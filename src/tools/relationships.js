/**
 * Relationships tools — always use 3LO.
 *
 * Tools: get_writable_relationships,
 *        create_relationships, delete_relationships
 *
 * Autodesk Relationship Service v2. Path shape:
 *   /bim360/relationship/v2/utility/...
 *   /bim360/relationship/v2/containers/{containerId}/...
 *
 * All endpoints use 3LO auth (user context required).
 */

import { apiRequest, withBPrefix } from '../auth/router.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const relationshipTools = [
  {
    name: 'get_writable_relationships',
    description: 'Get entity types compatible for creating/deleting relationships (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_relationships',
    description: 'Create one or more relationships between entities (batch up to 20, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Project container ID (UUID)' },
        relationships: {
          type: 'array',
          description: 'Array of relationship objects to create',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Relationship UUID (optional, auto-generated if omitted)' },
              entities: {
                type: 'array',
                description: 'Exactly 2 entities to link',
                items: {
                  type: 'object',
                  properties: {
                    domain: { type: 'string', description: 'Entity domain (e.g. autodesk-bim360-asset)' },
                    type: { type: 'string', description: 'Entity type (e.g. asset, documentlineage)' },
                    id: { type: 'string', description: 'Entity UUID' },
                  },
                  required: ['domain', 'type', 'id'],
                },
              },
            },
            required: ['entities'],
          },
        },
      },
      required: ['containerId', 'relationships'],
    },
  },
  {
    name: 'delete_relationships',
    description: 'Delete one or more relationships by UUID (batch 1-50, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Project container ID (UUID)' },
        relationshipIds: {
          type: 'array',
          description: 'Array of relationship UUIDs to delete (1-50 items)',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'relationshipIds'],
    },
  },
  {
    name: 'get_relationship_sync_status',
    description: 'Get relationship synchronization status with optional sync tokens (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Project container ID (UUID)' },
        syncTokens: {
          type: 'array',
          description: 'Optional array of sync token objects with syncToken and referenceId',
          items: {
            type: 'object',
            properties: {
              syncToken: { type: 'string', description: 'Sync token' },
              referenceId: { type: 'string', description: 'Optional reference ID' },
            },
          },
        },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'sync_relationships',
    description: 'Synchronize relationships using optional sync token and domain filters (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Project container ID (UUID)' },
        syncToken: { type: 'string', description: 'Optional sync token for resuming sync' },
        filterDomains: {
          type: 'array',
          description: 'Optional array of domains to filter results (1-20 items)',
          items: { type: 'string' },
        },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'batch_relationships',
    description: 'Get relationships by UUIDs in batch (1-50, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Project container ID (UUID)' },
        relationshipIds: {
          type: 'array',
          description: 'Array of relationship UUIDs to retrieve (1-50 items)',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'relationshipIds'],
    },
  },
  {
    name: 'search_relationships',
    description: 'Search relationships by domain, type, entity ID with pagination (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Project container ID (UUID)' },
        domain: { type: 'string', description: 'Filter by entity domain' },
        type: { type: 'string', description: 'Filter by entity type' },
        id: { type: 'string', description: 'Filter by entity ID' },
        createdAfter: { type: 'string', description: 'Filter by creation date (ISO 8601)' },
        createdBefore: { type: 'string', description: 'Filter by creation date (ISO 8601)' },
        withDomain: { type: 'string', description: 'Filter by related entity domain' },
        withType: { type: 'string', description: 'Filter by related entity type' },
        withId: { type: 'string', description: 'Filter by related entity ID' },
        includeDeleted: { type: 'boolean', description: 'Include deleted relationships' },
        onlyDeleted: { type: 'boolean', description: 'Only return deleted relationships' },
        pageLimit: { type: 'number', description: 'Max results per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'intersect_relationships',
    description: 'Find relationships containing specified entities (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Project container ID (UUID)' },
        entities: {
          type: 'array',
          description: 'Entities to find relationships for (1-20 items)',
          items: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Entity domain' },
              type: { type: 'string', description: 'Entity type' },
              id: { type: 'string', description: 'Entity ID' },
            },
            required: ['domain', 'type', 'id'],
          },
        },
        withEntities: {
          type: 'array',
          description: 'Optional filter entities (1-20 items)',
          items: {
            type: 'object',
            properties: {
              domain: { type: 'string', description: 'Entity domain' },
              type: { type: 'string', description: 'Entity type' },
              id: { type: 'string', description: 'Entity ID' },
            },
          },
        },
        includeDeleted: { type: 'boolean', description: 'Include deleted relationships' },
        onlyDeleted: { type: 'boolean', description: 'Only return deleted relationships' },
        pageLimit: { type: 'number', description: 'Max results per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
      },
      required: ['containerId', 'entities'],
    },
  },
  {
    name: 'get_relationship',
    description: 'Get a specific relationship by ID (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Project container ID (UUID)' },
        relationshipId: { type: 'string', description: 'Relationship ID (UUID)' },
      },
      required: ['containerId', 'relationshipId'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleRelationshipTool(name, args) {
  const base = '/bim360/relationship/v2';

  switch (name) {
    case 'get_writable_relationships': {
      const data = await apiRequest('GET', `${base}/utility/relationships:writable`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_relationships': {
      const path = `${base}/containers/${args.containerId}/relationships`;
      const data = await apiRequest('PUT', path, args.relationships);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_relationships': {
      const path = `${base}/containers/${args.containerId}/relationships:delete`;
      const data = await apiRequest('POST', path, args.relationshipIds);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_relationship_sync_status': {
      const path = `${base}/containers/${args.containerId}/relationships:syncStatus`;
      const body = args.syncTokens || [];
      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'sync_relationships': {
      const path = `${base}/containers/${args.containerId}/relationships:sync`;
      const body = {};
      if (args.syncToken) body.syncToken = args.syncToken;
      if (args.filterDomains) body.filters = { domains: args.filterDomains };
      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'batch_relationships': {
      const path = `${base}/containers/${args.containerId}/relationships:batch`;
      const data = await apiRequest('POST', path, args.relationshipIds);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'search_relationships': {
      let path = `${base}/containers/${args.containerId}/relationships:search`;
      const params = [];
      if (args.domain) params.push(`domain=${encodeURIComponent(args.domain)}`);
      if (args.type) params.push(`type=${encodeURIComponent(args.type)}`);
      if (args.id) params.push(`id=${encodeURIComponent(args.id)}`);
      if (args.createdAfter) params.push(`createdAfter=${encodeURIComponent(args.createdAfter)}`);
      if (args.createdBefore) params.push(`createdBefore=${encodeURIComponent(args.createdBefore)}`);
      if (args.withDomain) params.push(`withDomain=${encodeURIComponent(args.withDomain)}`);
      if (args.withType) params.push(`withType=${encodeURIComponent(args.withType)}`);
      if (args.withId) params.push(`withId=${encodeURIComponent(args.withId)}`);
      if (args.includeDeleted !== undefined) params.push(`includeDeleted=${args.includeDeleted}`);
      if (args.onlyDeleted !== undefined) params.push(`onlyDeleted=${args.onlyDeleted}`);
      if (args.pageLimit) params.push(`pageLimit=${args.pageLimit}`);
      if (args.continuationToken) params.push(`continuationToken=${encodeURIComponent(args.continuationToken)}`);
      if (params.length > 0) path += `?${params.join('&')}`;
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'intersect_relationships': {
      let path = `${base}/containers/${args.containerId}/relationships:intersect`;
      const params = [];
      if (args.includeDeleted !== undefined) params.push(`includeDeleted=${args.includeDeleted}`);
      if (args.onlyDeleted !== undefined) params.push(`onlyDeleted=${args.onlyDeleted}`);
      if (args.pageLimit) params.push(`pageLimit=${args.pageLimit}`);
      if (args.continuationToken) params.push(`continuationToken=${encodeURIComponent(args.continuationToken)}`);
      if (params.length > 0) path += `?${params.join('&')}`;
      const body = { entities: args.entities };
      if (args.withEntities) body.withEntities = args.withEntities;
      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_relationship': {
      const path = `${base}/containers/${args.containerId}/relationships/${args.relationshipId}`;
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    default:
      return `Unknown relationship tool: ${name}`;
  }
}
