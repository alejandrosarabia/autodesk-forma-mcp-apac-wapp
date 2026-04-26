/**
 * Auth management tools — exposed as MCP tools so Claude can check auth
 * health and trigger re-authentication directly from the chat interface.
 *
 * Tools:
 *   check_auth_status  — reports token validity and time-to-expiry
 *   start_auth_flow    — starts the OAuth browser flow and returns a
 *                        clickable URL; no server restart needed after auth
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { startAuthFlow } from '../auth/threeLegged.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const TOKEN_FILE = join(PROJECT_ROOT, '.aps_3lo_token.json');

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const authTools = [
  {
    name: 'check_auth_status',
    description:
      'Check the current Autodesk authentication status. Returns whether a valid 3LO token exists, when it expires, and whether a re-auth is needed before making API calls.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'start_auth_flow',
    description:
      'Start the Autodesk OAuth browser authentication flow. Returns a URL the user must open in their browser to log in. After completing the browser flow the MCP server will accept API calls immediately — no restart required.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleAuthTool(name) {
  switch (name) {
    case 'check_auth_status': {
      if (!existsSync(TOKEN_FILE)) {
        return {
          authenticated: false,
          reason: 'Token file not found',
          action_needed: 'Call start_auth_flow to authenticate',
        };
      }

      let tokenData;
      try {
        tokenData = JSON.parse(readFileSync(TOKEN_FILE, 'utf8'));
      } catch (err) {
        return {
          authenticated: false,
          reason: `Token file unreadable: ${err.message}`,
          action_needed: 'Call start_auth_flow to re-authenticate',
        };
      }

      const now = Date.now();
      const msRemaining = tokenData.expires_at - now;
      const minutesRemaining = Math.round(msRemaining / 60_000);
      const isValid = msRemaining > 60_000;

      return {
        authenticated: isValid,
        expires_at: new Date(tokenData.expires_at).toISOString(),
        expires_in_minutes: minutesRemaining,
        has_refresh_token: !!tokenData.refresh_token,
        action_needed: isValid
          ? null
          : tokenData.refresh_token
          ? 'Token expired but refresh_token is present — the server will attempt a silent refresh on next API call'
          : 'Token expired and no refresh_token. Call start_auth_flow to re-authenticate',
      };
    }

    case 'start_auth_flow': {
      try {
        const { authUrl } = await startAuthFlow();
        return {
          status: 'auth_flow_started',
          message:
            'Open the URL below in your browser to authenticate with Autodesk. ' +
            'After you complete the login the MCP server will resume immediately — no restart needed.',
          auth_url: authUrl,
        };
      } catch (err) {
        return {
          status: 'error',
          message: `Failed to start auth flow: ${err.message}`,
        };
      }
    }

    default:
      return `Unknown auth tool: ${name}`;
  }
}
