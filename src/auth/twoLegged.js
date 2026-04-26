/**
 * Two-legged (client_credentials) OAuth 2.0 for Autodesk APS.
 *
 * - Credentials sent as HTTP Basic Auth (base64 clientId:clientSecret)
 * - Token cached in memory
 * - Auto-refreshes 60 seconds before expiry
 */

import fetch from 'node-fetch';
import 'dotenv/config';

const TOKEN_URL = 'https://developer.api.autodesk.com/authentication/v2/token';

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getTwoLeggedToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = process.env.APS_CLIENT_ID;
  const clientSecret = process.env.APS_CLIENT_SECRET;
  const scopes = process.env.APS_SCOPES || 'data:read data:write data:create account:read account:write';

  if (!clientId || !clientSecret) {
    throw new Error('APS_CLIENT_ID and APS_CLIENT_SECRET must be set in .env');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: scopes,
    }),
  });

  if (!response.ok) {
    throw new Error(`2LO token fetch failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;

  return cachedToken;
}

export function clearTwoLeggedToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}
