/**
 * Takeoff tools — always use 3LO.
 *
 * Tools: get_takeoff_settings, update_takeoff_settings,
 *        list_takeoff_packages, get_takeoff_package, create_takeoff_package, update_takeoff_package,
 *        list_classification_systems, get_classification_system, list_classifications,
 *        create_classification_system, delete_classification_system, import_classifications,
 *        list_takeoff_types, get_takeoff_type,
 *        list_takeoff_items, get_takeoff_item,
 *        list_content_views
 *
 * ACC Takeoff API v1. Path shape:
 *   /construction/takeoff/v1/projects/{projectId}/...
 * projectId = bare UUID, b. prefix stripped via withoutBPrefix().
 *
 * List endpoints use offset/limit query params.
 * Responses have { results: [...], pagination: {...} }.
 */

import { apiRequest, withoutBPrefix } from '../auth/router.js';
import { paginate } from '../utils/paginate.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const takeoffTools = [
  // ── Settings ──────────────────────────────────────────────────────────────
  {
    name: 'get_takeoff_settings',
    description: 'Get project takeoff settings',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'update_takeoff_settings',
    description: 'Update project takeoff settings (e.g. measurement system)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        measurementSystem: {
          type: 'string',
          enum: ['METRIC', 'IMPERIAL'],
          description: 'Measurement system to use',
        },
      },
      required: ['projectId', 'measurementSystem'],
    },
  },

  // ── Packages ──────────────────────────────────────────────────────────────
  {
    name: 'list_takeoff_packages',
    description: 'List all takeoff packages in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_takeoff_package',
    description: 'Get a specific takeoff package by ID',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        packageId: { type: 'string', description: 'Package ID' },
      },
      required: ['projectId', 'packageId'],
    },
  },
  {
    name: 'create_takeoff_package',
    description: 'Create a new takeoff package',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Package name' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'update_takeoff_package',
    description: 'Update a takeoff package',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        packageId: { type: 'string', description: 'Package ID' },
        name: { type: 'string', description: 'New package name' },
      },
      required: ['projectId', 'packageId', 'name'],
    },
  },

  // ── Classification Systems ────────────────────────────────────────────────
  {
    name: 'list_classification_systems',
    description: 'List all classification systems in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_classification_system',
    description: 'Get a specific classification system by ID',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        systemId: { type: 'string', description: 'Classification system ID' },
      },
      required: ['projectId', 'systemId'],
    },
  },
  {
    name: 'list_classifications',
    description: 'List classifications in a classification system',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        systemId: { type: 'string', description: 'Classification system ID' },
      },
      required: ['projectId', 'systemId'],
    },
  },
  {
    name: 'create_classification_system',
    description: 'Create a new classification system with classifications',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'System name' },
        type: { type: 'string', description: 'System type' },
        classifications: {
          type: 'array',
          description: 'Array of classification objects with code, parentCode, description, measurementType',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              parentCode: { type: 'string' },
              description: { type: 'string' },
              measurementType: { type: 'string' },
            },
          },
        },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'delete_classification_system',
    description: 'Delete a classification system',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        systemId: { type: 'string', description: 'Classification system ID' },
      },
      required: ['projectId', 'systemId'],
    },
  },
  {
    name: 'import_classifications',
    description: 'Import classifications into an existing classification system',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        systemId: { type: 'string', description: 'Classification system ID' },
        name: { type: 'string', description: 'Import name' },
        classifications: {
          type: 'array',
          description: 'Array of classification objects with code, parentCode, description, measurementType',
          items: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              parentCode: { type: 'string' },
              description: { type: 'string' },
              measurementType: { type: 'string' },
            },
          },
        },
      },
      required: ['projectId', 'systemId', 'classifications'],
    },
  },

  // ── Takeoff Types ─────────────────────────────────────────────────────────
  {
    name: 'list_takeoff_types',
    description: 'List takeoff types in a package',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        packageId: { type: 'string', description: 'Package ID' },
      },
      required: ['projectId', 'packageId'],
    },
  },
  {
    name: 'get_takeoff_type',
    description: 'Get a specific takeoff type by ID',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        packageId: { type: 'string', description: 'Package ID' },
        takeoffTypeId: { type: 'string', description: 'Takeoff type ID' },
      },
      required: ['projectId', 'packageId', 'takeoffTypeId'],
    },
  },

  // ── Takeoff Items ─────────────────────────────────────────────────────────
  {
    name: 'list_takeoff_items',
    description: 'List takeoff items in a package',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        packageId: { type: 'string', description: 'Package ID' },
      },
      required: ['projectId', 'packageId'],
    },
  },
  {
    name: 'get_takeoff_item',
    description: 'Get a specific takeoff item by ID',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        packageId: { type: 'string', description: 'Package ID' },
        takeoffItemId: { type: 'string', description: 'Takeoff item ID' },
      },
      required: ['projectId', 'packageId', 'takeoffItemId'],
    },
  },

  // ── Content Views ─────────────────────────────────────────────────────────
  {
    name: 'list_content_views',
    description: 'List content views in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleTakeoffTool(name, args) {
  const pid = withoutBPrefix(args.projectId);
  const base = `/construction/takeoff/v1/projects/${pid}`;

  switch (name) {
    // ── Settings ────────────────────────────────────────────────────────────
    case 'get_takeoff_settings': {
      const data = await apiRequest('GET', `${base}/settings`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_takeoff_settings': {
      const body = { measurementSystem: args.measurementSystem };
      const data = await apiRequest('PATCH', `${base}/settings`, body);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Packages ────────────────────────────────────────────────────────────
    case 'list_takeoff_packages': {
      const items = await paginate(async (offset, pageSize) => {
        const data = await apiRequest(
          'GET',
          `${base}/packages?offset=${offset}&limit=${pageSize}`,
        );
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);
      return items;
    }

    case 'get_takeoff_package': {
      const data = await apiRequest('GET', `${base}/packages/${args.packageId}`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_takeoff_package': {
      const body = { name: args.name };
      const data = await apiRequest('POST', `${base}/packages`, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_takeoff_package': {
      const body = { name: args.name };
      const data = await apiRequest('PATCH', `${base}/packages/${args.packageId}`, body);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Classification Systems ──────────────────────────────────────────────
    case 'list_classification_systems': {
      const items = await paginate(async (offset, pageSize) => {
        const data = await apiRequest(
          'GET',
          `${base}/classification-systems?offset=${offset}&limit=${pageSize}`,
        );
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);
      return items;
    }

    case 'get_classification_system': {
      const data = await apiRequest('GET', `${base}/classification-systems/${args.systemId}`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_classifications': {
      const items = await paginate(async (offset, pageSize) => {
        const data = await apiRequest(
          'GET',
          `${base}/classification-systems/${args.systemId}/classifications?offset=${offset}&limit=${pageSize}`,
        );
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);
      return items;
    }

    case 'create_classification_system': {
      const body = { name: args.name };
      if (args.type)            body.type = args.type;
      if (args.classifications) body.classifications = args.classifications;
      const data = await apiRequest('POST', `${base}/classification-systems`, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_classification_system': {
      const data = await apiRequest('DELETE', `${base}/classification-systems/${args.systemId}`);
      if (data === null) return { success: true, message: 'Classification system deleted' };
      if (typeof data === 'string') return data;
      return data;
    }

    case 'import_classifications': {
      const body = { classifications: args.classifications };
      if (args.name) body.name = args.name;
      const data = await apiRequest(
        'POST',
        `${base}/classification-systems/${args.systemId}/classifications:import`,
        body,
      );
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Takeoff Types ───────────────────────────────────────────────────────
    case 'list_takeoff_types': {
      const items = await paginate(async (offset, pageSize) => {
        const data = await apiRequest(
          'GET',
          `${base}/packages/${args.packageId}/takeoff-types?offset=${offset}&limit=${pageSize}`,
        );
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);
      return items;
    }

    case 'get_takeoff_type': {
      const data = await apiRequest(
        'GET',
        `${base}/packages/${args.packageId}/takeoff-types/${args.takeoffTypeId}`,
      );
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Takeoff Items ───────────────────────────────────────────────────────
    case 'list_takeoff_items': {
      const items = await paginate(async (offset, pageSize) => {
        const data = await apiRequest(
          'GET',
          `${base}/packages/${args.packageId}/takeoff-items?offset=${offset}&limit=${pageSize}`,
        );
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);
      return items;
    }

    case 'get_takeoff_item': {
      const data = await apiRequest(
        'GET',
        `${base}/packages/${args.packageId}/takeoff-items/${args.takeoffItemId}`,
      );
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Content Views ───────────────────────────────────────────────────────
    case 'list_content_views': {
      const items = await paginate(async (offset, pageSize) => {
        const data = await apiRequest(
          'GET',
          `${base}/content-views?offset=${offset}&limit=${pageSize}`,
        );
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);
      return items;
    }

    default:
      return `Unknown takeoff tool: ${name}`;
  }
}
