import { apiRequest, withoutBPrefix } from '../auth/router.js';

const BASE = '/construction/autospecs/v1';

export const autospecsTools = [
  {
    name: 'get_autospecs_metadata',
    description: 'Get AutoSpecs project metadata including region and available versions.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ACC project ID (with or without b. prefix)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_autospecs_smartregister',
    description: 'Get the AutoSpecs submittal log (smartregister) for a specific spec version.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ACC project ID (with or without b. prefix)' },
        versionId: { type: 'string', description: 'AutoSpecs version ID' },
      },
      required: ['projectId', 'versionId'],
    },
  },
  {
    name: 'get_autospecs_requirements',
    description: 'Get AutoSpecs requirements (division/spec section/submittal group counts) for a version.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ACC project ID (with or without b. prefix)' },
        versionId: { type: 'string', description: 'AutoSpecs version ID' },
      },
      required: ['projectId', 'versionId'],
    },
  },
  {
    name: 'get_autospecs_summary',
    description: 'Get AutoSpecs submittals summary with type breakdowns for a version.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ACC project ID (with or without b. prefix)' },
        versionId: { type: 'string', description: 'AutoSpecs version ID' },
      },
      required: ['projectId', 'versionId'],
    },
  },
];

export async function handleAutospecsTool(name, args) {
  const pid = withoutBPrefix(args.projectId);

  switch (name) {
    case 'get_autospecs_metadata':
      return apiRequest('GET', `${BASE}/projects/${pid}/metadata`);

    case 'get_autospecs_smartregister':
      return apiRequest('GET', `${BASE}/projects/${pid}/version/${args.versionId}/smartregister`);

    case 'get_autospecs_requirements':
      return apiRequest('GET', `${BASE}/projects/${pid}/version/${args.versionId}/requirements`);

    case 'get_autospecs_summary':
      return apiRequest('GET', `${BASE}/projects/${pid}/version/${args.versionId}/submittalsSummary`);

    default:
      return `Unknown autospecs tool: ${name}`;
  }
}
