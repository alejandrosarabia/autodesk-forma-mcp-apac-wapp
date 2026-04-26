/**
 * Reviews tools — support both 2LO and 3LO auth.
 *
 * Tools: list_workflows, get_workflow, create_workflow,
 *        list_reviews, create_review, get_review,
 *        get_review_workflow, get_review_progress, get_review_versions,
 *        get_version_approval_statuses
 *
 * ACC Reviews API v1. Path shape:
 *   /construction/reviews/v1/projects/{projectId}/...
 * projectId = bare UUID, optionally with b. prefix.
 *
 * Supports both 2LO (with x-user-id header) and 3LO authentication.
 * List endpoints use offset/limit pagination.
 */

import { apiRequest, withoutBPrefix } from '../auth/router.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const reviewsTools = [
  // ── Approval Workflows ──────────────────────────────────────────────────────
  {
    name: 'list_workflows',
    description: 'List all approval workflows in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID with or without b. prefix)' },
        limit: { type: 'number', description: 'Max results per page (1-50, default: 50)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        sort: { type: 'string', description: 'Sort field and direction (e.g., name desc)' },
        'filter[initiator]': { type: 'boolean', description: 'Filter by initiator (true=current user only)' },
        'filter[status]': { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Filter by workflow status' },
        'x-user-id': { type: 'string', description: 'Autodesk ID of user (required for 2LO)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_workflow',
    description: 'Get a specific approval workflow by ID',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID with or without b. prefix)' },
        workflowId: { type: 'string', description: 'Workflow ID (UUID)' },
        'x-user-id': { type: 'string', description: 'Autodesk ID of user (required for 2LO)' },
      },
      required: ['projectId', 'workflowId'],
    },
  },
  {
    name: 'create_workflow',
    description: 'Create a new approval workflow in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID with or without b. prefix)' },
        name: { type: 'string', description: 'Workflow name (max 255 chars, must be unique)' },
        description: { type: 'string', description: 'Workflow description (max 4096 chars)' },
        notes: { type: 'string', description: 'Custom notes visible to reviewers (max 4096 chars)' },
        additionalOptions: {
          type: 'object',
          description: 'Workflow settings',
          properties: {
            allowInitiatorToEdit: { type: 'boolean', description: 'Allow initiator to edit reviewer assignments and durations' },
          },
        },
        additionalApprovalStatusOptions: {
          type: 'array',
          description: 'Custom approval statuses (max 50)',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Display name (max 255 chars, must be unique)' },
              value: { type: 'string', enum: ['APPROVED', 'REJECTED'], description: 'Status value' },
            },
          },
        },
        copyFilesOptions: {
          type: 'object',
          description: 'Configuration for copying approved files',
          properties: {
            enabled: { type: 'boolean', description: 'Enable file copying (required)' },
            allowOverride: { type: 'boolean', description: 'Allow initiator to change target folder' },
            condition: { type: 'string', enum: ['ANY', 'ALL'], description: 'Copy condition' },
            folderUrn: { type: 'string', description: 'Target folder URN' },
            includeMarkups: { type: 'boolean', description: 'Include published markups' },
            disableOverrideMarkupSetting: { type: 'boolean', description: 'Lock markup setting' },
          },
        },
        steps: {
          type: 'array',
          description: 'Workflow steps in order',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Step name (max 255 chars)' },
              type: { type: 'string', enum: ['INITIATOR', 'REVIEWER', 'APPROVER'], description: 'Step type' },
              duration: { type: 'number', description: 'Days allowed (1-99, REVIEWER/APPROVER only)' },
              dueDateType: { type: 'string', enum: ['CALENDAR_DAY', 'WORKDAY'], description: 'Due date calculation' },
              groupReview: {
                type: 'object',
                description: 'Multiple reviewer settings (REVIEWER steps only)',
                properties: {
                  enabled: { type: 'boolean', description: 'Enable group review' },
                  type: { type: 'string', enum: ['ALL', 'MINIMUM'], description: 'Group review type' },
                  min: { type: 'number', description: 'Min reviewers required (for MINIMUM)' },
                },
              },
              candidates: {
                type: 'object',
                description: 'Reviewers/approvers for this step (at least one field required)',
                properties: {
                  users: {
                    type: 'array',
                    description: 'Individual users',
                    items: {
                      type: 'object',
                      properties: {
                        autodeskId: { type: 'string', description: 'User Autodesk ID' },
                      },
                    },
                  },
                  roles: {
                    type: 'array',
                    description: 'Project roles',
                    items: {
                      type: 'object',
                      properties: {
                        autodeskId: { type: 'string', description: 'Role Autodesk ID' },
                      },
                    },
                  },
                  companies: {
                    type: 'array',
                    description: 'Companies',
                    items: {
                      type: 'object',
                      properties: {
                        autodeskId: { type: 'string', description: 'Company Autodesk ID' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        'x-user-id': { type: 'string', description: 'Autodesk ID of user (required for 2LO)' },
      },
      required: ['projectId', 'name', 'copyFilesOptions', 'steps'],
    },
  },

  // ── Reviews ─────────────────────────────────────────────────────────────────
  {
    name: 'list_reviews',
    description: 'List all reviews in a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID with or without b. prefix)' },
        limit: { type: 'number', description: 'Max results per page (1-50, default: 50)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        sort: { type: 'string', description: 'Sort field and direction (e.g., createdAt desc)' },
        'filter[workflowId]': { type: 'string', description: 'Filter by workflow ID' },
        'filter[status]': { type: 'string', enum: ['OPEN', 'CLOSED', 'VOID', 'FAILED'], description: 'Filter by review status' },
        'filter[currentStepDueDate]': { type: 'string', description: 'Filter by due date range (ISO 8601, e.g., 2023-06-01..2023-06-30)' },
        'filter[createdAt]': { type: 'string', description: 'Filter by creation date range (ISO 8601)' },
        'filter[updatedAt]': { type: 'string', description: 'Filter by last updated date range (ISO 8601)' },
        'filter[finishedAt]': { type: 'string', description: 'Filter by finished date range (ISO 8601)' },
        'filter[nextActionByUser]': { type: 'string', description: 'Filter by user Autodesk ID responsible for next action' },
        'filter[nextActionByRole]': { type: 'string', description: 'Filter by role Autodesk ID responsible for next action' },
        'filter[nextActionByCompany]': { type: 'string', description: 'Filter by company Autodesk ID responsible for next action' },
        'filter[name]': { type: 'string', description: 'Filter by review name (partial match, case-insensitive)' },
        'filter[sequenceId]': { type: 'number', description: 'Filter by sequence ID (partial match)' },
        'filter[archived]': { type: 'boolean', description: 'Filter by archive status (true=archived, false=active)' },
        'filter[archivedBy]': { type: 'string', description: 'Filter by archiver Autodesk ID (requires filter[archived]=true)' },
        'filter[archivedAt]': { type: 'string', description: 'Filter by archive date range (ISO 8601, requires filter[archived]=true)' },
        'x-user-id': { type: 'string', description: 'Autodesk ID of user (required for 2LO)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_review',
    description: 'Create a new review using an existing workflow',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID with or without b. prefix)' },
        name: { type: 'string', description: 'Review name (max 255 chars)' },
        fileVersions: {
          type: 'array',
          description: 'File versions to include (max 1000 items)',
          items: {
            type: 'object',
            properties: {
              urn: { type: 'string', description: 'File version URN' },
            },
          },
        },
        workflowId: { type: 'string', description: 'Approval workflow ID (UUID)' },
        notes: { type: 'string', description: 'Review notes/description (max 4096 chars)' },
        workflowOptions: {
          type: 'object',
          description: 'Override workflow settings for this review',
          properties: {
            copyFilesOptions: {
              type: 'object',
              properties: {
                folderUrn: { type: 'string', description: 'Target folder URN for copying approved files' },
              },
            },
            steps: {
              type: 'array',
              description: 'Override step candidates',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Step ID from workflow' },
                  candidates: {
                    type: 'object',
                    properties: {
                      users: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            autodeskId: { type: 'string', description: 'User Autodesk ID' },
                          },
                        },
                      },
                      roles: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            autodeskId: { type: 'string', description: 'Role Autodesk ID' },
                          },
                        },
                      },
                      companies: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            autodeskId: { type: 'string', description: 'Company Autodesk ID' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        'x-user-id': { type: 'string', description: 'Autodesk ID of user (required for 2LO)' },
      },
      required: ['projectId', 'name', 'fileVersions', 'workflowId'],
    },
  },
  {
    name: 'get_review',
    description: 'Get a specific review by ID',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID with or without b. prefix)' },
        reviewId: { type: 'string', description: 'Review ID (UUID, not sequence ID)' },
        'x-user-id': { type: 'string', description: 'Autodesk ID of user (required for 2LO)' },
      },
      required: ['projectId', 'reviewId'],
    },
  },
  {
    name: 'get_review_workflow',
    description: 'Get the exact workflow structure used in a review',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID with or without b. prefix)' },
        reviewId: { type: 'string', description: 'Review ID (UUID)' },
        'x-user-id': { type: 'string', description: 'Autodesk ID of user (required for 2LO)' },
      },
      required: ['projectId', 'reviewId'],
    },
  },
  {
    name: 'get_review_progress',
    description: 'Get the approval progress (step-by-step status) of a review',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID with or without b. prefix)' },
        reviewId: { type: 'string', description: 'Review ID (UUID)' },
        limit: { type: 'number', description: 'Max results per page (1-50, default: 50)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        'x-user-id': { type: 'string', description: 'Autodesk ID of user (required for 2LO)' },
      },
      required: ['projectId', 'reviewId'],
    },
  },
  {
    name: 'get_review_versions',
    description: 'Get all file versions in the latest round of a review',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID with or without b. prefix)' },
        reviewId: { type: 'string', description: 'Review ID (UUID)' },
        limit: { type: 'number', description: 'Max results per page (1-50, default: 50)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        'filter[approveStatus]': {
          type: 'array',
          description: 'Filter by approval status label (e.g., Approved, Rejected). Supports multiple values.',
          items: { type: 'string' },
        },
        'x-user-id': { type: 'string', description: 'Autodesk ID of user (required for 2LO)' },
      },
      required: ['projectId', 'reviewId'],
    },
  },

  // ── Versions ────────────────────────────────────────────────────────────────
  {
    name: 'get_version_approval_statuses',
    description: 'Get full approval and review history for a file version',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID with or without b. prefix)' },
        versionId: { type: 'string', description: 'File version URN (URL-encoded). E.g., urn%3Aadsk.wipprod%3Afs.file%3Avf.xxx%3Fversion%3D2' },
        limit: { type: 'number', description: 'Max results per page (1-50, default: 50)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        'x-user-id': { type: 'string', description: 'Autodesk ID of user (required for 2LO)' },
      },
      required: ['projectId', 'versionId'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleReviewsTool(name, args) {
  const projectId = withoutBPrefix(args.projectId);
  const base = `/construction/reviews/v1/projects/${projectId}`;

  // Extract x-user-id header if provided (for 2LO)
  const headers = args['x-user-id'] ? { 'x-user-id': args['x-user-id'] } : {};

  switch (name) {
    // ── Approval Workflows ────────────────────────────────────────────────────
    case 'list_workflows': {
      const { limit, offset, sort, 'x-user-id': userId, ...filters } = args;
      let path = `${base}/workflows?limit=${limit || 50}&offset=${offset || 0}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter[') && val !== undefined) {
          path += `&${key}=${encodeURIComponent(val)}`;
        }
      });

      const data = await apiRequest('GET', path, null, false, userId ? { 'x-user-id': userId } : {});
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_workflow': {
      const { workflowId, 'x-user-id': userId } = args;
      const path = `${base}/workflows/${workflowId}`;
      const data = await apiRequest('GET', path, null, false, userId ? { 'x-user-id': userId } : {});
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_workflow': {
      const { projectId, 'x-user-id': userId, ...body } = args;
      const workflowBody = {};
      const fields = ['name', 'description', 'notes', 'additionalOptions', 'additionalApprovalStatusOptions', 'copyFilesOptions', 'steps'];
      fields.forEach(field => {
        if (body[field] !== undefined) workflowBody[field] = body[field];
      });

      const data = await apiRequest('POST', `${base}/workflows`, workflowBody, false, userId ? { 'x-user-id': userId } : {});
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Reviews ─────────────────────────────────────────────────────────────
    case 'list_reviews': {
      const { limit, offset, sort, 'x-user-id': userId, ...filters } = args;
      let path = `${base}/reviews?limit=${limit || 50}&offset=${offset || 0}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter[') && val !== undefined) {
          path += `&${key}=${encodeURIComponent(val)}`;
        }
      });

      const data = await apiRequest('GET', path, null, false, userId ? { 'x-user-id': userId } : {});
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_review': {
      const { projectId, 'x-user-id': userId, ...body } = args;
      const reviewBody = {};
      const fields = ['name', 'fileVersions', 'workflowId', 'notes', 'workflowOptions'];
      fields.forEach(field => {
        if (body[field] !== undefined) reviewBody[field] = body[field];
      });

      const data = await apiRequest('POST', `${base}/reviews`, reviewBody, false, userId ? { 'x-user-id': userId } : {});
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_review': {
      const { reviewId, 'x-user-id': userId } = args;
      const path = `${base}/reviews/${reviewId}`;
      const data = await apiRequest('GET', path, null, false, userId ? { 'x-user-id': userId } : {});
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_review_workflow': {
      const { reviewId, 'x-user-id': userId } = args;
      const path = `${base}/reviews/${reviewId}/workflow`;
      const data = await apiRequest('GET', path, null, false, userId ? { 'x-user-id': userId } : {});
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_review_progress': {
      const { reviewId, limit, offset, 'x-user-id': userId } = args;
      let path = `${base}/reviews/${reviewId}/progress?limit=${limit || 50}&offset=${offset || 0}`;

      const data = await apiRequest('GET', path, null, false, userId ? { 'x-user-id': userId } : {});
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_review_versions': {
      const { reviewId, limit, offset, 'x-user-id': userId, ...filters } = args;
      let path = `${base}/reviews/${reviewId}/versions?limit=${limit || 50}&offset=${offset || 0}`;

      // Handle array filter for approveStatus
      if (filters['filter[approveStatus]']) {
        const statuses = Array.isArray(filters['filter[approveStatus]'])
          ? filters['filter[approveStatus]']
          : [filters['filter[approveStatus]']];
        statuses.forEach(status => {
          path += `&filter[approveStatus]=${encodeURIComponent(status)}`;
        });
      }

      const data = await apiRequest('GET', path, null, false, userId ? { 'x-user-id': userId } : {});
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Versions ────────────────────────────────────────────────────────────
    case 'get_version_approval_statuses': {
      const { versionId, limit, offset, 'x-user-id': userId } = args;
      let path = `${base}/versions/${versionId}/approval-statuses?limit=${limit || 50}&offset=${offset || 0}`;

      const data = await apiRequest('GET', path, null, false, userId ? { 'x-user-id': userId } : {});
      if (typeof data === 'string') return data;
      return data;
    }

    default:
      return `Unknown reviews tool: ${name}`;
  }
}
