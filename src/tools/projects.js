/**
 * Projects tools — all use 2LO.
 *
 * Tools: get_hubs, get_projects
 */

import { apiRequest } from '../auth/router.js';
import { paginate } from '../utils/paginate.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const projectTools = [
  {
    name: 'get_hubs',
    description: 'Get all accessible Autodesk hubs (BIM 360 / ACC accounts)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_projects',
    description: 'Get all projects within a hub',
    inputSchema: {
      type: 'object',
      properties: {
        hubId: {
          type: 'string',
          description: 'Hub ID (from get_hubs)',
        },
      },
      required: ['hubId'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleProjectTool(name, args) {
  switch (name) {
    case 'get_hubs': {
      const data = await apiRequest('GET', '/project/v1/hubs');
      if (typeof data === 'string') return data;
      return (data.data || []).map((h) => ({
        id: h.id,
        name: h.attributes?.name,
        region: h.attributes?.region,
      }));
    }

    case 'get_projects': {
      const { hubId } = args;
      return paginate(async (offset, limit) => {
        const data = await apiRequest('GET',
          `/project/v1/hubs/${hubId}/projects?page[number]=${offset}&page[limit]=${limit}`
        );
        if (typeof data === 'string') return [];
        return (data.data || []).map((p) => ({
          id: p.id,
          name: p.attributes?.name,
          status: p.attributes?.status,
        }));
      }, 100);
    }

    default:
      return `Unknown project tool: ${name}`;
  }
}
