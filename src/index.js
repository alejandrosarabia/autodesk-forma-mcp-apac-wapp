/**
 * Autodesk Construction Cloud — MCP Server
 *
 * Entry point: registers all tools and starts the stdio MCP transport.
 *
 * Modules:
 *   • Projects    — get_hubs, get_projects
 *   • Documents   — get_top_folders, get_folder_contents, get_item_versions, search_folder,
 *                   create_pdf_export, get_pdf_export_status,
 *                   batch_get_versions,
 *                   list_custom_attribute_definitions, create_custom_attribute_definition,
 *                   batch_update_custom_attributes,
 *                   get_naming_standard,
 *                   list_linked_revit_files,
 *                   list_file_packages, list_package_resources
 *   • Issues      — list_issues, get_issue, create_issue, update_issue,
 *                   list_issue_comments, add_issue_comment, list_issue_types,
 *                   get_issue_profile,
 *                   list_issue_attribute_definitions, list_issue_attribute_mappings,
 *                   list_issue_root_cause_categories,
 *                   create_issue_attachment, delete_issue_attachment, list_issue_attachments
 *   • RFIs        — list_rfis, get_rfi, create_rfi, update_rfi, add_rfi_comment, add_rfi_response,
 *                   list_rfi_types, list_rfi_attributes, get_next_rfi_custom_identifier,
 *                   search_rfis
 *   • Forms       — list_form_templates, get_form_template,
 *                   get_form_layout, get_form_layout_section,
 *                   list_form_instances, get_form_instance,
 *                   create_form_instance, update_form_instance,
 *                   submit_form_instance, close_form_instance,
 *                   void_form_instance, reopen_form_instance,
 *                   get_form_field_values, update_form_field_values,
 *                   delete_form_tabular_rows, get_form_table_values,
 *                   list_form_attachments, get_form_attachment_download_url
 *   • Assets      — list_assets, get_asset, create_assets, update_assets, delete_assets,
 *                   list_asset_categories, get_asset_categories, create_asset_category,
 *                   list_status_sets, get_status_sets, create_status_set,
 *                   get_category_status_sets, assign_category_status_set,
 *                   list_asset_statuses, list_asset_custom_attributes
 *   • Submittals  — list_submittals, get_submittal, create_submittal, update_submittal,
 *                   transition_submittal, list_submittal_revisions,
 *                   validate_submittal_custom_identifier, get_next_submittal_custom_identifier,
 *                   list_submittal_specs, create_submittal_spec, get_submittal_spec,
 *                   list_submittal_item_types, get_submittal_item_type,
 *                   create_submittal_item_type, update_submittal_item_type,
 *                   get_submittal_metadata,
 *                   list_submittal_packages, get_submittal_package,
 *                   create_submittal_package, update_submittal_package, delete_submittal_package,
 *                   list_submittal_responses, get_submittal_response,
 *                   create_submittal_response, update_submittal_response,
 *                   list_submittal_managers,
 *                   create_submittal_manager_mapping, delete_submittal_manager_mapping,
 *                   list_submittal_item_steps, get_submittal_item_step,
 *                   update_submittal_step,
 *                   list_submittal_step_tasks, get_submittal_step_task,
 *                   close_submittal_task, update_submittal_task,
 *                   list_submittal_templates,
 *                   create_submittal_template, update_submittal_template, delete_submittal_template,
 *                   get_submittal_user_permissions,
 *                   attach_submittal_file,
 *                   get_submittal_attachment_upload_url, complete_submittal_attachment_upload,
 *                   finalize_submittal_attachment,
 *                   list_submittal_item_attachments, get_submittal_attachment_download_url
 *   • Cost         — list_budgets, get_budget, create_budget, update_budget, delete_budget,
 *                   import_budgets,
 *                   list_contracts, get_contract, create_contract, update_contract, delete_contract,
 *                   link_budgets_contracts,
 *                   list_main_contracts, get_main_contract, create_main_contract, update_main_contract, delete_main_contract,
 *                   list_main_contract_items, get_main_contract_item, create_main_contract_item, update_main_contract_item, delete_main_contract_item,
 *                   list_change_order_types, list_change_orders_by_type, get_change_order, create_change_order, update_change_order, delete_change_order,
 *                   attach_cost_items, detach_cost_items, attach_cost_items_to_change_order, detach_cost_items_from_change_order,
 *                   list_cost_items, get_cost_item, create_cost_item, update_cost_item, delete_cost_item,
 *                   create_cost_items_batch, copy_sub_cost_items,
 *                   list_sub_cost_items, create_sub_cost_item, update_sub_cost_item, delete_sub_cost_item,
 *                   list_expenses, get_expense, create_expense, update_expense, delete_expense,
 *                   list_expense_items, get_expense_item, create_expense_item, update_expense_item, delete_expense_item,
 *                   list_payments, list_payment_items,
 *                   list_schedule_of_values, get_schedule_of_values, create_schedule_of_values, update_schedule_of_values, delete_schedule_of_values,
 *                   list_budgets, list_taxes, list_segments, get_segment, create_segment, update_segment, delete_segment,
 *                   list_segment_values, get_segment_value, create_segment_value, update_segment_value, delete_segment_value,
 *                   import_segment_values, list_templates,
 *                   list_available_actions, perform_action,
 *                   list_attribute_definitions, batch_update_attribute_values,
 *                   list_performance_tracking_items, get_performance_tracking_item, create_performance_tracking_item, delete_performance_tracking_item,
 *                   list_performance_tracking_item_instances, get_performance_tracking_item_instance,
 *                   create_performance_tracking_item_instance, update_performance_tracking_item_instance, delete_performance_tracking_item_instance,
 *                   list_timesheets, get_timesheet, create_timesheet, update_timesheet, delete_timesheet,
 *                   list_attachments, create_attachment, create_attachments_batch, delete_attachment,
 *                   create_attachment_folder, get_documents,
 *                   list_workflows, get_workflow, create_workflow,
 *   • Data Connector — list_data_connector_requests, get_data_connector_request,
 *                   create_data_connector_request, update_data_connector_request,
 *                   delete_data_connector_request,
 *                   list_data_connector_request_jobs, list_data_connector_jobs,
 *                   get_data_connector_job, delete_data_connector_job,
 *                   trigger_data_connector_job,
 *                   list_data_connector_job_data, get_data_connector_job_data_url
 *   • Takeoff     — get_takeoff_settings, update_takeoff_settings,
 *                   list_takeoff_packages, get_takeoff_package,
 *                   create_takeoff_package, update_takeoff_package,
 *                   list_classification_systems, get_classification_system,
 *                   list_classifications, create_classification_system,
 *                   delete_classification_system, import_classifications,
 *                   list_takeoff_types, get_takeoff_type,
 *                   list_takeoff_items, get_takeoff_item, list_content_views
 *   • Transmittals — list_transmittals, get_transmittal,
 *                   list_transmittal_recipients,
 *                   list_transmittal_folders, list_transmittal_documents
 *   • Relationships — get_writable_relationships,
 *                   create_relationships, delete_relationships,
 *                   get_relationship_sync_status, sync_relationships,
 *                   batch_relationships, search_relationships,
 *                   intersect_relationships, get_relationship
 *   • Hub Admin     — list_projects, get_project, create_project, update_project_image,
 *                   create_company, import_companies, list_companies, get_company,
 *                   search_companies, get_project_companies, update_company, update_company_image,
 *                   create_user, import_users, list_users, get_user,
 *                   get_user_projects, get_user_products, get_user_roles,
 *                   search_users, update_user,
 *                   list_project_users, get_project_user, add_project_user,
 *                   import_project_users, update_project_user, remove_project_user
 *   • Locations    — list_nodes, create_node, update_node, delete_node
 *   • Photos       — get_photo, filter_photos
 *   • Sheets       — list_version_sets, create_version_set, update_version_set,
 *                   batch_get_version_sets, batch_delete_version_sets,
 *                   list_sheets, get_sheet, batch_get_sheets, batch_update_sheets, batch_delete_sheets, batch_restore_sheets,
 *                   create_export, get_export,
 *                   list_collections, get_collection,
 *                   create_sheets_storage,
 *                   create_upload, list_uploads, get_upload,
 *                   list_review_sheets, update_review_sheets, publish_review_sheets,
 *                   get_thumbnail_urls
 *   • Model Coordination — list_model_sets, get_model_set, create_model_set, update_model_set,
 *                   get_container_job, get_model_set_job,
 *                   create_model_set_issue, get_issue_view_context,
 *                   create_model_set_version, list_model_set_versions,
 *                   get_latest_model_set_version, get_model_set_version,
 *                   enable_model_set_versions, disable_model_set_versions,
 *                   create_model_set_view, list_model_set_views, get_model_set_view,
 *                   update_model_set_view, delete_model_set_view,
 *                   list_model_set_version_views, get_model_set_version_view,
 *                   get_model_set_view_job,
 *                   list_clash_tests, list_clash_tests_by_version,
 *                   get_clash_test, get_clash_test_resources,
 *                   close_clash_groups, list_test_closed_clash_groups, get_closed_clash_groups,
 *                   reopen_clash_groups, list_closed_clash_groups,
 *                   assign_clash_groups, list_test_assigned_clash_groups, get_assigned_clash_groups,
 *                   list_assigned_clash_groups, get_assigned_clash_group_view_context,
 *                   get_clash_job, list_grouped_clashes
 *   • AutoSpecs      — get_autospecs_metadata, get_autospecs_smartregister,
 *                   get_autospecs_requirements, get_autospecs_summary
 *   • Model Properties — get_index, get_index_manifest, get_index_fields, get_index_properties,
 *                   get_index_query, get_index_query_properties, batch_index_status, create_index_query,
 *                   get_diff, get_diff_manifest, get_diff_fields, get_diff_properties,
 *                   get_diff_query, get_diff_query_properties, batch_diff_status, create_diff_query
 *   • Permissions — list_project_users, get_project_user, add_project_user,
 *                   update_project_user_role, remove_project_user, list_roles,
 *                   list_account_users, get_folder_permissions,
 *                   batch_create_folder_permissions, batch_update_folder_permissions,
 *                   batch_delete_folder_permissions, get_folder_permissions_recursive,
 *                   audit_user_folder_access
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { projectTools, handleProjectTool } from './tools/projects.js';
import { documentTools, handleDocumentTool } from './tools/documents.js';
import { issueTools, handleIssueTool } from './tools/issues.js';
import { rfiTools, handleRfiTool } from './tools/rfis.js';
import { formTools, handleFormTool } from './tools/forms.js';
import { permissionTools, handlePermissionTool } from './tools/permissions.js';
import { assetTools, handleAssetTool } from './tools/assets.js';
import { submittalTools, handleSubmittalTool } from './tools/submittals.js';
import { dataConnectorTools, handleDataConnectorTool } from './tools/data-connector.js';
import { costTools, handleCostTool } from './tools/cost.js';
import { takeoffTools, handleTakeoffTool } from './tools/takeoff.js';
import { reviewsTools, handleReviewsTool } from './tools/reviews.js';
import { transmittalTools, handleTransmittalTool } from './tools/transmittals.js';
import { relationshipTools, handleRelationshipTool } from './tools/relationships.js';
import { hubAdminTools, handleHubAdminTool } from './tools/hub-admin.js';
import { locationTools, handleLocationTool } from './tools/locations.js';
import { photoTools, handlePhotoTool } from './tools/photos.js';
import { sheetTools, handleSheetTool } from './tools/sheets.js';
import { modelCoordinationTools, handleModelCoordinationTool } from './tools/model-coordination.js';
import { modelPropertiesTools, handleModelPropertiesTool } from './tools/model-properties.js';
import { autospecsTools, handleAutospecsTool } from './tools/autospecs.js';
import { buildingConnectedTools, handleBuildingConnectedTool } from './tools/building-connected.js';
import { authTools, handleAuthTool } from './tools/auth.js';
import { startAuthServer } from './authServer.js';

// ─── Tool registry ────────────────────────────────────────────────────────────

const ALL_TOOLS = [
  ...authTools,
  ...projectTools,
  ...documentTools,
  ...issueTools,
  ...rfiTools,
  ...formTools,
  ...assetTools,
  ...submittalTools,
  ...dataConnectorTools,
  ...costTools,
  ...takeoffTools,
  ...reviewsTools,
  ...transmittalTools,
  ...relationshipTools,
  ...hubAdminTools,
  ...locationTools,
  ...photoTools,
  ...sheetTools,
  ...modelCoordinationTools,
  ...modelPropertiesTools,
  ...autospecsTools,
  ...buildingConnectedTools,
  ...permissionTools,
];

// Map tool name → handler function
const TOOL_HANDLERS = new Map();

for (const tool of authTools)       TOOL_HANDLERS.set(tool.name, () => handleAuthTool(tool.name));
for (const tool of projectTools)    TOOL_HANDLERS.set(tool.name, (a) => handleProjectTool(tool.name, a));
for (const tool of documentTools)   TOOL_HANDLERS.set(tool.name, (a) => handleDocumentTool(tool.name, a));
for (const tool of issueTools)      TOOL_HANDLERS.set(tool.name, (a) => handleIssueTool(tool.name, a));
for (const tool of rfiTools)        TOOL_HANDLERS.set(tool.name, (a) => handleRfiTool(tool.name, a));
for (const tool of formTools)       TOOL_HANDLERS.set(tool.name, (a) => handleFormTool(tool.name, a));
for (const tool of assetTools)      TOOL_HANDLERS.set(tool.name, (a) => handleAssetTool(tool.name, a));
for (const tool of submittalTools)      TOOL_HANDLERS.set(tool.name, (a) => handleSubmittalTool(tool.name, a));
for (const tool of dataConnectorTools)  TOOL_HANDLERS.set(tool.name, (a) => handleDataConnectorTool(tool.name, a));
for (const tool of costTools)           TOOL_HANDLERS.set(tool.name, (a) => handleCostTool(tool.name, a));
for (const tool of takeoffTools)        TOOL_HANDLERS.set(tool.name, (a) => handleTakeoffTool(tool.name, a));
for (const tool of reviewsTools)        TOOL_HANDLERS.set(tool.name, (a) => handleReviewsTool(tool.name, a));
for (const tool of transmittalTools)    TOOL_HANDLERS.set(tool.name, (a) => handleTransmittalTool(tool.name, a));
for (const tool of relationshipTools)   TOOL_HANDLERS.set(tool.name, (a) => handleRelationshipTool(tool.name, a));
for (const tool of hubAdminTools)       TOOL_HANDLERS.set(tool.name, (a) => handleHubAdminTool(tool.name, a));
for (const tool of locationTools)              TOOL_HANDLERS.set(tool.name, (a) => handleLocationTool(tool.name, a));
for (const tool of photoTools)                 TOOL_HANDLERS.set(tool.name, (a) => handlePhotoTool(tool.name, a));
for (const tool of sheetTools)                 TOOL_HANDLERS.set(tool.name, (a) => handleSheetTool(tool.name, a));
for (const tool of modelCoordinationTools)     TOOL_HANDLERS.set(tool.name, (a) => handleModelCoordinationTool(tool.name, a));
for (const tool of modelPropertiesTools)       TOOL_HANDLERS.set(tool.name, (a) => handleModelPropertiesTool(tool.name, a));
for (const tool of autospecsTools)             TOOL_HANDLERS.set(tool.name, (a) => handleAutospecsTool(tool.name, a));
for (const tool of buildingConnectedTools)     TOOL_HANDLERS.set(tool.name, (a) => handleBuildingConnectedTool(tool.name, a));
for (const tool of permissionTools)            TOOL_HANDLERS.set(tool.name, (a) => handlePermissionTool(tool.name, a));

// ─── MCP server setup ─────────────────────────────────────────────────────────

const server = new Server(
  { name: 'autodesk-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// List all tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  const handler = TOOL_HANDLERS.get(name);
  if (!handler) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  let result;
  try {
    result = await handler(args);
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Tool error: ${err.message}` }],
      isError: true,
    };
  }

  const text = typeof result === 'string'
    ? result
    : JSON.stringify(result, null, 2);

  return {
    content: [{ type: 'text', text }],
  };
});

// ─── Start ────────────────────────────────────────────────────────────────────

startAuthServer();

const transport = new StdioServerTransport();
await server.connect(transport);

console.error('Autodesk MCP server running on stdio');
console.error(`Registered ${ALL_TOOLS.length} tools`);
