/**
 * Issues tools — always use 3LO.
 *
 * Tools: list_issues, get_issue, create_issue, update_issue,
 *        list_issue_comments, add_issue_comment, list_issue_types,
 *        get_issue_profile,
 *        list_issue_attribute_definitions, list_issue_attribute_mappings,
 *        list_issue_root_cause_categories,
 *        create_issue_attachment, delete_issue_attachment, list_issue_attachments
 *
 * ACC Issues API v1. Path shape:
 *   /construction/issues/v1/projects/{projectId}/...
 * projectId = bare UUID, b. prefix stripped via withoutBPrefix().
 *
 * Response objects are flat (no .attributes wrapper).
 * create_issue requires issueSubtypeId (not the parent type id).
 */

import { apiRequest, withoutBPrefix } from '../auth/router.js';
import { paginate } from '../utils/paginate.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const issueTools = [
  {
    name: 'list_issues',
    description: 'List issues in a project with optional filters. Fetches all pages by default; use limit to cap results.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        limit: { type: 'number', description: 'Max results to return (default: all pages)' },
        offset: { type: 'number', description: 'Pagination offset' },
        filter_status: { type: 'string', description: 'Filter by status (comma-separated). Values: draft, open, pending, in_progress, completed, in_review, not_approved, in_dispute, closed' },
        filter_id: { type: 'string', description: 'Filter by issue ID(s) (comma-separated UUIDs)' },
        filter_issueTypeId: { type: 'string', description: 'Filter by issue category ID(s) (comma-separated)' },
        filter_issueSubtypeId: { type: 'string', description: 'Filter by issue type ID(s) (comma-separated)' },
        filter_assignedTo: { type: 'string', description: 'Filter by assignee Autodesk ID(s) (comma-separated)' },
        filter_assignedToType: { type: 'string', description: 'Filter by assignee type: user, company, role, null' },
        filter_rootCauseId: { type: 'string', description: 'Filter by root cause ID(s) (comma-separated)' },
        filter_locationId: { type: 'string', description: 'Filter by location ID(s) — exact match only (comma-separated)' },
        filter_subLocationId: { type: 'string', description: 'Filter by location ID(s) including sub-locations (comma-separated)' },
        filter_linkedDocumentUrn: { type: 'string', description: 'Filter pushpin issues by file item ID(s) (comma-separated, URL-encoded)' },
        filter_dueDate: { type: 'string', description: 'Filter by due date or range (YYYY-MM-DD or YYYY-MM-DD..YYYY-MM-DD)' },
        filter_startDate: { type: 'string', description: 'Filter by start date or range (YYYY-MM-DD or YYYY-MM-DD..YYYY-MM-DD)' },
        filter_createdAt: { type: 'string', description: 'Filter by creation date/range (ISO 8601)' },
        filter_createdBy: { type: 'string', description: 'Filter by creator Autodesk ID(s) (comma-separated)' },
        filter_updatedAt: { type: 'string', description: 'Filter by last updated date/range (ISO 8601)' },
        filter_updatedBy: { type: 'string', description: 'Filter by updater Autodesk ID(s) (comma-separated)' },
        filter_closedBy: { type: 'string', description: 'Filter by closer Autodesk ID(s) (comma-separated)' },
        filter_closedAt: { type: 'string', description: 'Filter by closed date/range (ISO 8601)' },
        filter_deleted: { type: 'boolean', description: 'true = only deleted issues, false = only undeleted (default false)' },
        filter_valid: { type: 'boolean', description: 'true = only issues with valid type/subtype' },
        filter_search: { type: 'string', description: 'Search by title or display ID' },
        filter_displayId: { type: 'number', description: 'Filter by display ID(s) (comma-separated)' },
        sortBy: { type: 'string', description: 'Sort field(s), comma-separated. Prefix with - for descending. E.g. "status,-displayId"' },
        fields: { type: 'string', description: 'Return only specific fields (comma-separated). Always includes id, title, status, issueTypeId.' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_issue',
    description: 'Get a single issue by ID',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        issueId: { type: 'string' },
      },
      required: ['projectId', 'issueId'],
    },
  },
  {
    name: 'create_issue',
    description: 'Create a new issue in a project. issueSubtypeId and status are required by the API.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string', description: 'Issue title (max 100 chars)' },
        issueSubtypeId: { type: 'string', description: 'Issue subtype (type) ID — from list_issue_types, use a subtype id not the parent type id' },
        status: {
          type: 'string',
          enum: ['draft', 'open', 'pending', 'in_progress', 'completed', 'in_review', 'not_approved', 'in_dispute', 'closed'],
          description: 'Issue status. Use "draft" to skip required-field validation.',
        },
        description: { type: 'string', description: 'Brief description (max 1000 chars)' },
        assignedTo: { type: 'string', description: 'Autodesk ID of the assignee (short uppercase string, e.g. A3RGM375QTZ7)' },
        assignedToType: { type: 'string', enum: ['user', 'company', 'role'], description: 'Type of assignee — required if assignedTo is set' },
        dueDate: { type: 'string', description: 'Due date in ISO 8601 format (YYYY-MM-DD)' },
        startDate: { type: 'string', description: 'Start date in ISO 8601 format (YYYY-MM-DD)' },
        locationId: { type: 'string', description: 'LBS location UUID' },
        locationDetails: { type: 'string', description: 'Location as plain text (max 250 chars)' },
        rootCauseId: { type: 'string', description: 'Root cause UUID — from list_issue_root_cause_categories' },
        published: { type: 'boolean', description: 'Whether the issue is published (default false)' },
        watchers: { type: 'array', items: { type: 'string' }, description: 'Autodesk IDs of watchers to assign' },
        customAttributes: {
          type: 'array',
          description: 'Custom attribute values',
          items: {
            type: 'object',
            properties: {
              attributeDefinitionId: { type: 'string', description: 'Custom attribute definition UUID' },
              value: { description: 'Attribute value (string, number, or null)' },
            },
            required: ['attributeDefinitionId', 'value'],
          },
        },
        gpsCoordinates: {
          type: 'object',
          description: 'GPS location of the issue',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
          },
        },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'update_issue',
    description: 'Update fields on an existing issue. Pass any updatable fields in the fields object.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        issueId: { type: 'string' },
        fields: {
          type: 'object',
          description: 'Fields to update. Supported: title, description, issueSubtypeId, status, assignedTo, assignedToType, dueDate, startDate, locationId, locationDetails, rootCauseId, published, watchers (array of Autodesk IDs), customAttributes (array of {attributeDefinitionId, value}), gpsCoordinates ({latitude, longitude})',
        },
      },
      required: ['projectId', 'issueId', 'fields'],
    },
  },
  {
    name: 'list_issue_comments',
    description: 'List all comments on an issue',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        issueId: { type: 'string' },
        sortBy: { type: 'string', description: 'Sort by field(s), comma-separated. Prefix - for descending. Values: createdAt, updatedAt, createdBy' },
        limit: { type: 'number', description: 'Results per page' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: ['projectId', 'issueId'],
    },
  },
  {
    name: 'add_issue_comment',
    description: 'Add a comment to an issue',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        issueId: { type: 'string' },
        body: { type: 'string', description: 'Comment text' },
      },
      required: ['projectId', 'issueId', 'body'],
    },
  },
  {
    name: 'list_issue_types',
    description: 'List issue categories (types) for a project. By default includes subtypes — pass include="subtypes" explicitly or omit (default). Pass a subtype id to create_issue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        include: { type: 'string', description: 'Pass "subtypes" to include subtypes (default behavior)' },
        limit: { type: 'number', description: 'Results per page' },
        offset: { type: 'number', description: 'Pagination offset' },
        filter_isActive: { type: 'boolean', description: 'Filter by active status (true/false). Default: both.' },
        filter_updatedAt: { type: 'string', description: 'Filter by last updated date/range (ISO 8601)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_issue_profile',
    description: "Retrieve the current user's permissions for issues in a project — permitted actions, attributes, statuses, and permission levels (create/read/write).",
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, b. prefix optional)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_issue_attribute_definitions',
    description: 'Retrieve issue custom attribute (custom field) definitions for a project — title, description, dataType (list/text/paragraph/numeric), and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, b. prefix optional)' },
        limit: { type: 'number', description: 'Results per page (1–200, default 200)' },
        offset: { type: 'number', description: 'Pagination offset' },
        filter_createdAt: { type: 'string', description: 'Filter by creation date/range (ISO 8601)' },
        filter_updatedAt: { type: 'string', description: 'Filter by last updated date/range (ISO 8601)' },
        filter_deletedAt: { type: 'string', description: 'Filter by deletion date/range (ISO 8601). Include null to also get non-deleted.' },
        filter_dataType: { type: 'string', description: 'Filter by data type: list, text, paragraph, numeric (comma-separated)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_issue_attribute_mappings',
    description: 'Retrieve issue custom attribute mappings — which custom fields are assigned to which issue categories (issueType) or issue types (issueSubtype).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, b. prefix optional)' },
        limit: { type: 'number', description: 'Results per page (1–200, default 200)' },
        offset: { type: 'number', description: 'Pagination offset' },
        filter_createdAt: { type: 'string', description: 'Filter by creation date/range (ISO 8601)' },
        filter_updatedAt: { type: 'string', description: 'Filter by last updated date/range (ISO 8601)' },
        filter_deletedAt: { type: 'string', description: 'Filter by deletion date/range (ISO 8601)' },
        filter_attributeDefinitionId: { type: 'string', description: 'Filter by attribute definition ID(s) (comma-separated)' },
        filter_mappedItemId: { type: 'string', description: 'Filter by mapped item ID(s) — project, type, or subtype (comma-separated)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_issue_root_cause_categories',
    description: 'Retrieve supported root cause categories (and optionally their root causes) that can be assigned to an issue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, b. prefix optional)' },
        include: { type: 'string', description: 'Pass "rootcauses" to include root causes nested under each category' },
        limit: { type: 'number', description: 'Results per page' },
        offset: { type: 'number', description: 'Pagination offset' },
        filter_updatedAt: { type: 'string', description: 'Filter by last updated date/range (ISO 8601)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_issue_attachment',
    description: 'Link one or more OSS-uploaded files to an issue as attachments. Each attachment requires an OSS storageUrn. Max 100 attachments per issue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, b. prefix optional)' },
        issueId: { type: 'string', description: 'UUID of the issue to attach files to (domainEntityId)' },
        attachments: {
          type: 'array',
          description: 'List of files to attach',
          items: {
            type: 'object',
            properties: {
              attachmentId: { type: 'string', description: 'Client-assigned UUID for this attachment (recommended: use the OSS storage GUID)' },
              displayName: { type: 'string', description: 'Human-readable filename shown in the UI, including extension (e.g. "photo.jpg")' },
              fileName: { type: 'string', description: 'Filename as stored in OSS, typically {attachmentId}.{ext}' },
              storageUrn: { type: 'string', description: 'OSS URN of the uploaded file' },
            },
            required: ['attachmentId', 'displayName', 'fileName', 'storageUrn'],
          },
        },
      },
      required: ['projectId', 'issueId', 'attachments'],
    },
  },
  {
    name: 'delete_issue_attachment',
    description: 'Delete a specific attachment from an issue. Returns null on success (204).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, b. prefix optional)' },
        issueId: { type: 'string', description: 'UUID of the issue' },
        attachmentId: { type: 'string', description: 'UUID of the attachment to delete' },
      },
      required: ['projectId', 'issueId', 'attachmentId'],
    },
  },
  {
    name: 'list_issue_attachments',
    description: 'Retrieve all attachments for a specific issue — returns attachment metadata including storageUrn, fileSize, fileType, and createdBy.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, b. prefix optional)' },
        issueId: { type: 'string', description: 'UUID of the issue' },
      },
      required: ['projectId', 'issueId'],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ISSUE_FILTER_KEYS = [
  'filter_status', 'filter_id', 'filter_issueTypeId', 'filter_issueSubtypeId',
  'filter_assignedTo', 'filter_assignedToType', 'filter_rootCauseId',
  'filter_locationId', 'filter_subLocationId', 'filter_linkedDocumentUrn',
  'filter_dueDate', 'filter_startDate',
  'filter_createdAt', 'filter_createdBy', 'filter_updatedAt', 'filter_updatedBy',
  'filter_closedBy', 'filter_closedAt',
  'filter_deleted', 'filter_valid', 'filter_search', 'filter_displayId',
  'sortBy', 'fields',
];

function buildIssueFilters(args) {
  const params = new URLSearchParams();
  for (const key of ISSUE_FILTER_KEYS) {
    if (args[key] !== undefined) {
      // Map filter_xxx schema key -> filter[xxx] URL param
      const urlKey = key.startsWith('filter_') ? key.replace('filter_', 'filter[') + ']' : key;
      params.set(urlKey, args[key]);
    }
  }
  const qs = params.toString();
  return qs ? `&${qs}` : '';
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleIssueTool(name, args) {
  const pid = withoutBPrefix(args.projectId);
  const base = `/construction/issues/v1/projects/${pid}`;

  switch (name) {
    case 'list_issues': {
      const { limit } = args;
      const filters = buildIssueFilters(args);

      const items = await paginate(async (offset, pageSize) => {
        const data = await apiRequest(
          'GET',
          `${base}/issues?offset=${offset}&limit=${pageSize}${filters}`,
        );
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);

      return limit ? items.slice(0, limit) : items;
    }

    case 'get_issue': {
      const data = await apiRequest('GET', `${base}/issues/${args.issueId}`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_issue': {
      const {
        title, description, issueSubtypeId, status,
        assignedTo, assignedToType,
        dueDate, startDate, locationId, locationDetails,
        rootCauseId, published, watchers, customAttributes, gpsCoordinates,
      } = args;
      const body = { title, status: status || 'open' };
      if (issueSubtypeId)   body.issueSubtypeId = issueSubtypeId;
      if (description)      body.description = description;
      if (assignedTo)       { body.assignedTo = assignedTo; body.assignedToType = assignedToType || 'user'; }
      if (dueDate)          body.dueDate = dueDate;
      if (startDate)        body.startDate = startDate;
      if (locationId)       body.locationId = locationId;
      if (locationDetails)  body.locationDetails = locationDetails;
      if (rootCauseId)      body.rootCauseId = rootCauseId;
      if (published !== undefined) body.published = published;
      if (watchers)         body.watchers = watchers;
      if (customAttributes) body.customAttributes = customAttributes;
      if (gpsCoordinates)   body.gpsCoordinates = gpsCoordinates;

      return apiRequest('POST', `${base}/issues`, body);
    }

    case 'update_issue': {
      return apiRequest('PATCH', `${base}/issues/${args.issueId}`, args.fields);
    }

    case 'list_issue_comments': {
      const params = new URLSearchParams();
      if (args.sortBy) params.set('sortBy', args.sortBy);
      if (args.limit !== undefined) params.set('limit', args.limit);
      if (args.offset !== undefined) params.set('offset', args.offset);
      const qs = params.toString();
      const data = await apiRequest('GET', `${base}/issues/${args.issueId}/comments${qs ? `?${qs}` : ''}`);
      if (typeof data === 'string') return data;
      return data.results || data;
    }

    case 'add_issue_comment': {
      const data = await apiRequest(
        'POST',
        `${base}/issues/${args.issueId}/comments`,
        { body: args.body },
      );
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_issue_types': {
      const params = new URLSearchParams();
      // Default to including subtypes unless caller explicitly passes something else
      params.set('include', args.include ?? 'subtypes');
      if (args.limit !== undefined) params.set('limit', args.limit);
      if (args.offset !== undefined) params.set('offset', args.offset);
      if (args['filter_isActive'] !== undefined) params.set('filter[isActive]', args['filter_isActive']);
      if (args['filter_updatedAt']) params.set('filter[updatedAt]', args['filter_updatedAt']);
      const data = await apiRequest('GET', `${base}/issue-types?${params.toString()}`);
      if (typeof data === 'string') return data;
      const types = data.results || data.data || [];
      return types.map((t) => ({
        typeId: t.id,
        typeTitle: t.title,
        isActive: t.isActive,
        subtypes: (t.subtypes || []).map((s) => ({ id: s.id, title: s.title, isActive: s.isActive })),
      }));
    }

    case 'get_issue_profile': {
      return apiRequest('GET', `${base}/users/me`);
    }

    case 'list_issue_attribute_definitions': {
      const params = new URLSearchParams();
      if (args.limit !== undefined) params.set('limit', args.limit);
      if (args.offset !== undefined) params.set('offset', args.offset);
      if (args['filter_createdAt']) params.set('filter[createdAt]', args['filter_createdAt']);
      if (args['filter_updatedAt']) params.set('filter[updatedAt]', args['filter_updatedAt']);
      if (args['filter_deletedAt']) params.set('filter[deletedAt]', args['filter_deletedAt']);
      if (args['filter_dataType']) params.set('filter[dataType]', args['filter_dataType']);
      const qs = params.toString();
      return apiRequest('GET', `${base}/issue-attribute-definitions${qs ? `?${qs}` : ''}`);
    }

    case 'list_issue_attribute_mappings': {
      const params = new URLSearchParams();
      if (args.limit !== undefined) params.set('limit', args.limit);
      if (args.offset !== undefined) params.set('offset', args.offset);
      if (args['filter_createdAt']) params.set('filter[createdAt]', args['filter_createdAt']);
      if (args['filter_updatedAt']) params.set('filter[updatedAt]', args['filter_updatedAt']);
      if (args['filter_deletedAt']) params.set('filter[deletedAt]', args['filter_deletedAt']);
      if (args['filter_attributeDefinitionId']) params.set('filter[attributeDefinitionId]', args['filter_attributeDefinitionId']);
      if (args['filter_mappedItemId']) params.set('filter[mappedItemId]', args['filter_mappedItemId']);
      const qs = params.toString();
      return apiRequest('GET', `${base}/issue-attribute-mappings${qs ? `?${qs}` : ''}`);
    }

    case 'list_issue_root_cause_categories': {
      const params = new URLSearchParams();
      if (args.include) params.set('include', args.include);
      if (args.limit !== undefined) params.set('limit', args.limit);
      if (args.offset !== undefined) params.set('offset', args.offset);
      if (args['filter_updatedAt']) params.set('filter[updatedAt]', args['filter_updatedAt']);
      const qs = params.toString();
      return apiRequest('GET', `${base}/issue-root-cause-categories${qs ? `?${qs}` : ''}`);
    }

    case 'create_issue_attachment': {
      const body = {
        domainEntityId: args.issueId,
        attachments: args.attachments.map((a) => ({
          attachmentId: a.attachmentId,
          displayName: a.displayName,
          fileName: a.fileName,
          attachmentType: 'issue-attachment',
          storageUrn: a.storageUrn,
        })),
      };
      return apiRequest('POST', `${base}/attachments`, body);
    }

    case 'delete_issue_attachment': {
      return apiRequest('DELETE', `${base}/attachments/${args.issueId}/items/${args.attachmentId}`);
    }

    case 'list_issue_attachments': {
      return apiRequest('GET', `${base}/attachments/${args.issueId}/items`);
    }

    default:
      return `Unknown issue tool: ${name}`;
  }
}

