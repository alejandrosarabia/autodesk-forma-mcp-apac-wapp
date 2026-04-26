/**
 * REST API layer — exposes every MCP tool as POST /api/{tool_name}.
 *
 * Designed to be used as a module: call addApiRoutes(app) to attach routes
 * to an existing Express app (http-server.js does this).
 *
 * Auth:    x-api-key header validated against env var ACTIONS_API_KEY
 * CORS:    all origins allowed (required for ChatGPT to call the API)
 * Spec:    GET /openapi.json serves the OpenAPI 3.0 schema for Custom GPT
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { projectTools,    handleProjectTool    } from './tools/projects.js';
import { documentTools,   handleDocumentTool   } from './tools/documents.js';
import { issueTools,      handleIssueTool      } from './tools/issues.js';
import { rfiTools,        handleRfiTool        } from './tools/rfis.js';
import { formTools,       handleFormTool       } from './tools/forms.js';
import { permissionTools, handlePermissionTool } from './tools/permissions.js';
import { authTools,       handleAuthTool       } from './tools/auth.js';

// ─── Tool registry (shared with http-server.js via this module) ───────────────

export const ALL_TOOLS = [
  ...authTools,
  ...projectTools,
  ...documentTools,
  ...issueTools,
  ...rfiTools,
  ...formTools,
  ...permissionTools,
];

export const TOOL_HANDLERS = new Map([
  ...authTools.map(       (t) => [t.name, ()  => handleAuthTool(t.name)]),
  ...projectTools.map(    (t) => [t.name, (a) => handleProjectTool(t.name, a)]),
  ...documentTools.map(   (t) => [t.name, (a) => handleDocumentTool(t.name, a)]),
  ...issueTools.map(      (t) => [t.name, (a) => handleIssueTool(t.name, a)]),
  ...rfiTools.map(        (t) => [t.name, (a) => handleRfiTool(t.name, a)]),
  ...formTools.map(       (t) => [t.name, (a) => handleFormTool(t.name, a)]),
  ...permissionTools.map( (t) => [t.name, (a) => handlePermissionTool(t.name, a)]),
]);

// ─── OpenAPI spec path ────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const OPENAPI_PATH = join(__dirname, '..', 'openapi.json');

// ─── Route factory ────────────────────────────────────────────────────────────

/**
 * Attaches REST API routes to the provided Express app.
 *
 * Routes added:
 *   GET  /openapi.json          — OpenAPI 3.0 spec (no auth required)
 *   POST /api/:toolName         — tool proxy (requires x-api-key)
 *
 * @param {import('express').Application} app
 */
export function addApiRoutes(app) {
  // ── API key guard ───────────────────────────────────────────────────────────

  function requireApiKey(req, res, next) {
    const expected = process.env.ACTIONS_API_KEY;
    const provided  = req.headers['x-api-key'];

    if (!expected) {
      // No key configured — reject with a clear message so misconfiguration is obvious
      return res.status(500).json({
        error: 'Server misconfiguration: ACTIONS_API_KEY env var is not set',
      });
    }

    if (!provided || provided !== expected) {
      return res.status(401).json({ error: 'Unauthorized: invalid or missing x-api-key header' });
    }

    next();
  }

  // ── OpenAPI spec ─────────────────────────────────────────────────────────────

  app.get('/openapi.json', (_req, res) => {
    if (!existsSync(OPENAPI_PATH)) {
      return res.status(404).json({ error: 'openapi.json not found' });
    }
    try {
      const spec = JSON.parse(readFileSync(OPENAPI_PATH, 'utf8'));
      res.json(spec);
    } catch (err) {
      res.status(500).json({ error: `Failed to read openapi.json: ${err.message}` });
    }
  });

  // ── Tool proxy ────────────────────────────────────────────────────────────────

  app.post('/api/:toolName', requireApiKey, async (req, res) => {
    const { toolName } = req.params;
    const handler = TOOL_HANDLERS.get(toolName);

    if (!handler) {
      return res.status(404).json({ error: `Unknown tool: ${toolName}` });
    }

    let result;
    try {
      result = await handler(req.body ?? {});
    } catch (err) {
      return res.status(500).json({ error: `Tool execution failed: ${err.message}` });
    }

    // Normalise: tool handlers may return strings (error messages) or objects
    if (typeof result === 'string') {
      return res.json({ result });
    }
    return res.json(result);
  });
}
