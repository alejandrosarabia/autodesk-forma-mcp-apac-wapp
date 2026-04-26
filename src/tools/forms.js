/**
 * Forms tools — always use 3LO.
 *
 * Tools: list_form_templates, get_form_template,
 *        get_form_layout, get_form_layout_section,
 *        list_form_instances, get_form_instance,
 *        create_form_instance, update_form_instance,
 *        submit_form_instance, close_form_instance,
 *        void_form_instance, reopen_form_instance,
 *        get_form_field_values, update_form_field_values,
 *        delete_form_tabular_rows, get_form_table_values,
 *        list_form_attachments, get_form_attachment_download_url
 *
 * ACC Forms API — mixed v1/v2:
 *   Templates:  v1 /construction/forms/v1/projects/{pid}/form-templates
 *   Layout:     v1 /construction/forms/v1/projects/{pid}/layouts/{layoutId}
 *   Section:    v2 /construction/forms/v2/projects/{pid}/layouts/{layoutId}/sections/{sectionId}
 *   Forms list: v2 /construction/forms/v2/projects/{pid}/forms
 *   Form CRUD:  v1 /construction/forms/v1/projects/{pid}/form-templates/{tid}/forms[/{fid}]
 *   Field vals: v2 /construction/forms/v2/projects/{pid}/forms/{fid}/values
 *   Batch upd:  v2 /construction/forms/v2/projects/{pid}/forms/{fid}/values:batch-update
 *   Batch del:  v2 /construction/forms/v2/projects/{pid}/forms/{fid}/values:batch-delete
 *   tabularValues row keys: {id, schema, columns} — schema=worklogEntries/materialsEntries/equipmentEntries or custom table UUID
 *   Custom tables: must use columnId (column UID from GET sections); native tables: columnName or columnId both work
 *   Table vals: v1 /construction/forms/v1/projects/{pid}/forms/{fid}/table/{fieldId}/values
 *
 * projectId = bare UUID, b. prefix stripped via withoutBPrefix().
 * Status values: draft, inReview, submitted, archived
 */

import { apiRequest, withoutBPrefix } from '../auth/router.js';

// ─── Pagination helper ────────────────────────────────────────────────────────

async function paginate(fetchFn, pageSize = 50, max = undefined) {
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

export const formTools = [
  // ── Templates ──────────────────────────────────────────────────────────────
  {
    name: 'list_form_templates',
    description:
      'List all form templates in a project. Auto-paginates all results. ' +
      'Optionally filter client-side by status or name. ' +
      'projectId should include the b. prefix — it is stripped internally.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:    { type: 'string', description: 'Project ID (b.{uuid} format)' },
        status:       { type: 'string', enum: ['active', 'inactive', 'deleted'], description: 'Filter by template status (client-side)' },
        search:       { type: 'string', description: 'Filter templates by name substring (client-side)' },
        updatedAfter: { type: 'string', description: 'Return templates updated after this ISO 8601 datetime' },
        updatedBefore:{ type: 'string', description: 'Return templates updated before this ISO 8601 datetime' },
        sortOrder:    { type: 'string', enum: ['asc', 'desc'], description: 'Sort order for results' },
        limit:        { type: 'number', description: 'Max results to return (omit to fetch all)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_form_template',
    description:
      'Get full details of a single form template by ID. ' +
      'Returns metadata including templateType, isPdf, pdfUrl, currentLayoutId, and permissions. ' +
      'For non-PDF templates use get_form_layout with currentLayoutId to get the section/field structure.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        templateId: { type: 'string', description: 'Form template UUID' },
      },
      required: ['projectId', 'templateId'],
    },
  },
  {
    name: 'get_form_layout',
    description:
      'Get layout information for a non-PDF form template, including its sections and their UIDs. ' +
      'Use currentLayoutId from get_form_template as the layoutId. ' +
      'Call get_form_layout_section for each section UID to get full field definitions.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        layoutId:  { type: 'string', description: 'Layout UUID (currentLayoutId from the template)' },
      },
      required: ['projectId', 'layoutId'],
    },
  },
  {
    name: 'get_form_layout_section',
    description:
      'Get detailed field definitions for a specific section within a form layout (v2). ' +
      'Returns sectionItems (fields and tables) with field types, labels, required flags, ' +
      'dropdown options (presets), table column definitions (columnType, columnKey, etc.), ' +
      'and conditional logic actions (show/hide/require rules based on field values). ' +
      'Use this to know which fieldId and valueName to use when updating field values.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        layoutId:  { type: 'string', description: 'Layout UUID' },
        sectionId: { type: 'string', description: 'Section UUID (uid from get_form_layout sections)' },
      },
      required: ['projectId', 'layoutId', 'sectionId'],
    },
  },

  // ── Forms (instances) ──────────────────────────────────────────────────────
  {
    name: 'list_form_instances',
    description:
      'List form instances (filled-out forms) in a project using the v2 API. ' +
      'Supports rich filtering by template, statuses, date ranges, location, and text search. ' +
      'Status values: draft, inReview, submitted, archived. ' +
      'Sort examples: "updatedAt desc", "formNum asc", "updatedAt desc,formNum asc". ' +
      'Use include=["layoutInfo"] to embed field values in the response.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:          { type: 'string', description: 'Project ID (b.{uuid} format)' },
        templateId:         { type: 'string', description: 'Filter by form template UUID' },
        statuses:           { type: 'array', items: { type: 'string', enum: ['draft', 'inReview', 'submitted', 'archived'] }, description: 'Filter by one or more statuses' },
        ids:                { type: 'array', items: { type: 'string' }, description: 'Fetch specific form instance UUIDs' },
        formDateMin:        { type: 'string', description: 'Return forms with formDate on or after this date (YYYY-MM-DD)' },
        formDateMax:        { type: 'string', description: 'Return forms with formDate on or before this date (YYYY-MM-DD)' },
        updatedAfter:       { type: 'string', description: 'Return forms updated at or after this ISO 8601 datetime' },
        updatedBefore:      { type: 'string', description: 'Return forms updated at or before this ISO 8601 datetime' },
        search:             { type: 'string', description: 'Search for forms containing exact match of specified text' },
        locationIds:        { type: 'array', items: { type: 'string' }, description: 'Filter by location UUIDs' },
        includeSubLocations:{ type: 'boolean', description: 'Include forms from sub-locations of specified locationIds' },
        include:            { type: 'array', items: { type: 'string', enum: ['sublocations', 'inactiveFormTemplates', 'layoutInfo', 'nativeValues', 'tableMetadata'] }, description: 'Extra fields to embed in response' },
        sort:               { type: 'string', description: 'Sort expression, e.g. "updatedAt desc" or "updatedAt desc,formNum asc" (max 3)' },
        limit:              { type: 'number', description: 'Max results to return (omit to fetch all)' },
        offset:             { type: 'number', description: 'Starting offset for a single page (use with limit)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_form_instance',
    description:
      'Get full details of a single form instance including metadata, field values (nativeForm.customValues), ' +
      'weather, PDF info, and status history. Uses the v2 list API with ids filter for efficient fetch.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        formId:    { type: 'string', description: 'Form instance UUID' },
      },
      required: ['projectId', 'formId'],
    },
  },
  {
    name: 'create_form_instance',
    description:
      'Create a new form instance from a template. All body parameters are optional — pass {} to use all defaults. ' +
      'The form starts in "draft" status. Use submit_form_instance to move it to "submitted". ' +
      'Note: dueDate is not settable at creation time — use update_form_instance after creation.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:     { type: 'string', description: 'Project ID (b.{uuid} format)' },
        templateId:    { type: 'string', description: 'Form template UUID (from list_form_templates)' },
        name:          { type: 'string', description: 'Form instance name. Defaults to template name if omitted. Max 100 chars.' },
        assigneeId:    { type: 'string', description: 'ID of the user, role, or company to assign the form to' },
        assigneeType:  { type: 'string', enum: ['user', 'company', 'role'], description: 'Type of assignee' },
        formDate:      { type: 'string', description: 'Date the form pertains to (YYYY-MM-DD, must be after 1950-01-01)' },
        locationId:    { type: 'string', description: 'Location UUID from the project location tree' },
        description:   { type: 'string', description: 'Form description. Max 8000 chars.' },
        notes:         { type: 'string', description: 'Form notes. Max 8000 chars.' },
        id:            { type: 'string', description: 'Pre-assign a UUID for the form (optional, auto-generated if omitted)' },
        userCreatedAt: { type: 'string', description: 'ISO 8601 timestamp of original creation (for offline sync)' },
      },
      required: ['projectId', 'templateId'],
    },
  },
  {
    name: 'update_form_instance',
    description:
      'Update metadata fields on an existing form instance (PATCH). Form must be in draft or inReview status. ' +
      'Can also transition status by passing the status field directly. ' +
      'To update form field values (questions/answers), use update_form_field_values instead.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:          { type: 'string', description: 'Project ID (b.{uuid} format)' },
        templateId:         { type: 'string', description: 'Form template UUID (from get_form_instance.formTemplateId)' },
        formId:             { type: 'string', description: 'Form instance UUID' },
        name:               { type: 'string', description: 'Form name. Max 100 chars.' },
        assigneeId:         { type: 'string', description: 'ID of user, role, or company to assign' },
        assigneeType:       { type: 'string', enum: ['user', 'company', 'role'], description: 'Type of assignee' },
        formDate:           { type: 'string', description: 'Date the form pertains to (YYYY-MM-DD)' },
        locationId:         { type: 'string', description: 'Location UUID' },
        description:        { type: 'string', description: 'Form description. Max 8000 chars.' },
        notes:              { type: 'string', description: 'Form notes. Max 8000 chars.' },
        status:             { type: 'string', enum: ['draft', 'inReview', 'submitted', 'archived'], description: 'Transition status directly' },
        submitterSignature: { type: 'string', description: 'Base64-encoded SVG signature of the submitter' },
        pdfValues:          { type: 'array', description: 'PDF field values for PDF-based forms. Each item: { name: "<fieldName>", value: "<fieldValue>" }.', items: { type: 'object', properties: { name: { type: 'string' }, value: { type: 'string' } }, required: ['name', 'value'] } },
      },
      required: ['projectId', 'templateId', 'formId'],
    },
  },
  {
    name: 'submit_form_instance',
    description: 'Transition a form instance to "submitted" status (from draft or inReview). Requires templateId.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        templateId: { type: 'string', description: 'Form template UUID (from get_form_instance.formTemplateId)' },
        formId:     { type: 'string', description: 'Form instance UUID' },
        submitterSignature: { type: 'string', description: 'Optional base64-encoded SVG signature' },
      },
      required: ['projectId', 'templateId', 'formId'],
    },
  },
  {
    name: 'close_form_instance',
    description: 'Archive a form instance (sets status to "archived"). Form will be hidden in the UI and not editable.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        templateId: { type: 'string', description: 'Form template UUID (from get_form_instance.formTemplateId)' },
        formId:     { type: 'string', description: 'Form instance UUID' },
      },
      required: ['projectId', 'templateId', 'formId'],
    },
  },
  {
    name: 'void_form_instance',
    description: 'Void/archive a form instance (sets status to "archived"). Equivalent to close_form_instance.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        templateId: { type: 'string', description: 'Form template UUID (from get_form_instance.formTemplateId)' },
        formId:     { type: 'string', description: 'Form instance UUID' },
      },
      required: ['projectId', 'templateId', 'formId'],
    },
  },
  {
    name: 'reopen_form_instance',
    description: 'Reopen a submitted or archived form, returning it to "draft" status so it can be edited again.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        templateId: { type: 'string', description: 'Form template UUID (from get_form_instance.formTemplateId)' },
        formId:     { type: 'string', description: 'Form instance UUID' },
      },
      required: ['projectId', 'templateId', 'formId'],
    },
  },

  // ── Field values ───────────────────────────────────────────────────────────
  {
    name: 'get_form_field_values',
    description:
      'Get all non-tabular field values (answers) for a form instance using the v2 values endpoint. ' +
      'Only answered questions are returned. Each value includes fieldId, the typed value, notes, updatedAt, updatedBy. ' +
      'Use sectionUid to filter to a specific section. ' +
      'For tabular values (work log, materials, equipment, custom tables), use get_form_table_values instead.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:  { type: 'string', description: 'Project ID (b.{uuid} format)' },
        formId:     { type: 'string', description: 'Form instance UUID' },
        sectionUid: { type: 'string', description: 'Filter to values in a specific section (uid from get_form_layout)' },
        limit:      { type: 'number', description: 'Max results per page (1-50, default 50). Omit to fetch all.' },
      },
      required: ['projectId', 'formId'],
    },
  },
  {
    name: 'update_form_field_values',
    description:
      'Batch-upsert field values in a form instance (v2, PUT). Form must be in "draft" status. ' +
      'Max 10 items per request for both customValues and tabularValues. ' +
      'customValues: non-tabular fields — provide fieldId + the correct typed value key for that field ' +
      '(textVal, choiceVal, arrayVal, dateVal, numberVal, toggleVal, or svgVal). ' +
      'Use get_form_layout_section to find fieldIds and valueName for each field. ' +
      'tabularValues: table rows — each row needs a client-generated UUID (id), a schema (built-in alias or custom table fieldId), and columns array. ' +
      'Built-in schemas: worklogEntries, materialsEntries, equipmentEntries.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        formId:    { type: 'string', description: 'Form instance UUID' },
        customValues: {
          type: 'array',
          description: 'Non-tabular field updates, max 10 items.',
          items: {
            type: 'object',
            properties: {
              fieldId:   { type: 'string', description: 'Field UUID from layout section' },
              textVal:   { type: 'string', description: 'For text fields (valueName: textVal)' },
              choiceVal: { type: 'string', description: 'For single-select fields (valueName: choiceVal)' },
              arrayVal:  { type: 'array', items: { type: 'string' }, description: 'For multi-select fields (valueName: arrayVal)' },
              dateVal:   { type: 'string', description: 'For date fields, YYYY-MM-DD (valueName: dateVal)' },
              numberVal: { type: 'number', description: 'For number fields (valueName: numberVal)' },
              toggleVal: { type: 'string', enum: ['Yes', 'No', 'True', 'False', 'Pass', 'Fail', 'Plus', 'Minus', 'NA'], description: 'For toggle/checkbox fields (valueName: toggleVal)' },
              svgVal:    { type: 'string', description: 'Base64-encoded SVG for signature fields (valueName: svgVal)' },
              name:      { type: 'string', description: 'Signer name — only for signature fields' },
              notes:     { type: 'string', description: 'Field-level notes. Max 8000 chars.' },
            },
            required: ['fieldId'],
          },
        },
        tabularValues: {
          type: 'array',
          description: 'Table row upserts, max 10 items. Each row needs a client-generated UUID.',
          items: {
            type: 'object',
            properties: {
              id:      { type: 'string', description: 'Client-generated UUID for this row (generate a new UUID for new rows)' },
              schema:  { type: 'string', description: 'Table identifier: worklogEntries, materialsEntries, equipmentEntries, or custom table UUID (from section sectionItems[].schema)' },
              columns: { type: 'array', description: 'Cell values for this row. Native tables: use columnName or columnId. Custom tables: must use columnId (column UID from section details).', items: { type: 'object' } },
            },
            required: ['id', 'schema'],
          },
        },
        excludeFormResponse:    { type: 'boolean', description: 'If true, returns 204 with no body (faster)' },
        includeNativeFormValues:{ type: 'boolean', description: 'Include nativeForm.customValues in response' },
      },
      required: ['projectId', 'formId'],
    },
  },
  {
    name: 'delete_form_tabular_rows',
    description:
      'Delete rows from tabular fields in a form instance (v2, POST to :batch-delete). ' +
      'Form must be in "draft" status. Currently only supports tabular rows — non-tabular values cannot be deleted. ' +
      'Provide the row UUID (id) and schema for each row to delete. Max 10 items per request. ' +
      'Built-in schemas: worklogEntries, materialsEntries, equipmentEntries. ' +
      'Custom table schema: use the fieldId/schema from the section detail.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        formId:    { type: 'string', description: 'Form instance UUID' },
        tabularValues: {
          type: 'array',
          description: 'Rows to delete, max 10 items.',
          items: {
            type: 'object',
            properties: {
              id:     { type: 'string', description: 'Row UUID (from get_form_table_values)' },
              schema: { type: 'string', description: 'Table identifier: worklogEntries, materialsEntries, equipmentEntries, or custom table UUID' },
            },
            required: ['id', 'schema'],
          },
        },
        excludeFormResponse:    { type: 'boolean', description: 'If true, returns 204 with no body (faster)' },
        includeNativeFormValues:{ type: 'boolean', description: 'Include nativeForm.customValues in response' },
      },
      required: ['projectId', 'formId', 'tabularValues'],
    },
  },
  {
    name: 'get_form_table_values',
    description:
      'Get all row values from a specific table in a form (v1). ' +
      'Use for work log, materials, equipment, or custom table data. ' +
      'The fieldId is the table\'s UID — use sectionItems[].uid from get_form_layout_section (NOT the schema UUID). ' +
      'Built-in table UIDs: ' +
      'Work Log: 6c8055d5-1301-46f6-9d18-8a2a208a277e, ' +
      'Materials: 2adf5ad9-d9d3-ee42-6fd8-015c34ce474d, ' +
      'Equipment: 8af6c450-dd2a-32ae-0090-5493a9cc884e. ' +
      'For custom tables, get the UID from get_form_layout_section (sectionItems[].uid where type="table").',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        formId:    { type: 'string', description: 'Form instance UUID' },
        fieldId:   { type: 'string', description: 'Table UID (sectionItems[].uid from get_form_layout_section, NOT the schema UUID)' },
        limit:     { type: 'number', description: 'Max rows per page (1-50, default 50). Omit to fetch all.' },
      },
      required: ['projectId', 'formId', 'fieldId'],
    },
  },

  // ── Attachments ────────────────────────────────────────────────────────────
  {
    name: 'list_form_attachments',
    description: 'List file attachments on a form instance.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (b.{uuid} format)' },
        formId:    { type: 'string', description: 'Form instance UUID' },
      },
      required: ['projectId', 'formId'],
    },
  },
  {
    name: 'get_form_attachment_download_url',
    description: 'Get a signed download URL for a file attachment on a form instance.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId:    { type: 'string', description: 'Project ID (b.{uuid} format)' },
        formId:       { type: 'string', description: 'Form instance UUID' },
        attachmentId: { type: 'string', description: 'Attachment UUID' },
      },
      required: ['projectId', 'formId', 'attachmentId'],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapTemplate(t) {
  return {
    id: t.id,
    projectId: t.projectId,
    name: t.name,
    status: t.status,
    templateType: t.templateType,
    createdBy: t.createdBy,
    updatedAt: t.updatedAt,
    isPdf: t.isPdf,
    pdfUrl: t.pdfUrl || undefined,
    currentLayoutId: t.currentLayoutId || undefined,
    formsUrl: t.forms?.url || undefined,
    userPermissions: t.userPermissions?.length ? t.userPermissions : undefined,
    groupPermissions: t.groupPermissions?.length ? t.groupPermissions : undefined,
  };
}

function mapInstance(f) {
  return {
    id: f.id,
    formTemplateId: f.formTemplateId,
    formTemplate: f.formTemplate || undefined,
    name: f.name,
    status: f.status,
    formNum: f.formNum,
    formDate: f.formDate,
    assigneeId: f.assigneeId,
    assigneeType: f.assigneeType,
    dueDate: f.dueDate || undefined,
    locationId: f.locationId || undefined,
    description: f.description || undefined,
    notes: f.notes || undefined,
    createdBy: f.createdBy,
    createdAt: f.createdAt,
    userCreatedAt: f.userCreatedAt || undefined,
    updatedAt: f.updatedAt,
    updatedBy: f.updatedBy || undefined,
    lastSubmittedAt: f.lastSubmittedAt || undefined,
    lastSubmittedBy: f.lastSubmittedBy || undefined,
    lastReopenedBy: f.lastReopenedBy || undefined,
    lastStatusChanges: f.lastStatusChanges || undefined,
    nativeForm: f.nativeForm || undefined,
    pdfFile: f.pdfFile || undefined,
    pdfUrl: f.pdfUrl || undefined,
    pdfValues: f.pdfValues?.length ? f.pdfValues : undefined,
    weather: f.weather || undefined,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleFormTool(name, args) {
  const pid = withoutBPrefix(args.projectId);
  const basev1 = `/construction/forms/v1/projects/${pid}`;
  const basev2 = `/construction/forms/v2/projects/${pid}`;

  switch (name) {

    // ── Templates ─────────────────────────────────────────────────────────────

    case 'list_form_templates': {
      const { status, search, updatedAfter, updatedBefore, sortOrder, limit } = args;
      const items = await paginate(async (offset, pageSize) => {
        const p = new URLSearchParams({ offset: String(offset), limit: String(pageSize) });
        if (updatedAfter)  p.set('updatedAfter', updatedAfter);
        if (updatedBefore) p.set('updatedBefore', updatedBefore);
        if (sortOrder)     p.set('sortOrder', sortOrder);
        return apiRequest('GET', `${basev1}/form-templates?${p}`);
      }, 50, limit);
      let out = items;
      if (status) out = out.filter((t) => t.status === status);
      if (search) out = out.filter((t) => t.name?.toLowerCase().includes(search.toLowerCase()));
      return out.map(mapTemplate);
    }

    case 'get_form_template': {
      const items = await paginate(async (offset, pageSize) =>
        apiRequest('GET', `${basev1}/form-templates?offset=${offset}&limit=${pageSize}`), 50);
      if (typeof items === 'string') return items;
      const found = items.find((t) => t.id === args.templateId);
      if (!found) return `Not found - no template with id ${args.templateId}`;
      return mapTemplate(found);
    }

    case 'get_form_layout': {
      const data = await apiRequest('GET', `${basev1}/layouts/${args.layoutId}`);
      if (typeof data === 'string') return data;
      return {
        layout: data.layout,
        sections: (data.sections || []).map((s) => ({
          uid: s.uid,
          label: s.label,
          description: s.description || undefined,
          sortIndex: s.sortIndex,
          displayIndex: s.displayIndex,
          assigneeType: s.assigneeType || undefined,
          assigneeId: s.assigneeId || undefined,
        })),
      };
    }

    case 'get_form_layout_section': {
      const data = await apiRequest('GET', `${basev2}/layouts/${args.layoutId}/sections/${args.sectionId}`);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Forms (instances) ─────────────────────────────────────────────────────

    case 'list_form_instances': {
      const {
        templateId, statuses, ids, formDateMin, formDateMax,
        updatedAfter, updatedBefore, search, locationIds,
        includeSubLocations, include, sort, limit, offset: startOffset,
      } = args;

      const buildParams = (offset, pageSize) => {
        const p = new URLSearchParams({ offset: String(offset), limit: String(pageSize) });
        if (templateId)          p.set('templateId', templateId);
        if (formDateMin)         p.set('formDateMin', formDateMin);
        if (formDateMax)         p.set('formDateMax', formDateMax);
        if (updatedAfter)        p.set('updatedAfter', updatedAfter);
        if (updatedBefore)       p.set('updatedBefore', updatedBefore);
        if (search)              p.set('search', search);
        if (includeSubLocations) p.set('includeSubLocations', 'true');
        if (sort)                p.set('sort', sort);
        if (statuses?.length)    statuses.forEach((s) => p.append('statuses', s));
        if (ids?.length)         ids.forEach((id) => p.append('ids', id));
        if (locationIds?.length) locationIds.forEach((id) => p.append('locationIds', id));
        if (include?.length)     include.forEach((v) => p.append('include', v));
        return p;
      };

      if (limit !== undefined && startOffset !== undefined) {
        const data = await apiRequest('GET', `${basev2}/forms?${buildParams(startOffset, limit)}`);
        if (typeof data === 'string') return data;
        return (data.data || []).map(mapInstance);
      }

      const items = await paginate(async (offset, pageSize) =>
        apiRequest('GET', `${basev2}/forms?${buildParams(offset, pageSize)}`), 50, limit);
      return items.map(mapInstance);
    }

    case 'get_form_instance': {
      const p = new URLSearchParams({ limit: '1' });
      p.append('ids', args.formId);
      const data = await apiRequest('GET', `${basev2}/forms?${p}`);
      if (typeof data === 'string') return data;
      const found = (data.data || [])[0];
      if (!found) return `Not found - no form instance with id ${args.formId}`;
      return mapInstance(found);
    }

    case 'create_form_instance': {
      const { templateId, name, assigneeId, assigneeType, formDate, locationId, description, notes, id, userCreatedAt } = args;
      const body = {};
      if (name)          body.name = name;
      if (assigneeId)    body.assigneeId = assigneeId;
      if (assigneeType)  body.assigneeType = assigneeType;
      if (formDate)      body.formDate = formDate;
      if (locationId)    body.locationId = locationId;
      if (description)   body.description = description;
      if (notes)         body.notes = notes;
      if (id)            body.id = id;
      if (userCreatedAt) body.userCreatedAt = userCreatedAt;
      const data = await apiRequest('POST', `${basev1}/form-templates/${templateId}/forms`, body);
      if (typeof data === 'string') return data;
      return mapInstance(data);
    }

    case 'update_form_instance': {
      const { templateId, formId, name, assigneeId, assigneeType, formDate, locationId, description, notes, status, submitterSignature, pdfValues } = args;
      const body = {};
      if (name !== undefined)               body.name = name;
      if (assigneeId !== undefined)         body.assigneeId = assigneeId;
      if (assigneeType !== undefined)       body.assigneeType = assigneeType;
      if (formDate !== undefined)           body.formDate = formDate;
      if (locationId !== undefined)         body.locationId = locationId;
      if (description !== undefined)        body.description = description;
      if (notes !== undefined)              body.notes = notes;
      if (status !== undefined)             body.status = status;
      if (submitterSignature !== undefined) body.submitterSignature = submitterSignature;
      if (pdfValues !== undefined)          body.pdfValues = pdfValues;
      const data = await apiRequest('PATCH', `${basev1}/form-templates/${templateId}/forms/${formId}`, body);
      if (typeof data === 'string') return data;
      return mapInstance(data);
    }

    case 'submit_form_instance': {
      const body = { status: 'submitted' };
      if (args.submitterSignature) body.submitterSignature = args.submitterSignature;
      const data = await apiRequest('PATCH', `${basev1}/form-templates/${args.templateId}/forms/${args.formId}`, body);
      if (typeof data === 'string') return data;
      return mapInstance(data);
    }

    case 'close_form_instance':
    case 'void_form_instance': {
      const data = await apiRequest('PATCH', `${basev1}/form-templates/${args.templateId}/forms/${args.formId}`, { status: 'archived' });
      if (typeof data === 'string') return data;
      return mapInstance(data);
    }

    case 'reopen_form_instance': {
      const data = await apiRequest('PATCH', `${basev1}/form-templates/${args.templateId}/forms/${args.formId}`, { status: 'draft' });
      if (typeof data === 'string') return data;
      return mapInstance(data);
    }

    // ── Field values ──────────────────────────────────────────────────────────

    case 'get_form_field_values': {
      const { formId, sectionUid, limit } = args;
      try {
        const items = await paginate(async (offset, pageSize) => {
          const p = new URLSearchParams({ offset: String(offset), limit: String(pageSize) });
          if (sectionUid) p.set('sectionUid', sectionUid);
          return apiRequest('GET', `${basev2}/forms/${formId}/values?${p}`);
        }, 50, limit);
        return items;
      } catch (err) {
        // API returns 404 when the form has no field values — treat as empty
        if (err.message && err.message.includes('Not found')) return [];
        throw err;
      }
    }

    case 'update_form_field_values': {
      const { formId, customValues, tabularValues, excludeFormResponse, includeNativeFormValues } = args;
      const p = new URLSearchParams();
      if (excludeFormResponse)    p.set('excludeFormResponse', 'true');
      if (includeNativeFormValues) p.set('includeNativeFormValues', 'true');
      const qs = p.toString();
      const url = `${basev2}/forms/${formId}/values:batch-update${qs ? '?' + qs : ''}`;
      const body = {};
      if (customValues)  body.customValues = customValues;
      if (tabularValues) body.tabularValues = tabularValues;
      const data = await apiRequest('PUT', url, body);
      if (typeof data === 'string') return data;
      return data ? mapInstance(data) : { updated: true };
    }

    case 'delete_form_tabular_rows': {
      const { formId, tabularValues, excludeFormResponse, includeNativeFormValues } = args;
      const p = new URLSearchParams();
      if (excludeFormResponse)     p.set('excludeFormResponse', 'true');
      if (includeNativeFormValues) p.set('includeNativeFormValues', 'true');
      const qs = p.toString();
      const url = `${basev2}/forms/${formId}/values:batch-delete${qs ? '?' + qs : ''}`;
      const data = await apiRequest('POST', url, { tabularValues });
      if (typeof data === 'string') return data;
      return data ? mapInstance(data) : { deleted: true };
    }

    case 'get_form_table_values': {
      const { formId, fieldId, limit } = args;
      const items = await paginate(async (offset, pageSize) => {
        const p = new URLSearchParams({ offset: String(offset), limit: String(pageSize) });
        return apiRequest('GET', `${basev1}/forms/${formId}/table/${fieldId}/values?${p}`);
      }, 50, limit);
      return items;
    }

    // ── Attachments ───────────────────────────────────────────────────────────

    case 'list_form_attachments': {
      const data = await apiRequest('GET', `${basev1}/forms/${args.formId}/attachments`);
      // API returns 404 when form has no attachments — treat as empty
      if (typeof data === 'string' && data.includes('Not found')) return [];
      if (typeof data === 'string') return data;
      return data?.data || data?.results || data || [];
    }

    case 'get_form_attachment_download_url': {
      const data = await apiRequest('GET', `${basev1}/forms/${args.formId}/attachments/${args.attachmentId}/download`);
      if (typeof data === 'string') return data;
      return data;
    }

    default:
      return `Unknown form tool: ${name}`;
  }
}
