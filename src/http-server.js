/**
 * Cloud HTTP/SSE entry point — additive layer on top of the existing stdio server.
 *
 * Run with:  node src/http-server.js   (npm run start:cloud)
 * The original stdio server is unchanged: node src/index.js  (npm run start:local)
 *
 * Ports
 * ─────
 * • This server listens on $PORT (Railway injects this) or 3002 locally.
 * • Port 3002 is also used by authServer.js, but that is only started by
 *   src/index.js — never by this file — so there is no conflict.
 *
 * Token bootstrap
 * ───────────────
 * In cloud deployments set APS_3LO_TOKEN to the JSON contents of
 * .aps_3lo_token.json.  This server writes that value to the exact same
 * TOKEN_FILE path that src/auth/threeLegged.js reads so no existing auth
 * code needs to be changed.
 *
 * On Windows the path is a real filesystem path.  On Linux (Railway) it is
 * treated as a literal filename string — both this file and threeLegged.js
 * use the same string, so they agree on which file to read/write.
 *
 * Endpoints
 * ─────────
 *   GET  /sse            MCP SSE transport  (Claude.ai web MCP connector)
 *   POST /message        MCP message relay  (SSE protocol requirement)
 *   GET  /health         { status:"ok", auth:true|false }
 *   POST /api/:toolName  REST tool proxy    (ChatGPT Custom GPT)
 *   GET  /openapi.json   OpenAPI 3.0 spec
 */

import 'dotenv/config';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import express from 'express';
import { Server }             from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// ─── Token bootstrap ──────────────────────────────────────────────────────────
// Must resolve to the same path as TOKEN_FILE in src/auth/threeLegged.js.
// In production point APS_TOKEN_FILE at a persistent volume (e.g.
// /data/.aps_3lo_token.json on Railway) so refresh_token rotations persist
// across redeploys — otherwise every cold start overwrites the rotated token
// with the stale APS_3LO_TOKEN env var and the refresh chain breaks.

const TOKEN_FILE = process.env.APS_TOKEN_FILE || join(process.cwd(), '.aps_3lo_token.json');

if (existsSync(TOKEN_FILE)) {
  console.log(`[boot] Using persisted token file: ${TOKEN_FILE}`);
} else if (process.env.APS_3LO_TOKEN) {
  try {
    JSON.parse(process.env.APS_3LO_TOKEN);
    writeFileSync(TOKEN_FILE, process.env.APS_3LO_TOKEN, 'utf8');
    console.log(`[boot] Bootstrapped APS_3LO_TOKEN to ${TOKEN_FILE} (cold start)`);
  } catch (err) {
    console.error(`[boot] WARNING: APS_3LO_TOKEN is not valid JSON — ${err.message}`);
  }
} else {
  console.warn(`[boot] WARNING: No token file at ${TOKEN_FILE} and no APS_3LO_TOKEN env var. ` +
    '3LO-authenticated tools will fail until a token is available.');
}

// ─── Tool registry ────────────────────────────────────────────────────────────
// Imported from api-server.js to avoid duplicating the registry definition.

import { ALL_TOOLS, TOOL_HANDLERS, addApiRoutes } from './api-server.js';
import { registerWhatsappRoutes } from './whatsapp/webhook.js';
import { createCloudAuthSession, exchangeCloudAuthCode } from './auth/threeLegged.js';

// ─── MCP server factory ───────────────────────────────────────────────────────
// Creates a fresh Server per SSE connection so concurrent clients don't share
// state and server.connect() can be called once per instance.

function createMcpServer() {
  const server = new Server(
    { name: 'autodesk-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: ALL_TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    const handler = TOOL_HANDLERS.get(name);
    if (!handler) {
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }

    let result;
    try {
      result = await handler(args);
    } catch (err) {
      return { content: [{ type: 'text', text: `Tool error: ${err.message}` }], isError: true };
    }

    const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    return { content: [{ type: 'text', text }] };
  });

  return server;
}

// ─── Express app ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// CORS — open to all origins so Claude.ai and ChatGPT can reach the server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// ─── GET /health ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  let auth = false;
  try {
    if (existsSync(TOKEN_FILE)) {
      const { expires_at } = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      auth = Date.now() < expires_at - 60_000;
    }
  } catch { /* ignore malformed token file */ }
  res.json({ status: 'ok', auth });
});

// ─── MCP SSE transport ────────────────────────────────────────────────────────

/** sessionId → SSEServerTransport  (one entry per connected SSE client) */
const activeTransports = new Map();

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/message', res);
  activeTransports.set(transport.sessionId, transport);
  res.on('close', () => activeTransports.delete(transport.sessionId));

  const server = createMcpServer();
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  const sessionId = String(req.query.sessionId ?? '');
  const transport = activeTransports.get(sessionId);
  if (!transport) {
    res.status(400).json({ error: 'Session not found or expired. Reconnect via GET /sse.' });
    return;
  }
  await transport.handlePostMessage(req, res, req.body);
});

// ─── Cloud OAuth routes ───────────────────────────────────────────────────────
// These allow re-authentication from Railway without needing localhost:3001.
//
// Setup (one-time):
//   1. Set APS_CALLBACK_URL=https://<your-railway-app>.up.railway.app/auth/callback
//      in Railway env vars AND in your APS app's registered callback URLs.
//   2. To re-authenticate: visit https://<your-railway-app>.up.railway.app/auth/start
//      and complete the browser login.

app.get('/auth/start', (_req, res) => {
  if (!process.env.APS_CALLBACK_URL || process.env.APS_CALLBACK_URL.includes('localhost')) {
    return res.status(400).send(
      '<h2>APS_CALLBACK_URL not configured for cloud use.</h2>' +
      '<p>Set <code>APS_CALLBACK_URL=https://&lt;your-railway-app&gt;.up.railway.app/auth/callback</code> ' +
      'in Railway environment variables and register it in your APS app settings.</p>',
    );
  }
  try {
    const { authUrl } = createCloudAuthSession();
    res.redirect(authUrl);
  } catch (err) {
    res.status(500).send(`<h2>Failed to start auth flow</h2><pre>${err.message}</pre>`);
  }
});

app.get('/auth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(
      `<h2 style="color:red">Authentication failed</h2><p>${error}: ${error_description || ''}</p>`,
    );
  }

  if (!code || !state) {
    return res.status(400).send('<h2>Missing code or state parameter</h2>');
  }

  try {
    await exchangeCloudAuthCode(String(code), String(state));
    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2em">
      <h2 style="color:green">&#10003; Authentication successful!</h2>
      <p>The Railway server is now authenticated with Autodesk. You can close this tab.</p>
      <p><small>Token saved — no restart required.</small></p>
    </body></html>`);
  } catch (err) {
    res.status(400).send(`<h2 style="color:red">Token exchange failed</h2><pre>${err.message}</pre>`);
  }
});

// ─── REST API routes (ChatGPT Custom GPT) ─────────────────────────────────────

addApiRoutes(app);

// ─── WhatsApp Cloud API webhook ───────────────────────────────────────────────

registerWhatsappRoutes(app);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3002;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\nAutodesk MCP cloud server running on http://localhost:${PORT}`);
  console.log(`  GET  /sse            MCP SSE transport  (Claude.ai)`);
  console.log(`  POST /message        MCP message relay`);
  console.log(`  GET  /health         health + auth check`);
  console.log(`  POST /api/:toolName  REST tool proxy    (ChatGPT)`);
  console.log(`  GET  /openapi.json   OpenAPI 3.0 spec`);
  console.log(`  GET  /auth/start     start Autodesk OAuth flow (cloud re-auth)`);
  console.log(`  GET  /auth/callback  OAuth redirect target (set as APS_CALLBACK_URL)`);
  console.log(`  GET  /webhook/whatsapp  WhatsApp Cloud API verification`);
  console.log(`  POST /webhook/whatsapp  WhatsApp Cloud API messages`);
  console.log(`  Tools loaded: ${ALL_TOOLS.length}`);
});
