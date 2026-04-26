/**
 * Transmittals tools — always use 2LO with x-user-id header.
 *
 * Tools: list_transmittals, get_transmittal,
 *        list_transmittal_recipients,
 *        list_transmittal_folders, list_transmittal_documents
 *
 * ACC Transmittals API v1. Path shape:
 *   /hq/v1/projects/{projectId}/transmittals/...
 * projectId = with b. prefix.
 *
 * List endpoints use limit/offset pagination.
 * All endpoints use 2LO auth via x-user-id header.
 * Some responses may return 202 with empty results while processing (SENDING status).
 */

import { apiRequest, withBPrefix } from '../auth/router.js';
import { paginate } from '../utils/paginate.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const transmittalTools = [
  {
    name: 'list_transmittals',
    description: 'List all transmittals in a project (2LO auth via x-user-id)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix)' },
        userId: { type: 'string', description: 'User ID for x-user-id header (required for 2LO)' },
        limit: { type: 'number', description: 'Results per page (1-200, default 20)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
        sort: { type: 'string', description: 'Sort field: status, sequenceId, title, sentByName, createdAt, documentsCount' },
      },
      required: ['projectId', 'userId'],
    },
  },
  {
    name: 'get_transmittal',
    description: 'Get a specific transmittal by ID (2LO auth via x-user-id)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix)' },
        transmittalId: { type: 'string', description: 'Transmittal ID' },
        userId: { type: 'string', description: 'User ID for x-user-id header (required for 2LO)' },
      },
      required: ['projectId', 'transmittalId', 'userId'],
    },
  },
  {
    name: 'list_transmittal_recipients',
    description: 'List recipients and external members of a transmittal (2LO auth via x-user-id)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix)' },
        transmittalId: { type: 'string', description: 'Transmittal ID' },
        userId: { type: 'string', description: 'User ID for x-user-id header (required for 2LO)' },
      },
      required: ['projectId', 'transmittalId', 'userId'],
    },
  },
  {
    name: 'list_transmittal_folders',
    description: 'List folders in a transmittal (2LO auth via x-user-id)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix)' },
        transmittalId: { type: 'string', description: 'Transmittal ID' },
        userId: { type: 'string', description: 'User ID for x-user-id header (required for 2LO)' },
        limit: { type: 'number', description: 'Results per page (1-200, default 20)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
        sort: { type: 'string', description: 'Sort field: name, lastUpdatedAt, updatedByName' },
      },
      required: ['projectId', 'transmittalId', 'userId'],
    },
  },
  {
    name: 'list_transmittal_documents',
    description: 'List documents in a transmittal (2LO auth via x-user-id)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix)' },
        transmittalId: { type: 'string', description: 'Transmittal ID' },
        userId: { type: 'string', description: 'User ID for x-user-id header (required for 2LO)' },
        limit: { type: 'number', description: 'Results per page (1-200, default 20)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
        sort: { type: 'string', description: 'Sort field: name, title, version, lastUpdatedAt, updatedByName' },
      },
      required: ['projectId', 'transmittalId', 'userId'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleTransmittalTool(name, args) {
  const pid = withBPrefix(args.projectId);
  const base = `/hq/v1/projects/${pid}/transmittals`;

  // 2LO auth with x-user-id header
  const customHeaders = { 'x-user-id': args.userId };

  switch (name) {
    case 'list_transmittals': {
      const limit = args.limit || 20;
      const offset = args.offset || 0;
      let path = `${base}?limit=${limit}&offset=${offset}`;
      if (args.sort) path += `&sort=${args.sort}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_transmittal': {
      const data = await apiRequest(
        'GET',
        `${base}/${args.transmittalId}`,
        null,
        false,
        customHeaders,
      );
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_transmittal_recipients': {
      const data = await apiRequest(
        'GET',
        `${base}/${args.transmittalId}/recipients`,
        null,
        false,
        customHeaders,
      );
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_transmittal_folders': {
      const limit = args.limit || 20;
      const offset = args.offset || 0;
      let path = `${base}/${args.transmittalId}/folders?limit=${limit}&offset=${offset}`;
      if (args.sort) path += `&sort=${args.sort}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_transmittal_documents': {
      const limit = args.limit || 20;
      const offset = args.offset || 0;
      let path = `${base}/${args.transmittalId}/documents?limit=${limit}&offset=${offset}`;
      if (args.sort) path += `&sort=${args.sort}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    default:
      return `Unknown transmittal tool: ${name}`;
  }
}
