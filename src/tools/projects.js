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
    description: 'Get all projects within a hub. When the user is looking for a specific project, ALWAYS pass nameFilter — hubs can have thousands of projects and returning them all is slow and gets truncated.',
    inputSchema: {
      type: 'object',
      properties: {
        hubId: {
          type: 'string',
          description: 'Hub ID (from get_hubs)',
        },
        nameFilter: {
          type: 'string',
          description: 'Optional case-insensitive substring to filter project names. Strongly recommended when searching for a specific project (e.g. "Alejandro" returns only projects whose name contains "Alejandro").',
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
      const { hubId, nameFilter } = args;
      const all = await paginate(async (offset, limit) => {
        // Autodesk uses 0-based PAGE numbers, not offsets. paginate() advances
        // offset by `limit` each call, so offset/limit gives the page number.
        const pageNumber = offset / limit;
        const data = await apiRequest('GET',
          `/project/v1/hubs/${hubId}/projects?page[number]=${pageNumber}&page[limit]=${limit}`
        );
        if (typeof data === 'string') return [];
        return (data.data || []).map((p) => ({
          id: p.id,
          name: p.attributes?.name,
          status: p.attributes?.status,
        }));
      }, 200); // 200 is the API's max page[limit]

      if (nameFilter) {
        const needle = nameFilter.toLowerCase();
        return all.filter((p) => (p.name || '').toLowerCase().includes(needle));
      }
      return all;
    }

    default:
      return `Unknown project tool: ${name}`;
  }
}
