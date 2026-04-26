/**
 * Model Properties tools — Model properties indexing and querying.
 *
 * Index tools:
 *   get_index, get_index_manifest, get_index_fields, get_index_properties,
 *   get_index_query, get_index_query_properties,
 *   batch_index_status, create_index_query
 *
 * Diff tools:
 *   get_diff, get_diff_manifest, get_diff_fields, get_diff_properties,
 *   get_diff_query, get_diff_query_properties,
 *   batch_diff_status, create_diff_query
 *
 * Autodesk Model Properties API v2. Base path:
 *   /construction/index/v2/projects/:projectId/indexes/:indexId
 *   /construction/index/v2/projects/:projectId/diffs/:diffId
 *
 * All endpoints use 3LO auth (user context required, scope: data:read).
 */

import { apiRequest, withoutBPrefix } from '../auth/router.js';

const BASE = '/construction/index/v2';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const modelPropertiesTools = [
  {
    name: 'get_index',
    description: 'Retrieve the indexing status for a given index ID. Returns state (PROCESSING/FINISHED/FAILED), stats, and URLs for manifest, fields, properties, and query results.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        indexId: { type: 'string', description: 'Index ID' },
      },
      required: ['projectId', 'indexId'],
    },
  },
  {
    name: 'get_index_manifest',
    description: 'Retrieve the manifest associated with a properties index. Returns seed files, databases (OSS paths), views, errors, and stats.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        indexId: { type: 'string', description: 'Index ID' },
      },
      required: ['projectId', 'indexId'],
    },
  },
  {
    name: 'get_index_fields',
    description: 'Retrieve the fields dictionary for a properties index (LDJSON streaming, immutable). Returns field key, category, type, name, and uom per line.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        indexId: { type: 'string', description: 'Index ID' },
      },
      required: ['projectId', 'indexId'],
    },
  },
  {
    name: 'get_index_properties',
    description: 'Retrieve the full properties index (LDJSON streaming, immutable). Returns all object properties: lmvId, dbId, props, propsHash, geomHash, bbox, views, svf2Id, lineageId, externalId.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        indexId: { type: 'string', description: 'Index ID' },
      },
      required: ['projectId', 'indexId'],
    },
  },
  {
    name: 'get_index_query',
    description: 'Retrieve the status of a query job on a properties index. Returns state, stats, and result URLs. Poll until state is FINISHED or FAILED.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        indexId: { type: 'string', description: 'Index ID' },
        queryId: { type: 'string', description: 'Query ID returned from create_index_query' },
      },
      required: ['projectId', 'indexId', 'queryId'],
    },
  },
  {
    name: 'get_index_query_properties',
    description: 'Retrieve query-filtered properties (LDJSON streaming, immutable). Same response shape as get_index_properties but only contains objects matching the query.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        indexId: { type: 'string', description: 'Index ID' },
        queryId: { type: 'string', description: 'Query ID' },
      },
      required: ['projectId', 'indexId', 'queryId'],
    },
  },
  {
    name: 'batch_index_status',
    description: 'Retrieve indexing job status for multiple versions in one request (up to 1000). Accepts array of version URNs with optional query/columns filters.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        versions: {
          type: 'array',
          description: 'Array of version objects (1–1000). Each: { versionUrn (required), query?, columns? }',
          items: {
            type: 'object',
            properties: {
              versionUrn: { type: 'string', description: 'File version URN' },
              query: { type: 'object', description: 'SQL AST for binary expression/filter (optional)' },
              columns: { type: 'object', description: 'SQL AST for describing columns/projections (optional)' },
            },
            required: ['versionUrn'],
          },
        },
        forceRegenerateCache: { type: 'boolean', description: 'If true, force regeneration of S3 cache (x-ads-force-regenerate-cache header)' },
      },
      required: ['projectId', 'versions'],
    },
  },
  {
    name: 'create_index_query',
    description: 'Apply a query on a properties index and get back a queryId to poll with get_index_query. Accepts SQL AST query and optional columns projection.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        indexId: { type: 'string', description: 'Index ID' },
        query: { type: 'object', description: 'SQL AST for binary expression/filter (required)' },
        columns: { type: 'object', description: 'SQL AST for describing columns/projections (optional)' },
        forceRegenerateCache: { type: 'boolean', description: 'If true, force regeneration of S3 cache (x-ads-force-regenerate-cache header)' },
      },
      required: ['projectId', 'indexId', 'query'],
    },
  },

  // ── Diff ──────────────────────────────────────────────────────────────────
  {
    name: 'get_diff',
    description: 'Retrieve the diff status for a given diff ID. Returns state (PROCESSING/FINISHED/FAILED), prevVersionUrns, curVersionUrns, stats (added/removed/modified), and URLs for manifest, fields, properties, and query results.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        diffId: { type: 'string', description: 'Diff ID' },
      },
      required: ['projectId', 'diffId'],
    },
  },
  {
    name: 'get_diff_manifest',
    description: 'Retrieve the manifest associated with a diff index. Returns seedFiles (current version), prev (previous version seed files), databases, views, errors, and stats (addedObjects, removedObjects, changedObjects, contentLength).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        diffId: { type: 'string', description: 'Diff ID' },
      },
      required: ['projectId', 'diffId'],
    },
  },
  {
    name: 'get_diff_fields',
    description: 'Retrieve the fields dictionary for a diff index (LDJSON streaming, immutable). Returns field key, category, type, name, and uom per line.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        diffId: { type: 'string', description: 'Diff ID' },
      },
      required: ['projectId', 'diffId'],
    },
  },
  {
    name: 'get_diff_properties',
    description: 'Retrieve the full diff properties (LDJSON streaming, immutable). Each object includes type (OBJECT_ADDED/REMOVED/CHANGED), current props, and prev object with previous version props.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        diffId: { type: 'string', description: 'Diff ID' },
      },
      required: ['projectId', 'diffId'],
    },
  },
  {
    name: 'get_diff_query',
    description: 'Retrieve the status of a query job on a diff index. Returns state, stats, and result URLs. Poll until state is FINISHED or FAILED.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        diffId: { type: 'string', description: 'Diff ID' },
        queryId: { type: 'string', description: 'Query ID returned from create_diff_query' },
      },
      required: ['projectId', 'diffId', 'queryId'],
    },
  },
  {
    name: 'get_diff_query_properties',
    description: 'Retrieve query-filtered diff properties (LDJSON streaming, immutable). Same response shape as get_diff_properties but only contains objects matching the query.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        diffId: { type: 'string', description: 'Diff ID' },
        queryId: { type: 'string', description: 'Query ID' },
      },
      required: ['projectId', 'diffId', 'queryId'],
    },
  },
  {
    name: 'batch_diff_status',
    description: 'Retrieve diff job status for multiple version pairs in one request (up to 1000). Each diff entry requires prevVersionUrn + curVersionUrn.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        diffs: {
          type: 'array',
          description: 'Array of diff objects (1–1000). Each: { prevVersionUrn (required), curVersionUrn (required), query?, columns? }',
          items: {
            type: 'object',
            properties: {
              prevVersionUrn: { type: 'string', description: 'Previous file version URN' },
              curVersionUrn: { type: 'string', description: 'Current file version URN' },
              query: { type: 'object', description: 'SQL AST for binary expression/filter (optional)' },
              columns: { type: 'object', description: 'SQL AST for describing columns/projections (optional)' },
            },
            required: ['prevVersionUrn', 'curVersionUrn'],
          },
        },
        forceRegenerateCache: { type: 'boolean', description: 'If true, force regeneration of S3 cache (x-ads-force-regenerate-cache header)' },
      },
      required: ['projectId', 'diffs'],
    },
  },
  {
    name: 'create_diff_query',
    description: 'Apply a query on a diff index and get back a queryId to poll with get_diff_query. Accepts SQL AST query and optional columns projection.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        diffId: { type: 'string', description: 'Diff ID' },
        query: { type: 'object', description: 'SQL AST for binary expression/filter (required)' },
        columns: { type: 'object', description: 'SQL AST for describing columns/projections (optional)' },
        forceRegenerateCache: { type: 'boolean', description: 'If true, force regeneration of S3 cache (x-ads-force-regenerate-cache header)' },
      },
      required: ['projectId', 'diffId', 'query'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleModelPropertiesTool(name, args) {
  const projectId = withoutBPrefix(args.projectId);

  switch (name) {
    case 'get_index': {
      const path = `${BASE}/projects/${projectId}/indexes/${args.indexId}`;
      return apiRequest('GET', path);
    }

    case 'get_index_manifest': {
      const path = `${BASE}/projects/${projectId}/indexes/${args.indexId}/manifest`;
      return apiRequest('GET', path);
    }

    case 'get_index_fields': {
      const path = `${BASE}/projects/${projectId}/indexes/${args.indexId}/fields`;
      return apiRequest('GET', path);
    }

    case 'get_index_properties': {
      const path = `${BASE}/projects/${projectId}/indexes/${args.indexId}/properties`;
      return apiRequest('GET', path);
    }

    case 'get_index_query': {
      const path = `${BASE}/projects/${projectId}/indexes/${args.indexId}/queries/${args.queryId}`;
      return apiRequest('GET', path);
    }

    case 'get_index_query_properties': {
      const path = `${BASE}/projects/${projectId}/indexes/${args.indexId}/queries/${args.queryId}/properties`;
      return apiRequest('GET', path);
    }

    case 'batch_index_status': {
      const path = `${BASE}/projects/${projectId}/indexes:batch-status`;
      const body = { versions: args.versions };
      const customHeaders = {};
      if (args.forceRegenerateCache) customHeaders['x-ads-force-regenerate-cache'] = 'true';
      return apiRequest('POST', path, body, false, customHeaders);
    }

    case 'create_index_query': {
      const path = `${BASE}/projects/${projectId}/indexes/${args.indexId}/queries`;
      const body = { query: args.query };
      if (args.columns !== undefined) body.columns = args.columns;
      const customHeaders = {};
      if (args.forceRegenerateCache) customHeaders['x-ads-force-regenerate-cache'] = 'true';
      return apiRequest('POST', path, body, false, customHeaders);
    }

    // ── Diff ────────────────────────────────────────────────────────────────

    case 'get_diff': {
      const path = `${BASE}/projects/${projectId}/diffs/${args.diffId}`;
      return apiRequest('GET', path);
    }

    case 'get_diff_manifest': {
      const path = `${BASE}/projects/${projectId}/diffs/${args.diffId}/manifest`;
      return apiRequest('GET', path);
    }

    case 'get_diff_fields': {
      const path = `${BASE}/projects/${projectId}/diffs/${args.diffId}/fields`;
      return apiRequest('GET', path);
    }

    case 'get_diff_properties': {
      const path = `${BASE}/projects/${projectId}/diffs/${args.diffId}/properties`;
      return apiRequest('GET', path);
    }

    case 'get_diff_query': {
      const path = `${BASE}/projects/${projectId}/diffs/${args.diffId}/queries/${args.queryId}`;
      return apiRequest('GET', path);
    }

    case 'get_diff_query_properties': {
      const path = `${BASE}/projects/${projectId}/diffs/${args.diffId}/queries/${args.queryId}/properties`;
      return apiRequest('GET', path);
    }

    case 'batch_diff_status': {
      const path = `${BASE}/projects/${projectId}/diffs:batch-status`;
      const body = { diffs: args.diffs };
      const customHeaders = {};
      if (args.forceRegenerateCache) customHeaders['x-ads-force-regenerate-cache'] = 'true';
      return apiRequest('POST', path, body, false, customHeaders);
    }

    case 'create_diff_query': {
      const path = `${BASE}/projects/${projectId}/diffs/${args.diffId}/queries`;
      const body = { query: args.query };
      if (args.columns !== undefined) body.columns = args.columns;
      const customHeaders = {};
      if (args.forceRegenerateCache) customHeaders['x-ads-force-regenerate-cache'] = 'true';
      return apiRequest('POST', path, body, false, customHeaders);
    }

    default:
      return `Unknown model properties tool: ${name}`;
  }
}
