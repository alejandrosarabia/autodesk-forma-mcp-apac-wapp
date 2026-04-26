/**
 * Documents / Files tools.
 *
 * Read operations use 2LO. Write operations (if added) use 3LO.
 *
 * Tools: get_top_folders, get_folder_contents, get_item_versions, search_folder,
 *        create_pdf_export, get_pdf_export_status,
 *        batch_get_versions,
 *        list_custom_attribute_definitions, create_custom_attribute_definition,
 *        batch_update_custom_attributes,
 *        get_naming_standard,
 *        list_linked_revit_files,
 *        list_file_packages, list_package_resources
 *
 * PROJECT ID NOTE:
 *   Data Management API (/data/v1, /project/v1) requires the "b." prefix → withBPrefix()
 *   Files API (/construction/files/v1) accepts with or without "b." → withoutBPrefix()
 */

import { apiRequest, withBPrefix, withoutBPrefix } from '../auth/router.js';
import { paginate } from '../utils/paginate.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const documentTools = [
  {
    name: 'get_top_folders',
    description: 'Get root-level folders for a project',
    inputSchema: {
      type: 'object',
      properties: {
        hubId: {
          type: 'string',
          description: 'Hub ID (from get_hubs)',
        },
        projectId: {
          type: 'string',
          description: 'Project ID (from get_projects)',
        },
      },
      required: ['hubId', 'projectId'],
    },
  },
  {
    name: 'get_folder_contents',
    description: 'List all files and subfolders inside a folder (auto-paginated)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        folderId: { type: 'string', description: 'Folder URN/ID' },
      },
      required: ['projectId', 'folderId'],
    },
  },
  {
    name: 'get_item_versions',
    description: 'Get version history for a file item',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        itemId: { type: 'string', description: 'Item URN/ID' },
      },
      required: ['projectId', 'itemId'],
    },
  },
  {
    name: 'search_folder',
    description: 'Search for items by name within a folder',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
        folderId: { type: 'string', description: 'Folder URN/ID to search within' },
        query: { type: 'string', description: 'Name substring to search for' },
      },
      required: ['projectId', 'folderId', 'query'],
    },
  },
  {
    name: 'get_naming_standard',
    description: 'Retrieve the file naming standard for a project. Returns field definitions (name, type, options, constraints) and metadata fields. Note: one naming standard per project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix optional)' },
        id: { type: 'string', description: 'Naming standard UUID — found in folder attributes under extension.data.namingStandardIds' },
      },
      required: ['projectId', 'id'],
    },
  },
  {
    name: 'list_linked_revit_files',
    description: 'Retrieve metadata and signed download URLs (1-hour expiry) for a published RVT model version and any linked RVT files. Only supported for models published after Feb 7, 2025.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix optional)' },
        versionId: { type: 'string', description: 'Version URN of the published RVT model (will be URL-encoded automatically)' },
        includeHost: { type: 'boolean', description: 'Include the host model signed URL in the response (default true)' },
        limit: { type: 'number', description: 'Max linked models to return (max 600, default 600)' },
        offset: { type: 'number', description: 'Pagination offset' },
        'filter[name]': { type: 'string', description: 'Filter by file name(s) (repeat for multiple)' },
        'filter[publishStatus]': { type: 'string', description: 'Filter by publish status: published, notPublished, or published,notPublished' },
      },
      required: ['projectId', 'versionId'],
    },
  },
  {
    name: 'list_file_packages',
    description: 'Retrieve all file packages in a Forma project. Returns package metadata including locked status, resource count, and version type (FIXED/CURRENT).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix optional)' },
        limit: { type: 'number', description: 'Results per page (1–200, default 200)' },
        offset: { type: 'number', description: 'Pagination offset' },
        'filter[createdBy]': { type: 'string', description: 'Filter by creator Autodesk ID(s) (comma-separated)' },
        'filter[updatedBy]': { type: 'string', description: 'Filter by updater Autodesk ID(s) (comma-separated)' },
        'filter[createdAt]': { type: 'string', description: 'Filter by creation time range (ISO 8601, e.g. "2025-03-01T00:00:00Z..2025-03-31T23:59:59Z")' },
        'filter[updatedAt]': { type: 'string', description: 'Filter by update time range (ISO 8601)' },
        'filter[versionType]': { type: 'string', enum: ['FIXED', 'CURRENT'], description: 'Filter by version type' },
        sort: { type: 'string', description: 'Sort field and direction (e.g. "name", "createdAt desc"). Fields: name, createdAt, updatedAt, displayId' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_package_resources',
    description: 'Retrieve file versions (resources) within a specific package. Includes deleted files (isDeleted=true) and custom attributes.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix optional)' },
        packageId: { type: 'string', description: 'Package UUID from list_file_packages' },
        limit: { type: 'number', description: 'Results per page (1–1000, default 200)' },
        offset: { type: 'number', description: 'Pagination offset' },
        'filter[fileType]': { type: 'string', description: 'Filter by file type(s), comma-separated (e.g. "pdf,rvt")' },
        'filter[version]': { type: 'string', description: 'Filter by version number(s), comma-separated' },
        sort: { type: 'string', description: 'Sort field and direction (e.g. "name desc"). Fields: name, description, updatedAt, approvalStatus, version' },
      },
      required: ['projectId', 'packageId'],
    },
  },
  {
    name: 'create_pdf_export',
    description: 'Export one or more PDFs, DWG 2D views, or RVT sheets/views as a ZIP of PDFs. Async — returns an exportId to poll with get_pdf_export_status. Max 200 files per export.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (with or without b. prefix)' },
        fileVersions: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of file version URNs to export (max 200)',
        },
        outputFileName: { type: 'string', description: 'Output filename without extension' },
        standardMarkups: {
          type: 'object',
          description: 'Options for standard markups',
          properties: {
            includePublishedMarkups: { type: 'boolean', description: 'Include published markups (default true)' },
            includeUnpublishedMarkups: { type: 'boolean', description: 'Include unpublished markups (default true)' },
            includeMarkupLinks: { type: 'boolean', description: 'Include reference links in markups (default false)' },
          },
        },
        issueMarkups: {
          type: 'object',
          description: 'Options for Issues markups',
          properties: {
            includePublishedMarkups: { type: 'boolean', description: 'Include published Issues markups (default false)' },
            includeUnpublishedMarkups: { type: 'boolean', description: 'Include unpublished Issues markups (default false)' },
          },
        },
        photoMarkups: {
          type: 'object',
          description: 'Options for Photos markups',
          properties: {
            includePublishedMarkups: { type: 'boolean', description: 'Include published Photos markups (default false)' },
            includeUnpublishedMarkups: { type: 'boolean', description: 'Include unpublished Photos markups (default false)' },
          },
        },
      },
      required: ['projectId', 'fileVersions'],
    },
  },
  {
    name: 'get_pdf_export_status',
    description: 'Poll the status of a PDF export job. When status is "successful", result.output.signedUrl contains the download URL (valid 1 hour). Status values: processing, successful, failed, partialSuccess.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (with or without b. prefix)' },
        exportId: { type: 'string', description: 'Export job ID from create_pdf_export' },
      },
      required: ['projectId', 'exportId'],
    },
  },
  {
    name: 'batch_get_versions',
    description: 'Retrieve custom attribute values, approval status, and revision info for up to 50 document versions or items. Pass version URNs or item URNs (item URN returns the tip/latest version).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix optional)' },
        urns: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of version URNs or item URNs (max 50)',
        },
      },
      required: ['projectId', 'urns'],
    },
  },
  {
    name: 'list_custom_attribute_definitions',
    description: 'Retrieve all custom attribute definitions for documents in a folder — includes attributes with no assigned value and drop-list options.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix optional)' },
        folderId: { type: 'string', description: 'Folder URN (URL-encoded)' },
        limit: { type: 'number', description: 'Results per page (1–200, default 10)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
      },
      required: ['projectId', 'folderId'],
    },
  },
  {
    name: 'create_custom_attribute_definition',
    description: 'Add a new custom attribute definition to a folder. Name must be unique within the folder. Type: string (text), date, or array (drop-list).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix optional)' },
        folderId: { type: 'string', description: 'Folder URN (URL-encoded)' },
        name: { type: 'string', description: 'Attribute name (unique within folder)' },
        type: { type: 'string', enum: ['string', 'date', 'array'], description: 'Attribute type: string (text field), date, array (drop-list)' },
        arrayValues: { type: 'array', items: { type: 'string' }, description: 'Possible values for drop-list attributes (only for type=array)' },
      },
      required: ['projectId', 'folderId', 'name', 'type'],
    },
  },
  {
    name: 'batch_update_custom_attributes',
    description: 'Assign or clear custom attribute values for a specific document version. Pass null as value to clear an attribute.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b. prefix optional)' },
        versionId: { type: 'string', description: 'Version URN (will be URL-encoded automatically)' },
        attributes: {
          type: 'array',
          description: 'List of attribute updates',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'Custom attribute ID from list_custom_attribute_definitions' },
              value: { description: 'New value (string for text/date/array, or null to clear)' },
            },
            required: ['id', 'value'],
          },
        },
      },
      required: ['projectId', 'versionId', 'attributes'],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapItem(item) {
  return {
    id: item.id,
    name: item.attributes?.displayName || item.attributes?.name,
    type: item.type,
    version: item.attributes?.versionNumber,
    createTime: item.attributes?.createTime,
    lastModifiedTime: item.attributes?.lastModifiedTime,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleDocumentTool(name, args) {
  switch (name) {
    case 'get_top_folders': {
      const { hubId, projectId } = args;
      const bProjectId = withBPrefix(projectId);
      const data = await apiRequest(
        'GET',
        `/project/v1/hubs/${hubId}/projects/${bProjectId}/topFolders`,
      );
      if (typeof data === 'string') return data;
      return (data.data || []).map((f) => ({
        id: f.id,
        name: f.attributes?.displayName || f.attributes?.name,
        type: f.type,
      }));
    }

    case 'get_folder_contents': {
      const { projectId, folderId } = args;
      const bProjectId = withBPrefix(projectId);
      const base = `/data/v1/projects/${bProjectId}/folders/${folderId}/contents`;

      const items = await paginate(async (offset, limit) => {
        const data = await apiRequest('GET', `${base}?page[number]=${offset}&page[limit]=${limit}`);
        if (typeof data === 'string') throw new Error(data);
        return data.data || [];
      }, 100);

      return items.map(mapItem);
    }

    case 'get_item_versions': {
      const { projectId, itemId } = args;
      const bProjectId = withBPrefix(projectId);
      const data = await apiRequest(
        'GET',
        `/data/v1/projects/${bProjectId}/items/${itemId}/versions`,
      );
      if (typeof data === 'string') return data;
      return (data.data || []).map((v) => ({
        id: v.id,
        createTime: v.attributes?.createTime,
        createUserId: v.attributes?.createUserId,
        storageSize: v.attributes?.storageSize,
        versionNumber: v.attributes?.versionNumber,
        mimeType: v.attributes?.mimeType,
      }));
    }

    case 'search_folder': {
      const { projectId, folderId, query } = args;
      const bProjectId = withBPrefix(projectId);
      const encoded = encodeURIComponent(query);
      const data = await apiRequest(
        'GET',
        `/data/v1/projects/${bProjectId}/folders/${folderId}/search?filter[displayName]=${encoded}`,
      );
      if (typeof data === 'string') return data;
      return (data.data || []).map(mapItem);
    }

    case 'get_naming_standard': {
      const cleanId = withoutBPrefix(args.projectId);
      return apiRequest('GET', `/bim360/docs/v1/projects/${cleanId}/naming-standards/${args.id}`);
    }

    case 'list_linked_revit_files': {
      const pid = withoutBPrefix(args.projectId);
      const encodedVersion = encodeURIComponent(args.versionId);
      const params = new URLSearchParams();
      if (args.limit !== undefined) params.set('limit', args.limit);
      if (args.offset !== undefined) params.set('offset', args.offset);
      if (args.includeHost !== undefined) params.set('includeHost', args.includeHost);
      if (args['filter[name]']) params.set('filter[name]', args['filter[name]']);
      if (args['filter[publishStatus]']) params.set('filter[publishStatus]', args['filter[publishStatus]']);
      const qs = params.toString();
      return apiRequest('GET', `/construction/rcm/v1/projects/${pid}/published-versions/${encodedVersion}/linked-files${qs ? `?${qs}` : ''}`);
    }

    case 'list_file_packages': {
      const pid = withoutBPrefix(args.projectId);
      const params = new URLSearchParams();
      if (args.limit !== undefined) params.set('limit', args.limit);
      if (args.offset !== undefined) params.set('offset', args.offset);
      if (args['filter[createdBy]']) params.set('filter[createdBy]', args['filter[createdBy]']);
      if (args['filter[updatedBy]']) params.set('filter[updatedBy]', args['filter[updatedBy]']);
      if (args['filter[createdAt]']) params.set('filter[createdAt]', args['filter[createdAt]']);
      if (args['filter[updatedAt]']) params.set('filter[updatedAt]', args['filter[updatedAt]']);
      if (args['filter[versionType]']) params.set('filter[versionType]', args['filter[versionType]']);
      if (args.sort) params.set('sort', args.sort);
      const qs = params.toString();
      return apiRequest('GET', `/construction/packages/v1/projects/${pid}/packages${qs ? `?${qs}` : ''}`);
    }

    case 'list_package_resources': {
      const pid = withoutBPrefix(args.projectId);
      const params = new URLSearchParams();
      if (args.limit !== undefined) params.set('limit', args.limit);
      if (args.offset !== undefined) params.set('offset', args.offset);
      if (args['filter[fileType]']) params.set('filter[fileType]', args['filter[fileType]']);
      if (args['filter[version]']) params.set('filter[version]', args['filter[version]']);
      if (args.sort) params.set('sort', args.sort);
      const qs = params.toString();
      return apiRequest('GET', `/construction/packages/v1/projects/${pid}/packages/${args.packageId}/resources${qs ? `?${qs}` : ''}`);
    }

    case 'batch_get_versions': {
      const cleanId = withoutBPrefix(args.projectId);
      return apiRequest('POST', `/bim360/docs/v1/projects/${cleanId}/versions:batch-get`, { urns: args.urns });
    }

    case 'list_custom_attribute_definitions': {
      const cleanId = withoutBPrefix(args.projectId);
      const params = new URLSearchParams();
      if (args.limit !== undefined) params.set('limit', args.limit);
      if (args.offset !== undefined) params.set('offset', args.offset);
      const qs = params.toString();
      const encodedFolder = encodeURIComponent(args.folderId);
      return apiRequest('GET', `/bim360/docs/v1/projects/${cleanId}/folders/${encodedFolder}/custom-attribute-definitions${qs ? `?${qs}` : ''}`);
    }

    case 'create_custom_attribute_definition': {
      const cleanId = withoutBPrefix(args.projectId);
      const encodedFolder = encodeURIComponent(args.folderId);
      const body = { name: args.name, type: args.type };
      if (args.arrayValues) body.arrayValues = args.arrayValues;
      return apiRequest('POST', `/bim360/docs/v1/projects/${cleanId}/folders/${encodedFolder}/custom-attribute-definitions`, body);
    }

    case 'batch_update_custom_attributes': {
      const cleanId = withoutBPrefix(args.projectId);
      const encodedVersion = encodeURIComponent(args.versionId);
      return apiRequest('POST', `/bim360/docs/v1/projects/${cleanId}/versions/${encodedVersion}/custom-attributes:batch-update`, args.attributes);
    }

    case 'create_pdf_export': {
      const pid = withoutBPrefix(args.projectId);
      const body = { fileVersions: args.fileVersions };
      const options = {};
      if (args.outputFileName) options.outputFileName = args.outputFileName;
      if (args.standardMarkups) options.standardMarkups = args.standardMarkups;
      if (args.issueMarkups)    options.issueMarkups = args.issueMarkups;
      if (args.photoMarkups)    options.photoMarkups = args.photoMarkups;
      if (Object.keys(options).length > 0) body.options = options;
      return apiRequest('POST', `/construction/files/v1/projects/${pid}/exports`, body);
    }

    case 'get_pdf_export_status': {
      const pid = withoutBPrefix(args.projectId);
      return apiRequest('GET', `/construction/files/v1/projects/${pid}/exports/${args.exportId}`);
    }

    default:
      return `Unknown document tool: ${name}`;
  }
}
