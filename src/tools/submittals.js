/**
 * Submittals tools — always use 3LO.
 *
 * Tools: list_submittals, get_submittal, create_submittal, update_submittal,
 *        transition_submittal, list_submittal_revisions,
 *        validate_submittal_custom_identifier, get_next_submittal_custom_identifier,
 *        list_submittal_specs, create_submittal_spec, get_submittal_spec,
 *        list_submittal_item_types, get_submittal_item_type,
 *        create_submittal_item_type, update_submittal_item_type,
 *        get_submittal_metadata,
 *        list_submittal_packages, get_submittal_package,
 *        create_submittal_package, update_submittal_package, delete_submittal_package,
 *        list_submittal_responses, get_submittal_response,
 *        create_submittal_response, update_submittal_response,
 *        list_submittal_managers,
 *        create_submittal_manager_mapping, delete_submittal_manager_mapping,
 *        list_submittal_item_steps, get_submittal_item_step,
 *        update_submittal_step,
 *        list_submittal_step_tasks, get_submittal_step_task,
 *        close_submittal_task, update_submittal_task,
 *        list_submittal_templates,
 *        create_submittal_template, update_submittal_template, delete_submittal_template,
 *        get_submittal_user_permissions,
 *        attach_submittal_file,
 *        get_submittal_attachment_upload_url, complete_submittal_attachment_upload,
 *        finalize_submittal_attachment,
 *        list_submittal_item_attachments, get_submittal_attachment_download_url
 *
 * ACC Submittals API v2. Path shape:
 *   /construction/submittals/v2/projects/{projectId}/...
 * projectId = bare UUID — b. prefix stripped via withoutBPrefix().
 *
 * Pagination: { pagination: { limit, offset, totalResults, nextUrl }, results: [] }
 * All list tools auto-paginate unless caller passes an explicit limit.
 *
 * stateId values: draft, sbc-1, mgr-1, rev, mgr-2, sbc-2, void
 * statusId values: 1 (Required), 2 (Open), 3 (Closed), 4 (Void), 5 (Empty), 6 (Draft)
 */

import { apiRequest, withoutBPrefix } from '../auth/router.js';

// ─── Pagination helper ────────────────────────────────────────────────────────

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

export const submittalTools = [
  {
    name: 'list_submittals',
    description:
      'List submittal items in a project with optional filters. ' +
      'Auto-paginates all results unless limit is specified. ' +
      'stateId is the workflow state (draft/sbc-1/mgr-1/rev/mgr-2/sbc-2/void); ' +
      'statusId is the display status (1=Required, 2=Open, 3=Closed, 4=Void, 5=Empty, 6=Draft). ' +
      'Multiple filter values can be comma-separated. ' +
      'projectId should include the b. prefix — it is stripped internally.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:        { type: 'string', description: 'Project ID (b.{uuid} format)' },
        search:           { type: 'string', description: 'Free-text search across identifier, title, specIdentifier, ballInCourt' },
        statusId:         { type: 'string', description: 'Filter by display status ID (1-6). Multiple values comma-separated.' },
        stateId:          { type: 'string', description: 'Filter by workflow state ID (draft, sbc-1, mgr-1, rev, mgr-2, sbc-2, void). Multiple values comma-separated.' },
        specId:           { type: 'string', description: 'Filter by spec section UUID. Multiple values comma-separated.' },
        typeId:           { type: 'string', description: 'Filter by item type UUID. Multiple values comma-separated.' },
        packageId:        { type: 'string', description: 'Filter by package UUID. Use "noPackage" for items with no package.' },
        manager:          { type: 'string', description: 'Filter by manager Autodesk ID. Multiple values comma-separated.' },
        subcontractor:    { type: 'string', description: 'Filter by subcontractor Autodesk ID. Multiple values comma-separated.' },
        ballInCourtUsers: { type: 'string', description: 'Filter by ball-in-court user Autodesk ID. Multiple values comma-separated.' },
        createdBy:        { type: 'string', description: 'Filter by creator Autodesk ID.' },
        watchers:         { type: 'string', description: 'Filter by watcher Autodesk ID. Multiple values comma-separated.' },
        responseId:       { type: 'string', description: 'Filter by final response ID.' },
        identifier:       { type: 'string', description: 'Filter by submittal item UI identifier number.' },
        dueDate:          { type: 'string', description: 'Filter by due date. Single day: YYYY-MM-DD or range: YYYY-MM-DD..YYYY-MM-DD.' },
        updatedAt:        { type: 'string', description: 'Filter by last updated date. Single day or range.' },
        createdAt:        { type: 'string', description: 'Filter by creation date. Single day or range.' },
        sort:             { type: 'string', description: 'Sort field and direction, e.g. "dueDate asc" or "customIdentifier desc".' },
        limit:            { type: 'number', description: 'Max results to return (omit to fetch all)' },
        offset:           { type: 'number', description: 'Starting offset for a single page (use with limit)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_submittal',
    description:
      'Get full details of a single submittal item by its UUID. ' +
      'Returns all fields including stateId, permittedActions, and available transitions. ' +
      'Check permittedActions to determine what updates and transitions are allowed.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:    { type: 'string', description: 'Submittal item UUID (from list_submittals)' },
      },
      required: ['projectId', 'itemId'],
    },
  },
  {
    name: 'create_submittal',
    description:
      'Create a new submittal item in a project. ' +
      'typeId, specId, title, and stateId are required. ' +
      'stateId determines which other fields become mandatory: ' +
      '"sbc-1" (Waiting for Submission — manager creates and assigns to subcontractor) requires subcontractor + subcontractorType + submitterDueDate; ' +
      '"mgr-1" (Open/Submitted — subcontractor creates and assigns to manager) requires manager + managerType. ' +
      'Use list_submittal_item_types for typeId, list_submittal_specs for specId, ' +
      'list_submittal_managers for manager IDs, and list_submittal_templates for templateId.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:          { type: 'string', description: 'Project ID (b.{uuid} format)' },
        typeId:             { type: 'string', description: 'Item type UUID (from list_submittal_item_types)' },
        specId:             { type: 'string', description: 'Spec section UUID (from list_submittal_specs)' },
        title:              { type: 'string', description: 'Submittal item title' },
        stateId:            { type: 'string', enum: ['draft', 'sbc-1', 'mgr-1'], description: 'Initial workflow state. "sbc-1" requires manager+managerType; "mgr-1" requires subcontractor+subcontractorType+submitterDueDate.' },
        customIdentifier:   { type: 'string', description: 'Custom number (sequential part only). Use get_next_submittal_custom_identifier to find the next available.' },
        subsection:         { type: 'string', description: 'Sub-spec section, e.g. "1.05-B"' },
        description:        { type: 'string' },
        priority:           { type: 'string', enum: ['Low', 'Normal', 'High'], description: 'Default: Normal' },
        manager:            { type: 'string', description: 'Autodesk ID or Group ID of the manager (required for sbc-1 state)' },
        managerType:        { type: 'string', enum: ['1', '2', '3'], description: 'Manager type: 1=user, 2=company, 3=role (required when manager is set)' },
        subcontractor:      { type: 'string', description: 'Autodesk ID of the subcontractor/responsible contractor (required for mgr-1 state)' },
        subcontractorType:  { type: 'string', enum: ['1', '2', '3'], description: 'Subcontractor type: 1=user, 2=company, 3=role (required when subcontractor is set)' },
        watchers: {
          type: 'array',
          description: 'List of watchers',
          items: {
            type: 'object',
            properties: {
              id:       { type: 'string', description: 'Autodesk ID or memberGroupId' },
              userType: { type: 'string', enum: ['1', '2', '3'], description: '1=user, 2=company, 3=role' },
            },
            required: ['id', 'userType'],
          },
        },
        requiredOnJobDate:    { type: 'string', description: 'Date materials expected on site (YYYY-MM-DD)' },
        leadTime:             { type: 'number', description: 'Days from approval to delivery' },
        requiredDate:         { type: 'string', description: 'Date by which subcontractor must submit (YYYY-MM-DD)' },
        requiredApprovalDate: { type: 'string', description: 'Date by which approval is required (YYYY-MM-DD)' },
        submitterDueDate:     { type: 'string', description: 'Subcontractor due date, corresponds to sbc-1 state (YYYY-MM-DD)' },
        managerDueDate:       { type: 'string', description: 'Manager due date, corresponds to mgr-1 state (YYYY-MM-DD)' },
        packageId:            { type: 'string', description: 'Package UUID (from list_submittal_packages)' },
        templateId:           { type: 'string', description: 'Review template UUID — defines predefined workflow steps and tasks' },
      },
      required: ['projectId', 'typeId', 'specId', 'title', 'stateId'],
    },
  },
  {
    name: 'update_submittal',
    description:
      'Update specific fields of an existing submittal item (PATCH). ' +
      'Only fields listed under "Item::partial_update" in the item\'s permittedActions can be modified. ' +
      'Call get_submittal first to check permittedActions. ' +
      'This does NOT change the workflow state — use transition_submittal for state changes.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:            { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:               { type: 'string', description: 'Submittal item UUID' },
        customIdentifier:     { type: 'string', description: 'Custom number (sequential part only)' },
        typeId:               { type: 'string', description: 'Item type UUID' },
        specId:               { type: 'string', description: 'Spec section UUID' },
        subsection:           { type: 'string', description: 'Sub-spec section, e.g. "1.05-B"' },
        title:                { type: 'string' },
        description:          { type: 'string' },
        priority:             { type: 'string', enum: ['Low', 'Normal', 'High'] },
        manager:              { type: 'string', description: 'Autodesk ID or Group ID of the manager' },
        managerType:          { type: 'string', enum: ['1', '2', '3'], description: '1=user, 2=company, 3=role' },
        subcontractor:        { type: 'string', description: 'Autodesk ID of the subcontractor' },
        subcontractorType:    { type: 'string', enum: ['1', '2', '3'], description: '1=user, 2=company, 3=role' },
        watchers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id:       { type: 'string' },
              userType: { type: 'string', enum: ['1', '2', '3'] },
            },
            required: ['id', 'userType'],
          },
        },
        requiredOnJobDate:    { type: 'string', description: 'YYYY-MM-DD' },
        leadTime:             { type: 'number' },
        requiredDate:         { type: 'string', description: 'YYYY-MM-DD' },
        requiredApprovalDate: { type: 'string', description: 'YYYY-MM-DD' },
        submitterDueDate:     { type: 'string', description: 'YYYY-MM-DD' },
        managerDueDate:       { type: 'string', description: 'YYYY-MM-DD' },
        packageId:            { type: 'string' },
        sentToSubmitter:      { type: 'string', description: 'ISO 8601 datetime override' },
        receivedFromSubmitter:{ type: 'string', description: 'ISO 8601 datetime override' },
        sentToReview:         { type: 'string', description: 'ISO 8601 datetime override' },
        receivedFromReview:   { type: 'string', description: 'ISO 8601 datetime override' },
        publishedDate:        { type: 'string', description: 'ISO 8601 datetime override' },
      },
      required: ['projectId', 'itemId'],
    },
  },
  {
    name: 'transition_submittal',
    description:
      'Transition a submittal item to a new workflow state. ' +
      'stateId is required. Call get_submittal first to check permittedActions.transitions for valid target states and mandatory fields. ' +
      'Key transitions: draft→sbc-1 or mgr-1; sbc-1→mgr-1; mgr-1→rev (needs template+customIdentifier); mgr-2→sbc-2 (needs responseId). ' +
      'mailNote appears in email notifications and the activity log. ' +
      'stepDueDate is required when transitioning to rev state.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:            { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:               { type: 'string', description: 'Submittal item UUID' },
        stateId:              { type: 'string', enum: ['sbc-1', 'mgr-1', 'rev', 'mgr-2', 'sbc-2', 'void'], description: 'Target workflow state' },
        mailNote:             { type: 'string', description: 'Note sent in email and shown in activity log' },
        stepDueDate:          { type: 'string', description: 'Due date for the next review step (YYYY-MM-DD). Required when transitioning to rev.' },
        responseId:           { type: 'string', description: 'Response UUID (from list_submittal_responses). Required when transitioning to sbc-2 (Closed).' },
        responseComment:      { type: 'string', description: 'Response comment. Used when transitioning to sbc-2.' },
        customIdentifier:     { type: 'string', description: 'Custom number (sequential part only)' },
        typeId:               { type: 'string' },
        specId:               { type: 'string' },
        subsection:           { type: 'string' },
        title:                { type: 'string' },
        description:          { type: 'string' },
        priority:             { type: 'string', enum: ['Low', 'Normal', 'High'] },
        manager:              { type: 'string' },
        managerType:          { type: 'string', enum: ['1', '2', '3'] },
        subcontractor:        { type: 'string' },
        subcontractorType:    { type: 'string', enum: ['1', '2', '3'] },
        watchers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id:       { type: 'string' },
              userType: { type: 'string', enum: ['1', '2', '3'] },
            },
            required: ['id', 'userType'],
          },
        },
        requiredOnJobDate:    { type: 'string', description: 'YYYY-MM-DD' },
        leadTime:             { type: 'number' },
        requiredDate:         { type: 'string', description: 'YYYY-MM-DD' },
        requiredApprovalDate: { type: 'string', description: 'YYYY-MM-DD' },
        submitterDueDate:     { type: 'string', description: 'YYYY-MM-DD' },
        managerDueDate:       { type: 'string', description: 'YYYY-MM-DD' },
        packageId:            { type: 'string' },
        duplicateAttachments: { type: 'array', items: { type: 'string' }, description: 'Attachment UUIDs to duplicate from the previous stage' },
      },
      required: ['projectId', 'itemId', 'stateId'],
    },
  },
  {
    name: 'list_submittal_revisions',
    description:
      'Retrieve the revision history of a submittal item. ' +
      'Each revision captures the workflow state at a point in time, including steps and reviewer tasks. ' +
      'Returns manager/subcontractor assignments, all workflow timestamps, response details, and nested steps with tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:    { type: 'string', description: 'Submittal item UUID' },
        limit:     { type: 'number', description: 'Max results per page (1-50, default 20)' },
        offset:    { type: 'number', description: 'Number of results to skip' },
      },
      required: ['projectId', 'itemId'],
    },
  },
  {
    name: 'validate_submittal_custom_identifier',
    description:
      'Validate that a custom identifier is available and correctly formatted before using it. ' +
      'Returns success (204) if valid, or an error if the identifier is already taken (409) or malformed. ' +
      'Always provide only the sequential number — not the full specId-number format. ' +
      'specId is required when the project uses spec sequence numbering (check get_submittal_metadata for customIdentifierSequenceType).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:        { type: 'string', description: 'Project ID (b.{uuid} format)' },
        customIdentifier: { type: 'string', description: 'Sequential number to validate (e.g. "01", "A-111")' },
        specId:           { type: 'string', description: 'Spec section UUID — required for spec sequence projects' },
      },
      required: ['projectId', 'customIdentifier'],
    },
  },
  {
    name: 'get_next_submittal_custom_identifier',
    description:
      'Get the next available custom identifier for a submittal item. ' +
      'Returns both the last used identifier (previousCustomIdentifier) and the next available one (nextCustomIdentifier). ' +
      'specId is required when the project uses spec sequence numbering.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        specId:    { type: 'string', description: 'Spec section UUID — required for spec sequence projects' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_submittal_specs',
    description:
      'List spec sections configured for the project (e.g. "033100 - Structural Concrete"). ' +
      'Use the id as specId when creating or filtering submittals. ' +
      'The identifier field holds the spec code (e.g. "033100").',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_submittal_spec',
    description:
      'Create a new spec section for the project. ' +
      'title is the spec name (e.g. "Cast-in-Place Concrete"); identifier is the spec code (e.g. "033100") and is required.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        title:      { type: 'string', description: 'Spec section title' },
        identifier: { type: 'string', description: 'Spec section code / number (e.g. "033100")' },
      },
      required: ['projectId', 'title', 'identifier'],
    },
  },
  {
    name: 'get_submittal_spec',
    description: 'Get details of a single spec section by its UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        specId:    { type: 'string', description: 'Spec section UUID' },
      },
      required: ['projectId', 'specId'],
    },
  },
  {
    name: 'list_submittal_item_types',
    description:
      'List submittal item type definitions for a project (e.g. "Shop Drawings", "Product Data", "Samples"). ' +
      'Use the id as typeId when creating submittals. ' +
      'The value field holds the display name.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_submittal_item_type',
    description: 'Get details of a single submittal item type by its UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemTypeId: { type: 'string', description: 'Item type UUID' },
      },
      required: ['projectId', 'itemTypeId'],
    },
  },
  {
    name: 'create_submittal_item_type',
    description: 'Create a new submittal item type for the project (e.g. "Shop Drawings"). value is the display name.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        value:     { type: 'string', description: 'Display name for the item type (required)' },
        isActive:  { type: 'boolean', description: 'Whether the item type is active (default: true)' },
      },
      required: ['projectId', 'value'],
    },
  },
  {
    name: 'update_submittal_item_type',
    description: 'Update an existing submittal item type (rename or toggle active status).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemTypeId: { type: 'string', description: 'Item type UUID' },
        value:      { type: 'string', description: 'New display name' },
        isActive:   { type: 'boolean', description: 'Set to false to deactivate' },
      },
      required: ['projectId', 'itemTypeId'],
    },
  },
  {
    name: 'get_submittal_metadata',
    description:
      'Get project-level submittal configuration. ' +
      'Returns customIdentifierSequenceType (1=global, 2=per-spec), default due date settings, and other project settings. ' +
      'Call this first to understand numbering rules before creating submittals.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'list_submittal_packages',
    description:
      'List submittal packages in the project. Packages group related submittal items together. ' +
      'Returns id, title, identifier, description, specId, specIdentifier, and permittedActions.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        specId:    { type: 'string', description: 'Filter by spec section UUID' },
        search:    { type: 'string', description: 'Free-text search' },
        sort:      { type: 'string', description: 'Sort field and direction, e.g. "title asc"' },
        limit:     { type: 'number', description: 'Max results to return (omit to fetch all)' },
        offset:    { type: 'number', description: 'Starting offset (use with limit)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_submittal_package',
    description: 'Get details of a single submittal package by its UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        packageId: { type: 'string', description: 'Package UUID' },
      },
      required: ['projectId', 'packageId'],
    },
  },
  {
    name: 'create_submittal_package',
    description: 'Create a new submittal package to group related submittal items.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:   { type: 'string', description: 'Project ID (b.{uuid} format)' },
        title:       { type: 'string', description: 'Package title (required)' },
        specId:      { type: 'string', description: 'Spec section UUID to associate the package with (required)' },
        identifier:  { type: 'string', description: 'Package identifier/number (optional)' },
        description: { type: 'string', description: 'Package description (optional)' },
      },
      required: ['projectId', 'title', 'specId'],
    },
  },
  {
    name: 'update_submittal_package',
    description: 'Update the title or description of an existing submittal package.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:   { type: 'string', description: 'Project ID (b.{uuid} format)' },
        packageId:   { type: 'string', description: 'Package UUID' },
        title:       { type: 'string', description: 'New package title' },
        description: { type: 'string', description: 'New package description' },
      },
      required: ['projectId', 'packageId'],
    },
  },
  {
    name: 'delete_submittal_package',
    description: 'Delete a submittal package. The package must have no items assigned to it.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        packageId: { type: 'string', description: 'Package UUID' },
      },
      required: ['projectId', 'packageId'],
    },
  },
  {
    name: 'list_submittal_responses',
    description:
      'List available response types configured for the project (e.g. "Approved", "Approved as Noted", "Rejected"). ' +
      'Use the id as responseId when closing a task or transitioning a submittal to sbc-2. ' +
      'isApproval indicates whether the response counts as an approval.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_submittal_response',
    description: 'Get details of a single response type by its UUID.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        responseId: { type: 'string', description: 'Response type UUID' },
      },
      required: ['projectId', 'responseId'],
    },
  },
  {
    name: 'create_submittal_response',
    description:
      'Create a new response type for the project (e.g. "Approved", "Rejected"). ' +
      'categoryId: "1"=Approved, "2"=Approved with comments, "3"=Rejected.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        value:      { type: 'string', description: 'Display name for the response (required)' },
        categoryId: { type: 'string', enum: ['1', '2', '3'], description: '"1"=Approved, "2"=Approved with comments, "3"=Rejected (required)' },
        isActive:   { type: 'boolean', description: 'Whether the response is active' },
      },
      required: ['projectId', 'value', 'categoryId'],
    },
  },
  {
    name: 'update_submittal_response',
    description: 'Update an existing response type (rename, change category, or toggle active status).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        responseId: { type: 'string', description: 'Response type UUID' },
        value:      { type: 'string', description: 'New display name' },
        categoryId: { type: 'string', enum: ['1', '2', '3'], description: '"1"=Approved, "2"=Approved with comments, "3"=Rejected' },
        isActive:   { type: 'boolean', description: 'Set to false to deactivate' },
      },
      required: ['projectId', 'responseId'],
    },
  },
  {
    name: 'list_submittal_managers',
    description:
      'List manager mappings for the project — users/companies/roles who have manager role in Submittals. ' +
      'Each result has oxygenId (Autodesk ID or group ID), userType (1=user/2=company/3=role), submittalsRole (1=Manager).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        limit:     { type: 'number', description: 'Max results per page (omit to fetch all)' },
        offset:    { type: 'number', description: 'Starting offset' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_submittal_manager_mapping',
    description:
      'Grant manager role to a user, company, or role in the Submittals module. ' +
      'submittalsRole: "1"=Manager, "2"=User.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:      { type: 'string', description: 'Project ID (b.{uuid} format)' },
        oxygenId:       { type: 'string', description: 'Autodesk ID (user) or memberGroupId (company/role)' },
        userType:       { type: 'string', enum: ['1', '2', '3'], description: '1=user, 2=company, 3=role' },
        submittalsRole: { type: 'string', enum: ['1', '2'], description: '"1"=Manager, "2"=User' },
      },
      required: ['projectId', 'oxygenId', 'userType'],
    },
  },
  {
    name: 'delete_submittal_manager_mapping',
    description: 'Remove a manager mapping, revoking the Submittals manager role from a user/company/role.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        mappingId: { type: 'string', description: 'Manager mapping UUID (from list_submittal_managers)' },
      },
      required: ['projectId', 'mappingId'],
    },
  },
  {
    name: 'list_submittal_item_steps',
    description:
      'List review steps for a submittal item. Each step has a stepNumber, status, dueDate, and nested tasks. ' +
      'Steps are sequential stages in the review workflow — each must be completed to advance the submittal.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:    { type: 'string', description: 'Submittal item UUID' },
        limit:     { type: 'number', description: 'Max results per page (1-50, default 20)' },
        offset:    { type: 'number', description: 'Number of results to skip' },
      },
      required: ['projectId', 'itemId'],
    },
  },
  {
    name: 'get_submittal_item_step',
    description: 'Get details of a single review step for a submittal item, including its nested tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:    { type: 'string', description: 'Submittal item UUID' },
        stepId:    { type: 'string', description: 'Step UUID (from list_submittal_item_steps)' },
      },
      required: ['projectId', 'itemId', 'stepId'],
    },
  },
  {
    name: 'list_submittal_step_tasks',
    description:
      'List tasks for a specific review step. Tasks assign responsibility to reviewers (user, company, or role). ' +
      'Each required task must be closed to advance the step.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:    { type: 'string', description: 'Submittal item UUID' },
        stepId:    { type: 'string', description: 'Step UUID' },
        limit:     { type: 'number', description: 'Max results per page (1-50, default 20)' },
        offset:    { type: 'number', description: 'Number of results to skip' },
      },
      required: ['projectId', 'itemId', 'stepId'],
    },
  },
  {
    name: 'get_submittal_step_task',
    description: 'Get details of a single task within a review step.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:    { type: 'string', description: 'Submittal item UUID' },
        stepId:    { type: 'string', description: 'Step UUID' },
        taskId:    { type: 'string', description: 'Task UUID' },
      },
      required: ['projectId', 'itemId', 'stepId', 'taskId'],
    },
  },
  {
    name: 'close_submittal_task',
    description:
      'Close a review task by submitting a response, marking it complete. ' +
      'responseId is required — use list_submittal_responses to find valid response IDs. ' +
      'When the last required task in a step is closed, the submittal automatically advances to the next step. ' +
      'After all steps are complete, the submittal reaches the "Close and distribute" state.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:            { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:               { type: 'string', description: 'Submittal item UUID' },
        stepId:               { type: 'string', description: 'Step UUID' },
        taskId:               { type: 'string', description: 'Task UUID' },
        responseId:           { type: 'string', description: 'Response type UUID (required)' },
        responseComment:      { type: 'string', description: 'Feedback or instructions for the response' },
        duplicateAttachments: { type: 'array', items: { type: 'string' }, description: 'Attachment UUIDs to copy from the previous stage' },
      },
      required: ['projectId', 'itemId', 'stepId', 'taskId', 'responseId'],
    },
  },
  {
    name: 'update_submittal_step',
    description:
      'Update mutable fields on a review step: daysToRespond, startedAt, dueDate. ' +
      'Use when Step::partial_update appears in permittedActions of the step.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:     { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:        { type: 'string', description: 'Submittal item UUID' },
        stepId:        { type: 'string', description: 'Step UUID' },
        daysToRespond: { type: 'number', description: 'Number of days allotted for this step' },
        startedAt:     { type: 'string', description: 'ISO 8601 datetime when the step started' },
        dueDate:       { type: 'string', description: 'ISO 8601 datetime deadline for this step' },
      },
      required: ['projectId', 'itemId', 'stepId'],
    },
  },
  {
    name: 'update_submittal_task',
    description:
      'Update mutable fields on a review task: startedAt, completedAt. ' +
      'Use when Task::partial_update appears in permittedActions of the task.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:   { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:      { type: 'string', description: 'Submittal item UUID' },
        stepId:      { type: 'string', description: 'Step UUID' },
        taskId:      { type: 'string', description: 'Task UUID' },
        startedAt:   { type: 'string', description: 'ISO 8601 datetime when the task started' },
        completedAt: { type: 'string', description: 'ISO 8601 datetime when the task was completed' },
      },
      required: ['projectId', 'itemId', 'stepId', 'taskId'],
    },
  },
  {
    name: 'list_submittal_templates',
    description:
      'List review templates available for a project. Templates contain predefined steps and tasks ' +
      'that can be applied when creating submittal items (via templateId in create_submittal).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        sort:      { type: 'string', description: 'Sort field and direction. Possible fields: id, name, createdAt, createdBy, updatedAt, updatedBy.' },
        limit:     { type: 'number', description: 'Max results per page (1-50, default 20)' },
        offset:    { type: 'number', description: 'Number of results to skip' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_submittal_template',
    description:
      'Create a review template with predefined steps and tasks. ' +
      'steps is an array of step objects, each with daysToRespond and tasks[]. ' +
      'Each task needs assignedTo (Autodesk ID or group ID), assignedToType (1=user/2=company/3=role), and isRequired.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        name:      { type: 'string', description: 'Template name (required)' },
        steps: {
          type: 'array',
          description: 'Review steps (required)',
          items: {
            type: 'object',
            properties: {
              daysToRespond: { type: 'number', description: 'Days allowed to respond for this step' },
              tasks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    assignedTo:     { type: 'string', description: 'Autodesk ID or memberGroupId' },
                    assignedToType: { type: 'string', enum: ['1', '2', '3'], description: '1=user, 2=company, 3=role' },
                    isRequired:     { type: 'boolean', description: 'Whether this task must be completed' },
                  },
                  required: ['assignedTo', 'assignedToType'],
                },
              },
            },
            required: ['tasks'],
          },
        },
        watchers: {
          type: 'array',
          description: 'Watchers to notify',
          items: {
            type: 'object',
            properties: {
              id:       { type: 'string', description: 'Autodesk ID or memberGroupId' },
              userType: { type: 'string', enum: ['1', '2', '3'], description: '1=user, 2=company, 3=role' },
            },
            required: ['id', 'userType'],
          },
        },
      },
      required: ['projectId', 'name', 'steps'],
    },
  },
  {
    name: 'update_submittal_template',
    description: 'Update an existing review template — rename, replace steps, or update watchers.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        templateId: { type: 'string', description: 'Template UUID' },
        name:       { type: 'string', description: 'New template name' },
        steps: {
          type: 'array',
          description: 'Replacement steps array (replaces all existing steps)',
          items: {
            type: 'object',
            properties: {
              daysToRespond: { type: 'number' },
              tasks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    assignedTo:     { type: 'string' },
                    assignedToType: { type: 'string', enum: ['1', '2', '3'] },
                    isRequired:     { type: 'boolean' },
                  },
                  required: ['assignedTo', 'assignedToType'],
                },
              },
            },
            required: ['tasks'],
          },
        },
        watchers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id:       { type: 'string' },
              userType: { type: 'string', enum: ['1', '2', '3'] },
            },
            required: ['id', 'userType'],
          },
        },
      },
      required: ['projectId', 'templateId'],
    },
  },
  {
    name: 'delete_submittal_template',
    description: 'Delete a review template from the project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        templateId: { type: 'string', description: 'Template UUID' },
      },
      required: ['projectId', 'templateId'],
    },
  },
  {
    name: 'get_submittal_user_permissions',
    description:
      'Get the current authenticated user\'s ID, roles, and permitted actions in the Submittals module. ' +
      'Roles: 1=Manager, 2=User, 4=Admin. ' +
      'permittedActions lists what the user can do (e.g. Item::create, Spec::create) and available workflow transitions. ' +
      'Not compatible with BIM 360 projects.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'attach_submittal_file',
    description:
      'Create an attachment on a submittal item. Two use cases:\n' +
      '1. Forma Files tool file (already uploaded): provide urn (version ID from Data Management) and isFileUploaded=true.\n' +
      '2. Local file upload: omit urn and isFileUploaded — this creates a placeholder and returns uploadUrn. ' +
      'Then call get_submittal_attachment_upload_url, upload the file via PUT (no auth token), ' +
      'call complete_submittal_attachment_upload, and finally finalize_submittal_attachment.\n' +
      'urnTypeId must always be "2". ' +
      'categoryId: "1"=Submit, "2"=For-review (default in mgr-1), "4"=Final response. ' +
      'In rev state, include taskId to link to a specific reviewer task.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:      { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:         { type: 'string', description: 'Submittal item UUID' },
        name:           { type: 'string', description: 'Display name for the attachment (e.g. "ElectricalPlan.pdf")' },
        urnTypeId:      { type: 'string', description: 'Must be "2"', enum: ['2'] },
        urn:            { type: 'string', description: 'File version ID from Data Management — omit for local file uploads' },
        isFileUploaded: { type: 'boolean', description: 'Set to true when attaching a Forma Files file. Omit for local file uploads.' },
        categoryId:     { type: 'string', description: 'Workflow stage category: "1"=Submit, "2"=For-review, "4"=Final response. Usually auto-assigned.' },
        taskId:         { type: 'string', description: 'Task UUID — required in rev state to link attachment to a specific reviewer task' },
      },
      required: ['projectId', 'itemId', 'name', 'urnTypeId'],
    },
  },
  {
    name: 'get_submittal_attachment_upload_url',
    description:
      'Generate a signed S3 upload URL for a local file attachment. ' +
      'Pass the uploadUrn from attach_submittal_file response. ' +
      'Returns urls[] (PUT to urls[0] without auth token to upload) and uploadKey (needed for complete_submittal_attachment_upload). ' +
      'Supports chunked parallel uploads — request multiple URLs for large files.',
    inputSchema: {
      type: 'object',
      properties: {
        uploadUrn: { type: 'string', description: 'Storage object URN from attach_submittal_file response (uploadUrn field)' },
        parts:     { type: 'number', description: 'Number of signed URLs to generate for chunked upload (default: 1)' },
      },
      required: ['uploadUrn'],
    },
  },
  {
    name: 'complete_submittal_attachment_upload',
    description:
      'Complete a multipart S3 upload after the file has been PUT to all signed URLs. ' +
      'Must be called within 24 hours of starting the upload. ' +
      'Pass the uploadUrn and the uploadKey from get_submittal_attachment_upload_url.',
    inputSchema: {
      type: 'object',
      properties: {
        uploadUrn: { type: 'string', description: 'Storage object URN from attach_submittal_file response (uploadUrn field)' },
        uploadKey: { type: 'string', description: 'Upload key from get_submittal_attachment_upload_url response' },
      },
      required: ['uploadUrn', 'uploadKey'],
    },
  },
  {
    name: 'finalize_submittal_attachment',
    description:
      'Mark an attachment as fully uploaded (PATCH isFileUploaded=true). ' +
      'Call this after complete_submittal_attachment_upload to finalize the attachment in the submittal workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:    { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:       { type: 'string', description: 'Submittal item UUID' },
        attachmentId: { type: 'string', description: 'Attachment UUID from attach_submittal_file response' },
      },
      required: ['projectId', 'itemId', 'attachmentId'],
    },
  },
  {
    name: 'list_submittal_item_attachments',
    description:
      'List attachments for a submittal item. Returns file metadata including name, uploadUrn (storage object ID), ' +
      'urn (versioned file URN), revision, taskId, and categoryId. ' +
      'Use uploadUrn with get_submittal_attachment_download_url to get a download link.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        itemId:    { type: 'string', description: 'Submittal item UUID' },
        limit:     { type: 'number', description: 'Max results per page (1-50, default 20)' },
        offset:    { type: 'number', description: 'Number of results to skip' },
      },
      required: ['projectId', 'itemId'],
    },
  },
  {
    name: 'get_submittal_attachment_download_url',
    description:
      'Generate a one-time signed S3 download URL for a submittal attachment. ' +
      'Pass the uploadUrn from list_submittal_item_attachments (format: urn:adsk.objects:os.object:{bucketKey}/{objectKey}). ' +
      'The returned url can be used to download the file directly without an auth token. ' +
      'The signed URL is single-use and expires.',
    inputSchema: {
      type: 'object',
      properties: {
        uploadUrn: { type: 'string', description: 'Storage object URN from the attachment (uploadUrn field)' },
      },
      required: ['uploadUrn'],
    },
  },
];

// ─── Response mappers ─────────────────────────────────────────────────────────

function mapSubmittal(s) {
  return {
    id:                          s.id,
    identifier:                  s.identifier,
    customIdentifier:            s.customIdentifier ?? null,
    customIdentifierHumanReadable: s.customIdentifierHumanReadable ?? null,
    typeId:                      s.typeId,
    specId:                      s.specId,
    specIdentifier:              s.specIdentifier ?? null,
    specTitle:                   s.specTitle ?? null,
    subsection:                  s.subsection ?? null,
    title:                       s.title,
    description:                 s.description ?? null,
    priority:                    s.priority,
    revision:                    s.revision,
    stateId:                     s.stateId,
    statusId:                    s.statusId,
    ballInCourtUsers:            s.ballInCourtUsers ?? [],
    ballInCourtCompanies:        s.ballInCourtCompanies ?? [],
    ballInCourtRoles:            s.ballInCourtRoles ?? [],
    ballInCourtType:             s.ballInCourtType ?? null,
    manager:                     s.manager ?? null,
    managerType:                 s.managerType ?? null,
    subcontractor:               s.subcontractor ?? null,
    subcontractorType:           s.subcontractorType ?? null,
    watchers:                    s.watchers ?? [],
    dueDate:                     s.dueDate ?? null,
    requiredOnJobDate:           s.requiredOnJobDate ?? null,
    leadTime:                    s.leadTime ?? null,
    requiredDate:                s.requiredDate ?? null,
    requiredApprovalDate:        s.requiredApprovalDate ?? null,
    submitterDueDate:            s.submitterDueDate ?? null,
    sentToSubmitter:             s.sentToSubmitter ?? null,
    receivedFromSubmitter:       s.receivedFromSubmitter ?? null,
    submittedBy:                 s.submittedBy ?? null,
    managerDueDate:              s.managerDueDate ?? null,
    sentToReview:                s.sentToReview ?? null,
    sentToReviewBy:              s.sentToReviewBy ?? null,
    receivedFromReview:          s.receivedFromReview ?? null,
    publishedDate:               s.publishedDate ?? null,
    publishedBy:                 s.publishedBy ?? null,
    responseId:                  s.responseId ?? null,
    responseComment:             s.responseComment ?? null,
    respondedAt:                 s.respondedAt ?? null,
    respondedBy:                 s.respondedBy ?? null,
    packageId:                   s.packageId ?? null,
    packageIdentifier:           s.packageIdentifier ?? null,
    packageTitle:                s.packageTitle ?? null,
    packageSpecIdentifier:       s.packageSpecIdentifier ?? null,
    folderUrn:                   s.folderUrn ?? null,
    revisionsFoldersUrns:        s.revisionsFoldersUrns ?? null,
    createdAt:                   s.createdAt,
    createdBy:                   s.createdBy,
    updatedAt:                   s.updatedAt,
    updatedBy:                   s.updatedBy,
    permittedActions:            s.permittedActions ?? [],
  };
}

function mapSpec(s) {
  return {
    id:         s.id,
    title:      s.title,
    identifier: s.identifier,
    createdBy:  s.createdBy,
    createdAt:  s.createdAt,
    updatedBy:  s.updatedBy,
    updatedAt:  s.updatedAt,
  };
}

function mapItemType(t) {
  return {
    id:         t.id,
    value:      t.value,
    key:        t.key ?? null,
    platformId: t.platformId ?? null,
    isActive:   t.isActive ?? null,
    isInUse:    t.isInUse ?? null,
    createdBy:  t.createdBy ?? null,
    createdAt:  t.createdAt ?? null,
    updatedBy:  t.updatedBy ?? null,
    updatedAt:  t.updatedAt ?? null,
  };
}

function mapManagerMapping(m) {
  return {
    id:             m.id,
    oxygenId:       m.oxygenId,
    userType:       m.userType,
    submittalsRole: m.submittalsRole,
    createdBy:      m.createdBy ?? null,
    createdAt:      m.createdAt ?? null,
    updatedBy:      m.updatedBy ?? null,
    updatedAt:      m.updatedAt ?? null,
  };
}

function mapResponse(r) {
  return {
    id:         r.id,
    value:      r.value,
    key:        r.key        ?? null,
    platformId: r.platformId ?? null,
    categoryId: r.categoryId ?? null,
    isApproval: r.isApproval ?? null,
    isActive:   r.isActive   ?? null,
    isInUse:    r.isInUse    ?? null,
    createdBy:  r.createdBy  ?? null,
    createdAt:  r.createdAt  ?? null,
    updatedBy:  r.updatedBy  ?? null,
    updatedAt:  r.updatedAt  ?? null,
  };
}

function mapPackage(p) {
  return {
    id:              p.id,
    title:           p.title,
    identifier:      p.identifier ?? null,
    description:     p.description ?? null,
    specId:          p.specId ?? null,
    specIdentifier:  p.specIdentifier ?? null,
    createdBy:       p.createdBy ?? null,
    createdAt:       p.createdAt ?? null,
    updatedBy:       p.updatedBy ?? null,
    updatedAt:       p.updatedAt ?? null,
    permittedActions: p.permittedActions ?? [],
  };
}

function mapTask(t) {
  return {
    id:              t.id,
    stepId:          t.stepId,
    status:          t.status,
    assignedTo:      t.assignedTo,
    assignedToType:  t.assignedToType,
    isRequired:      t.isRequired,
    stepDueDate:     t.stepDueDate ?? null,
    responseId:      t.responseId ?? null,
    responseComment: t.responseComment ?? null,
    respondedAt:     t.respondedAt ?? null,
    respondedBy:     t.respondedBy ?? null,
    createdAt:       t.createdAt,
    createdBy:       t.createdBy,
    updatedAt:       t.updatedAt,
    updatedBy:       t.updatedBy,
    startedAt:       t.startedAt ?? null,
    completedAt:     t.completedAt ?? null,
    completedBy:     t.completedBy ?? null,
    permittedActions: t.permittedActions ?? [],
  };
}

function mapStep(s) {
  return {
    id:           s.id,
    itemId:       s.itemId,
    status:       s.status,
    stepNumber:   s.stepNumber,
    daysToRespond: s.daysToRespond ?? null,
    dueDate:      s.dueDate ?? null,
    tasks:        (s.tasks ?? []).map(mapTask),
    createdAt:    s.createdAt,
    createdBy:    s.createdBy,
    updatedAt:    s.updatedAt,
    updatedBy:    s.updatedBy,
    startedAt:    s.startedAt ?? null,
    completedAt:  s.completedAt ?? null,
    permittedActions: s.permittedActions ?? [],
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleSubmittalTool(name, args) {
  const pid  = withoutBPrefix(args.projectId);
  const base = `/construction/submittals/v2/projects/${pid}`;

  switch (name) {

    case 'list_submittals': {
      const {
        search, statusId, stateId, specId, typeId, packageId,
        manager, subcontractor, ballInCourtUsers, createdBy, watchers,
        responseId, identifier, dueDate, updatedAt, createdAt,
        sort, limit, offset: startOffset,
      } = args;

      const buildParams = (off, ps) => {
        const p = new URLSearchParams({ limit: String(ps), offset: String(off) });
        if (search)           p.set('search',                        search);
        if (statusId)         p.set('filter[statusId]',              statusId);
        if (stateId)          p.set('filter[stateId]',               stateId);
        if (specId)           p.set('filter[specId]',                specId);
        if (typeId)           p.set('filter[typeId]',                typeId);
        if (packageId)        p.set('filter[packageId]',             packageId);
        if (manager)          p.set('filter[manager]',               manager);
        if (subcontractor)    p.set('filter[subcontractor]',         subcontractor);
        if (ballInCourtUsers) p.set('filter[ballInCourtUsers]',      ballInCourtUsers);
        if (createdBy)        p.set('filter[createdBy]',             createdBy);
        if (watchers)         p.set('filter[watchers]',              watchers);
        if (responseId)       p.set('filter[responseId]',            responseId);
        if (identifier)       p.set('filter[identifier]',            identifier);
        if (dueDate)          p.set('filter[dueDate]',               dueDate);
        if (updatedAt)        p.set('filter[updatedAt]',             updatedAt);
        if (createdAt)        p.set('filter[createdAt]',             createdAt);
        if (sort)             p.set('sort',                          sort);
        return p;
      };

      if (limit !== undefined && startOffset !== undefined) {
        const data = await apiRequest('GET', `${base}/items?${buildParams(startOffset, limit).toString()}`);
        if (typeof data === 'string') return data;
        return (data.results || []).map(mapSubmittal);
      }

      const items = await paginateV2(async (off, ps) => {
        return apiRequest('GET', `${base}/items?${buildParams(off, ps).toString()}`);
      }, 50, limit);

      return items.map(mapSubmittal);
    }

    case 'get_submittal': {
      const { itemId } = args;
      const data = await apiRequest('GET', `${base}/items/${itemId}`);
      if (typeof data === 'string') return data;
      return mapSubmittal(data);
    }

    case 'create_submittal': {
      const {
        typeId, specId, title, stateId, customIdentifier, subsection, description, priority,
        manager, managerType, subcontractor, subcontractorType, watchers,
        requiredOnJobDate, leadTime, requiredDate, requiredApprovalDate,
        submitterDueDate, managerDueDate, packageId, templateId,
      } = args;

      const body = { typeId, specId, title, stateId };
      if (customIdentifier   !== undefined) body.customIdentifier   = customIdentifier;
      if (subsection         !== undefined) body.subsection         = subsection;
      if (description        !== undefined) body.description        = description;
      if (priority           !== undefined) body.priority           = priority;
      if (manager            !== undefined) body.manager            = manager;
      if (managerType        !== undefined) body.managerType        = managerType;
      if (subcontractor      !== undefined) body.subcontractor      = subcontractor;
      if (subcontractorType  !== undefined) body.subcontractorType  = subcontractorType;
      if (watchers           !== undefined) body.watchers           = watchers;
      if (requiredOnJobDate  !== undefined) body.requiredOnJobDate  = requiredOnJobDate;
      if (leadTime           !== undefined) body.leadTime           = leadTime;
      if (requiredDate       !== undefined) body.requiredDate       = requiredDate;
      if (requiredApprovalDate !== undefined) body.requiredApprovalDate = requiredApprovalDate;
      if (submitterDueDate   !== undefined) body.submitterDueDate   = submitterDueDate;
      if (managerDueDate     !== undefined) body.managerDueDate     = managerDueDate;
      if (packageId          !== undefined) body.packageId          = packageId;
      if (templateId         !== undefined) body.templateId         = templateId;

      const data = await apiRequest('POST', `${base}/items`, body);
      if (typeof data === 'string') return data;
      return mapSubmittal(data);
    }

    case 'update_submittal': {
      const {
        itemId, customIdentifier, typeId, specId, subsection, title, description, priority,
        manager, managerType, subcontractor, subcontractorType, watchers,
        requiredOnJobDate, leadTime, requiredDate, requiredApprovalDate,
        submitterDueDate, managerDueDate, packageId,
        sentToSubmitter, receivedFromSubmitter, sentToReview, receivedFromReview, publishedDate,
      } = args;

      const body = {};
      if (customIdentifier    !== undefined) body.customIdentifier    = customIdentifier;
      if (typeId              !== undefined) body.typeId              = typeId;
      if (specId              !== undefined) body.specId              = specId;
      if (subsection          !== undefined) body.subsection          = subsection;
      if (title               !== undefined) body.title               = title;
      if (description         !== undefined) body.description         = description;
      if (priority            !== undefined) body.priority            = priority;
      if (manager             !== undefined) body.manager             = manager;
      if (managerType         !== undefined) body.managerType         = managerType;
      if (subcontractor       !== undefined) body.subcontractor       = subcontractor;
      if (subcontractorType   !== undefined) body.subcontractorType   = subcontractorType;
      if (watchers            !== undefined) body.watchers            = watchers;
      if (requiredOnJobDate   !== undefined) body.requiredOnJobDate   = requiredOnJobDate;
      if (leadTime            !== undefined) body.leadTime            = leadTime;
      if (requiredDate        !== undefined) body.requiredDate        = requiredDate;
      if (requiredApprovalDate !== undefined) body.requiredApprovalDate = requiredApprovalDate;
      if (submitterDueDate    !== undefined) body.submitterDueDate    = submitterDueDate;
      if (managerDueDate      !== undefined) body.managerDueDate      = managerDueDate;
      if (packageId           !== undefined) body.packageId           = packageId;
      if (sentToSubmitter     !== undefined) body.sentToSubmitter     = sentToSubmitter;
      if (receivedFromSubmitter !== undefined) body.receivedFromSubmitter = receivedFromSubmitter;
      if (sentToReview        !== undefined) body.sentToReview        = sentToReview;
      if (receivedFromReview  !== undefined) body.receivedFromReview  = receivedFromReview;
      if (publishedDate       !== undefined) body.publishedDate       = publishedDate;

      const data = await apiRequest('PATCH', `${base}/items/${itemId}`, body);
      if (typeof data === 'string') return data;
      return mapSubmittal(data);
    }

    case 'transition_submittal': {
      const {
        itemId, stateId, mailNote, stepDueDate, responseId, responseComment,
        customIdentifier, typeId, specId, subsection, title, description, priority,
        manager, managerType, subcontractor, subcontractorType, watchers,
        requiredOnJobDate, leadTime, requiredDate, requiredApprovalDate,
        submitterDueDate, managerDueDate, packageId, duplicateAttachments,
      } = args;

      const body = { stateId };
      if (mailNote            !== undefined) body.mailNote            = mailNote;
      if (stepDueDate         !== undefined) body.stepDueDate         = stepDueDate;
      if (responseId          !== undefined) body.responseId          = responseId;
      if (responseComment     !== undefined) body.responseComment     = responseComment;
      if (customIdentifier    !== undefined) body.customIdentifier    = customIdentifier;
      if (typeId              !== undefined) body.typeId              = typeId;
      if (specId              !== undefined) body.specId              = specId;
      if (subsection          !== undefined) body.subsection          = subsection;
      if (title               !== undefined) body.title               = title;
      if (description         !== undefined) body.description         = description;
      if (priority            !== undefined) body.priority            = priority;
      if (manager             !== undefined) body.manager             = manager;
      if (managerType         !== undefined) body.managerType         = managerType;
      if (subcontractor       !== undefined) body.subcontractor       = subcontractor;
      if (subcontractorType   !== undefined) body.subcontractorType   = subcontractorType;
      if (watchers            !== undefined) body.watchers            = watchers;
      if (requiredOnJobDate   !== undefined) body.requiredOnJobDate   = requiredOnJobDate;
      if (leadTime            !== undefined) body.leadTime            = leadTime;
      if (requiredDate        !== undefined) body.requiredDate        = requiredDate;
      if (requiredApprovalDate !== undefined) body.requiredApprovalDate = requiredApprovalDate;
      if (submitterDueDate    !== undefined) body.submitterDueDate    = submitterDueDate;
      if (managerDueDate      !== undefined) body.managerDueDate      = managerDueDate;
      if (packageId           !== undefined) body.packageId           = packageId;
      if (duplicateAttachments !== undefined) body.duplicateAttachments = duplicateAttachments;

      const data = await apiRequest('POST', `${base}/items/${itemId}:transition`, body);
      if (typeof data === 'string') return data;
      return mapSubmittal(data);
    }

    case 'list_submittal_revisions': {
      const { itemId, limit, offset: startOffset } = args;
      const params = new URLSearchParams();
      if (limit !== undefined)       params.set('limit',  String(limit));
      if (startOffset !== undefined) params.set('offset', String(startOffset));
      const qs = params.toString();
      const data = await apiRequest('GET', `${base}/items/${itemId}/revisions${qs ? '?' + qs : ''}`);
      if (typeof data === 'string') return data;
      return {
        pagination: data.pagination ?? null,
        results:    data.results ?? [],
      };
    }

    case 'validate_submittal_custom_identifier': {
      const { customIdentifier, specId } = args;
      const params = new URLSearchParams();
      if (specId) params.set('specId', specId);
      const qs = params.toString();
      const data = await apiRequest(
        'POST',
        `${base}/items:validate-custom-identifier${qs ? '?' + qs : ''}`,
        { customIdentifier },
      );
      if (data === null) return { valid: true, customIdentifier };
      if (typeof data === 'string') return data;
      return { valid: true, customIdentifier };
    }

    case 'get_next_submittal_custom_identifier': {
      const { specId } = args;
      const params = new URLSearchParams();
      if (specId) params.set('specId', specId);
      const qs = params.toString();
      const data = await apiRequest('GET', `${base}/items:next-custom-identifier${qs ? '?' + qs : ''}`);
      if (typeof data === 'string') return data;
      return {
        previousCustomIdentifier: data.previousCustomIdentifier ?? null,
        nextCustomIdentifier:     data.nextCustomIdentifier,
      };
    }

    case 'list_submittal_specs': {
      const items = await paginateV2(async (off, ps) => {
        return apiRequest('GET', `${base}/specs?limit=${ps}&offset=${off}`);
      }, 200);
      return items.map(mapSpec);
    }

    case 'create_submittal_spec': {
      const { title, identifier } = args;
      const data = await apiRequest('POST', `${base}/specs`, { title, identifier });
      if (typeof data === 'string') return data;
      return mapSpec(data);
    }

    case 'get_submittal_spec': {
      const { specId } = args;
      const data = await apiRequest('GET', `${base}/specs/${specId}`);
      if (typeof data === 'string') return data;
      return mapSpec(data);
    }

    case 'list_submittal_item_types': {
      const items = await paginateV2(async (off, ps) => {
        return apiRequest('GET', `${base}/item-types?limit=${ps}&offset=${off}`);
      }, 200);
      return items.map(mapItemType);
    }

    case 'get_submittal_item_type': {
      const { itemTypeId } = args;
      const data = await apiRequest('GET', `${base}/item-types/${itemTypeId}`);
      if (typeof data === 'string') return data;
      return mapItemType(data);
    }

    case 'create_submittal_item_type': {
      const { value, isActive } = args;
      const body = { value };
      if (isActive !== undefined) body.isActive = isActive;
      const data = await apiRequest('POST', `${base}/item-types`, body);
      if (typeof data === 'string') return data;
      return mapItemType(data);
    }

    case 'update_submittal_item_type': {
      const { itemTypeId, value, isActive } = args;
      const body = {};
      if (value    !== undefined) body.value    = value;
      if (isActive !== undefined) body.isActive = isActive;
      const data = await apiRequest('PATCH', `${base}/item-types/${itemTypeId}`, body);
      if (typeof data === 'string') return data;
      return mapItemType(data);
    }

    case 'get_submittal_metadata': {
      const data = await apiRequest('GET', `${base}/metadata`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_submittal_packages': {
      const { specId, search, sort, limit, offset: startOffset } = args;

      const buildParams = (off, ps) => {
        const p = new URLSearchParams({ limit: String(ps), offset: String(off) });
        if (specId)  p.set('filter[specId]', specId);
        if (search)  p.set('search', search);
        if (sort)    p.set('sort', sort);
        return p;
      };

      if (limit !== undefined && startOffset !== undefined) {
        const data = await apiRequest('GET', `${base}/packages?${buildParams(startOffset, limit).toString()}`);
        if (typeof data === 'string') return data;
        return (data.results || []).map(mapPackage);
      }

      const items = await paginateV2(async (off, ps) => {
        return apiRequest('GET', `${base}/packages?${buildParams(off, ps).toString()}`);
      }, 50, limit);
      return items.map(mapPackage);
    }

    case 'get_submittal_package': {
      const { packageId } = args;
      const data = await apiRequest('GET', `${base}/packages/${packageId}`);
      if (typeof data === 'string') return data;
      return mapPackage(data);
    }

    case 'create_submittal_package': {
      const { title, specId, identifier, description } = args;
      const body = { title, specId };
      if (identifier  !== undefined) body.identifier  = identifier;
      if (description !== undefined) body.description = description;
      const data = await apiRequest('POST', `${base}/packages`, body);
      if (typeof data === 'string') return data;
      return mapPackage(data);
    }

    case 'update_submittal_package': {
      const { packageId, title, description } = args;
      const body = {};
      if (title       !== undefined) body.title       = title;
      if (description !== undefined) body.description = description;
      const data = await apiRequest('PATCH', `${base}/packages/${packageId}`, body);
      if (typeof data === 'string') return data;
      return mapPackage(data);
    }

    case 'delete_submittal_package': {
      const { packageId } = args;
      const data = await apiRequest('DELETE', `${base}/packages/${packageId}`);
      if (typeof data === 'string') return data;
      return { success: true, packageId };
    }

    case 'list_submittal_responses': {
      const items = await paginateV2(async (off, ps) => {
        return apiRequest('GET', `${base}/responses?limit=${ps}&offset=${off}`);
      }, 200);
      return items.map(mapResponse);
    }

    case 'get_submittal_response': {
      const { responseId } = args;
      const data = await apiRequest('GET', `${base}/responses/${responseId}`);
      if (typeof data === 'string') return data;
      return mapResponse(data);
    }

    case 'create_submittal_response': {
      const { value, categoryId, isActive } = args;
      const body = { value, categoryId };
      if (isActive !== undefined) body.isActive = isActive;
      const data = await apiRequest('POST', `${base}/responses`, body);
      if (typeof data === 'string') return data;
      return mapResponse(data);
    }

    case 'update_submittal_response': {
      const { responseId, value, categoryId, isActive } = args;
      const body = {};
      if (value      !== undefined) body.value      = value;
      if (categoryId !== undefined) body.categoryId = categoryId;
      if (isActive   !== undefined) body.isActive   = isActive;
      const data = await apiRequest('PATCH', `${base}/responses/${responseId}`, body);
      if (typeof data === 'string') return data;
      return mapResponse(data);
    }

    case 'list_submittal_managers': {
      const { limit, offset: startOffset } = args;

      if (limit !== undefined || startOffset !== undefined) {
        const params = new URLSearchParams();
        if (limit !== undefined)       params.set('limit',  String(limit));
        if (startOffset !== undefined) params.set('offset', String(startOffset));
        const data = await apiRequest('GET', `${base}/settings/mappings?${params.toString()}`);
        if (typeof data === 'string') return data;
        return {
          pagination: data.pagination ?? null,
          results: (data.results ?? []).map(mapManagerMapping),
        };
      }

      const items = await paginateV2(async (off, ps) => {
        return apiRequest('GET', `${base}/settings/mappings?limit=${ps}&offset=${off}`);
      }, 200);
      return items.map(mapManagerMapping);
    }

    case 'create_submittal_manager_mapping': {
      const { oxygenId, userType, submittalsRole } = args;
      const body = { oxygenId, userType };
      if (submittalsRole !== undefined) body.submittalsRole = submittalsRole;
      const data = await apiRequest('POST', `${base}/settings/mappings`, body);
      if (typeof data === 'string') return data;
      return mapManagerMapping(data);
    }

    case 'delete_submittal_manager_mapping': {
      const { mappingId } = args;
      const data = await apiRequest('DELETE', `${base}/settings/mappings/${mappingId}`);
      if (typeof data === 'string') return data;
      return { success: true, mappingId };
    }

    case 'list_submittal_item_steps': {
      const { itemId, limit, offset: startOffset } = args;
      const params = new URLSearchParams();
      if (limit !== undefined)       params.set('limit',  String(limit));
      if (startOffset !== undefined) params.set('offset', String(startOffset));
      const qs = params.toString();
      const data = await apiRequest('GET', `${base}/items/${itemId}/steps${qs ? '?' + qs : ''}`);
      if (typeof data === 'string') return data;
      return {
        pagination: data.pagination ?? null,
        results:    (data.results ?? []).map(mapStep),
      };
    }

    case 'get_submittal_item_step': {
      const { itemId, stepId } = args;
      const data = await apiRequest('GET', `${base}/items/${itemId}/steps/${stepId}`);
      if (typeof data === 'string') return data;
      return mapStep(data);
    }

    case 'list_submittal_step_tasks': {
      const { itemId, stepId, limit, offset: startOffset } = args;
      const params = new URLSearchParams();
      if (limit !== undefined)       params.set('limit',  String(limit));
      if (startOffset !== undefined) params.set('offset', String(startOffset));
      const qs = params.toString();
      const data = await apiRequest('GET', `${base}/items/${itemId}/steps/${stepId}/tasks${qs ? '?' + qs : ''}`);
      if (typeof data === 'string') return data;
      return {
        pagination: data.pagination ?? null,
        results:    (data.results ?? []).map(mapTask),
      };
    }

    case 'get_submittal_step_task': {
      const { itemId, stepId, taskId } = args;
      const data = await apiRequest('GET', `${base}/items/${itemId}/steps/${stepId}/tasks/${taskId}`);
      if (typeof data === 'string') return data;
      return mapTask(data);
    }

    case 'close_submittal_task': {
      const { itemId, stepId, taskId, responseId, responseComment, duplicateAttachments } = args;
      const body = { responseId };
      if (responseComment      !== undefined) body.responseComment      = responseComment;
      if (duplicateAttachments !== undefined) body.duplicateAttachments = duplicateAttachments;
      const data = await apiRequest('POST', `${base}/items/${itemId}/steps/${stepId}/tasks/${taskId}:close`, body);
      if (typeof data === 'string') return data;
      return mapTask(data);
    }

    case 'update_submittal_step': {
      const { itemId, stepId, daysToRespond, startedAt, dueDate } = args;
      const body = {};
      if (daysToRespond !== undefined) body.daysToRespond = daysToRespond;
      if (startedAt     !== undefined) body.startedAt     = startedAt;
      if (dueDate       !== undefined) body.dueDate       = dueDate;
      const data = await apiRequest('PATCH', `${base}/items/${itemId}/steps/${stepId}`, body);
      if (typeof data === 'string') return data;
      return mapStep(data);
    }

    case 'update_submittal_task': {
      const { itemId, stepId, taskId, startedAt, completedAt } = args;
      const body = {};
      if (startedAt   !== undefined) body.startedAt   = startedAt;
      if (completedAt !== undefined) body.completedAt = completedAt;
      const data = await apiRequest('PATCH', `${base}/items/${itemId}/steps/${stepId}/tasks/${taskId}`, body);
      if (typeof data === 'string') return data;
      return mapTask(data);
    }

    case 'list_submittal_templates': {
      const { sort, limit, offset: startOffset } = args;
      const params = new URLSearchParams();
      if (sort !== undefined)        params.set('sort',   sort);
      if (limit !== undefined)       params.set('limit',  String(limit));
      if (startOffset !== undefined) params.set('offset', String(startOffset));
      const qs = params.toString();
      const data = await apiRequest('GET', `${base}/templates${qs ? '?' + qs : ''}`);
      if (typeof data === 'string') return data;
      return {
        pagination: data.pagination ?? null,
        results:    data.results ?? [],
      };
    }

    case 'create_submittal_template': {
      const { name, steps, watchers } = args;
      const body = { name, steps };
      if (watchers !== undefined) body.watchers = watchers;
      const data = await apiRequest('POST', `${base}/templates`, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_submittal_template': {
      const { templateId, name, steps, watchers } = args;
      const body = {};
      if (name     !== undefined) body.name     = name;
      if (steps    !== undefined) body.steps    = steps;
      if (watchers !== undefined) body.watchers = watchers;
      const data = await apiRequest('PATCH', `${base}/templates/${templateId}`, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_submittal_template': {
      const { templateId } = args;
      const data = await apiRequest('DELETE', `${base}/templates/${templateId}`);
      if (typeof data === 'string') return data;
      return { success: true, templateId };
    }

    case 'get_submittal_user_permissions': {
      const data = await apiRequest('GET', `${base}/users/me`);
      if (typeof data === 'string') return data;
      return {
        id:               data.id,
        roles:            data.roles ?? [],
        permittedActions: data.permittedActions ?? [],
      };
    }

    case 'attach_submittal_file': {
      const { itemId, name, urn, urnTypeId, isFileUploaded, categoryId, taskId } = args;
      const body = { name, urn, urnTypeId };
      if (isFileUploaded !== undefined) body.isFileUploaded = isFileUploaded;
      if (categoryId     !== undefined) body.categoryId     = categoryId;
      if (taskId         !== undefined) body.taskId         = taskId;
      const data = await apiRequest('POST', `${base}/items/${itemId}/attachments`, body);
      if (typeof data === 'string') return data;
      return {
        id:                data.id,
        itemId:            data.itemId,
        taskId:            data.taskId ?? null,
        name:              data.name,
        isFileUploaded:    data.isFileUploaded,
        uploadUrn:         data.uploadUrn ?? null,
        urn:               data.urn ?? null,
        urnTypeId:         data.urnTypeId ?? null,
        urnVersion:        data.urnVersion ?? null,
        revision:          data.revision ?? null,
        categoryId:        data.categoryId ?? null,
        revisionFolderUrn: data.revisionFolderUrn ?? null,
        duplicatedFrom:    data.duplicatedFrom ?? null,
        createdBy:         data.createdBy,
        createdAt:         data.createdAt,
        updatedAt:         data.updatedAt,
        updatedBy:         data.updatedBy,
        permittedActions:  data.permittedActions ?? [],
      };
    }

    case 'get_submittal_attachment_upload_url': {
      const { uploadUrn, parts } = args;
      const prefix = 'urn:adsk.objects:os.object:';
      if (!uploadUrn.startsWith(prefix)) {
        return `Invalid uploadUrn format — expected "${prefix}{bucketKey}/{objectKey}"`;
      }
      const rest = uploadUrn.slice(prefix.length);
      const slashIdx = rest.indexOf('/');
      if (slashIdx === -1) return 'Invalid uploadUrn format — cannot parse bucketKey and objectKey';
      const bucketKey = rest.slice(0, slashIdx);
      const objectKey = rest.slice(slashIdx + 1);
      const params = new URLSearchParams();
      if (parts !== undefined) params.set('parts', String(parts));
      const qs = params.toString();
      const data = await apiRequest(
        'GET',
        `/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectKey)}/signeds3upload${qs ? '?' + qs : ''}`,
      );
      if (typeof data === 'string') return data;
      return {
        uploadKey:        data.uploadKey,
        urls:             data.urls ?? [],
        uploadExpiration: data.uploadExpiration ?? null,
        urlExpiration:    data.urlExpiration ?? null,
      };
    }

    case 'complete_submittal_attachment_upload': {
      const { uploadUrn, uploadKey } = args;
      const prefix = 'urn:adsk.objects:os.object:';
      if (!uploadUrn.startsWith(prefix)) {
        return `Invalid uploadUrn format — expected "${prefix}{bucketKey}/{objectKey}"`;
      }
      const rest = uploadUrn.slice(prefix.length);
      const slashIdx = rest.indexOf('/');
      if (slashIdx === -1) return 'Invalid uploadUrn format — cannot parse bucketKey and objectKey';
      const bucketKey = rest.slice(0, slashIdx);
      const objectKey = rest.slice(slashIdx + 1);
      const data = await apiRequest(
        'POST',
        `/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectKey)}/signeds3upload`,
        { uploadKey },
      );
      if (typeof data === 'string') return data;
      return {
        bucketKey:   data.bucketKey,
        objectId:    data.objectId,
        objectKey:   data.objectKey,
        size:        data.size ?? null,
        contentType: data.contentType ?? null,
        location:    data.location ?? null,
      };
    }

    case 'finalize_submittal_attachment': {
      const { itemId, attachmentId } = args;
      const data = await apiRequest(
        'PATCH',
        `${base}/items/${itemId}/attachments/${attachmentId}`,
        { isFileUploaded: true },
      );
      if (typeof data === 'string') return data;
      return {
        id:             data.id,
        itemId:         data.itemId,
        name:           data.name,
        isFileUploaded: data.isFileUploaded,
        uploadUrn:      data.uploadUrn ?? null,
        urn:            data.urn ?? null,
        categoryId:     data.categoryId ?? null,
        revision:       data.revision ?? null,
        updatedAt:      data.updatedAt,
        permittedActions: data.permittedActions ?? [],
      };
    }

    case 'list_submittal_item_attachments': {
      const { itemId, limit, offset: startOffset } = args;
      const params = new URLSearchParams();
      if (limit !== undefined)       params.set('limit',  String(limit));
      if (startOffset !== undefined) params.set('offset', String(startOffset));
      const qs = params.toString();
      const data = await apiRequest('GET', `${base}/items/${itemId}/attachments${qs ? '?' + qs : ''}`);
      if (typeof data === 'string') return data;
      return {
        pagination: data.pagination ?? null,
        results: (data.results ?? []).map(a => ({
          id:                a.id,
          itemId:            a.itemId,
          taskId:            a.taskId ?? null,
          name:              a.name,
          isFileUploaded:    a.isFileUploaded,
          uploadUrn:         a.uploadUrn ?? null,
          urn:               a.urn ?? null,
          urnVersion:        a.urnVersion ?? null,
          revision:          a.revision ?? null,
          categoryId:        a.categoryId ?? null,
          urnTypeId:         a.urnTypeId ?? null,
          revisionFolderUrn: a.revisionFolderUrn ?? null,
          duplicatedFrom:    a.duplicatedFrom ?? null,
          createdBy:         a.createdBy,
          createdAt:         a.createdAt,
          updatedAt:         a.updatedAt,
          updatedBy:         a.updatedBy,
          permittedActions:  a.permittedActions ?? [],
        })),
      };
    }

    case 'get_submittal_attachment_download_url': {
      const { uploadUrn } = args;
      // Parse urn:adsk.objects:os.object:{bucketKey}/{objectKey}
      const prefix = 'urn:adsk.objects:os.object:';
      if (!uploadUrn.startsWith(prefix)) {
        return `Invalid uploadUrn format — expected "${prefix}{bucketKey}/{objectKey}"`;
      }
      const rest = uploadUrn.slice(prefix.length);
      const slashIdx = rest.indexOf('/');
      if (slashIdx === -1) {
        return 'Invalid uploadUrn format — cannot parse bucketKey and objectKey';
      }
      const bucketKey = rest.slice(0, slashIdx);
      const objectKey = rest.slice(slashIdx + 1);
      const data = await apiRequest(
        'GET',
        `/oss/v2/buckets/${encodeURIComponent(bucketKey)}/objects/${encodeURIComponent(objectKey)}/signeds3download`,
      );
      if (typeof data === 'string') return data;
      return {
        status:      data.status,
        url:         data.url,
        size:        data.size ?? null,
        sha1:        data.sha1 ?? null,
        contentType: data.params?.['content-type'] ?? null,
        fileName:    data.params?.['content-disposition']?.match(/filename="(.+?)"/)?.[1] ?? null,
      };
    }

    default:
      return `Unknown submittal tool: ${name}`;
  }
}
