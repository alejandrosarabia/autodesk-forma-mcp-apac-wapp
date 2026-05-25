/**
 * Three-legged (authorization_code + PKCE) OAuth 2.0 for Autodesk APS.
 *
 * Exports:
 *   startAuthFlow()      — starts callback server on port 3001, returns { authUrl }
 *                          immediately. Token is saved to file in the background
 *                          when the user completes the browser flow.
 *   doAuthFlow()         — same as startAuthFlow but also waits for the token.
 *                          Used by auth-trigger.js (CLI).
 *   getThreeLeggedToken() — returns a valid token, refreshing from file/memory as needed.
 *                           Throws (never hangs) if no valid token exists.
 *   clearThreeLeggedToken() — invalidates cached token.
 */

import fetch from 'node-fetch';
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

const AUTH_URL = 'https://developer.api.autodesk.com/authentication/v2/authorize';
const TOKEN_URL = 'https://developer.api.autodesk.com/authentication/v2/token';
// In production set APS_TOKEN_FILE to a path on a persistent volume (e.g.
// /data/.aps_3lo_token.json on Railway) so refreshed tokens survive redeploys.
const TOKEN_FILE = process.env.APS_TOKEN_FILE || join(PROJECT_ROOT, '.aps_3lo_token.json');

let tokenCache = null;

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadTokenFromFile() {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveTokenToFile(tokenData) {
  writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.APS_CLIENT_ID;
  const clientSecret = process.env.APS_CLIENT_SECRET;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const tokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  saveTokenToFile(tokenData);
  tokenCache = tokenData;
  return tokenData.access_token;
}

// ─── Core auth session ────────────────────────────────────────────────────────
//
// Generates PKCE params, builds the auth URL, starts the port-3001 callback
// server, and returns:
//   { authUrl: string, tokenPromise: Promise<string> }
//
// tokenPromise resolves with the access_token once the user completes the
// browser flow. The callback server closes itself after one successful exchange.

function createAuthSession() {
  const clientId = process.env.APS_CLIENT_ID;
  const callbackUrl = process.env.APS_CALLBACK_URL || 'http://localhost:3001/callback';
  const scopes = process.env.APS_SCOPES || 'data:read data:write data:create account:read account:write';

  if (!clientId) {
    return Promise.reject(new Error('APS_CLIENT_ID must be set in .env'));
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString('hex');

  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${AUTH_URL}?${authParams.toString()}`;

  // tokenPromise resolves/rejects when the callback arrives
  let resolveToken, rejectToken;
  const tokenPromise = new Promise((res, rej) => {
    resolveToken = res;
    rejectToken = rej;
  });

  const server = createServer(async (req, res) => {
    let url;
    try {
      url = new URL(req.url, 'http://localhost:3001');
    } catch {
      res.end('Bad request');
      return;
    }

    if (url.pathname !== '/callback') {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const code = url.searchParams.get('code');
    const returnedState = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400);
      res.end(`Authentication failed: ${error} — ${url.searchParams.get('error_description') || ''}`);
      server.close();
      rejectToken(new Error(`Auth error: ${error}`));
      return;
    }

    if (returnedState !== state) {
      res.writeHead(400);
      res.end('State mismatch — possible CSRF. Please retry.');
      server.close();
      rejectToken(new Error('OAuth state mismatch'));
      return;
    }

    try {
      const clientSecret = process.env.APS_CLIENT_SECRET;
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const tokenResponse = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${await tokenResponse.text()}`);
      }

      const data = await tokenResponse.json();
      const tokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + data.expires_in * 1000,
      };

      saveTokenToFile(tokenData);
      tokenCache = tokenData;

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><html><body>
        <h2 style="color:green">&#10003; Authentication successful!</h2>
        <p>You can close this tab and return to your MCP client.</p>
      </body></html>`);

      server.close();
      console.error('✓ Authentication successful! Token saved.\n');
      resolveToken(data.access_token);
    } catch (err) {
      res.writeHead(500);
      res.end(`Token exchange failed: ${err.message}`);
      server.close();
      rejectToken(err);
    }
  });

  // Return a promise that resolves once the server is listening
  return new Promise((resolve, reject) => {
    server.listen(3001, () => {
      resolve({ authUrl, tokenPromise });
    });
    server.on('error', (err) => {
      reject(new Error(`Failed to start callback server on port 3001: ${err.message}`));
    });
  });
}

// ─── Public: start flow, return URL immediately ───────────────────────────────

/**
 * Starts the OAuth callback server on port 3001 and returns the authorization
 * URL immediately. Token saving happens in the background when the user
 * completes the browser flow.
 *
 * Used by authServer.js /auth-start endpoint.
 *
 * @returns {Promise<{ authUrl: string }>}
 */
export async function startAuthFlow() {
  const { authUrl, tokenPromise } = await createAuthSession();

  // Handle token saving in background — don't block the caller
  tokenPromise
    .then(() => {
      // Reload tokenCache from disk so the server picks up the new token
      // without requiring a restart or manual reconnect
      tokenCache = loadTokenFromFile();
      console.error('✓ 3LO token saved and in-memory cache updated — no restart needed.\n');
    })
    .catch((err) => console.error('Background auth flow failed:', err.message));

  return { authUrl };
}

// ─── Public: start flow and wait for token (CLI) ──────────────────────────────

/**
 * Full blocking auth flow — prints the URL to stderr and waits for the user
 * to complete the browser flow before resolving with the access token.
 *
 * Used by auth-trigger.js.
 *
 * @returns {Promise<string>} access_token
 */
export async function doAuthFlow() {
  const { authUrl, tokenPromise } = await createAuthSession();

  console.error('\n╔══════════════════════════════════════════════════════════╗');
  console.error('║     AUTODESK 3LO AUTHENTICATION REQUIRED                 ║');
  console.error('╚══════════════════════════════════════════════════════════╝');
  console.error('\nOpen this URL in your browser:\n');
  console.error(authUrl);
  console.error('\nWaiting for callback on port 3001...\n');
  console.error('Listening for OAuth callback on http://localhost:3001/callback');

  return tokenPromise;
}

// ─── Public: get a valid token ────────────────────────────────────────────────

export async function getThreeLeggedToken() {
  const now = Date.now();

  // Use in-memory cache if still valid (>60s remaining)
  if (tokenCache && now < tokenCache.expires_at - 60_000) {
    return tokenCache.access_token;
  }

  // Always re-read disk to pick up tokens written by external processes
  // (e.g. auth-trigger.js, or a completed browser re-auth flow)
  const diskToken = loadTokenFromFile();
  if (diskToken) {
    console.error(`[auth] Disk token expires_at=${new Date(diskToken.expires_at).toISOString()}, now=${new Date(now).toISOString()}`);
  } else {
    console.error('[auth] No token file found on disk');
  }

  if (diskToken && now < diskToken.expires_at - 60_000) {
    console.error(`[auth] Loaded fresh token from disk (expires in ${Math.round((diskToken.expires_at - now) / 60_000)}m)`);
    tokenCache = diskToken;
    return tokenCache.access_token;
  }

  // Try refresh using the best available refresh_token (disk takes priority — it may be newer)
  const candidate = diskToken || tokenCache;
  if (candidate?.refresh_token) {
    console.error('[auth] Access token expired — attempting silent refresh...');
    try {
      const newToken = await refreshAccessToken(candidate.refresh_token);
      console.error('[auth] Token refreshed successfully');
      return newToken;
    } catch (err) {
      console.error('[auth] Refresh failed:', err.message);
      tokenCache = null;
      throw new Error(
        `3LO token expired and refresh failed: ${err.message}. Use the start_auth_flow tool to re-authenticate.`,
      );
    }
  }

  // No valid token anywhere — surface a clear error with recovery path
  const expiryInfo = diskToken
    ? ` (disk token expired ${Math.round((now - diskToken.expires_at) / 60_000)}m ago)`
    : ' (no token file found)';
  console.error(`[auth] No valid 3LO token${expiryInfo}`);
  throw new Error(
    `No valid 3LO token found${expiryInfo}. Use the start_auth_flow tool to re-authenticate without restarting the server.`,
  );
}

export function clearThreeLeggedToken() {
  tokenCache = null;
  const data = loadTokenFromFile();
  if (data) {
    data.expires_at = 0;
    saveTokenToFile(data);
  }
}
