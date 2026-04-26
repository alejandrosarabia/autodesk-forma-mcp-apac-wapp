/**
 * RFIs tools — always use 3LO.
 *
 * Tools: list_rfis, get_rfi, create_rfi, update_rfi, add_rfi_response,
 *        list_rfi_types, list_rfi_attributes, get_next_rfi_custom_identifier,
 *        search_rfis
 *
 * ACC RFIs API v3. Path shape:
 *   /construction/rfis/v3/projects/{projectId}/...
 * projectId = bare UUID, b. prefix stripped via withoutBPrefix().
 */

import { apiRequest, withoutBPrefix } from '../auth/router.js';
import { paginate } from '../utils/paginate.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const rfiTools = [
  {
    name: 'list_rfis',
    description: 'List RFIs in a project with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        status: {
          type: 'string',
          description: 'Filter by status (e.g. open, closed, draft, void)',
        },
        assignedTo: { type: 'string', description: 'Filter by assigned user ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_rfi',
    description: 'Get a single RFI by ID',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        rfiId: { type: 'string' },
      },
      required: ['projectId', 'rfiId'],
    },
  },
  {
    name: 'create_rfi',
    description: 'Create a new RFI in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string', description: 'RFI title/subject line' },
        question: { type: 'string', description: 'RFI question body' },
        status: { type: 'string', description: 'Initial status (e.g. draft, open). Defaults to draft.' },
        suggestedAnswer: { type: 'string', description: 'Suggested answer text' },
        rfiTypeId: { type: 'string', description: 'RFI type ID from list_rfi_types' },
        customIdentifier: { type: 'string', description: 'Custom RFI number (e.g. RFI-001). Use get_next_rfi_custom_identifier to get the next available value.' },
        assignedTo: {
          type: 'array',
          description: 'Array of assignees. Each: { id (Autodesk user ID), type ("user") }',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string', enum: ['user'] },
            },
            required: ['id', 'type'],
          },
        },
        customAttributes: {
          type: 'array',
          description: 'Custom attribute values. Each: { id (attributeDefinitionId), values: [string] }',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              values: { type: 'array', items: { type: 'string' } },
            },
            required: ['id', 'values'],
          },
        },
        dueDate: { type: 'string', description: 'ISO 8601 date string' },
        costImpact: { type: 'string', description: 'Cost impact description' },
        scheduleImpact: { type: 'string', description: 'Schedule impact description' },
      },
      required: ['projectId', 'title', 'question'],
    },
  },
  {
    name: 'update_rfi',
    description: 'Update fields on an existing RFI (use for transitions too — set status field)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        rfiId: { type: 'string' },
        fields: {
          type: 'object',
          description: 'Fields to update: title, question, status, assignedTo, dueDate, suggestedAnswer, officialResponse, officialResponseStatus, attachments',
        },
      },
      required: ['projectId', 'rfiId', 'fields'],
    },
  },
  {
    name: 'add_rfi_comment',
    description: 'Add a comment to an RFI',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        rfiId: { type: 'string' },
        body: { type: 'string', description: 'Comment text' },
      },
      required: ['projectId', 'rfiId', 'body'],
    },
  },
  {
    name: 'add_rfi_response',
    description: 'Submit a response to an RFI (used for reviewer/manager responses)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        rfiId: { type: 'string' },
        status: { type: 'string', description: 'Response status (e.g. answered, notAnswered)' },
        text: { type: 'string', description: 'Response text body' },
        onBehalf: {
          type: 'object',
          description: 'Optional: respond on behalf of another user. { id, type: "user" }',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
          },
        },
        attachments: {
          type: 'array',
          description: 'File attachments. Each: { attachmentType, displayName, fileName, storageUrn }',
          items: {
            type: 'object',
            properties: {
              attachmentType: { type: 'string' },
              displayName: { type: 'string' },
              fileName: { type: 'string' },
              storageUrn: { type: 'string' },
            },
            required: ['displayName', 'fileName', 'storageUrn'],
          },
        },
      },
      required: ['projectId', 'rfiId', 'status', 'text'],
    },
  },
  {
    name: 'list_rfi_types',
    description: 'List available RFI types for a project (needed for create_rfi rfiTypeId)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_rfi_attributes',
    description: 'List custom attribute definitions for RFIs in a project (needed for create_rfi customAttributes)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_next_rfi_custom_identifier',
    description: 'Get the next available custom RFI identifier (e.g. RFI-042) for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'search_rfis',
    description: 'Search RFIs using advanced filters (POST search)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        filter: {
          type: 'object',
          description: 'Filter criteria: status, assignedTo, rfiTypeId, createdBy, etc.',
        },
        sort: {
          type: 'array',
          description: 'Sort fields. Each: { field, direction: "asc"|"desc" }',
          items: { type: 'object' },
        },
        limit: { type: 'number', description: 'Max results to return (default 50)' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: ['projectId'],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRfi(rfi) {
  const a = rfi.attributes || rfi;
  return {
    id: rfi.id || a.id,
    title: a.title || a.subject,
    status: a.status,
    assignedTo: a.assignedTo,
    dueDate: a.dueDate,
    createdAt: a.createdAt,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleRfiTool(name, args) {
  const pid = withoutBPrefix(args.projectId);
  const base = `/construction/rfis/v3/projects/${pid}`;

  switch (name) {
    case 'list_rfis': {
      const { status, assignedTo } = args;

      const items = await paginate(async (offset, pageSize) => {
        const params = new URLSearchParams({ offset: String(offset), limit: String(pageSize) });
        if (status)     params.set('filter[status]', status);
        if (assignedTo) params.set('filter[assignedTo]', assignedTo);

        const data = await apiRequest('GET', `${base}/rfis?${params.toString()}`);
        if (typeof data === 'string') throw new Error(data);
        return data.results || data.data || [];
      }, 50);

      return items.map(mapRfi);
    }

    case 'get_rfi': {
      return apiRequest('GET', `${base}/rfis/${args.rfiId}`);
    }

    case 'create_rfi': {
      const { title, question, status, suggestedAnswer, rfiTypeId, customIdentifier,
              assignedTo, customAttributes, dueDate, costImpact, scheduleImpact } = args;
      const body = { title, question, status: status || 'draft' };
      if (suggestedAnswer)    body.suggestedAnswer = suggestedAnswer;
      if (rfiTypeId)          body.rfiTypeId = rfiTypeId;
      if (customIdentifier)   body.customIdentifier = customIdentifier;
      if (assignedTo)         body.assignedTo = assignedTo;
      if (customAttributes)   body.customAttributes = customAttributes;
      if (dueDate)            body.dueDate = dueDate;
      if (costImpact)         body.costImpact = costImpact;
      if (scheduleImpact)     body.scheduleImpact = scheduleImpact;

      return apiRequest('POST', `${base}/rfis`, body);
    }

    case 'update_rfi': {
      return apiRequest('PATCH', `${base}/rfis/${args.rfiId}`, args.fields);
    }

    case 'add_rfi_comment': {
      return apiRequest('POST', `${base}/rfis/${args.rfiId}/comments`, { body: args.body });
    }

    case 'add_rfi_response': {
      const { rfiId, status, text, onBehalf, attachments } = args;
      const body = { status, text };
      if (onBehalf)    body.onBehalf = onBehalf;
      if (attachments) body.attachments = attachments;

      return apiRequest('POST', `${base}/rfis/${rfiId}/responses`, body);
    }

    case 'list_rfi_types': {
      return apiRequest('GET', `${base}/rfi-types`);
    }

    case 'list_rfi_attributes': {
      return apiRequest('GET', `${base}/attributes`);
    }

    case 'get_next_rfi_custom_identifier': {
      return apiRequest('GET', `${base}/custom-identifier`);
    }

    case 'search_rfis': {
      const body = {};
      if (args.filter) body.filter = args.filter;
      if (args.sort)   body.sort = args.sort;
      if (args.limit)  body.limit = args.limit;
      if (args.offset !== undefined) body.offset = args.offset;

      return apiRequest('POST', `${base}/rfis:search`, body);
    }

    default:
      return `Unknown RFI tool: ${name}`;
  }
}
