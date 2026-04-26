# Autodesk ACC MCP — Claude Code Guide

## What this is
MCP server that connects Claude Code to Autodesk Construction Cloud (ACC) APIs.
Covers: Projects, Issues, RFIs, Forms, Submittals, Assets, Permissions, Documents, Cost Management, Takeoff, Sheets, Locations, Photos, Reviews, Transmittals, Relationships, Model Coordination, Model Properties, AutoSpecs, Data Connector, Hub Admin.

## First-time setup (do this once)

```bash
npm install
cp .env.example .env        # then fill in credentials from your team lead
node auth-trigger.js        # opens browser → log in with your Autodesk account → done
```

After that, reopen this folder in Claude Code. The MCP server starts automatically via `.mcp.json` and all tools are available.

## Re-authenticating (token expires ~60 min)
Ask Claude: "check auth status" or "start auth flow" — it will give you a browser link.
Or run: `node auth-trigger.js`

## Available tools

| Area | Key tools |
|------|-----------|
| Projects | `get_hubs`, `get_projects` |
| Hub Admin | `list_projects`, `list_companies`, `list_users`, `add_project_user` |
| Issues | `list_issues`, `create_issue`, `update_issue`, `create_issue_attachment` |
| RFIs | `list_rfis`, `create_rfi`, `update_rfi`, `add_rfi_comment` |
| Forms | `list_form_templates`, `list_form_instances`, `create_form_instance`, `submit_form_instance` |
| Submittals | `list_submittals`, `get_submittal`, `create_submittal`, `transition_submittal` |
| Assets | `list_assets`, `create_assets`, `update_assets`, `list_asset_categories`, `list_status_sets` |
| Cost Management | `list_budgets`, `list_contracts`, `list_change_orders_by_type`, `create_change_order`, `perform_action` |
| Documents | `get_top_folders`, `get_folder_contents`, `search_folder`, `create_pdf_export` |
| Permissions | `get_folder_permissions`, `batch_create_folder_permissions` |
| Locations | `list_nodes`, `create_node` |
| Photos | `get_photo`, `filter_photos` |
| Sheets | `list_sheets`, `get_sheet`, `list_version_sets` |
| Takeoff | `list_takeoff_packages`, `list_takeoff_items` |
| Reviews | `list_reviews`, `create_review` |
| Transmittals | `list_transmittals`, `get_transmittal` |
| Relationships | `search_relationships`, `create_relationships`, `delete_relationships` |
| Model Coordination | `list_model_sets`, `list_clash_tests` |
| Model Properties | `get_index`, `get_index_fields`, `create_index_query` |
| AutoSpecs | `get_autospecs_metadata`, `get_autospecs_smartregister` |
| Data Connector | `list_data_connector_requests`, `create_data_connector_request` |
| Auth | `check_auth_status`, `start_auth_flow` |

## Key project IDs

| Project | ID |
|---------|----|
| (Your Project) | `b.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

## Notes
- All construction APIs use your personal Autodesk account (3LO). Each teammate authenticates individually.
- `projectId` always uses the `b.` prefix (e.g. `b.xxxxxxxx-...`). Cost Management uses a separate `containerId` (bare GUID).
- Token auto-refreshes silently. If you get auth errors, run `node auth-trigger.js`.

---

## Workflows

---

### Projects & Navigation

**Find your hub and project IDs**

Tool chain: `get_hubs` → `get_projects`

---

### Hub Admin — Create and Configure Projects

**Create a project from scratch**

Tool chain:
1. `create_project` (accountId, name, type, classification="production", startDate, endDate, addressLine1, city, country, timezone, projectValue)
2. Poll `get_project` (projectId) until `status === "active"` — activation is async
3. `add_project_user` (projectId, email, companyId, roleIds, products=[{key: "projectAdministration", access: "administrator"}]) — assign admin first
4. `import_project_users` (projectId, users=[{email, companyId, roleIds, products},...]) — bulk add remaining members

**Create a project from a template**

Tool chain:
1. `list_projects` (accountId, filterClassification=["template"]) — find template project ID
2. `create_project` (accountId, name, type, templateProjectId=\<template-id\>) — clones products and settings
3. Poll `get_project` (projectId) until `status === "active"`
4. `add_project_user` (projectId, email, products=[{key: "projectAdministration", access: "administrator"}]) — must assign admin to trigger template member import

**Add members to a project in bulk**

Tool chain:
1. `list_roles` (projectId) — get role IDs
2. `get_project_companies` (accountId, projectId) — get company IDs
3. `import_project_users` (projectId, users=[{email, companyId, roleIds, products:[{key:"takeoff",access:"member"},{key:"build",access:"member"}]},...])
4. `list_project_users` (projectId, filterStatus=["active"]) — verify activation

**Update a project member's product access**

Tool chain:
1. `list_project_users` (projectId, filterEmail=email) — find userId
2. `update_project_user` (projectId, userId, products=[{key: "takeoff", access: "administrator"}])

---

### Assets

**Retrieve all asset data for a project (full audit)**

Tool chain:
1. `list_asset_categories` — full category tree
2. `list_status_sets` — all status sets with statuses
3. `list_asset_custom_attributes` — all custom attribute definitions
4. `get_category_status_sets` (categoryIds=[...], includeInherited=true) — status set assignments
5. `get_category_custom_attributes` (per category, includeInherited=true) — custom attribute assignments
6. `list_assets` (includeCustomAttributes=true) — all assets with their values
7. `get_location_nodes` — resolve locationId to human-readable names

**Set up asset project settings from scratch**

Tool chain:
1. `list_asset_categories` — find ROOT category ID
2. `create_asset_category` (name, parentId=ROOT, includeUid=true) — get both numeric ID and UID
3. `create_status_set` (name, values=[{label, color},...])
4. `assign_category_status_set` (categoryId, statusSetId)
5. `create_asset_custom_attribute` (displayName, dataType, requiredOnIngress)
6. `assign_category_custom_attribute` (categoryId, customAttributeId)
7. `create_relationships` — link category UID to a form template (domain: autodesk-bim360-asset/categoryuid + autodesk-construction-form/formtemplate)

**Create and manage assets**

Tool chain:
1. `list_asset_categories` — find category ID
2. `list_asset_statuses` — find valid status IDs
3. `create_assets` (array of asset objects with categoryId, statusId, clientAssetId, customAttributes)

**Update assets in bulk**

Tool chain:
1. `list_assets` (filter by search or categoryId to get IDs)
2. `update_assets` (array of {id, statusId} patch objects)

**Link an asset to an issue**

Tool chain:
1. `create_relationships` (entities: [{id: assetId, domain: autodesk-bim360-asset, type: asset}, {id: issueId, domain: autodesk-bim360-issue, type: issue}])

**Find all relationships for an asset**

Tool chain: `get_asset_relationships` (assetId=X) → optionally filter by withDomain

---

### Issues

**List and filter issues**

Tool chain: `list_issues` (filter[status]=open, filter[assignedTo]=userId, projectId)

**Create an issue with custom attributes**

Tool chain:
1. `get_issue_profile` (projectId) — verify user has create permission (issues.new in response)
2. `list_issue_types` (projectId, include="subtypes") — find issueTypeId (category) and issueSubtypeId
3. `list_issue_attribute_mappings` (projectId, filter[mappedItemId]=issueSubtypeId) — find custom field attributeDefinitionIds for that subtype
4. `list_issue_attribute_definitions` (projectId) — get dataType/title for those attributeDefinitionIds
5. `create_issue` (projectId, title, issueSubtypeId, status="open", assignedTo, assignedToType="user", dueDate, locationId, published=true, watchers=[...], customAttributes=[{attributeDefinitionId, value}])

**Add a comment to an issue**

Tool chain: `add_issue_comment` (projectId, issueId, body)

**Attach a file to an issue (OSS upload workflow)**

Tool chain:
1. `get_top_folders` (hubId, projectId) — get folder ID, note parent folder URN from `relationships.parent.data.id`
2. OSS storage create (manual): POST `/data/v1/projects/{pid}/storage` with `{data: {type: "objects", attributes: {name: "{uuid}.jpg"}, relationships: {target: {data: {type: "folders", id: rootFolderUrn}}}}}` → get `data.id` (storageUrn)
3. OSS upload (manual): GET `signeds3upload` for bucket/object key → PUT file to signed URL → POST `signeds3upload` with uploadKey
4. `create_issue_attachment` (projectId, issueId, attachments=[{attachmentId: \<uuid\>, displayName: "site-photo.jpg", fileName: "\<uuid\>.jpg", storageUrn: \<from step 2\>}])

**Link a photo to an issue**

Tool chain:
1. `filter_photos` (projectId) — find photo ID
2. `create_relationships` (containerId=projectId, entities=[{domain: "autodesk-bim360-issue", type: "issue", id: issueId}, {domain: "autodesk-construction-photo", type: "photo", id: photoId}])

**Find all photos linked to an issue**

Tool chain:
1. `intersect_relationships` (containerId=projectId, entities=[{domain: "autodesk-bim360-issue", type: "issue", id: issueId}]) — returns related photo IDs
2. `get_photo` (projectId, photoId, include="signedUrls") — get signed download URL for each photo

**Retrieve and download issue file attachments**

Tool chain:
1. `list_issue_attachments` (projectId, issueId) — returns attachments with storageUrn, fileType, displayName
2. Extract bucket key and object key from storageUrn (`urn:adsk.objects:os.object:{bucketKey}/{objectKey}`)
3. GET `/oss/v2/buckets/{bucketKey}/objects/{objectKey}/signeds3download` (manual) → signed URL (valid ~15 min)
4. GET signed URL to download file (no bearer token needed)

---

### RFIs

**Create an RFI with custom attributes**

Tool chain:
1. `list_rfi_types` (projectId) — find rfiTypeId
2. `get_next_rfi_custom_identifier` (projectId) — get next RFI number (e.g. RFI-042)
3. `list_rfi_attributes` (projectId) — find custom attribute IDs for customAttributes body
4. `create_rfi` (projectId, title, question, status="draft", rfiTypeId, customIdentifier, assignedTo=[{id, type:"user"}], customAttributes=[{id, values:["Structural"]}])

**Submit a response to an RFI**

Tool chain: `add_rfi_response` (projectId, rfiId, status="answered", text, onBehalf?, attachments?)

Note: Use `add_rfi_comment` for general discussion comments. Use `add_rfi_response` for formal reviewer responses with a status.

**Transition an RFI (open, submit, close)**

Tool chain: `update_rfi` (projectId, rfiId, fields={status: "open"})

Note: All status transitions use `update_rfi` with `fields.status`. Common transitions: draft → open → submitted → closed/void.

**Set official response on an RFI**

Tool chain: `update_rfi` (projectId, rfiId, fields={officialResponse: "Use Type IV...", officialResponseStatus: "answered"})

**Search RFIs with advanced filters**

Tool chain: `search_rfis` (projectId, filter={status: "open", assignedTo: userId}, sort=[{field: "createdAt", direction: "desc"}])

---

### Cost Management

**Set up a budget code template**

Tool chain:
1. `list_templates` — get template ID (one per project)
2. `create_segment` (templateId, name, type=code, length, position)
3. `create_segment_value` (segmentId, code, description) — repeat for each code value

**Link budgets to contracts**

Tool chain:
1. `list_contracts` — find contract IDs
2. `list_budgets` — find budget IDs
3. `link_budgets_contracts` (create=[{budgetId, contractId},...])

**Update a contract's company**

Tool chain:
1. `list_contracts` — find contract ID
2. `get_project_companies` — find company member_group_id
3. `update_contract` (contractId, companyId)

**Create a Potential Change Order (PCO)**

Tool chain:
1. `create_change_order` (changeOrder=pco, name, description, scope, type, sourceType, sourceRef)
2. `create_cost_item` (changeOrderId, name, description) — repeat to add cost items

**Open a PCO (workflow action)**

Tool chain:
1. `list_change_orders_by_type` (changeOrder=pco) — find PCO ID
2. `list_available_actions` (associationType=FormInstance, associationId=pcoId) — confirm 'open' action available
3. `perform_action` (actions=[{action: open, associationId: pcoId, associationType: FormInstance}])

**Update PCO custom attributes**

Tool chain:
1. `list_change_orders_by_type` (changeOrder=pco, include=attributes) — find PCO ID + propertyDefinitionId
2. `batch_update_attribute_values` (associationId, associationType=FormInstance, propertyDefinitionId, value)

**Download a generated SCO document**

Tool chain:
1. `list_change_orders_by_type` (changeOrder=sco) — find SCO ID
2. `get_documents` (associationId=scoId, associationType=FormInstance) — get document URN
3. Use `get_item_versions` on the URN to locate storage object → download via signed S3 URL (manual step)

**Attach a file to a cost item**

Tool chain:
1. `list_cost_items` — find cost item ID
2. `create_attachment_folder` (associationType=CostItem, associationId=costItemId) — get folder URN
3. Upload file to OSS using the folder URN (manual step — requires S3 signed URL workflow)
4. `create_attachment` (urn, folderId, name, associationType=CostItem, associationId, type=Upload)

**Track budget performance with timesheets**

Tool chain:
1. `list_performance_tracking_item_instances` — find instance ID and budget code
2. `create_timesheet` (trackingItemInstanceId, startDate, endDate, inputQuantity, outputQuantity)

**Update existing timesheets**

Tool chain:
1. `list_timesheets` (filter[budgetCode]=..., filter[endDate]=2022-05-06) — find timesheet ID
2. `update_timesheet` (id, inputQuantity, outputQuantity)

**Integrate a BIM 360 budget with an external ERP system**

Tool chain:
1. `list_budgets` — find budget ID
2. `update_budget` (budgetId, externalSystem, externalId, externalMessage, integrationState=locked, lastSyncTime)

**Import an ERP budget into BIM 360 Cost Management**

Tool chain:
1. `create_budget` (code, name, quantity, unitPrice, unit, externalSystem, externalId, integrationState=locked, lastSyncTime)

---

### Model Properties

**Create a property index and query it**

Tool chain:
1. `batch_index_status` (projectId, versions=[{versionUrn}]) — lazy: starts indexing if not yet run, returns indexId + state
2. `get_index` (projectId, indexId) — poll until state=FINISHED
3. `get_index_fields` (projectId, indexId) — discover field keys (e.g. p69a0daab = Ht in ft)
4. `create_index_query` (projectId, indexId, query={$ge: ["s.props.p69a0daab", 0.5]}) — returns queryId
5. `get_index_query` (projectId, indexId, queryId) — poll until state=FINISHED
6. `get_index_query_properties` (projectId, indexId, queryId) — download matching rows (gzip LDJSON)

Note: `batch_index_status` is idempotent — same inputs always return the same indexId. Indexes are cached 30 days rolling.

**Query with column projections (reduce payload size)**

Tool chain:
1. `batch_index_status` (projectId, versions=[{versionUrn}]) → wait until FINISHED
2. `create_index_query` (projectId, indexId,
   query={$and: [{$notnull: "s.props.p20d8441e"}, {$gt: [{$count: "s.views"}, 0]}]},
   columns={s.svf2Id: true, lmvName: "s.props.p153cb174", revitCategory: "s.props.p20d8441e", revitFamily: "s.props.p30db51f9", s.views: true})
3. `get_index_query` → `get_index_query_properties` — smaller result set with only requested columns

**Download the raw property index**

Tool chain:
1. `batch_index_status` (projectId, versions=[{versionUrn}]) → wait until FINISHED
2. `get_index_manifest` (projectId, indexId) — verify seed files and views
3. `get_index_properties` (projectId, indexId) — full LDJSON index (gzip)

**Track changes between two model versions**

Tool chain:
1. `batch_diff_status` (projectId, diffs=[{prevVersionUrn, curVersionUrn}]) — lazy: starts diff job, returns diffId + state
2. `get_diff` (projectId, diffId) — poll until state=FINISHED; stats show added/removed/modified counts
3. `get_diff_manifest` (projectId, diffId) — see prev and seedFiles (current) file details
4. `get_diff_properties` (projectId, diffId) — full diff LDJSON: rows with type OBJECT_ADDED/REMOVED/CHANGED + prev block

**Query a diff for specific property changes**

Tool chain:
1. `batch_diff_status` (projectId, diffs=[{prevVersionUrn, curVersionUrn}]) → wait until FINISHED
2. `create_diff_query` (projectId, diffId, query={$ne: ["s.props.p1b2aabe1", "s.prev.props.p1b2aabe1"]}) — returns queryId
3. `get_diff_query` (projectId, diffId, queryId) — poll until FINISHED
4. `get_diff_query_properties` (projectId, diffId, queryId) — download only changed objects (LDJSON)

---

### AutoSpecs

**Retrieve the smart register for a project**

Tool chain:
1. `get_autospecs_metadata` (projectId) — list versions, find current (currentVersion=true)
2. `get_autospecs_smartregister` (projectId, versionId) — full submittal log

**Get submittal requirements and summary**

Tool chain:
1. `get_autospecs_requirements` (projectId, versionId)
2. `get_autospecs_summary` (projectId, versionId)

---

### Data Connector

**Schedule a weekly data export for specific projects**

Tool chain:
1. `create_data_connector_request` (scheduleInterval=WEEK, reoccuringInterval=1, effectiveFrom, effectiveTo, serviceGroups=[issues, cost, submittals], projectIdList=[...])

**Schedule an export for all active projects in a hub**

Tool chain:
1. `create_data_connector_request` (scheduleInterval=MONTH, reoccuringInterval=1, serviceGroups=[all], projectStatus=active, effectiveFrom, effectiveTo)

**Find and update an existing data request**

Tool chain:
1. `list_data_connector_requests` (accountId) — find request ID
2. `update_data_connector_request` (requestId, description='Q2 Extract')

**Download data from a completed export job**

Tool chain:
1. `list_data_connector_request_jobs` (accountId, requestId, sort=desc) — find latest job ID
2. `get_data_connector_job` (jobId) — confirm status=complete, completionStatus=success
3. `list_data_connector_job_data` (jobId) — see available files (CSVs, README, ZIP)
4. `get_data_connector_job_data_url` (jobId, fileName=autodesk_data_extract.zip) — get signed URL (valid 60s)

**Trigger an on-demand export now**

Tool chain:
1. `trigger_data_connector_job` (accountId, requestId)
2. `get_data_connector_job` (jobId) — poll until status=complete

---

### Submittals

**Create a submittal item**

Tool chain:
1. `list_submittal_item_types` (projectId) — find typeId (e.g. Shop Drawing, Product Data)
2. `list_submittal_specs` (projectId) — find specId for the spec section
3. `get_next_submittal_custom_identifier` (projectId) — get next available identifier
4. `list_submittal_managers` (projectId) — find manager oxygenId
5. `create_submittal` (projectId, typeId, specId, title, stateId="sbc-1", customIdentifier, manager, managerType="user", subcontractor, subcontractorType, submitterDueDate)

Note: stateId determines required fields — "sbc-1" (manager creates, sends to sub) requires subcontractor+subcontractorType+submitterDueDate; "mgr-1" (sub creates, sends to manager) requires manager+managerType; "draft" requires none.

**Manage submittal item transitions (full lifecycle)**

Tool chain:
1. `list_submittals` (projectId) — find itemId
2. `transition_submittal` (projectId, itemId, stateId="mgr-1") — sub submits to manager
3. `transition_submittal` (projectId, itemId, stateId="rev", stepDueDate) — manager sends for review
4. `list_submittal_item_steps` (projectId, itemId) — see current review step and tasks
5. `list_submittal_step_tasks` (projectId, itemId, stepId) — find reviewer taskIds
6. `close_submittal_task` (projectId, itemId, stepId, taskId, responseId) — reviewer submits response
7. `transition_submittal` (projectId, itemId, stateId="mgr-2") — manager closes and distributes
8. `transition_submittal` (projectId, itemId, stateId="sbc-2") — mark as closed to subcontractor

Workflow states: draft → sbc-1 (Waiting for Submission) → mgr-1 (Open/Submitted) → rev (In Review) → mgr-2 (Close and Distribute) → sbc-2 (Closed).

**Attach a file from the Files tool to a submittal**

Tool chain:
1. `get_folder_contents` — locate the file item; get version URN (item.relationships.tip.data.id)
2. `attach_submittal_file` (projectId, itemId, name="shop-drawing.pdf", urn=\<versionUrn\>, urnTypeId="2", isFileUploaded=true)

Note: The `urn` is the Data Management item tip version URN; `urnTypeId` is always "2"; `isFileUploaded=true` because the file already exists in cloud storage.

**Attach a local file to a submittal (OSS upload flow)**

Tool chain:
1. `attach_submittal_file` (projectId, itemId, name="calculations.pdf", urnTypeId="2") — omit urn and isFileUploaded; returns attachmentId and uploadUrn
2. `get_submittal_attachment_upload_url` (uploadUrn, parts=1) — returns urls[] and uploadKey
3. PUT file bytes to urls[0] (no Authorization header needed)
4. `complete_submittal_attachment_upload` (uploadUrn, uploadKey) — completes multipart upload
5. `finalize_submittal_attachment` (projectId, itemId, attachmentId) — PATCH isFileUploaded=true to finalize

**Download a submittal attachment**

Tool chain:
1. `list_submittal_item_attachments` (projectId, itemId) — get attachments with uploadUrn field
2. `get_submittal_attachment_download_url` (uploadUrn) — parses bucket/object key from URN, returns signed download URL (single-use, expires)

---

### Forms

**Create and submit a form**

Tool chain:
1. `list_form_templates` — find template ID
2. `create_form_instance` (templateId, name)
3. `update_form_field_values` — fill in field values
4. `submit_form_instance` (formId)

**Retrieve forms with field values (v2)**

Tool chain:
1. `list_form_instances` (projectId, statuses=["submitted"], templateId, include=["nativeValues"]) — returns forms with `nativeForm.customValues` (non-tabular) and `nativeForm.tabularValues` (tabular rows)
2. For custom table data: `get_form_table_values` (formId, fieldId) — retrieves rows from a specific table field

**Filter forms by location**

Tool chain:
1. `list_nodes` (projectId) — find location node UUID for Level 3
2. `list_form_instances` (projectId, locationIds=[nodeUuid], includeSubLocations=true)

**Update all field types in a form**

Tool chain:
1. `get_form_layout` (projectId, layoutId) → `get_form_layout_section` — discover fieldIds
2. `update_form_field_values` (projectId, formId):
   - Non-tabular: `customValues=[{fieldId, textVal}, {fieldId, numberVal}, {fieldId, choiceVal}, ...]`
   - Tabular (worklog): `tabularValues=[{id: <new-uuid>, schema: "worklogEntries", columns: [{columnName: "trade", textVal: "Electricians"}, {columnName: "timespan", timespanVal: 28800000}, {columnName: "headcount", numberVal: 5}]}]`
   - Tabular (custom table): `tabularValues=[{id: <new-uuid>, schema: "<table-UUID-from-section>", columns: [{columnId: "<col-UID>", textVal: "..."}, ...]}]` (custom tables must use columnId, not columnName)
3. `submit_form_instance` (projectId, formId)

**Manage form status**

Tool chain:
1. `update_form_instance` (projectId, templateId, formId, status="inReview")
2. `close_form_instance` (projectId, formId)

Note: Status transitions — draft → inReview → submitted. Void or reopen with `void_form_instance` / `reopen_form_instance`.

---

### Documents & Files

**Navigate to a folder**

Tool chain:
1. `get_top_folders` (hubId, projectId) — list root folders (Plans, Project Files, etc.)
2. `get_folder_contents` (projectId, folderId) — list files and subfolders inside

**Export files to PDF**

Tool chain:
1. `get_top_folders` (hubId, projectId) — find folder ID
2. `get_folder_contents` (projectId, folderId) — list items, collect version URNs
3. `create_pdf_export` (projectId, fileVersions=[...], outputFileName, standardMarkups={includePublishedMarkups: true})
4. `get_pdf_export_status` (projectId, exportId) — poll until status=successful, then use result.output.signedUrl to download (URL valid 1 hour)

**Download files from the Files tool**

Tool chain:
1. `get_top_folders` (hubId, projectId) — find folder ID
2. `get_folder_contents` (projectId, folderId) — locate the file item
3. `get_item_versions` (projectId, itemId) — get version list with storage URNs
4. Use the storage URN to obtain a signed download URL via OSS (manual step — outside MCP scope)

**Download RVT files from a published model**

Tool chain:
1. `get_top_folders` → `get_folder_contents` — navigate to the model, get item ID
2. `get_item_versions` (projectId, itemId) — find the published version URN
3. `list_linked_revit_files` (projectId, versionId, includeHost=true) — returns signed download URLs (valid 1 hour) for host model and all linked RVT files

Note: Only works for models published after Feb 7, 2025.

**Upload files to a project folder**

Tool chain:
1. `get_top_folders` → `get_folder_contents` — locate the target folder, note its URN
2. OSS upload flow (manual — outside MCP scope): create storage object, get signed S3 URL, PUT file bytes, call `complete` endpoint
3. Create item in Data Management via POST /data/v1/projects/.../items (manual step)

**Search for a file**

Tool chain: `search_folder` (projectId, folderId, query)

**View version history and custom attributes**

Tool chain:
1. `get_folder_contents` → locate item ID
2. `get_item_versions` (projectId, itemId) — version list
3. `batch_get_versions` (projectId, urns=[versionUrns]) — custom attributes, approval status, revision info

**Update document custom attributes**

Tool chain:
1. `list_custom_attribute_definitions` (projectId, folderId) — find attribute ID
2. `batch_update_custom_attributes` (projectId, versionId, attributes=[{id, value}])

---

### Permissions

**Set folder permissions**

Tool chain:
1. `get_folder_permissions` (projectId, folderId) — see current permissions
2. `batch_create_folder_permissions` (projectId, folderId, [{subjectId, subjectType, actions}])

**Audit a user's folder access**

Tool chain: `audit_user_folder_access` (projectId, userId)

---

### Locations

**Build and query the location tree**

Tool chain: `list_nodes` (projectId, treeId="default") — returns full tree including root node ID

**Build a location breakdown structure from scratch**

Tool chain:
1. `list_nodes` (projectId, treeId="default") — get root node ID (results[0].id where type="Root")
2. `create_node` (projectId, treeId="default", parentId=rootId, type="Area", name="Floor 2", barcode="barcodeFloor2")
3. `create_node` (projectId, treeId="default", parentId=rootId, type="Area", name="Floor 1", barcode="barcodeFloor1", targetNodeId=floor2Id, insertOption="Before") — inserts Floor 1 before Floor 2
4. `create_node` (projectId, treeId="default", parentId=floor2Id, type="Area", name="Suite 205", barcode="barcodeSuite205")

**Rename a location node**

Tool chain: `update_node` (projectId, treeId="default", nodeId, name="Suite 211", barcode="barcodeSuite211")

**Delete a location node**

Tool chain: `delete_node` (projectId, treeId="default", nodeId) — also deletes all descendants

Note: `treeId` is always `"default"`. The root node (type="Root") is auto-created and cannot be deleted. Node ordering uses `targetNodeId` + `insertOption` ("Before"/"After") at creation time.

---

### Takeoff

**Extract the full inventory for a takeoff project**

Tool chain:
1. `list_takeoff_packages` (projectId) — get all packages; note package IDs
2. `list_takeoff_types` (projectId, packageId) — get all types per package (repeat per package)
3. `list_takeoff_items` (projectId, packageId) — get all items per package (repeat per package)

**Retrieve classification systems and codes**

Tool chain:
1. `list_classification_systems` (projectId) — get all systems with their IDs
2. `list_classifications` (projectId, systemId) — get codes (code, parentCode, description, measurementType) per system

**Resolve a takeoff item's content view to a sheet or model name**

Tool chain:
1. `list_takeoff_items` (projectId, packageId) — find item's contentView.id and contentView.version
2. `list_content_views` (projectId) — match contentView.id; for SHEET type read view.sheetName; for FILE_MODEL type note view.lineageUrn
3. For FILE_MODEL: `get_item_versions` (projectId, lineageUrn) — get data.attributes.name as the model filename

Note: `list_content_views` returns content views as the flat `results` array. SHEET entries have `view.sheetName`; FILE_MODEL entries have `view.lineageUrn` which maps to a Data Management item.

---

### Reviews

**Create an approval workflow**

Tool chain:
1. `list_users` (accountId, filterEmail=email) — get autodeskId for each candidate
2. `list_roles` (projectId) — get role autodeskId values
3. `create_workflow` (projectId, name, description, notes,
   steps=[{name, type: INITIATOR, candidates: {users, roles, companies}},
          {name, type: REVIEWER, candidates, duration, dueDateType: CALENDAR_DAY, groupReview: {enabled: true, type: MINIMUM, min: 2}},
          {name, type: APPROVER, candidates, duration, dueDateType: CALENDAR_DAY}],
   additionalApprovalStatusOptions=[{label: "Approved with comments", value: APPROVED}],
   additionalOptions={allowInitiatorToEdit: true},
   copyFilesOptions={enabled: true, allowOverride: true, condition: ANY, folderUrn, includeMarkups: false})

Note: steps must start with INITIATOR, end with APPROVER; step IDs in response (e.g. Lane_xxx) are needed for create_review overrides.

**Create a review from a workflow**

Tool chain:
1. `list_workflows` (projectId, filter[status]=ACTIVE) — find workflowId and step IDs
2. `get_top_folders` → `get_folder_contents` → `get_item_versions` — get file version URNs
3. `create_review` (projectId, name, workflowId, fileVersions=[{urn},...],
   notes, workflowOptions={copyFilesOptions: {folderUrn}, steps: [{id: Lane_xxx, candidates: {users, roles, companies}}]})

Note: To override candidates, workflow must have additionalOptions.allowInitiatorToEdit=true. New review status=OPEN; may later go FAILED if file validation fails.

**Inspect a review's files, workflow, and progress**

Tool chain:
1. `get_review` (projectId, reviewId) — current status, currentStepId, nextActionBy
2. `get_review_versions` (projectId, reviewId) — list files with approveStatus and copiedFileVersionUrn
3. `get_review_workflow` (projectId, reviewId) — workflow snapshot at time of creation (may differ from current workflow)
4. `get_review_progress` (projectId, reviewId) — step-by-step history (reverse chronological, current round only)

**List reviews and filter by status**

Tool chain:
1. `list_reviews` (projectId, filter[status]=OPEN, filter[nextActionByUser]=autodeskId, limit, offset)
2. Use nextUrl from pagination to get subsequent pages

---

### Sheets

**List and manage sheets**

Tool chain:
1. `list_version_sets` (projectId) — find current version set
2. `list_sheets` (projectId, versionSetId)
3. `create_export` (projectId, sheetIds) — export to PDF

**Upload a PDF and publish it as sheets**

Tool chain:
1. `create_version_set` (projectId, name, issuanceDate) — or find existing with `list_version_sets`
2. `create_sheets_storage` (projectId, fileName="example.pdf") — get storageUrn for the OSS object
3. OSS upload (manual): GET `signeds3upload` for bucket/objectKey → PUT file bytes to signed URL → POST `signeds3upload` with uploadKey to complete
4. `create_upload` (projectId, versionSetId, files=[{storageType:"OSS", storageUrn, name:"example.pdf"}]) — triggers async extraction
5. `get_upload` (projectId, uploadId) — poll until status=IN_REVIEW (then READY before publishing)
6. `list_review_sheets` (projectId, uploadId) — review extracted sheets, note IDs
7. `get_thumbnail_urls` (projectId, uploadId, reviewSheetIds=[...], type="small") — preview thumbnails before publishing
8. `update_review_sheets` (projectId, uploadId, sheets=[{id, number, title, tags}]) — optionally correct sheet numbers/titles
9. `publish_review_sheets` (projectId, uploadId) — publish; poll `get_upload` until status=COMPLETE
10. `list_sheets` (projectId, filterVersionSetId=versionSetId) — confirm published sheets

Note: `create_sheets_storage` creates an OSS object in the Sheets bucket (not Data Management). Only PDF files are supported.

**Export sheets to PDF with markups**

Tool chain:
1. `list_version_sets` / `list_sheets` (projectId, filterVersionSetId) — get sheet IDs
2. `create_export` (projectId, sheets=[ids], options={outputFileName, standardMarkups:{includePublishedMarkups:true, includeUnpublishedMarkups:true, includeMarkupLinks:true}, issueMarkups:{includePublishedMarkups:true, includeUnpublishedMarkups:true}, photoMarkups:{includePublishedMarkups:true, includeUnpublishedMarkups:true}})
3. `get_export` (projectId, exportId) — poll until status=successful; use result.output.signedUrl to download (valid 1 hour)

Note: Up to 1000 sheets per export. Download URL expires in 1 hour; recall `create_export` if needed.

---

### Model Coordination

**Find clashes between models**

Tool chain:
1. `list_model_sets` (containerId)
2. `list_clash_tests` (containerId, modelSetId)
3. `get_clash_test` (containerId, testId) — details + resources

**Download clash result files from a test**

Tool chain:
1. `get_clash_test_resources` (containerId, testId) — returns signed URLs + headers for json.gz/sqlite files
2. Download each file using the signed URL + provided headers (manual step, URLs are time-limited)

Note: Files are gzip-compressed JSON containing clash instances and document info.

**List clashes for a specific model set version**

Tool chain:
1. `list_model_set_versions` (containerId, modelSetId) — confirm version number exists
2. `list_clash_tests_by_version` (containerId, modelSetId, version=5)

**Create a new model set**

Tool chain:
1. `get_top_folders` → `get_folder_contents` — find the folder URN
2. `create_model_set` (containerId, name, folderUrn) — returns a job
3. `get_model_set_job` (containerId, modelSetId, jobId) — poll until complete (status=Success)

**Enable or disable automatic versioning**

Tool chain:
1. `disable_model_set_versions` (containerId, modelSetId) — returns a job
2. `get_model_set_job` (containerId, modelSetId, jobId) — poll until complete
3. `enable_model_set_versions` (containerId, modelSetId) — re-enable when ready

**Trigger a new model set version manually**

Tool chain:
1. `create_model_set_version` (containerId, modelSetId) — returns a job (no new version created if content unchanged)
2. `get_model_set_job` (containerId, modelSetId, jobId) — poll until complete
3. `list_model_set_versions` (containerId, modelSetId) — confirm new version appears

**Close clash groups (suppress recurring clashes)**

Tool chain:
1. `close_clash_groups` (containerId, testId, groups=[{title, reason: 'VALID_INTERFACE', clashes: [indexIds]}]) — returns a job
2. `get_clash_job` (containerId, jobId) — poll until complete
3. `list_test_closed_clash_groups` (containerId, testId) — verify closures appear

**Assign clash groups to issues**

Tool chain:
1. `assign_clash_groups` (containerId, testId, groups=[{title, clashes, issueTypeId, issueSubTypeId, documentVersionUrn, pushpin, assignedTo, assignedToType}]) — returns a job
2. `get_clash_job` (containerId, jobId) — poll until complete
3. `list_test_assigned_clash_groups` (containerId, testId) — confirm assignments

**Reopen (delete) closed clash groups**

Tool chain:
1. `list_closed_clash_groups` (containerId, modelSetId) — find group IDs
2. `reopen_clash_groups` (containerId, modelSetId, groupIds=[...]) — returns a job (cannot be undone)
3. `get_clash_job` (containerId, jobId) — poll until complete

**Find which issues are linked to clash groups**

Tool chain:
1. `list_assigned_clash_groups` (containerId, modelSetId) — returns groups with linked issue IDs
2. `get_assigned_clash_groups` (containerId, testId, ids=[...]) — full details per group
3. Optionally: `get_issue` (projectId, issueId) — look up issue details

---

### Relationships

**Search all relationships in a project**

Tool chain: `search_relationships` (containerId, domain=autodesk-bim360-asset, type=asset, id=assetId)

**Check entity compatibility before creating a relationship**

Tool chain: `get_writable_relationships` — returns each domain's allowed entity type pairs (e.g. autodesk-bim360-asset/asset allows autodesk-bim360-documentmanagement/documentlineage)

**Create a relationship between an asset and a document**

Tool chain:
1. `get_writable_relationships` — confirm asset↔documentlineage is allowed
2. `create_relationships` (containerId, relationships=[{entities: [{domain: "autodesk-bim360-asset", type: "asset", id: assetId}, {domain: "autodesk-bim360-documentmanagement", type: "documentlineage", id: lineageUrn}]}])

**Batch create relationships**

Tool chain: `create_relationships` (containerId, relationships=[{entities: [...]}, {entities: [...]}, ...]) — up to 20 pairs per call

**Get a specific relationship by ID**

Tool chain: `get_relationship` (containerId, relationshipId)

**Retrieve a set of known relationships**

Tool chain: `batch_relationships` (containerId, relationshipIds=[...]) — up to 50 IDs

**Intersect a batch of issues with assets (paged workflow)**

Tool chain: `intersect_relationships` (containerId, entities=[{domain: autodesk-bim360-issue, type: issue, id: ...}, ...], withEntities=[{domain: autodesk-bim360-asset, type: asset}]) — entities must be fully specified; withEntities can be domain-only or domain+type

**Sync all relationships for external replication**

Tool chain:
1. `sync_relationships` (containerId) — no syncToken = full download; returns current[], deleted[], moreData, nextSyncToken
2. Store nextSyncToken; call again with syncToken=nextSyncToken while moreData=true
3. `get_relationship_sync_status` (containerId, syncTokens=[{syncToken}]) — check if new data exists before syncing again (moreData=true means call sync_relationships with that token)
