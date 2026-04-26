/**
 * Auth management HTTP server — runs on port 3002 alongside the MCP server.
 *
 * Endpoints:
 *   GET /auth-status  → { authenticated, expires_at, expires_in_minutes }
 *   GET /auth-start   → { authUrl }  (starts port-3001 callback server, returns URL immediately)
 */

import express from 'express';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { startAuthFlow } from './auth/threeLegged.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const TOKEN_FILE = join(PROJECT_ROOT, '.aps_3lo_token.json');

const app = express();

// ─── CORS for all localhost origins ──────────────────────────────────────────

app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (!origin || origin.startsWith('http://localhost') || origin.startsWith('https://localhost')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// ─── GET /auth-status ─────────────────────────────────────────────────────────

app.get('/auth-status', (req, res) => {
  if (!existsSync(TOKEN_FILE)) {
    return res.json({ authenticated: false, expires_at: null, expires_in_minutes: null });
  }

  try {
    const { expires_at } = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
    const now = Date.now();
    const expiresInMs = expires_at - now;
    res.json({
      authenticated: expiresInMs > 60_000,
      expires_at,
      expires_in_minutes: Math.round(expiresInMs / 60_000),
    });
  } catch {
    res.json({ authenticated: false, expires_at: null, expires_in_minutes: null });
  }
});

// ─── GET /auth-start ──────────────────────────────────────────────────────────

app.get('/auth-start', async (req, res) => {
  try {
    const { authUrl } = await startAuthFlow();
    res.json({ authUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

export function startAuthServer() {
  const srv = app.listen(3002, () => {
    console.error('Auth server running on http://localhost:3002');
  });
  srv.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('Auth server port 3002 already in use — skipping (MCP tools still work)');
    } else {
      console.error(`Auth server failed to start: ${err.message}`);
    }
  });
}
