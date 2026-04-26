/**
 * Model Coordination tools — Model Sets, Versions, Views, and Clash Tests management.
 *
 * Base URL: https://developer.api.autodesk.com/bim360/modelset/v3/
 * All endpoints use 3LO auth (user context required).
 *
 * Model Set tools:
 *   list_model_sets, get_model_set, create_model_set, update_model_set,
 *   get_container_job, get_model_set_job,
 *   create_model_set_issue, get_issue_view_context
 *
 * Model Set Version tools:
 *   create_model_set_version, list_model_set_versions,
 *   get_latest_model_set_version, get_model_set_version,
 *   enable_model_set_versions, disable_model_set_versions
 *
 * Model Set View tools:
 *   create_model_set_view, list_model_set_views, get_model_set_view,
 *   update_model_set_view, delete_model_set_view,
 *   list_model_set_version_views, get_model_set_version_view,
 *   get_model_set_view_job
 *
 * Clash Test tools:
 *   list_clash_tests, get_clash_test, get_clash_results,
 *   list_clash_groups, list_closed_clash_groups,
 *   list_assigned_clash_groups, list_shared_clash_groups
 *
 * Note: Screenshot upload/download endpoints require binary (image/png) transfer
 * which is not supported over the JSON-based MCP protocol — omitted intentionally.
 */

import { apiRequest } from '../auth/router.js';

const BASE = '/bim360/modelset/v3';
const CLASH_BASE = '/bim360/clash/v3';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const modelCoordinationTools = [
  // ── Model Sets ──────────────────────────────────────────────────────────────
  {
    name: 'list_model_sets',
    description: 'List all model sets in a container (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID (from ACC project)' },
        pageLimit: { type: 'number', description: 'Max model sets per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
        name: { type: 'string', description: 'Filter by exact model set name' },
        folderUrn: { type: 'string', description: 'Filter by folder URN' },
        includeDisabled: { type: 'boolean', description: 'Include disabled model sets' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'get_model_set',
    description: 'Get a single model set by ID (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'create_model_set',
    description: 'Create a new model set in a container (3LO auth). Returns a job — poll get_model_set_job for completion.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        name: { type: 'string', description: 'Model set name (unique within container, 1–64 chars)' },
        description: { type: 'string', description: 'Model set description (1–1024 chars)' },
        modelSetId: { type: 'string', description: 'Optional: supply a specific GUID for the new model set' },
        isDisabled: { type: 'boolean', description: 'If true, new versions are not auto-created on changes' },
        folderUrn: { type: 'string', description: 'Folder URN whose documents seed the model set (required)' },
      },
      required: ['containerId', 'name', 'folderUrn'],
    },
  },
  {
    name: 'update_model_set',
    description: 'Update a model set name and/or description (PATCH, 3LO auth). Supply oldName+newName to rename; supply oldDescription or newDescription to update description. Returns a job.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        oldName: { type: 'string', description: 'Current name (required when renaming)' },
        newName: { type: 'string', description: 'New name (required when renaming, unique within container)' },
        oldDescription: { type: 'string', description: 'Current description' },
        newDescription: { type: 'string', description: 'New description (can be null to clear)' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'get_container_job',
    description: 'Get the status of a container-level job by jobId (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        jobId: { type: 'string', description: 'Job GUID' },
        region: { type: 'string', enum: ['US', 'EMEA'], description: 'Required: region where the container resides' },
      },
      required: ['containerId', 'jobId', 'region'],
    },
  },
  {
    name: 'get_model_set_job',
    description: 'Get the status of a model-set-level job by jobId (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        jobId: { type: 'string', description: 'Job GUID' },
      },
      required: ['containerId', 'modelSetId', 'jobId'],
    },
  },
  {
    name: 'create_model_set_issue',
    description: 'Create a visual inspection issue (pushpin) on a model set (3LO auth). Returns a job.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        title: { type: 'string', description: 'Issue title (required, 1–4200 chars)' },
        description: { type: 'string', description: 'Issue description (max 10000 chars)' },
        issueTypeId: { type: 'string', description: 'Issue type GUID (required)' },
        issueSubTypeId: { type: 'string', description: 'Issue sub-type GUID (required)' },
        documentVersionUrn: { type: 'string', description: 'Document/seed file version URN (required)' },
        pushpin: {
          type: 'object',
          description: 'Pushpin object: { location: {x,y,z}, objectId, type?, viewerState? }',
        },
        viewContext: {
          type: 'array',
          description: 'Array of { urn, viewableName } context objects',
          items: { type: 'object' },
        },
        assignedTo: { type: 'string', description: 'User/role/company to assign to' },
        assignedToType: { type: 'string', enum: ['User', 'Role', 'Company'], description: 'Type of assignedTo' },
        dueDate: { type: 'string', description: 'Due date (ISO 8601)' },
        locationId: { type: 'string', description: 'Location GUID' },
        locationDescription: { type: 'string', description: 'Location description' },
        owner: { type: 'string', description: 'Issue owner user ID' },
        status: { type: 'string', enum: ['Open', 'Draft'], description: 'Initial issue status' },
        viewableName: { type: 'string', description: 'Viewable name in the Model Derivative manifest' },
        customAttributes: {
          type: 'array',
          description: 'Array of { id, value } custom attribute objects (max 64)',
          items: { type: 'object' },
        },
      },
      required: ['containerId', 'modelSetId', 'title', 'issueTypeId', 'issueSubTypeId', 'documentVersionUrn', 'pushpin', 'viewContext'],
    },
  },
  {
    name: 'get_issue_view_context',
    description: 'Get the model set and document context for a set of visual inspection issues (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        issueIds: {
          type: 'array',
          description: 'Array of issue GUIDs to look up (max 1)',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'issueIds'],
    },
  },

  // ── Model Set Versions ───────────────────────────────────────────────────────
  {
    name: 'create_model_set_version',
    description: 'Trigger creation of a new version of a model set (POST, 3LO auth). No body required. Returns a job — not guaranteed to produce a new version if folder contents have not changed.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'list_model_set_versions',
    description: 'List versions of a model set (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        status: { type: 'string', description: 'Filter by status: Pending, Processing, Successful, Partial, or Failed' },
        pageLimit: { type: 'number', description: 'Max versions per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'get_latest_model_set_version',
    description: 'Get the latest version of a model set (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        status: { type: 'string', description: 'Filter by status: Pending, Processing, Successful, Partial, or Failed' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'get_model_set_version',
    description: 'Get a specific version of a model set by version number (integer, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        version: { type: 'number', description: 'Version number (integer, e.g. 42)' },
      },
      required: ['containerId', 'modelSetId', 'version'],
    },
  },
  {
    name: 'enable_model_set_versions',
    description: 'Enable automatic version creation for a model set (PATCH versions:enable, 3LO auth). Returns a job.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'disable_model_set_versions',
    description: 'Disable automatic version creation for a model set (PATCH versions:disable, 3LO auth). Returns a job.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },

  // ── Model Set Views ──────────────────────────────────────────────────────────
  {
    name: 'create_model_set_view',
    description: 'Create a view for a model set (POST, 3LO auth). Returns a job — poll get_model_set_view_job for completion.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        name: { type: 'string', description: 'View name (1–64 chars)' },
        description: { type: 'string', description: 'View description (1–1024 chars)' },
        isPrivate: { type: 'boolean', description: 'Whether the view is private (only accessible to creator)' },
        definition: {
          type: 'array',
          description: 'Array of { lineageUrn, viewableName? } — document lineages to include (1–1000 items)',
          items: { type: 'object' },
        },
      },
      required: ['containerId', 'modelSetId', 'name', 'isPrivate', 'definition'],
    },
  },
  {
    name: 'list_model_set_views',
    description: 'List views in a model set (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        pageLimit: { type: 'number', description: 'Max views per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
        createdBy: { type: 'string', description: 'Filter by creator user ID' },
        modifiedBy: { type: 'string', description: 'Filter by last modifier user ID' },
        after: { type: 'string', description: 'Filter to views created/modified after this ISO 8601 datetime' },
        before: { type: 'string', description: 'Filter to views created/modified before this ISO 8601 datetime' },
        isPrivate: { type: 'boolean', description: 'If true, return only views belonging to the current user' },
        sortBy: { type: 'string', description: 'Property to sort by (e.g. Name)' },
        sortDirection: { type: 'string', enum: ['Asc', 'Desc'], description: 'Sort direction' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'get_model_set_view',
    description: 'Get a single model set view by ID (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        viewId: { type: 'string', description: 'View GUID' },
      },
      required: ['containerId', 'modelSetId', 'viewId'],
    },
  },
  {
    name: 'update_model_set_view',
    description: 'Update a model set view name, description, privacy, or definition (PATCH, 3LO auth). Returns a job. Supply old+new pairs for each field to change.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        viewId: { type: 'string', description: 'View GUID' },
        oldName: { type: 'string', description: 'Current name (required when renaming, 1–64 chars)' },
        newName: { type: 'string', description: 'New name (required when renaming, 1–64 chars)' },
        oldDescription: { type: 'string', description: 'Current description (can be null)' },
        newDescription: { type: 'string', description: 'New description (can be null to clear, 1–1024 chars)' },
        oldIsPrivate: { type: 'boolean', description: 'Current privacy setting (required when changing privacy)' },
        newIsPrivate: { type: 'boolean', description: 'New privacy setting (required when changing privacy)' },
        oldDefinition: {
          type: 'array',
          description: 'Current definition array (required when changing definition)',
          items: { type: 'object' },
        },
        newDefinition: {
          type: 'array',
          description: 'New definition array (required when changing definition)',
          items: { type: 'object' },
        },
      },
      required: ['containerId', 'modelSetId', 'viewId'],
    },
  },
  {
    name: 'delete_model_set_view',
    description: 'Delete a model set view (DELETE, 3LO auth). Returns a job.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        viewId: { type: 'string', description: 'View GUID' },
      },
      required: ['containerId', 'modelSetId', 'viewId'],
    },
  },
  {
    name: 'list_model_set_version_views',
    description: 'List all model set views as they exist in a specific model set version (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        version: { type: 'number', description: 'Model set version number (integer)' },
        pageLimit: { type: 'number', description: 'Max views per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
      },
      required: ['containerId', 'modelSetId', 'version'],
    },
  },
  {
    name: 'get_model_set_version_view',
    description: 'Get a model set view as it exists in a specific model set version (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        version: { type: 'number', description: 'Model set version number (integer)' },
        viewId: { type: 'string', description: 'View GUID' },
      },
      required: ['containerId', 'modelSetId', 'version', 'viewId'],
    },
  },
  {
    name: 'get_model_set_view_job',
    description: 'Get the status of a model set view job by jobId (3LO auth). Used to poll create/update/delete view operations.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        viewId: { type: 'string', description: 'View GUID' },
        jobId: { type: 'string', description: 'Job GUID' },
      },
      required: ['containerId', 'modelSetId', 'viewId', 'jobId'],
    },
  },

  // ── Clash Tests ──────────────────────────────────────────────────────────────
  {
    name: 'list_clash_tests',
    description: 'List all clash tests executed for a model set (GET /bim360/clash/v3, 3LO auth). Filters by status: Pending, Processing, Success, Failed.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        status: { type: 'string', enum: ['Pending', 'Processing', 'Success', 'Failed'], description: 'Filter by status' },
        pageLimit: { type: 'number', description: 'Max results per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'list_clash_tests_by_version',
    description: 'List all clash tests for a specific model set version (GET /bim360/clash/v3, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        version: { type: 'number', description: 'Model set version number (integer)' },
        status: { type: 'string', enum: ['Pending', 'Processing', 'Success', 'Failed'], description: 'Filter by status' },
        pageLimit: { type: 'number', description: 'Max results per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
      },
      required: ['containerId', 'modelSetId', 'version'],
    },
  },
  {
    name: 'get_clash_test',
    description: 'Get a single clash test by testId (GET /bim360/clash/v3/containers/:containerId/tests/:testId, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        testId: { type: 'string', description: 'Clash test GUID' },
      },
      required: ['containerId', 'testId'],
    },
  },
  {
    name: 'get_clash_test_resources',
    description: 'Get signed URLs and headers for the raw result files of a clash test (GET /bim360/clash/v3, 3LO auth). Resources are json.gz or sqlite files containing clash instances and document info.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        testId: { type: 'string', description: 'Clash test GUID' },
      },
      required: ['containerId', 'testId'],
    },
  },
  {
    name: 'get_clash_job',
    description: 'Get the status of any clash group job (close, assign, reopen, etc.) by jobId (GET /bim360/clash/v3, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        jobId: { type: 'string', description: 'Job GUID (returned by close_clash_groups, assign_clash_groups, reopen_clash_groups, etc.)' },
      },
      required: ['containerId', 'jobId'],
    },
  },
  {
    name: 'list_grouped_clashes',
    description: 'List all clash IDs that are part of any assigned or closed clash group in a model set (GET /bim360/clash/v3, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'close_clash_groups',
    description: 'Create a batch of closed clash groups for a clash test (POST clashes:close, 3LO auth). Closed clashes are suppressed in future tests. Returns a job.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        testId: { type: 'string', description: 'Clash test GUID' },
        groups: {
          type: 'array',
          description: 'Array of clash group objects to close (1–1000 clashes each)',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Group title (required, max 128 chars)' },
              description: { type: 'string', description: 'Group description (max 1024 chars)' },
              reason: { type: 'string', enum: ['OTHER', 'VALID_INTERFACE', 'VALID_PENETRATION', 'MINIMAL_OVERLAP', 'ITEM_CAN_FLEX', 'MODEL_INACCURACY', 'FIELD_FIX'], description: 'Reason for closing' },
              clashes: { type: 'array', items: { type: 'number' }, description: 'Array of clash index IDs (1–1000 items)' },
              screenShots: { type: 'array', items: { type: 'string' }, description: 'Screenshot GUIDs (max 5)' },
              id: { type: 'string', description: 'Optional: supply a specific GUID for this group' },
            },
          },
        },
      },
      required: ['containerId', 'testId', 'groups'],
    },
  },
  {
    name: 'list_test_closed_clash_groups',
    description: 'List all closed clash groups for a model set, intersected with the specified clash test results (GET .../tests/:testId/clashes/closed, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        testId: { type: 'string', description: 'Clash test GUID' },
        pageLimit: { type: 'number', description: 'Max results per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
      },
      required: ['containerId', 'testId'],
    },
  },
  {
    name: 'get_closed_clash_groups',
    description: 'Get full details for specific closed clash groups intersected with a clash test (POST .../tests/:testId/clashes/closed with array of group IDs, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        testId: { type: 'string', description: 'Clash test GUID' },
        groupIds: {
          type: 'array',
          description: 'Array of closed clash group GUIDs to fetch details for (1–20 items)',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'testId', 'groupIds'],
    },
  },
  {
    name: 'reopen_clash_groups',
    description: 'Re-open (delete) a batch of closed clash groups for a model set (POST clashes:reopen, 3LO auth). Cannot be undone. Returns a job.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        groupIds: {
          type: 'array',
          description: 'Array of closed clash group GUIDs to reopen (1–20 items)',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'modelSetId', 'groupIds'],
    },
  },
  {
    name: 'list_closed_clash_groups',
    description: 'List all closed clash groups in a model set with filters (GET .../modelsets/:modelSetId/clashes/closed, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        pageLimit: { type: 'number', description: 'Max results per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
        clashTestId: { type: 'string', description: 'Filter by clash test GUID' },
        reason: { type: 'string', description: 'Filter by reason (e.g. OTHER, VALID_INTERFACE)' },
        createdBy: { type: 'string', description: 'Filter by creator user ID' },
        after: { type: 'string', description: 'Filter to groups created after this ISO 8601 datetime' },
        before: { type: 'string', description: 'Filter to groups created before this ISO 8601 datetime' },
        sort: { type: 'string', enum: ['Asc', 'Desc'], description: 'Sort direction' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'assign_clash_groups',
    description: 'Create a batch of assigned clash groups for a clash test (POST clashes:assign, 3LO auth). Each group creates a BIM 360 issue. Returns a job.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        testId: { type: 'string', description: 'Clash test GUID' },
        groups: {
          type: 'array',
          description: 'Array of assigned clash group objects',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Group title (required, 1–4200 chars)' },
              description: { type: 'string', description: 'Description (max 10000 chars)' },
              clashes: { type: 'array', items: { type: 'number' }, description: 'Clash index IDs (1–1000)' },
              issueTypeId: { type: 'string', description: 'Issue type GUID (required)' },
              issueSubTypeId: { type: 'string', description: 'Issue sub-type GUID (required)' },
              documentVersionUrn: { type: 'string', description: 'Document version URN (required)' },
              pushpin: { type: 'object', description: '{ location: {x,y,z}, objectId, type?, viewerState? }' },
              assignedTo: { type: 'string', description: 'User/role/company to assign to' },
              assignedToType: { type: 'string', enum: ['User', 'Role', 'Company'] },
              dueDate: { type: 'string', description: 'Due date (ISO 8601)' },
              locationId: { type: 'string', description: 'Location GUID' },
              locationDescription: { type: 'string' },
              owner: { type: 'string', description: 'Issue owner user ID' },
              status: { type: 'string', enum: ['Open', 'Draft'] },
              viewableName: { type: 'string', description: 'Viewable name in Model Derivative manifest' },
              viewContext: { type: 'array', items: { type: 'object' }, description: '[{ urn, viewableName }] — context (1–50 items)' },
              rootCauseId: { type: 'string', description: 'Root cause GUID' },
              customAttributes: { type: 'array', items: { type: 'object' }, description: '[{ id, value }] — max 64' },
              screenShots: { type: 'array', items: { type: 'string' }, description: 'Screenshot GUIDs (max 5)' },
              id: { type: 'string', description: 'Optional: specific GUID for this group' },
            },
          },
        },
      },
      required: ['containerId', 'testId', 'groups'],
    },
  },
  {
    name: 'list_test_assigned_clash_groups',
    description: 'List all assigned clash groups for a model set, intersected with the specified clash test results (GET .../tests/:testId/clashes/assigned, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        testId: { type: 'string', description: 'Clash test GUID' },
        pageLimit: { type: 'number', description: 'Max results per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
      },
      required: ['containerId', 'testId'],
    },
  },
  {
    name: 'get_assigned_clash_groups',
    description: 'Get full details for specific assigned clash groups intersected with a clash test (POST .../tests/:testId/clashes/assigned with array of IDs, 3LO auth). Set issues=true to query by BIM 360 issue IDs instead.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        testId: { type: 'string', description: 'Clash test GUID' },
        ids: {
          type: 'array',
          description: 'Array of clash group GUIDs (or issue GUIDs if issues=true), 1–20 items',
          items: { type: 'string' },
        },
        issues: { type: 'boolean', description: 'If true, ids are treated as BIM 360 issue GUIDs' },
      },
      required: ['containerId', 'testId', 'ids'],
    },
  },
  {
    name: 'list_assigned_clash_groups',
    description: 'List all assigned clash groups in a model set with filters (GET .../modelsets/:modelSetId/clashes/assigned, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        modelSetId: { type: 'string', description: 'Model set GUID' },
        pageLimit: { type: 'number', description: 'Max results per page' },
        continuationToken: { type: 'string', description: 'Token for next page' },
        clashTestId: { type: 'string', description: 'Filter by clash test GUID' },
        issueId: { type: 'string', description: 'Filter by issue GUID' },
        createdBy: { type: 'string', description: 'Filter by creator user ID' },
        after: { type: 'string', description: 'Filter to groups created after this ISO 8601 datetime' },
        before: { type: 'string', description: 'Filter to groups created before this ISO 8601 datetime' },
        sort: { type: 'string', enum: ['Asc', 'Desc'], description: 'Sort direction' },
      },
      required: ['containerId', 'modelSetId'],
    },
  },
  {
    name: 'get_assigned_clash_group_view_context',
    description: 'Get the model set and document context for a set of assigned clash group issues (POST .../clashes/assigned/viewcontext, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Container GUID' },
        issueIds: {
          type: 'array',
          description: 'Array of issue GUIDs (1–5 items)',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'issueIds'],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildQuery(params) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleModelCoordinationTool(name, args) {
  const { containerId, modelSetId, clashTestId, testId, jobId, viewId } = args;

  switch (name) {

    // ── Model Sets ────────────────────────────────────────────────────────────

    case 'list_model_sets': {
      const qs = buildQuery({
        pageLimit: args.pageLimit,
        continuationToken: args.continuationToken,
        name: args.name,
        folderUrn: args.folderUrn,
        includeDisabled: args.includeDisabled,
      });
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets${qs}`);
    }

    case 'get_model_set': {
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets/${modelSetId}`);
    }

    case 'create_model_set': {
      const body = {
        name: args.name,
        folders: [{ folderUrn: args.folderUrn }],
      };
      if (args.modelSetId) body.modelSetId = args.modelSetId;
      if (args.description) body.description = args.description;
      if (args.isDisabled !== undefined) body.isDisabled = args.isDisabled;

      return await apiRequest('POST', `${BASE}/containers/${containerId}/modelsets`, body);
    }

    case 'update_model_set': {
      const body = {};
      if (args.oldName) body.oldName = args.oldName;
      if (args.newName) body.newName = args.newName;
      if (args.oldDescription !== undefined) body.oldDescription = args.oldDescription;
      if (args.newDescription !== undefined) body.newDescription = args.newDescription;

      return await apiRequest('PATCH', `${BASE}/containers/${containerId}/modelsets/${modelSetId}`, body);
    }

    case 'get_container_job': {
      return await apiRequest(
        'GET',
        `${BASE}/containers/${containerId}/jobs/${jobId}`,
        null,
        false,
        { 'x-ads-region': args.region },
      );
    }

    case 'get_model_set_job': {
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/jobs/${jobId}`);
    }

    case 'create_model_set_issue': {
      const issue = {
        title: args.title,
        issueTypeId: args.issueTypeId,
        issueSubTypeId: args.issueSubTypeId,
        documentVersionUrn: args.documentVersionUrn,
        pushpin: args.pushpin,
        viewContext: args.viewContext,
      };
      if (args.description) issue.description = args.description;
      if (args.assignedTo) issue.assignedTo = args.assignedTo;
      if (args.assignedToType) issue.assignedToType = args.assignedToType;
      if (args.dueDate) issue.dueDate = args.dueDate;
      if (args.locationId) issue.locationId = args.locationId;
      if (args.locationDescription) issue.locationDescription = args.locationDescription;
      if (args.owner) issue.owner = args.owner;
      if (args.status) issue.status = args.status;
      if (args.viewableName) issue.viewableName = args.viewableName;
      if (args.customAttributes) issue.customAttributes = args.customAttributes;

      return await apiRequest('POST', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/issues`, [issue]);
    }

    case 'get_issue_view_context': {
      return await apiRequest('POST', `${BASE}/containers/${containerId}/issues/viewcontext`, args.issueIds);
    }

    // ── Model Set Versions ────────────────────────────────────────────────────

    case 'create_model_set_version': {
      return await apiRequest('POST', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/versions`);
    }

    case 'list_model_set_versions': {
      const qs = buildQuery({
        status: args.status,
        pageLimit: args.pageLimit,
        continuationToken: args.continuationToken,
      });
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/versions${qs}`);
    }

    case 'get_latest_model_set_version': {
      const qs = buildQuery({ status: args.status });
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/versions/latest${qs}`);
    }

    case 'get_model_set_version': {
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/versions/${args.version}`);
    }

    case 'enable_model_set_versions': {
      return await apiRequest('PATCH', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/versions:enable`);
    }

    case 'disable_model_set_versions': {
      return await apiRequest('PATCH', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/versions:disable`);
    }

    // ── Model Set Views ───────────────────────────────────────────────────────

    case 'create_model_set_view': {
      const body = {
        name: args.name,
        isPrivate: args.isPrivate,
        definition: args.definition,
      };
      if (args.description) body.description = args.description;
      return await apiRequest('POST', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/views`, body);
    }

    case 'list_model_set_views': {
      const qs = buildQuery({
        pageLimit: args.pageLimit,
        continuationToken: args.continuationToken,
        createdBy: args.createdBy,
        modifiedBy: args.modifiedBy,
        after: args.after,
        before: args.before,
        isPrivate: args.isPrivate,
        sortBy: args.sortBy,
        sortDirection: args.sortDirection,
      });
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/views${qs}`);
    }

    case 'get_model_set_view': {
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/views/${viewId}`);
    }

    case 'update_model_set_view': {
      const body = {};
      if (args.oldName !== undefined) body.oldName = args.oldName;
      if (args.newName !== undefined) body.newName = args.newName;
      if (args.oldDescription !== undefined) body.oldDescription = args.oldDescription;
      if (args.newDescription !== undefined) body.newDescription = args.newDescription;
      if (args.oldIsPrivate !== undefined) body.oldIsPrivate = args.oldIsPrivate;
      if (args.newIsPrivate !== undefined) body.newIsPrivate = args.newIsPrivate;
      if (args.oldDefinition !== undefined) body.oldDefinition = args.oldDefinition;
      if (args.newDefinition !== undefined) body.newDefinition = args.newDefinition;
      return await apiRequest('PATCH', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/views/${viewId}`, body);
    }

    case 'delete_model_set_view': {
      return await apiRequest('DELETE', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/views/${viewId}`);
    }

    case 'list_model_set_version_views': {
      const qs = buildQuery({
        pageLimit: args.pageLimit,
        continuationToken: args.continuationToken,
      });
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/versions/${args.version}/views${qs}`);
    }

    case 'get_model_set_version_view': {
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/versions/${args.version}/views/${viewId}`);
    }

    case 'get_model_set_view_job': {
      return await apiRequest('GET', `${BASE}/containers/${containerId}/modelsets/${modelSetId}/views/${viewId}/jobs/${jobId}`);
    }

    // ── Clash Tests ───────────────────────────────────────────────────────────

    case 'list_clash_tests': {
      const qs = buildQuery({
        status: args.status,
        pageLimit: args.pageLimit,
        continuationToken: args.continuationToken,
      });
      return await apiRequest('GET', `${CLASH_BASE}/containers/${containerId}/modelsets/${modelSetId}/tests${qs}`);
    }

    case 'list_clash_tests_by_version': {
      const qs = buildQuery({
        status: args.status,
        pageLimit: args.pageLimit,
        continuationToken: args.continuationToken,
      });
      return await apiRequest('GET', `${CLASH_BASE}/containers/${containerId}/modelsets/${modelSetId}/versions/${args.version}/tests${qs}`);
    }

    case 'get_clash_test': {
      return await apiRequest('GET', `${CLASH_BASE}/containers/${containerId}/tests/${testId}`);
    }

    case 'get_clash_test_resources': {
      return await apiRequest('GET', `${CLASH_BASE}/containers/${containerId}/tests/${testId}/resources`);
    }

    case 'get_clash_job': {
      return await apiRequest('GET', `${CLASH_BASE}/containers/${containerId}/clashes/jobs/${jobId}`);
    }

    case 'list_grouped_clashes': {
      return await apiRequest('GET', `${CLASH_BASE}/containers/${containerId}/modelsets/${modelSetId}/clashes/grouped`);
    }

    case 'close_clash_groups': {
      return await apiRequest('POST', `${CLASH_BASE}/containers/${containerId}/tests/${testId}/clashes:close`, args.groups);
    }

    case 'list_test_closed_clash_groups': {
      const qs = buildQuery({
        pageLimit: args.pageLimit,
        continuationToken: args.continuationToken,
      });
      return await apiRequest('GET', `${CLASH_BASE}/containers/${containerId}/tests/${testId}/clashes/closed${qs}`);
    }

    case 'get_closed_clash_groups': {
      return await apiRequest('POST', `${CLASH_BASE}/containers/${containerId}/tests/${testId}/clashes/closed`, args.groupIds);
    }

    case 'reopen_clash_groups': {
      return await apiRequest('POST', `${CLASH_BASE}/containers/${containerId}/modelsets/${modelSetId}/clashes:reopen`, args.groupIds);
    }

    case 'list_closed_clash_groups': {
      const qs = buildQuery({
        pageLimit: args.pageLimit,
        continuationToken: args.continuationToken,
        clashTestId: args.clashTestId,
        reason: args.reason,
        createdBy: args.createdBy,
        after: args.after,
        before: args.before,
        sort: args.sort,
      });
      return await apiRequest('GET', `${CLASH_BASE}/containers/${containerId}/modelsets/${modelSetId}/clashes/closed${qs}`);
    }

    case 'assign_clash_groups': {
      return await apiRequest('POST', `${CLASH_BASE}/containers/${containerId}/tests/${testId}/clashes:assign`, args.groups);
    }

    case 'list_test_assigned_clash_groups': {
      const qs = buildQuery({
        pageLimit: args.pageLimit,
        continuationToken: args.continuationToken,
      });
      return await apiRequest('GET', `${CLASH_BASE}/containers/${containerId}/tests/${testId}/clashes/assigned${qs}`);
    }

    case 'get_assigned_clash_groups': {
      const qs = buildQuery({ issues: args.issues });
      return await apiRequest('POST', `${CLASH_BASE}/containers/${containerId}/tests/${testId}/clashes/assigned${qs}`, args.ids);
    }

    case 'list_assigned_clash_groups': {
      const qs = buildQuery({
        pageLimit: args.pageLimit,
        continuationToken: args.continuationToken,
        clashTestId: args.clashTestId,
        issueId: args.issueId,
        createdBy: args.createdBy,
        after: args.after,
        before: args.before,
        sort: args.sort,
      });
      return await apiRequest('GET', `${CLASH_BASE}/containers/${containerId}/modelsets/${modelSetId}/clashes/assigned${qs}`);
    }

    case 'get_assigned_clash_group_view_context': {
      return await apiRequest('POST', `${CLASH_BASE}/containers/${containerId}/clashes/assigned/viewcontext`, args.issueIds);
    }


    default:
      return `Unknown model coordination tool: ${name}`;
  }
}
