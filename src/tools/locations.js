/**
 * Locations (Nodes) tools — Locations tree management.
 *
 * Tools: list_nodes, create_node, update_node, delete_node
 *
 * Autodesk Locations API v2. Paths:
 *   /construction/locations/v2/projects/{projectId}/trees/{treeId}/nodes
 *
 * All endpoints use 3LO auth (user context required).
 * treeId is currently always "default".
 */

import { apiRequest } from '../auth/router.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const locationTools = [
  {
    name: 'list_nodes',
    description: 'List all nodes (locations) in a locations tree (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        treeId: { type: 'string', description: 'Tree ID (always "default")' },
        filterIds: {
          type: 'array',
          description: 'Comma-separated node IDs to retrieve (returns with path array)',
          items: { type: 'string' },
        },
        limit: { type: 'number', description: 'Max results per page (1-10000, default 10000)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
      },
      required: ['projectId', 'treeId'],
    },
  },
  {
    name: 'create_node',
    description: 'Create a node in a locations tree (POST, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        treeId: { type: 'string', description: 'Tree ID (always "default")' },
        parentId: { type: 'string', description: 'Parent node ID (UUID, required)' },
        type: {
          type: 'string',
          description: 'Node type: Area, Level, Root (required)',
          enum: ['Area', 'Level', 'Root'],
        },
        name: { type: 'string', description: 'Node name (max 255, required)' },
        description: { type: 'string', description: 'Node description' },
        barcode: { type: 'string', description: 'Barcode (max 255, must be unique per project)' },
        targetNodeId: { type: 'string', description: 'Sibling node ID for positioning (requires insertOption)' },
        insertOption: {
          type: 'string',
          description: 'Position relative to targetNodeId: After, Before (requires targetNodeId)',
          enum: ['After', 'Before'],
        },
      },
      required: ['projectId', 'treeId', 'parentId', 'type', 'name'],
    },
  },
  {
    name: 'update_node',
    description: 'Update a node name or barcode (PATCH, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        treeId: { type: 'string', description: 'Tree ID (always "default")' },
        nodeId: { type: 'string', description: 'Node ID (UUID, required)' },
        name: { type: 'string', description: 'New node name (max 255)' },
        barcode: { type: 'string', description: 'New barcode (max 255, must be unique per project)' },
      },
      required: ['projectId', 'treeId', 'nodeId'],
    },
  },
  {
    name: 'delete_node',
    description: 'Delete a node and its descendants (DELETE, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        treeId: { type: 'string', description: 'Tree ID (always "default")' },
        nodeId: { type: 'string', description: 'Node ID (UUID, required)' },
      },
      required: ['projectId', 'treeId', 'nodeId'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleLocationTool(name, args) {
  const base = `/construction/locations/v2/projects/${args.projectId}/trees/${args.treeId}/nodes`;

  switch (name) {
    case 'list_nodes': {
      let path = base;
      const params = [];

      if (args.filterIds) params.push(`filter[id]=${args.filterIds.join(',')}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_node': {
      let path = base;
      const params = [];

      if (args.targetNodeId && args.insertOption) {
        params.push(`targetNodeId=${args.targetNodeId}`);
        params.push(`insertOption=${args.insertOption}`);
      }

      if (params.length > 0) path += `?${params.join('&')}`;

      const body = {
        parentId: args.parentId,
        type: args.type,
        name: args.name,
      };

      if (args.description) body.description = args.description;
      if (args.barcode) body.barcode = args.barcode;

      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_node': {
      const path = `${base}/${args.nodeId}`;
      const body = {};

      if (args.name) body.name = args.name;
      if (args.barcode) body.barcode = args.barcode;

      const data = await apiRequest('PATCH', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_node': {
      const path = `${base}/${args.nodeId}`;

      const data = await apiRequest('DELETE', path);
      if (typeof data === 'string') return data;
      return data;
    }

    default:
      return `Unknown location tool: ${name}`;
  }
}
