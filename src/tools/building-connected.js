/**
 * Building Connected tools — all use 3LO (user context required).
 *
 * Tools: list_bc_projects, get_bc_project, list_bc_opportunities, get_bc_opportunity
 */

import { apiRequest } from '../auth/router.js';

const BC_BASE = '/construction/buildingconnected/v2';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const buildingConnectedTools = [
  {
    name: 'list_bc_projects',
    description: 'List all Building Connected projects accessible to the current user',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max results per page (default 100)',
        },
      },
    },
  },
  {
    name: 'get_bc_project',
    description: 'Get details for a specific Building Connected project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Building Connected project ID',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_bc_opportunities',
    description: 'List Building Connected bid opportunities (bids sent or received)',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max results per page (default 100)',
        },
        offset: {
          type: 'number',
          description: 'Pagination offset (default 0)',
        },
        filterStatus: {
          type: 'string',
          description: 'Filter by opportunity status (e.g. active, awarded, lost)',
        },
      },
    },
  },
  {
    name: 'get_bc_opportunity',
    description: 'Get details for a specific Building Connected opportunity',
    inputSchema: {
      type: 'object',
      properties: {
        opportunityId: {
          type: 'string',
          description: 'Building Connected opportunity ID',
        },
      },
      required: ['opportunityId'],
    },
  },
  {
    name: 'list_bc_bid_packages',
    description: 'List bid packages in a Building Connected project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Building Connected project ID',
        },
        limit: {
          type: 'number',
          description: 'Max results per page (default 100)',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_bc_bid_package',
    description: 'Create a bid package in a Building Connected project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'Building Connected project ID',
        },
        number: {
          type: 'string',
          description: 'Bid package number / code (e.g. "1.1")',
        },
        title: {
          type: 'string',
          description: 'Bid package name / title',
        },
        instructions: {
          type: 'string',
          description: 'Optional scope / instructions shown to bidders (supports plain text)',
        },
      },
      required: ['projectId', 'number', 'title'],
    },
  },
  {
    name: 'create_bc_bid_form',
    description: 'Create a bid form with line items for a Building Connected bid package',
    inputSchema: {
      type: 'object',
      properties: {
        bidPackageId: {
          type: 'string',
          description: 'Building Connected bid package ID',
        },
        lineItems: {
          type: 'array',
          description: 'Line items for the bid form',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Line item description' },
              quantity: { type: 'number', description: 'Quantity (e.g. 8.93)' },
              unit: { type: 'string', description: 'Unit of measure (e.g. M3)' },
              code: { type: 'string', description: 'Classification code (e.g. A10)' },
              externalObject: {
                type: 'object',
                description: 'Link to an external tool (BuildingConnected does not use this data)',
                properties: {
                  id: { type: 'string', description: 'User-provided ID in the external tool (e.g. ACC Takeoff package ID)' },
                },
                required: ['id'],
              },
            },
            required: ['description'],
          },
        },
      },
      required: ['bidPackageId', 'lineItems'],
    },
  },
  {
    name: 'get_bc_bid_form',
    description: 'Get the bid form for a Building Connected bid package',
    inputSchema: {
      type: 'object',
      properties: {
        bidFormId: {
          type: 'string',
          description: 'Bid form ID',
        },
      },
      required: ['bidFormId'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleBuildingConnectedTool(name, args) {
  switch (name) {
    case 'list_bc_projects': {
      const { limit = 100 } = args;
      const params = new URLSearchParams({ limit });
      const data = await apiRequest('GET', `${BC_BASE}/projects?${params}`);
      return data;
    }

    case 'get_bc_project': {
      const { projectId } = args;
      const data = await apiRequest('GET', `${BC_BASE}/projects/${projectId}`);
      return data;
    }

    case 'list_bc_opportunities': {
      const { limit = 100, offset = 0, filterStatus } = args;
      const params = new URLSearchParams({ limit, offset });
      if (filterStatus) params.set('filter[status]', filterStatus);
      const data = await apiRequest('GET', `${BC_BASE}/opportunities?${params}`);
      return data;
    }

    case 'get_bc_opportunity': {
      const { opportunityId } = args;
      const data = await apiRequest('GET', `${BC_BASE}/opportunities/${opportunityId}`);
      return data;
    }

    case 'list_bc_bid_packages': {
      const { projectId, limit = 100 } = args;
      const params = new URLSearchParams({ limit });
      params.set('filter[projectId]', projectId);
      const data = await apiRequest('GET', `${BC_BASE}/bid-packages?${params}`);
      return data;
    }

    case 'create_bc_bid_package': {
      const { projectId, number, title, instructions } = args;
      const body = { projectId, number, name: title };
      if (instructions) body.instructions = instructions;
      const data = await apiRequest('POST', `${BC_BASE}/bid-packages`, body);
      return data;
    }

    case 'create_bc_bid_form': {
      const { bidPackageId, lineItems } = args;
      const normalized = (lineItems || []).map((li) => ({ type: 'COST_BREAKDOWN', ...li }));
      const data = await apiRequest(
        'POST',
        `${BC_BASE}/scope-specific-bid-forms`,
        { bidPackageId, lineItems: normalized }
      );
      return data;
    }

    case 'get_bc_bid_form': {
      const { bidFormId } = args;
      const data = await apiRequest('GET', `${BC_BASE}/bid-forms/${bidFormId}`);
      return data;
    }

    default:
      return `Unknown Building Connected tool: ${name}`;
  }
}
