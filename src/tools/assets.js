/**
 * Assets tools — always use 3LO.
 *
 * Tools: list_assets, get_asset, create_assets, update_assets, delete_assets,
 *        list_asset_categories, list_asset_statuses, list_asset_custom_attributes
 *
 * ACC Assets API v2. Path shape:
 *   /construction/assets/v2/projects/{projectId}/...
 * projectId = bare UUID — b. prefix stripped via withoutBPrefix().
 *
 * Pagination: { pagination: { limit, offset, totalResults, nextUrl }, results: [] }
 * All list tools auto-paginate unless caller passes an explicit limit.
 */

import { apiRequest, withoutBPrefix } from '../auth/router.js';

// ─── Pagination helper ────────────────────────────────────────────────────────

/**
 * Fetch all pages from a v2 paginated endpoint.
 * @param {Function} fetchFn  async (offset, limit) => raw API response object
 * @param {number}   pageSize items per request (default 50, max 200)
 * @param {number}   [max]    stop after this many results (undefined = all)
 */
async function paginateV2(fetchFn, pageSize = 50, max = undefined) {
  const items = [];
  let offset = 0;

  while (true) {
    const data = await fetchFn(offset, pageSize);
    if (typeof data === 'string') throw new Error(data);
    const page = data.results || data.data || [];
    items.push(...page);
    if (max !== undefined && items.length >= max) return items.slice(0, max);
    if (!data.pagination?.nextUrl || page.length < pageSize) break;
    offset += page.length;
  }

  return items;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const assetTools = [
  {
    name: 'list_assets',
    description:
      'List assets in a project. Accepts optional filters for category, status, and free-text search. ' +
      'WARNING: Large projects (BIM/Revit-synced) can have 10,000+ assets — always use filters or a limit to avoid rate limiting. ' +
      'Default limit is 200 if no limit is specified. ' +
      'Set includeCustomAttributes=true to include custom attribute values on each asset. ' +
      'projectId should include the b. prefix — it is stripped internally.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:               { type: 'string', description: 'Project ID (b.{uuid} format)' },
        categoryId:              { type: 'string', description: 'Filter by asset category ID (numeric string)' },
        statusId:                { type: 'string', description: 'Filter by asset status UUID' },
        search:                  { type: 'string', description: 'Free-text search across tag, description, and custom fields' },
        includeCustomAttributes: { type: 'boolean', description: 'Include custom attribute values on each asset (default false)' },
        includeDeleted:          { type: 'boolean', description: 'Include soft-deleted assets (default false)' },
        updatedAfter:            { type: 'string', description: 'ISO 8601 datetime — return only assets updated at or after this time' },
        limit:                   { type: 'number', description: 'Results per page (default 200, max 200). Use cursorState to get the next page.' },
        cursorState:             { type: 'string', description: 'Cursor token from a previous response\'s nextCursorState field — used to fetch the next page.' },
        sort:                    { type: 'string', description: 'Sort order, e.g. "clientAssetId" or "-createdAt"' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_asset',
    description:
      'Get full details of a single asset by its UUID. ' +
      'Uses the batch-get endpoint internally (the v2 API has no single-item GET). ' +
      'Set includeCustomAttributes=true to include custom attribute values. ' +
      'projectId should include the b. prefix.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:               { type: 'string', description: 'Project ID (b.{uuid} format)' },
        assetId:                 { type: 'string', description: 'Asset UUID (from list_assets)' },
        includeCustomAttributes: { type: 'boolean', description: 'Include custom attribute values (default false)' },
      },
      required: ['projectId', 'assetId'],
    },
  },
  {
    name: 'get_assets',
    description:
      'Fetch multiple assets by their UUIDs in a single batch call. ' +
      'Invalid or non-existent IDs are silently omitted from the response. ' +
      'Set includeCustomAttributes=true to include custom attribute values.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:               { type: 'string', description: 'Project ID (b.{uuid} format)' },
        assetIds:                { type: 'array', items: { type: 'string' }, description: 'Array of asset UUIDs to fetch (max 100)' },
        includeCustomAttributes: { type: 'boolean', description: 'Include custom attribute values (default false)' },
      },
      required: ['projectId', 'assetIds'],
    },
  },
  {
    name: 'create_assets',
    description:
      'Create one or more assets in a project in a single batch call. ' +
      'Each asset object supports categoryId, statusId, description, clientAssetId, and customAttributes. ' +
      'Returns the created asset objects with their assigned UUIDs.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        assets: {
          type: 'array',
          description: 'Array of asset objects to create',
          items: {
            type: 'object',
            properties: {
              clientAssetId:    { type: 'string', description: 'User-visible tag / ID (e.g. "PUMP-001")' },
              categoryId:       { type: 'string', description: 'Asset category ID — numeric string (from list_asset_categories)' },
              statusId:         { type: 'string', description: 'Asset status UUID (from list_asset_statuses)' },
              description:      { type: 'string' },
              barcode:          { type: 'string', description: 'Barcode value for the asset' },
              customAttributes: { type: 'object', description: 'Key-value map of custom attribute name (e.g. "ca1") to value ID or primitive value' },
            },
          },
        },
      },
      required: ['projectId', 'assets'],
    },
  },
  {
    name: 'update_assets',
    description:
      'Update one or more existing assets in a single batch call. ' +
      'Each patch object must include the asset id (UUID). Unspecified fields are left unchanged.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        assets: {
          type: 'array',
          description: 'Array of patch objects — each must include id',
          items: {
            type: 'object',
            properties: {
              id:               { type: 'string', description: 'Asset UUID to update' },
              clientAssetId:    { type: 'string' },
              categoryId:       { type: 'string' },
              statusId:         { type: 'string' },
              description:      { type: 'string' },
              barcode:          { type: 'string' },
              customAttributes: { type: 'object' },
            },
            required: ['id'],
          },
        },
      },
      required: ['projectId', 'assets'],
    },
  },
  {
    name: 'delete_assets',
    description:
      'Soft-delete one or more assets by their UUIDs. ' +
      'Deleted assets become inactive (isActive: false) but their records remain and can still be retrieved. ' +
      'Requires data:write scope.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        assetIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of asset UUIDs to delete',
        },
      },
      required: ['projectId', 'assetIds'],
    },
  },
  {
    name: 'list_asset_categories',
    description:
      'List all asset category definitions for a project (full tree, returned in one call — no pagination). ' +
      'Returns id (numeric string), name, parentId, isRoot, isLeaf, and isActive. ' +
      'Use the id as categoryId when creating or filtering assets. ' +
      'Category IDs are numeric strings (e.g. "2"), not UUIDs. ' +
      'Set filterActive=true to return only active categories. ' +
      'Set updatedAfter to an ISO 8601 datetime to return only categories changed since that time.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:    { type: 'string', description: 'Project ID (b.{uuid} format)' },
        filterActive: { type: 'boolean', description: 'Return only active categories (default false — returns all)' },
        updatedAfter: { type: 'string', description: 'ISO 8601 datetime — return only categories updated at or after this time' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_asset_categories',
    description:
      'Fetch specific asset categories by their IDs. ' +
      'More efficient than list_asset_categories when you only need a few specific nodes. ' +
      'Invalid IDs are silently omitted from the response. ' +
      'Category IDs are numeric strings (e.g. "1", "2").',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:   { type: 'string', description: 'Project ID (b.{uuid} format)' },
        categoryIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Numeric string IDs of categories to fetch',
        },
      },
      required: ['projectId', 'categoryIds'],
    },
  },
  {
    name: 'create_asset_category',
    description:
      'Create a new category in the project\'s asset category tree. ' +
      'The new category must have a parentId — use list_asset_categories to find the parent. ' +
      'Set includeUid=true to also return the universally unique UUID (uid) for the category — ' +
      'this uid is required when creating relationships via create_relationships.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:   { type: 'string', description: 'Project ID (b.{uuid} format)' },
        name:        { type: 'string', description: 'Category name — must be unique among siblings' },
        parentId:    { type: 'string', description: 'Numeric string ID of the parent category (from list_asset_categories)' },
        description: { type: 'string', description: 'Optional description of the category' },
        includeUid:  { type: 'boolean', description: 'Include the universally unique category UUID (uid) in the response (default false)' },
      },
      required: ['projectId', 'name', 'parentId'],
    },
  },
  {
    name: 'list_status_sets',
    description:
      'List all status sets in a project. Auto-paginates all results. ' +
      'Each status set has a name, isDefault flag, and a values array of status objects (label, color, sortOrder). ' +
      'Use the status set id with assign_category_status_set to assign it to a category.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:      { type: 'string', description: 'Project ID (b.{uuid} format)' },
        includeDeleted: { type: 'boolean', description: 'Include soft-deleted status sets (default false)' },
        updatedAfter:   { type: 'string', description: 'ISO 8601 datetime — return only status sets updated at or after this time' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_status_sets',
    description:
      'Fetch specific status sets by their UUIDs. ' +
      'Returns the full status set including its values array. Invalid IDs are silently omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:      { type: 'string', description: 'Project ID (b.{uuid} format)' },
        statusSetIds:   { type: 'array', items: { type: 'string' }, description: 'Array of status set UUIDs to fetch' },
        includeDeleted: { type: 'boolean', description: 'Include soft-deleted status sets (default false)' },
      },
      required: ['projectId', 'statusSetIds'],
    },
  },
  {
    name: 'create_status_set',
    description:
      'Create a new status set for a project. ' +
      'Provide a name and an array of status values (each with label, optional description and color). ' +
      'Valid color values are Autodesk design tokens e.g. "adsk-green-500", "adsk-red-700".',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:   { type: 'string', description: 'Project ID (b.{uuid} format)' },
        name:        { type: 'string', description: 'Display name for the status set (max 100 chars)' },
        description: { type: 'string', description: 'Optional description (max 500 chars)' },
        values: {
          type: 'array',
          description: 'Array of status definitions',
          items: {
            type: 'object',
            properties: {
              label:       { type: 'string', description: 'Status label — must be unique within this set' },
              description: { type: 'string' },
              color:       { type: 'string', description: 'Autodesk color token e.g. "adsk-green-500"' },
            },
            required: ['label'],
          },
        },
      },
      required: ['projectId', 'name', 'values'],
    },
  },
  {
    name: 'get_category_status_sets',
    description:
      'Get the status set assignments for a set of categories. ' +
      'By default returns only explicitly assigned status sets. ' +
      'Set includeInherited=true to also return inherited assignments (with inheritedFromCategoryId field).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:        { type: 'string', description: 'Project ID (b.{uuid} format)' },
        categoryIds:      { type: 'array', items: { type: 'string' }, description: 'Numeric string category IDs to query' },
        includeInherited: { type: 'boolean', description: 'Include inherited status set assignments (default false)' },
      },
      required: ['projectId', 'categoryIds'],
    },
  },
  {
    name: 'assign_category_status_set',
    description:
      'Assign a status set to a category. Overwrites any existing assignment (explicit or inherited). ' +
      'Only one status set can be assigned to a category at a time.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:     { type: 'string', description: 'Project ID (b.{uuid} format)' },
        categoryId:    { type: 'string', description: 'Numeric string category ID' },
        statusSetId:   { type: 'string', description: 'UUID of the status set to assign' },
      },
      required: ['projectId', 'categoryId', 'statusSetId'],
    },
  },
  {
    name: 'list_asset_statuses',
    description:
      'List all asset statuses in a project (auto-paginates using cursorState). ' +
      'Returns id, label, color, statusSetId, bucket, sortOrder, isActive. ' +
      'Use statusId when creating or filtering assets.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:      { type: 'string', description: 'Project ID (b.{uuid} format)' },
        includeDeleted: { type: 'boolean', description: 'Include soft-deleted statuses (default false)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_asset_status',
    description:
      'Create a new individual status and add it to an existing status set. ' +
      'label must be unique (case-insensitive) within the target status set. ' +
      'Valid color values are Autodesk design tokens e.g. "adsk-green-500", "adsk-red-700".',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:   { type: 'string', description: 'Project ID (b.{uuid} format)' },
        label:       { type: 'string', description: 'Display label — unique within the status set' },
        statusSetId: { type: 'string', description: 'UUID of the status set this status belongs to' },
        description: { type: 'string' },
        color:       { type: 'string', description: 'Autodesk color token e.g. "adsk-green-500"' },
      },
      required: ['projectId', 'label', 'statusSetId'],
    },
  },
  {
    name: 'get_asset_statuses',
    description:
      'Fetch specific asset statuses by their UUIDs. ' +
      'Invalid IDs are silently omitted from the response.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:      { type: 'string', description: 'Project ID (b.{uuid} format)' },
        statusIds:      { type: 'array', items: { type: 'string' }, description: 'Array of status UUIDs to fetch' },
        includeDeleted: { type: 'boolean', description: 'Include soft-deleted statuses (default false)' },
      },
      required: ['projectId', 'statusIds'],
    },
  },
  {
    name: 'list_asset_custom_attributes',
    description:
      'List all custom attribute definitions for assets in a project (auto-paginates via cursorState). ' +
      'Returns id, name, displayName, dataType, requiredOnIngress, enumValues, and values for select types. ' +
      'Use the name field as the key in the customAttributes map when creating or updating assets.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:      { type: 'string', description: 'Project ID (b.{uuid} format)' },
        includeDeleted: { type: 'boolean', description: 'Include soft-deleted attributes (default false)' },
        updatedAfter:   { type: 'string', description: 'ISO 8601 datetime — return only attributes updated at or after this time' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_asset_custom_attributes',
    description:
      'Fetch specific custom attributes by their UUIDs and/or immutable names. ' +
      'At least one of ids or names must be provided. Invalid IDs/names are silently omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:      { type: 'string', description: 'Project ID (b.{uuid} format)' },
        ids:            { type: 'array', items: { type: 'string' }, description: 'Array of custom attribute UUIDs' },
        names:          { type: 'array', items: { type: 'string' }, description: 'Array of immutable custom attribute names (not displayName)' },
        includeDeleted: { type: 'boolean', description: 'Include soft-deleted attributes (default false)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_asset_custom_attribute',
    description:
      'Create a new custom attribute definition for assets in a project. ' +
      'dataType cannot be changed after creation. ' +
      'For select/multi_select types, provide enumValues array. ' +
      'dataType options: boolean, text, numeric, date, select, multi_select.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:          { type: 'string', description: 'Project ID (b.{uuid} format)' },
        displayName:        { type: 'string', description: 'Human-readable name — must be unique in project (max 100 chars)' },
        dataType:           { type: 'string', enum: ['boolean', 'text', 'numeric', 'date', 'select', 'multi_select'], description: 'Value type — cannot be changed after creation' },
        requiredOnIngress:  { type: 'boolean', description: 'Whether this attribute is required when creating/editing assets' },
        description:        { type: 'string', description: 'Optional description (max 1000 chars)' },
        enumValues:         { type: 'array', items: { type: 'string' }, description: 'Required for select/multi_select — list of allowed value display names' },
        maxLengthOnIngress: { type: 'number', description: 'Max text length for text type (default and max: 250)' },
        defaultValue:       { description: 'Default value — string, array of strings, or boolean depending on dataType' },
      },
      required: ['projectId', 'displayName', 'dataType', 'requiredOnIngress'],
    },
  },
  {
    name: 'get_location_nodes',
    description:
      'Fetch location tree nodes for a project, optionally filtered by specific node IDs. ' +
      'Used to resolve the locationId field on assets into human-readable location names. ' +
      'Returns id, parentId, type, name, description, order, and areaDefined fields.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format — b. prefix is stripped internally)' },
        nodeIds:   { type: 'array', items: { type: 'string' }, description: 'Optional list of specific location node UUIDs to fetch (omit to fetch all)' },
        limit:     { type: 'number', description: 'Page size (default 200, max 200)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_asset_relationships',
    description:
      'Search for relationships linking assets to other entities (issues, forms, photos, documents, sheets, submittals). ' +
      'domain is always "autodesk-bim360-asset" and type is always "asset". ' +
      'Optionally filter by a specific assetId, or by the related entity domain/type/id. ' +
      'Returns relationship records each containing an entities array with both sides of the link.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:    { type: 'string', description: 'Project ID (b.{uuid} format — used as the relationship container ID)' },
        assetId:      { type: 'string', description: 'Optional — filter to relationships for a specific asset UUID' },
        withDomain:   { type: 'string', description: 'Optional — filter by related entity domain (e.g. "autodesk-bim360-issue", "autodesk-construction-form", "autodesk-construction-photo", "autodesk-construction-submittals")' },
        withType:     { type: 'string', description: 'Optional — filter by related entity type (e.g. "issue", "form", "photo", "submittalitem", "documentlineage")' },
        withId:       { type: 'string', description: 'Optional — filter by a specific related entity ID (e.g. a specific issue UUID)' },
        continuationToken: { type: 'string', description: 'Pagination continuation token from a previous response' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'assign_category_custom_attribute',
    description:
      'Assign a custom attribute to a category. ' +
      'Returns all custom attributes assigned to the category after the assignment. ' +
      'Set includeInherited=true to also include inherited assignments in the response — inherited entries include an inheritedFromCategoryId field.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:         { type: 'string', description: 'Project ID (b.{uuid} format)' },
        categoryId:        { type: 'string', description: 'Numeric string category ID (from list_asset_categories)' },
        customAttributeId: { type: 'string', description: 'Custom attribute UUID to assign (from list/get_asset_custom_attributes)' },
        includeInherited:  { type: 'boolean', description: 'Include inherited custom attributes in response (default false)' },
      },
      required: ['projectId', 'categoryId', 'customAttributeId'],
    },
  },
  {
    name: 'get_category_custom_attributes',
    description:
      'Get the custom attribute assignments for a specific category. ' +
      'By default returns only explicitly assigned custom attributes. ' +
      'Set includeInherited=true to also return inherited assignments — inherited entries include an inheritedFromCategoryId field. ' +
      'Note: all results are returned in one call (no pagination despite pagination fields in response).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:        { type: 'string', description: 'Project ID (b.{uuid} format)' },
        categoryId:       { type: 'string', description: 'Numeric string category ID (from list_asset_categories)' },
        includeInherited: { type: 'boolean', description: 'Include custom attributes inherited from ancestor categories (default false)' },
      },
      required: ['projectId', 'categoryId'],
    },
  },
  {
    name: 'update_asset_custom_attribute',
    description:
      'Update an existing custom attribute definition. All fields are optional — only provided fields are changed. ' +
      'dataType can only be changed if no assets currently have a value for this attribute. ' +
      'If changing dataType to select or multi_select, enumValues is required. ' +
      'Use get_asset_custom_attributes to find the customAttributeId.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:           { type: 'string', description: 'Project ID (b.{uuid} format)' },
        customAttributeId:   { type: 'string', description: 'Custom attribute UUID (from list/get_asset_custom_attributes)' },
        displayName:         { type: 'string', description: 'New human-readable name — must remain unique in project' },
        dataType:            { type: 'string', enum: ['boolean', 'text', 'numeric', 'date', 'select', 'multi_select'], description: 'New value type — only changeable if no assets have this attribute set' },
        requiredOnIngress:   { type: 'boolean', description: 'Whether this attribute is required when creating/editing assets' },
        description:         { type: 'string', description: 'Optional description (max 1000 chars)' },
        enumValues:          { type: 'array', items: { type: 'string' }, description: 'Allowed values for select/multi_select types' },
        maxLengthOnIngress:  { type: 'number', description: 'Max text length for text type (max: 250)' },
        defaultValue:        { description: 'Default value — string, array of strings, or boolean depending on dataType' },
      },
      required: ['projectId', 'customAttributeId'],
    },
  },
];

// ─── Response mappers ─────────────────────────────────────────────────────────

function mapCustomAttribute(a) {
  return {
    id:                 a.id,
    name:               a.name,
    displayName:        a.displayName,
    description:        a.description ?? null,
    dataType:           a.dataType,
    requiredOnIngress:  a.requiredOnIngress,
    maxLengthOnIngress: a.maxLengthOnIngress ?? null,
    defaultValue:       a.defaultValue ?? null,
    enumValues:         a.enumValues ?? [],
    values:             (a.values || []).map(v => ({
      id:          v.id,
      displayName: v.displayName,
      isActive:    v.isActive,
    })),
    isActive:           a.isActive,
    version:            a.version,
    createdAt:          a.createdAt,
    updatedAt:          a.updatedAt,
  };
}

function mapStatus(s) {
  return {
    id:             s.id,
    label:          s.label,
    description:    s.description ?? null,
    color:          s.color ?? null,
    statusSetId:    s.statusStepSetId,
    bucket:         s.bucket,
    sortOrder:      s.sortOrder,
    isActive:       s.isActive,
    version:        s.version,
    createdAt:      s.createdAt,
    updatedAt:      s.updatedAt,
  };
}

function mapStatusSet(s) {
  return {
    id:          s.id,
    name:        s.name,
    description: s.description ?? null,
    isDefault:   s.isDefault ?? false,
    isActive:    s.isActive,
    version:     s.version,
    values:      (s.values || []).map(v => ({
      id:               v.id,
      label:            v.label,
      description:      v.description ?? null,
      color:            v.color ?? null,
      sortOrder:        v.sortOrder,
      bucket:           v.bucket,
      statusStepSetId:  v.statusStepSetId,
      isActive:         v.isActive,
    })),
    createdAt:   s.createdAt,
    updatedAt:   s.updatedAt,
  };
}

function mapAsset(a) {
  return {
    id:               a.id,
    version:          a.version,
    isActive:         a.isActive,
    clientAssetId:    a.clientAssetId,
    description:      a.description,
    categoryId:       a.categoryId,
    statusId:         a.statusId,
    locationId:       a.locationId,
    barcode:          a.barcode,
    companyId:        a.companyId,
    customAttributes: a.customAttributes,
    createdAt:        a.createdAt,
    createdBy:        a.createdBy,
    updatedAt:        a.updatedAt,
    updatedBy:        a.updatedBy,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleAssetTool(name, args) {
  const pid  = withoutBPrefix(args.projectId);
  const base = `/construction/assets/v2/projects/${pid}`;

  switch (name) {

    case 'list_assets': {
      const { categoryId, statusId, search, includeCustomAttributes, includeDeleted, updatedAfter, sort, cursorState } = args;
      const limit = args.limit ?? 200; // default 200 — prevents runaway pagination on BIM-synced projects

      // Assets v2 uses cursor-based pagination — offset param is ignored, must use cursorState from previous response
      const pageSize = Math.min(limit, 200);
      const params = new URLSearchParams({ limit: String(pageSize), offset: '0' });
      if (cursorState)             params.set('cursorState',           cursorState);
      if (categoryId)              params.set('filter[categoryId]',    categoryId);
      if (statusId)                params.set('filter[statusId]',      statusId);
      if (search)                  params.set('filter[search]',        search);
      if (sort)                    params.set('sort',                   sort);
      if (includeCustomAttributes) params.set('includeCustomAttributes', 'true');
      if (includeDeleted)          params.set('includeDeleted',        'true');
      if (updatedAfter)            params.set('filter[updatedAt]',     `${updatedAfter}...`);

      const data = await apiRequest('GET', `${base}/assets?${params.toString()}`);
      if (typeof data === 'string') return data;
      const items = (data.results || []).map(mapAsset);
      // Return nextCursorState so caller can fetch the next page
      const nextCursorState = data.pagination?.nextUrl
        ? new URL(data.pagination.nextUrl).searchParams.get('cursorState')
        : null;
      return { assets: items, count: items.length, nextCursorState: nextCursorState || undefined };
    }

    case 'get_asset': {
      const { assetId, includeCustomAttributes } = args;
      const qs = includeCustomAttributes ? '?includeCustomAttributes=true' : '';
      const data = await apiRequest(
        'POST',
        `${base}/assets:batch-get${qs}`,
        { ids: [assetId] },
      );
      if (typeof data === 'string') return data;
      const results = data.results || data || [];
      if (results.length === 0) return `Asset ${assetId} not found`;
      return mapAsset(results[0]);
    }

    case 'get_assets': {
      const { assetIds, includeCustomAttributes } = args;
      const qs = includeCustomAttributes ? '?includeCustomAttributes=true' : '';
      const data = await apiRequest(
        'POST',
        `${base}/assets:batch-get${qs}`,
        { ids: assetIds },
      );
      if (typeof data === 'string') return data;
      return (data.results || []).map(mapAsset);
    }

    case 'create_assets': {
      const { assets } = args;
      const data = await apiRequest('POST', `${base}/assets:batch-create`, assets);
      if (typeof data === 'string') return data;
      const results = data.results || data || [];
      return results.map(mapAsset);
    }

    case 'update_assets': {
      const { assets } = args;
      // API expects object keyed by asset ID: { "<id>": { field: value, ... }, ... }
      const body = {};
      for (const { id, ...fields } of assets) {
        body[id] = fields;
      }
      const data = await apiRequest('PATCH', `${base}/assets:batch-patch`, body);
      if (typeof data === 'string') return data;
      // Response is also an object keyed by asset ID
      return Object.values(data).map(mapAsset);
    }

    case 'delete_assets': {
      const { assetIds } = args;
      // API expects { ids: [...] } and returns 204 No Content on success
      const data = await apiRequest('POST', `${base}/assets:batch-delete`, { ids: assetIds });
      if (typeof data === 'string') return data;
      return { success: true, deleted: assetIds.length };
    }

    case 'get_asset_categories': {
      const { categoryIds } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const data = await apiRequest('POST', `${v1base}/categories:batch-get`, { ids: categoryIds });
      if (typeof data === 'string') return data;
      return (data.results || []).map(c => ({
        id:            c.id,
        name:          c.name,
        description:   c.description ?? null,
        parentId:      c.parentId ?? null,
        subcategoryIds:c.subcategoryIds ?? [],
        isRoot:        c.isRoot ?? false,
        isLeaf:        c.isLeaf ?? false,
        isActive:      c.isActive ?? true,
      }));
    }

    case 'create_asset_category': {
      const { name, parentId, description, includeUid } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const body = { name, parentId };
      if (description) body.description = description;
      const qs = includeUid ? '?includeUid=true' : '';
      const data = await apiRequest('POST', `${v1base}/categories${qs}`, body);
      if (typeof data === 'string') return data;
      const result = {
        id:            data.id,
        name:          data.name,
        description:   data.description ?? null,
        parentId:      data.parentId ?? null,
        subcategoryIds:data.subcategoryIds ?? [],
        isRoot:        data.isRoot ?? false,
        isLeaf:        data.isLeaf ?? true,
        isActive:      data.isActive ?? true,
      };
      if (data.uid !== undefined) result.uid = data.uid;
      return result;
    }

    case 'list_asset_categories': {
      // v1 path, no pagination support — returns full tree in one call
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const params = new URLSearchParams();
      if (args.filterActive) params.set('filter[isActive]', 'true');
      if (args.updatedAfter) params.set('filter[updatedAt]', `${args.updatedAfter}...`);
      const qs = params.toString();
      const data = await apiRequest('GET', `${v1base}/categories${qs ? '?' + qs : ''}`);
      if (typeof data === 'string') return data;
      const items = data.results || [];
      return items.map(c => ({
        id:            c.id,
        name:          c.name,
        description:   c.description ?? null,
        parentId:      c.parentId ?? null,
        subcategoryIds:c.subcategoryIds ?? [],
        isRoot:        c.isRoot ?? false,
        isLeaf:        c.isLeaf ?? false,
        isActive:      c.isActive ?? true,
      }));
    }

    case 'list_status_sets': {
      const { includeDeleted, updatedAfter } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const items = [];
      let cursorState = null;
      while (true) {
        const params = new URLSearchParams({ limit: '200' });
        if (includeDeleted) params.set('includeDeleted', 'true');
        if (updatedAfter)   params.set('filter[updatedAt]', `${updatedAfter}...`);
        if (cursorState)    params.set('cursorState', cursorState);
        const data = await apiRequest('GET', `${v1base}/status-step-sets?${params.toString()}`);
        if (typeof data === 'string') throw new Error(data);
        items.push(...(data.results || []));
        if (!data.pagination?.cursorState) break;
        cursorState = data.pagination.cursorState;
      }
      return items.map(mapStatusSet);
    }

    case 'get_status_sets': {
      const { statusSetIds, includeDeleted } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const params = new URLSearchParams();
      if (includeDeleted) params.set('includeDeleted', 'true');
      const qs = params.toString();
      const data = await apiRequest(
        'POST',
        `${v1base}/status-step-sets:batch-get${qs ? '?' + qs : ''}`,
        { ids: statusSetIds },
      );
      if (typeof data === 'string') return data;
      return (data.results || []).map(mapStatusSet);
    }

    case 'create_status_set': {
      const { name, description, values } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const body = { name, values };
      if (description) body.description = description;
      const data = await apiRequest('POST', `${v1base}/status-step-sets`, body);
      if (typeof data === 'string') return data;
      return mapStatusSet(data);
    }

    case 'get_category_status_sets': {
      const { categoryIds, includeInherited } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const params = new URLSearchParams();
      if (includeInherited) params.set('includeInherited', 'true');
      const qs = params.toString();
      const data = await apiRequest(
        'POST',
        `${v1base}/category-status-step-sets/status-step-sets:batch-get${qs ? '?' + qs : ''}`,
        { ids: categoryIds },
      );
      if (typeof data === 'string') return data;
      return data.results || [];
    }

    case 'assign_category_status_set': {
      const { categoryId, statusSetId } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const data = await apiRequest(
        'PUT',
        `${v1base}/categories/${categoryId}/status-step-set/${statusSetId}`,
      );
      if (typeof data === 'string') return data;
      return {
        id:            data.id,
        categoryId:    data.categoryId,
        statusSetId:   data.statusStepSetId,
        isActive:      data.isActive,
        createdAt:     data.createdAt,
        updatedAt:     data.updatedAt,
      };
    }

    case 'list_asset_statuses': {
      const { includeDeleted } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const items = [];
      let cursorState = null;
      while (true) {
        const params = new URLSearchParams({ limit: '200' });
        if (includeDeleted) params.set('includeDeleted', 'true');
        if (cursorState)    params.set('cursorState', cursorState);
        const data = await apiRequest('GET', `${v1base}/asset-statuses?${params.toString()}`);
        if (typeof data === 'string') throw new Error(data);
        items.push(...(data.results || []));
        if (!data.pagination?.cursorState) break;
        cursorState = data.pagination.cursorState;
      }
      return items.map(mapStatus);
    }

    case 'create_asset_status': {
      const { label, statusSetId, description, color } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const body = { label, statusStepSetId: statusSetId };
      if (description) body.description = description;
      if (color)       body.color       = color;
      const data = await apiRequest('POST', `${v1base}/asset-statuses`, body);
      if (typeof data === 'string') return data;
      return mapStatus(data);
    }

    case 'get_asset_statuses': {
      const { statusIds, includeDeleted } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const params = new URLSearchParams();
      if (includeDeleted) params.set('includeDeleted', 'true');
      const qs = params.toString();
      const data = await apiRequest(
        'POST',
        `${v1base}/asset-statuses:batch-get${qs ? '?' + qs : ''}`,
        { ids: statusIds },
      );
      if (typeof data === 'string') return data;
      return (data.results || []).map(mapStatus);
    }

    case 'list_asset_custom_attributes': {
      const { includeDeleted, updatedAfter } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const items = [];
      let cursorState = null;
      while (true) {
        const params = new URLSearchParams({ limit: '200' });
        if (includeDeleted) params.set('includeDeleted', 'true');
        if (updatedAfter)   params.set('filter[updatedAt]', `${updatedAfter}...`);
        if (cursorState)    params.set('cursorState', cursorState);
        const data = await apiRequest('GET', `${v1base}/custom-attributes?${params.toString()}`);
        if (typeof data === 'string') throw new Error(data);
        items.push(...(data.results || []));
        if (!data.pagination?.cursorState) break;
        cursorState = data.pagination.cursorState;
      }
      return items.map(mapCustomAttribute);
    }

    case 'get_asset_custom_attributes': {
      const { ids, names, includeDeleted } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const params = new URLSearchParams();
      if (includeDeleted) params.set('includeDeleted', 'true');
      const qs = params.toString();
      const body = {};
      if (ids   && ids.length)   body.ids   = ids;
      if (names && names.length) body.names = names;
      const data = await apiRequest(
        'POST',
        `${v1base}/custom-attributes:batch-get${qs ? '?' + qs : ''}`,
        body,
      );
      if (typeof data === 'string') return data;
      return (data.results || []).map(mapCustomAttribute);
    }

    case 'create_asset_custom_attribute': {
      const { displayName, dataType, requiredOnIngress, description, enumValues, maxLengthOnIngress, defaultValue } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const body = { displayName, dataType, requiredOnIngress };
      if (description         !== undefined) body.description         = description;
      if (enumValues          !== undefined) body.enumValues          = enumValues;
      if (maxLengthOnIngress  !== undefined) body.maxLengthOnIngress  = maxLengthOnIngress;
      if (defaultValue        !== undefined) body.defaultValue        = defaultValue;
      const data = await apiRequest('POST', `${v1base}/custom-attributes`, body);
      if (typeof data === 'string') return data;
      return mapCustomAttribute(data);
    }

    case 'get_location_nodes': {
      const { nodeIds, limit: locLimit } = args;
      const locBase = `/construction/locations/v2/projects/${pid}/trees/default/nodes`;
      const items = [];
      let offset = 0;
      const ps = locLimit || 200;
      while (true) {
        const params = new URLSearchParams({ limit: String(ps), offset: String(offset) });
        if (nodeIds && nodeIds.length) params.set('filter[id]', nodeIds.join(','));
        const data = await apiRequest('GET', `${locBase}?${params.toString()}`);
        if (typeof data === 'string') throw new Error(data);
        const page = data.results || [];
        items.push(...page);
        if (!data.pagination?.nextUrl || page.length < ps) break;
        if (locLimit) break; // single-page mode when limit explicitly given
        offset += page.length;
      }
      return items.map(n => ({
        id:            n.id,
        parentId:      n.parentId ?? null,
        type:          n.type,
        name:          n.name,
        description:   n.description ?? null,
        order:         n.order,
        documentCount: n.documentCount,
        areaDefined:   n.areaDefined,
      }));
    }

    case 'get_asset_relationships': {
      const { assetId, withDomain, withType, withId, continuationToken } = args;
      const relBase = `/bim360/relationship/v2/containers/${pid}/relationships:search`;
      const params = new URLSearchParams({
        domain: 'autodesk-bim360-asset',
        type:   'asset',
      });
      if (assetId)            params.set('id',         assetId);
      if (withDomain)         params.set('withDomain', withDomain);
      if (withType)           params.set('withType',   withType);
      if (withId)             params.set('withId',     withId);
      if (continuationToken)  params.set('continuationToken', continuationToken);
      const data = await apiRequest('GET', `${relBase}?${params.toString()}`);
      if (typeof data === 'string') return data;
      return {
        relationships:     data.relationships || [],
        continuationToken: data.page?.continuationToken ?? null,
        syncToken:         data.page?.syncToken ?? null,
      };
    }

    case 'assign_category_custom_attribute': {
      const { categoryId, customAttributeId, includeInherited } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const params = new URLSearchParams();
      if (includeInherited) params.set('includeInherited', 'true');
      const qs = params.toString();
      const data = await apiRequest(
        'PUT',
        `${v1base}/categories/${categoryId}/custom-attributes/${customAttributeId}${qs ? '?' + qs : ''}`,
      );
      if (typeof data === 'string') return data;
      return (data.results || []).map(a => ({
        ...mapCustomAttribute(a),
        ...(a.inheritedFromCategoryId !== undefined ? { inheritedFromCategoryId: a.inheritedFromCategoryId } : {}),
      }));
    }

    case 'get_category_custom_attributes': {
      const { categoryId, includeInherited } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const params = new URLSearchParams();
      if (includeInherited) params.set('includeInherited', 'true');
      const qs = params.toString();
      const data = await apiRequest('GET', `${v1base}/categories/${categoryId}/custom-attributes${qs ? '?' + qs : ''}`);
      if (typeof data === 'string') return data;
      return (data.results || []).map(a => ({
        ...mapCustomAttribute(a),
        ...(a.inheritedFromCategoryId !== undefined ? { inheritedFromCategoryId: a.inheritedFromCategoryId } : {}),
      }));
    }

    case 'update_asset_custom_attribute': {
      const { customAttributeId, displayName, dataType, requiredOnIngress, description, enumValues, maxLengthOnIngress, defaultValue } = args;
      const v1base = `/construction/assets/v1/projects/${pid}`;
      const body = {};
      if (displayName        !== undefined) body.displayName        = displayName;
      if (dataType           !== undefined) body.dataType           = dataType;
      if (requiredOnIngress  !== undefined) body.requiredOnIngress  = requiredOnIngress;
      if (description        !== undefined) body.description        = description;
      if (enumValues         !== undefined) body.enumValues         = enumValues;
      if (maxLengthOnIngress !== undefined) body.maxLengthOnIngress = maxLengthOnIngress;
      if (defaultValue       !== undefined) body.defaultValue       = defaultValue;
      const data = await apiRequest('PATCH', `${v1base}/custom-attributes/${customAttributeId}`, body);
      if (typeof data === 'string') return data;
      return mapCustomAttribute(data);
    }

    default:
      return `Unknown asset tool: ${name}`;
  }
}
