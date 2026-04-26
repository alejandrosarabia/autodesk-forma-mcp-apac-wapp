/**
 * Hybrid auth dispatcher + central API request function.
 *
 * Routing rules:
 *   3LO  → ALL /construction/issues/, /construction/rfis/, /rfis/v2/, /construction/forms/
 *          (ACC Construction APIs require user context even for reads)
 *          POST|PATCH|PUT|DELETE on /data/v1/…/items or /data/v1/…/folders
 *          (but NOT /data/v1/…/permissions sub-endpoints — those stay on 2LO)
 *   2LO  → everything else (project/, data/ reads, hq/ admin endpoints)
 *
 * On 401: clears the appropriate token and retries once with a fresh token.
 */

import fetch from 'node-fetch';
import { getTwoLeggedToken, clearTwoLeggedToken } from './twoLegged.js';
import { getThreeLeggedToken, clearThreeLeggedToken } from './threeLegged.js';
import 'dotenv/config';

const APS_BASE = 'https://developer.api.autodesk.com';
const REGION = process.env.APS_REGION || 'US';

// ─── Routing logic ────────────────────────────────────────────────────────────

function requiresThreeLegged(method, path) {
  const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

  // Construction endpoints: always 3LO (ACC requires user context even for reads)
  if (path.includes('/construction/issues/')) return true;
  if (path.includes('/construction/rfis/')) return true;
  if (path.includes('/rfis/v2/')) return true;
  if (path.includes('/construction/forms/')) return true;
  if (path.includes('/construction/admin/')) return true;
  if (path.includes('/construction/assets/')) return true;
  if (path.includes('/construction/submittals/')) return true;
  if (path.includes('/construction/takeoff/')) return true;
  if (path.includes('/construction/reviews/')) return true;
  if (path.includes('/construction/locations/')) return true;
  if (path.includes('/data-connector/')) return true;
  if (path.includes('/cost/')) return true;
  if (path.includes('/bim360/relationship/')) return true;
  if (path.includes('/bim360/modelset/')) return true;
  if (path.includes('/bim360/clash/')) return true;
  if (path.includes('/construction/index/')) return true;
  if (path.includes('/construction/files/')) return true;
  if (path.includes('/construction/rcm/')) return true;
  if (path.includes('/construction/packages/')) return true;
  if (path.includes('/construction/autospecs/')) return true;
  if (path.includes('/userprofile/')) return true;

  // Write operations on data/v1 items or folders — but NOT permission sub-endpoints
  if (isWrite && path.includes('/data/v1/')) {
    if (path.includes('/permissions')) return false; // stays on 2LO
    if (/\/data\/v1\/projects\/[^/]+\/(items|folders)/.test(path)) return true;
  }

  return false;
}

// ─── Error formatting ─────────────────────────────────────────────────────────

function formatError(status) {
  switch (true) {
    case status === 401: return null; // handled by retry logic
    case status === 403: return 'Permission denied - check project membership and folder access';
    case status === 404: return 'Not found - verify the ID is correct';
    case status === 429: return 'Rate limited - wait 30 seconds and try again';
    case status >= 500:  return `Autodesk API error ${status} - try again shortly`;
    default:             return null;
  }
}

// ─── Central request function ─────────────────────────────────────────────────

/**
 * @param {string}  method  - HTTP method (GET, POST, PATCH, PUT, DELETE)
 * @param {string}  path    - URL path, e.g. '/data/v1/projects/...'
 * @param {object}  [body]  - JSON body (optional)
 * @param {boolean} [retried] - internal flag to prevent infinite retry
 * @param {object}  [customHeaders] - additional headers to merge (optional)
 * @returns {Promise<object|string|null>}
 *   - Parsed JSON on success
 *   - null on 204 No Content
 *   - Plain error string on failure
 */
export async function apiRequest(method, path, body = null, retried = false, customHeaders = {}) {
  const use3LO = requiresThreeLegged(method, path);

  let token;
  try {
    token = use3LO ? await getThreeLeggedToken() : await getTwoLeggedToken();
  } catch (err) {
    console.error(`[auth] Token acquisition failed (${use3LO ? '3LO' : '2LO'}): ${err.message}`);
    return `Authentication failed: ${err.message}`;
  }

  const url = `${APS_BASE}${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-ads-region': REGION,
    ...customHeaders,
  };

  const options = { method, headers, signal: AbortSignal.timeout(30_000) };
  if (body !== null) options.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return `Request timed out after 30s — Autodesk API did not respond`;
    }
    return `Network error: ${err.message}`;
  }

  // Retry once on 401 with a fresh token
  if (response.status === 401 && !retried) {
    if (use3LO) clearThreeLeggedToken();
    else clearTwoLeggedToken();
    return apiRequest(method, path, body, true, customHeaders);
  }

  if (response.status === 401) {
    console.error(`[auth] 401 persisted after token refresh retry on ${method} ${path}`);
    return 'Authentication failed: 401 from Autodesk API even after token refresh. Use start_auth_flow to re-authenticate.';
  }

  if (response.status === 204) return null;

  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  const errMsg = formatError(response.status);
  if (errMsg) {
    const detail = responseBody ? ` — ${JSON.stringify(responseBody)}` : '';
    return `${errMsg}${detail}`;
  }

  if (!response.ok) {
    const detail = responseBody ? ` — ${JSON.stringify(responseBody)}` : '';
    return `API error ${response.status}${detail}`;
  }

  return responseBody ?? `Unexpected non-JSON response (status ${response.status})`;
}

// ─── projectId helpers ────────────────────────────────────────────────────────

/** Ensures "b." prefix for Data Management API project IDs */
export function withBPrefix(projectId) {
  return projectId.startsWith('b.') ? projectId : `b.${projectId}`;
}

/** Strips "b." prefix for Construction Cloud API project IDs */
export function withoutBPrefix(projectId) {
  return projectId.startsWith('b.') ? projectId.slice(2) : projectId;
}
