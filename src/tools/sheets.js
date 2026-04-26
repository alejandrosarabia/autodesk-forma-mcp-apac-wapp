/**
 * Sheets tools — Version Sets, Sheets, and Uploads management.
 *
 * Tools: list_version_sets, create_version_set, update_version_set, batch_get_version_sets, batch_delete_version_sets,
 *        list_sheets, get_sheet, batch_get_sheets, batch_update_sheets, batch_delete_sheets, batch_restore_sheets,
 *        create_export, get_export,
 *        list_collections, get_collection,
 *        create_upload, list_uploads, get_upload,
 *        list_review_sheets, update_review_sheets, publish_review_sheets,
 *        get_thumbnail_urls
 *
 * Autodesk Sheets API v1. Paths:
 *   /construction/sheets/v1/projects/{projectId}/version-sets
 *   /construction/sheets/v1/projects/{projectId}/sheets
 *   /construction/sheets/v1/projects/{projectId}/uploads
 *
 * All endpoints use 2LO or 3LO auth (user context optional).
 * x-user-id header required for 2LO with user impersonation.
 */

import { apiRequest, withBPrefix, withoutBPrefix } from '../auth/router.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const sheetTools = [
  {
    name: 'list_version_sets',
    description: 'List version sets in a project (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
        offset: { type: 'number', description: 'Starting point for results (default 0)' },
        limit: { type: 'number', description: 'Max results per page (default 200)' },
        sort: { type: 'string', description: 'Sort by issuanceDate or name, with asc/desc (e.g. "issuanceDate desc")' },
        collectionId: { type: 'string', description: 'Filter by collection ID, or "*" for all collections' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_version_set',
    description: 'Create a new version set (POST, 2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
        name: { type: 'string', description: 'Version set name (max 255, required)' },
        issuanceDate: { type: 'string', description: 'Issuance date in ISO 8601 format (YYYY-MM-DD, required)' },
      },
      required: ['projectId', 'name', 'issuanceDate'],
    },
  },
  {
    name: 'update_version_set',
    description: 'Update a version set name or issuance date (PATCH, 2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        versionSetId: { type: 'string', description: 'Version set ID (UUID, required)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
        name: { type: 'string', description: 'New version set name (max 255)' },
        issuanceDate: { type: 'string', description: 'New issuance date in ISO 8601 format (YYYY-MM-DD)' },
      },
      required: ['projectId', 'versionSetId'],
    },
  },
  {
    name: 'batch_get_version_sets',
    description: 'Retrieve multiple version sets by IDs (POST, 2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        ids: {
          type: 'array',
          description: 'Version set IDs to retrieve (max 200)',
          items: { type: 'string' },
        },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'ids'],
    },
  },
  {
    name: 'batch_delete_version_sets',
    description: 'Delete multiple version sets (POST, 2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        ids: {
          type: 'array',
          description: 'Version set IDs to delete (max 10)',
          items: { type: 'string' },
        },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'ids'],
    },
  },
  {
    name: 'list_sheets',
    description: 'List sheets in a project with optional filters (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
        currentOnly: { type: 'boolean', description: 'Return only newest issuance date sheets (default true)' },
        filterVersionSetId: { type: 'string', description: 'Filter by version set ID' },
        filterTags: {
          type: 'array',
          description: 'Filter by tags (array)',
          items: { type: 'string' },
        },
        searchText: { type: 'string', description: 'Free-text search' },
        fields: {
          type: 'array',
          description: 'Specific fields to return',
          items: { type: 'string' },
        },
        withAllTags: { type: 'boolean', description: 'Match all tags (true) or any tag (false)' },
        isDeleted: { type: 'boolean', description: 'Include deleted sheets' },
        offset: { type: 'number', description: 'Starting point for results (default 0)' },
        limit: { type: 'number', description: 'Max results per page (default 200)' },
        collectionId: { type: 'string', description: 'Filter by collection ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_sheet',
    description: 'Get a single sheet by ID (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        sheetId: { type: 'string', description: 'Sheet ID (UUID, required)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'sheetId'],
    },
  },
  {
    name: 'batch_get_sheets',
    description: 'Retrieve multiple sheets by IDs (POST, 2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        ids: {
          type: 'array',
          description: 'Sheet IDs to retrieve (max 200)',
          items: { type: 'string' },
        },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'ids'],
    },
  },
  {
    name: 'batch_update_sheets',
    description: 'Update multiple sheets with metadata changes (POST, 2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        updates: {
          type: 'object',
          description: 'Updates object with sheet IDs as keys; each value: { number?, title?, versionSetId?, addTags?, removeTags? }',
        },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'updates'],
    },
  },
  {
    name: 'batch_delete_sheets',
    description: 'Delete multiple sheets (POST, 2LO/3LO auth, returns 204)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        ids: {
          type: 'array',
          description: 'Sheet IDs to delete (max 200)',
          items: { type: 'string' },
        },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'ids'],
    },
  },
  {
    name: 'batch_restore_sheets',
    description: 'Restore deleted sheets to their original version sets (POST, 2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        ids: {
          type: 'array',
          description: 'Deleted sheet IDs to restore (max 200). Find deleted sheets with list_sheets(isDeleted=true).',
          items: { type: 'string' },
        },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'ids'],
    },
  },
  {
    name: 'create_export',
    description: 'Export sheets to PDF (POST, 2LO/3LO auth, async, returns 202 Accepted)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        sheets: {
          type: 'array',
          description: 'Sheet IDs to export (max 1000, required)',
          items: { type: 'string' },
        },
        options: {
          type: 'object',
          description: 'Export options including outputFileName and markup settings',
          properties: {
            outputFileName: { type: 'string', description: 'Output file name without extension (max 255)' },
            standardMarkups: {
              type: 'object',
              description: 'Standard markup options',
              properties: {
                includePublishedMarkups: { type: 'boolean', description: 'Include published markups (default true)' },
                includeUnpublishedMarkups: { type: 'boolean', description: 'Include unpublished markups (default true)' },
                includeMarkupLinks: { type: 'boolean', description: 'Include markup links to Sheets, Files, RFIs, Forms, Submittals, Assets (default false)' },
              },
            },
            issueMarkups: {
              type: 'object',
              description: 'Issue markup options',
              properties: {
                includePublishedMarkups: { type: 'boolean', description: 'Include published issue markups (default false)' },
                includeUnpublishedMarkups: { type: 'boolean', description: 'Include unpublished issue markups (default false)' },
              },
            },
            photoMarkups: {
              type: 'object',
              description: 'Photo markup options',
              properties: {
                includePublishedMarkups: { type: 'boolean', description: 'Include published photo markups (default false)' },
                includeUnpublishedMarkups: { type: 'boolean', description: 'Include unpublished photo markups (default false)' },
              },
            },
          },
        },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'sheets'],
    },
  },
  {
    name: 'get_export',
    description: 'Get export job status and download URL (2LO/3LO auth, signedUrl expires in 1 hour)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        exportId: { type: 'string', description: 'Export job ID (UUID, required)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'exportId'],
    },
  },
  {
    name: 'list_collections',
    description: 'List all collections in a project (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
        offset: { type: 'number', description: 'Starting point for results (default 0)' },
        limit: { type: 'number', description: 'Max results per page' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_collection',
    description: 'Get a single collection by ID (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        collectionId: { type: 'string', description: 'Collection ID (UUID, required)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'collectionId'],
    },
  },
  {
    name: 'create_sheets_storage',
    description: 'Create a Sheets-specific OSS storage object for a file upload. Returns a storageUrn to use with create_upload. Note: use this endpoint (not the Data Management POST storage) for sheet uploads.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        fileName: { type: 'string', description: 'File name including extension (e.g. "example.pdf")' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'fileName'],
    },
  },
  {
    name: 'create_upload',
    description: 'Create upload to split PDF files into sheets (POST, 2LO/3LO auth, async)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        versionSetId: { type: 'string', description: 'Version set ID (UUID, required)' },
        files: {
          type: 'array',
          description: 'Files to upload (required, PDF only)',
          items: {
            type: 'object',
            properties: {
              storageType: { type: 'string', description: 'Always "OSS"' },
              storageUrn: { type: 'string', description: 'Storage URN from OSS (required)' },
              name: { type: 'string', description: 'File name (max 255, required)' },
            },
            required: ['storageType', 'storageUrn', 'name'],
          },
        },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'versionSetId', 'files'],
    },
  },
  {
    name: 'list_uploads',
    description: 'List all uploads in a project with pagination (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
        offset: { type: 'number', description: 'Starting point for results (default 0)' },
        limit: { type: 'number', description: 'Max results per page' },
        sort: { type: 'string', description: 'Sort by createdAt or issuanceDate, with asc/desc' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_upload',
    description: 'Get single upload status by ID (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        uploadId: { type: 'string', description: 'Upload ID (UUID, required)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'uploadId'],
    },
  },
  {
    name: 'list_review_sheets',
    description: 'List review sheets in an upload (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        uploadId: { type: 'string', description: 'Upload ID (UUID, required)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
        offset: { type: 'number', description: 'Starting point for results (default 0)' },
        limit: { type: 'number', description: 'Max results per page' },
      },
      required: ['projectId', 'uploadId'],
    },
  },
  {
    name: 'update_review_sheets',
    description: 'Update review sheet metadata (number, title, tags, delete flag) (PATCH, 2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        uploadId: { type: 'string', description: 'Upload ID (UUID, required)' },
        sheets: {
          type: 'array',
          description: 'Array of review sheets to update (required)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Review sheet ID (required)' },
              number: { type: 'string', description: 'Sheet number (max 255)' },
              title: { type: 'string', description: 'Sheet title (max 255)' },
              deleted: { type: 'boolean', description: 'Delete or restore sheet' },
              tags: {
                type: 'array',
                description: 'Tags (max 50 items, max 100 chars per tag)',
                items: { type: 'string' },
              },
            },
            required: ['id'],
          },
        },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'uploadId', 'sheets'],
    },
  },
  {
    name: 'publish_review_sheets',
    description: 'Publish review sheets (POST, 2LO/3LO auth, returns 202 Accepted)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        uploadId: { type: 'string', description: 'Upload ID (UUID, required)' },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'uploadId'],
    },
  },
  {
    name: 'get_thumbnail_urls',
    description: 'Get signed URLs for review sheet thumbnails (POST, 2LO/3LO auth, expire in 1 hour)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, with or without b. prefix)' },
        uploadId: { type: 'string', description: 'Upload ID (UUID, required)' },
        reviewSheetIds: {
          type: 'array',
          description: 'Review sheet IDs (max 100, required)',
          items: { type: 'string' },
        },
        type: {
          type: 'string',
          description: 'Thumbnail size: big (512px), small (256px), tiny (64px) (required)',
          enum: ['big', 'small', 'tiny'],
        },
        userId: { type: 'string', description: 'User ID (Forma ID or Autodesk ID, required for 2LO impersonation)' },
      },
      required: ['projectId', 'uploadId', 'reviewSheetIds', 'type'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleSheetTool(name, args) {
  const projectId = withoutBPrefix(args.projectId);
  const customHeaders = args.userId ? { 'x-user-id': args.userId } : {};

  switch (name) {
    case 'list_version_sets': {
      let path = `/construction/sheets/v1/projects/${projectId}/version-sets`;
      const params = [];

      if (args.offset !== undefined) params.push(`offset=${args.offset}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.sort) params.push(`sort=${args.sort}`);
      if (args.collectionId) params.push(`collectionId=${args.collectionId}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_version_set': {
      const path = `/construction/sheets/v1/projects/${projectId}/version-sets`;
      const body = {
        name: args.name,
        issuanceDate: args.issuanceDate,
      };

      const data = await apiRequest('POST', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_version_set': {
      const path = `/construction/sheets/v1/projects/${projectId}/version-sets/${args.versionSetId}`;
      const body = {};

      if (args.name) body.name = args.name;
      if (args.issuanceDate) body.issuanceDate = args.issuanceDate;

      const data = await apiRequest('PATCH', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'batch_get_version_sets': {
      const path = `/construction/sheets/v1/projects/${projectId}/version-sets:batch-get`;
      const body = { ids: args.ids };

      const data = await apiRequest('POST', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'batch_delete_version_sets': {
      const path = `/construction/sheets/v1/projects/${projectId}/version-sets:batch-delete`;
      const body = { ids: args.ids };

      const data = await apiRequest('POST', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_sheets': {
      let path = `/construction/sheets/v1/projects/${projectId}/sheets`;
      const params = [];

      if (args.currentOnly !== undefined) params.push(`currentOnly=${args.currentOnly}`);
      if (args.filterVersionSetId) params.push(`filter[versionSetId]=${args.filterVersionSetId}`);
      if (args.filterTags && args.filterTags.length > 0) {
        params.push(`filter[tags]=${args.filterTags.join(',')}`);
      }
      if (args.searchText) params.push(`searchText=${encodeURIComponent(args.searchText)}`);
      if (args.fields && args.fields.length > 0) params.push(`fields=${args.fields.join(',')}`);
      if (args.withAllTags !== undefined) params.push(`withAllTags=${args.withAllTags}`);
      if (args.isDeleted !== undefined) params.push(`isDeleted=${args.isDeleted}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.collectionId) params.push(`collectionId=${args.collectionId}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_sheet': {
      const path = `/construction/sheets/v1/projects/${projectId}/sheets/${args.sheetId}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'batch_get_sheets': {
      const path = `/construction/sheets/v1/projects/${projectId}/sheets:batch-get`;
      const body = { ids: args.ids };

      const data = await apiRequest('POST', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'batch_update_sheets': {
      const path = `/construction/sheets/v1/projects/${projectId}/sheets:batch-update`;
      const body = { updates: args.updates };

      const data = await apiRequest('POST', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'batch_delete_sheets': {
      const path = `/construction/sheets/v1/projects/${projectId}/sheets:batch-delete`;
      const body = { ids: args.ids };

      const data = await apiRequest('POST', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data || { status: 'deleted', message: '204 No Content' };
    }

    case 'batch_restore_sheets': {
      const path = `/construction/sheets/v1/projects/${projectId}/sheets:batch-restore`;
      const body = { ids: args.ids };

      const data = await apiRequest('POST', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_export': {
      const path = `/construction/sheets/v1/projects/${projectId}/exports`;
      const body = {
        sheets: args.sheets,
      };

      if (args.options) body.options = args.options;

      const data = await apiRequest('POST', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_export': {
      const path = `/construction/sheets/v1/projects/${projectId}/exports/${args.exportId}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_collections': {
      let path = `/construction/sheets/v1/projects/${projectId}/collections`;
      const params = [];

      if (args.offset !== undefined) params.push(`offset=${args.offset}`);
      if (args.limit) params.push(`limit=${args.limit}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_collection': {
      const path = `/construction/sheets/v1/projects/${projectId}/collections/${args.collectionId}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_sheets_storage': {
      const path = `/construction/sheets/v1/projects/${projectId}/storage`;
      const body = { fileName: args.fileName };

      return apiRequest('POST', path, body, false, customHeaders);
    }

    case 'create_upload': {
      const path = `/construction/sheets/v1/projects/${projectId}/uploads`;
      const body = {
        versionSetId: args.versionSetId,
        files: args.files,
      };

      const data = await apiRequest('POST', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_uploads': {
      let path = `/construction/sheets/v1/projects/${projectId}/uploads`;
      const params = [];

      if (args.offset !== undefined) params.push(`offset=${args.offset}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.sort) params.push(`sort=${args.sort}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_upload': {
      const path = `/construction/sheets/v1/projects/${projectId}/uploads/${args.uploadId}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_review_sheets': {
      let path = `/construction/sheets/v1/projects/${projectId}/uploads/${args.uploadId}/review-sheets`;
      const params = [];

      if (args.offset !== undefined) params.push(`offset=${args.offset}`);
      if (args.limit) params.push(`limit=${args.limit}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path, null, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_review_sheets': {
      const path = `/construction/sheets/v1/projects/${projectId}/uploads/${args.uploadId}/review-sheets`;
      const body = args.sheets;

      const data = await apiRequest('PATCH', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'publish_review_sheets': {
      const path = `/construction/sheets/v1/projects/${projectId}/uploads/${args.uploadId}/review-sheets:publish`;

      const data = await apiRequest('POST', path, {}, false, customHeaders);
      if (typeof data === 'string') return data;
      return data || { status: 'accepted', message: '202 Accepted - Publishing in progress' };
    }

    case 'get_thumbnail_urls': {
      const path = `/construction/sheets/v1/projects/${projectId}/uploads/${args.uploadId}/thumbnails:batch-get`;
      const body = {
        reviewSheetsIds: args.reviewSheetIds,
        type: args.type,
      };

      const data = await apiRequest('POST', path, body, false, customHeaders);
      if (typeof data === 'string') return data;
      return data;
    }

    default:
      return `Unknown sheet tool: ${name}`;
  }
}
