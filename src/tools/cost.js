/**
 * Cost Management tools — always use 3LO.
 *
 * Tools: list_budgets, get_budget, create_budget, update_budget, delete_budget,
 *        list_contracts, get_contract, create_contract, update_contract, delete_contract,
 *        list_main_contracts, create_main_contract, get_main_contract, update_main_contract, delete_main_contract,
 *        list_main_contract_items, create_main_contract_item, get_main_contract_item, update_main_contract_item, delete_main_contract_item,
 *        list_cost_items, get_cost_item, create_cost_item, create_cost_items_batch,
 *        update_cost_item, delete_cost_item,
 *        list_change_order_types, list_change_orders_by_type, create_change_order,
 *        get_change_order, update_change_order, delete_change_order,
 *        link_budgets_contracts,
 *        attach_cost_items_to_change_order, detach_cost_items_from_change_order,
 *        get_documents,
 *        list_expenses, get_expense, create_expense, update_expense, delete_expense,
 *        list_expense_items, get_expense_item, create_expense_item, update_expense_item, delete_expense_item,
 *        list_payments, list_payment_items,
 *        list_schedule_of_values, get_schedule_of_values, create_schedule_of_values,
 *        update_schedule_of_values, delete_schedule_of_values,
 *        list_sub_cost_items, create_sub_cost_item, copy_sub_cost_items,
 *        update_sub_cost_item, delete_sub_cost_item,
 *        list_taxes,
 *        list_timesheets, get_timesheet, create_timesheet, update_timesheet, delete_timesheet,
 *        list_performance_tracking_items, get_performance_tracking_item,
 *        create_performance_tracking_item, delete_performance_tracking_item,
 *        list_performance_tracking_item_instances, get_performance_tracking_item_instance,
 *        create_performance_tracking_item_instance, update_performance_tracking_item_instance,
 *        delete_performance_tracking_item_instance,
 *        list_attribute_definitions, batch_update_attribute_values,
 *        list_segment_values, get_segment_values, create_segment_value,
 *        import_segment_values, update_segment_value, delete_segment_value,
 *        get_segment_value,
 *        list_segments, create_segment, get_segment, update_segment, delete_segment,
 *        list_templates,
 *        attach_cost_items, detach_cost_items,
 *        perform_action, list_available_actions,
 *        list_attachments, create_attachment, create_attachments_batch,
 *        delete_attachment, create_attachment_folder
 *
 * ACC Cost Management API v1. Path shape:
 *   /cost/v1/containers/{containerId}/...
 * containerId = bare GUID passed directly by the user.
 *
 * List endpoints use offset/limit pagination.
 * Response shape: { results: [...] } or plain arrays.
 */

import { apiRequest } from '../auth/router.js';
import { paginate } from '../utils/paginate.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const costTools = [
  // ── Budgets ──────────────────────────────────────────────────────────────────
  {
    name: 'list_budgets',
    description: 'List all budgets in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        include: {
          type: 'array',
          description: 'Nested resources to include: subitems, attributes, contract, mainContract, mainContractItem, segments, idOnly, compounded',
          items: { type: 'string' },
        },
        filter_rootId: { type: 'string', description: 'Filter by root item IDs (comma-separated)' },
        filter_id: { type: 'string', description: 'Filter by budget IDs (comma-separated)' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        filter_externalSystem: { type: 'string', description: 'Filter by external ERP system name (max 255 chars)' },
        filter_externalId: { type: 'string', description: 'Filter by external IDs (comma-separated)' },
        filter_code: { type: 'string', description: 'Filter by codes (comma-separated, must be in double quotes)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'import_budgets',
    description: 'Import a list of budgets into a project (max 50 per request)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        data: {
          type: 'array',
          description: 'Array of budget objects to import (max 50)',
          items: { type: 'object' },
        },
        append: { type: 'boolean', description: 'true=append to existing, false=replace existing (default: false)' },
        force: { type: 'boolean', description: 'Force override locked budgeting' },
      },
      required: ['containerId', 'data'],
    },
  },
  {
    name: 'get_budget',
    description: 'Get a single budget by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        budgetId: { type: 'string', description: 'Budget ID' },
        include: {
          type: 'array',
          description: 'Related items to include: segments, contract, attributes, compounded',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'budgetId'],
    },
  },
  {
    name: 'create_budget',
    description: 'Create a new budget in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        code: { type: 'string', description: 'Budget code (max 255 chars, ignored if segmentCodeMap set)' },
        name: { type: 'string', description: 'Budget name (max 1024 chars)' },
        description: { type: 'string', description: 'Budget description (max 2048 chars)' },
        quantity: { type: 'number', description: 'Planned quantity' },
        inputQuantity: { type: 'number', description: 'Input quantity' },
        unitPrice: { type: 'number', description: 'Unit price' },
        unit: { type: 'string', description: 'Unit of measure' },
        scope: { type: 'string', enum: ['budgetOnly', 'budgetAndCost'], description: 'Budget scope' },
        parentId: { type: 'string', description: 'Parent budget ID for sub-budgets' },
        segmentCodeMap: { type: 'object', description: 'Map of segment IDs to codes for variable-length segments' },
        locations: { type: 'array', items: { type: 'string' }, description: 'Location IDs' },
        externalId: { type: 'string', description: 'External ERP system ID (max 255 chars)' },
        externalSystem: { type: 'string', description: 'External ERP system name (max 255 chars)' },
        externalMessage: { type: 'string', description: 'External system message (max 255 chars)' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
        force: { type: 'boolean', description: 'Force override locked budgeting (query param)' },
      },
      required: ['containerId', 'code', 'name'],
    },
  },
  {
    name: 'update_budget',
    description: 'Update a budget',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        budgetId: { type: 'string', description: 'Budget ID' },
        code: { type: 'string', description: 'Budget code (max 255 chars)' },
        name: { type: 'string', description: 'Budget name (max 1024 chars)' },
        description: { type: 'string', description: 'Budget description' },
        quantity: { type: 'number', description: 'Planned quantity' },
        inputQuantity: { type: 'number', description: 'Input quantity' },
        unitPrice: { type: 'number', description: 'Unit price' },
        actualQuantity: { type: 'number', description: 'Actual quantity' },
        actualUnitPrice: { type: 'number', description: 'Actual unit price' },
        actualCost: { type: 'number', description: 'Actual cost' },
        unit: { type: 'string', description: 'Unit of measure' },
        lockedField: { type: 'string', description: 'Locked field: originalAmount, quantity, or unitPrice' },
        segmentCodeMap: { type: 'object', description: 'Map of segment IDs to codes' },
        locations: { type: 'array', items: { type: 'string' }, description: 'Location IDs' },
        externalId: { type: 'string', description: 'External ERP system ID (max 255 chars)' },
        externalSystem: { type: 'string', description: 'External ERP system name (max 255 chars)' },
        externalMessage: { type: 'string', description: 'External system message (max 255 chars)' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
        force: { type: 'boolean', description: 'Force override locked budgeting (query param)' },
      },
      required: ['containerId', 'budgetId'],
    },
  },
  {
    name: 'delete_budget',
    description: 'Delete a budget',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        budgetId: { type: 'string', description: 'Budget ID' },
        force: { type: 'boolean', description: 'Force override locked budgeting' },
      },
      required: ['containerId', 'budgetId'],
    },
  },

  // ── Contracts ────────────────────────────────────────────────────────────────
  {
    name: 'list_contracts',
    description: 'List all contracts in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 50)' },
        sort: { type: 'string', description: 'Sort field and direction, e.g. "name asc"' },
        filter_id: { type: 'string', description: 'Filter by contract ID' },
        filter_source: { type: 'string', description: 'Filter by source' },
        filter_code: { type: 'string', description: 'Filter by code' },
        filter_status: { type: 'string', description: 'Filter by status' },
        filter_type: { type: 'string', description: 'Filter by type' },
        filter_externalSystem: { type: 'string', description: 'Filter by external system' },
        filter_externalId: { type: 'string', description: 'Filter by external ID' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        include: { type: 'string', description: 'Include related data: budgets, scheduleOfValues, compounded, companyERPId, companyTaxId' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'get_contract',
    description: 'Get a single contract by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        contractId: { type: 'string', description: 'Contract ID' },
        include: { type: 'string', description: 'Include related data: budgets, scheduleOfValues, compounded, companyERPId, companyTaxId' },
      },
      required: ['containerId', 'contractId'],
    },
  },
  {
    name: 'create_contract',
    description: 'Create a new contract (name required)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        name: { type: 'string', description: 'Contract name (required)' },
        code: { type: 'string', description: 'Contract code' },
        description: { type: 'string', description: 'Contract description' },
        companyId: { type: 'string', description: 'Company ID' },
        companyUid: { type: 'string', description: 'Company UUID' },
        type: { type: 'string', description: 'Contract type' },
        contactId: { type: 'string', description: 'Contact ID' },
        recipients: { type: 'array', items: { type: 'string' }, description: 'Recipients' },
        source: { type: 'string', description: 'Contract source' },
        additionalContacts: { type: 'array', items: { type: 'string' }, description: 'Additional contacts' },
        signedBy: { type: 'string', description: 'Signed by (user ID)' },
        ownerId: { type: 'string', description: 'Owner ID' },
        mainContractId: { type: 'string', description: 'Main contract ID' },
        completedWorkRetentionPercent: { type: 'number', description: 'Completed work retention percent' },
        materialsRetentionPercent: { type: 'number', description: 'Materials retention percent' },
        retentionCap: { type: 'number', description: 'Retention cap' },
        status: { type: 'string', description: 'Contract status' },
        subStatus: { type: 'string', description: 'Contract sub-status' },
        currency: { type: 'string', description: 'Currency code' },
        exchangeRate: { type: 'number', description: 'Exchange rate' },
        forecastExchangeRate: { type: 'number', description: 'Forecast exchange rate' },
        forecastExchangeRateUpdatedAt: { type: 'string', description: 'Forecast exchange rate updated date (ISO 8601)' },
        awardedAt: { type: 'string', description: 'Awarded date (ISO 8601)' },
        sentAt: { type: 'string', description: 'Sent date (ISO 8601)' },
        respondedAt: { type: 'string', description: 'Responded date (ISO 8601)' },
        responseDue: { type: 'string', description: 'Response due date (ISO 8601)' },
        returnedAt: { type: 'string', description: 'Returned date (ISO 8601)' },
        onsiteAt: { type: 'string', description: 'Onsite date (ISO 8601)' },
        offsiteAt: { type: 'string', description: 'Offsite date (ISO 8601)' },
        procuredAt: { type: 'string', description: 'Procured date (ISO 8601)' },
        approvedAt: { type: 'string', description: 'Approved date (ISO 8601)' },
        executedAt: { type: 'string', description: 'Executed date (ISO 8601)' },
        internalId: { type: 'string', description: 'Internal ID' },
        internalSystem: { type: 'string', description: 'Internal system name' },
        externalId: { type: 'string', description: 'External ERP system ID' },
        externalSystem: { type: 'string', description: 'External ERP system name' },
        externalMessage: { type: 'string', description: 'External integration message' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'name'],
    },
  },
  {
    name: 'update_contract',
    description: 'Update fields on an existing contract',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        contractId: { type: 'string', description: 'Contract ID' },
        code: { type: 'string', description: 'Contract code' },
        name: { type: 'string', description: 'Contract name' },
        description: { type: 'string', description: 'Contract description' },
        companyId: { type: 'string', description: 'Company ID' },
        companyUid: { type: 'string', description: 'Company UUID' },
        type: { type: 'string', description: 'Contract type' },
        contactId: { type: 'string', description: 'Contact ID' },
        recipients: { type: 'array', items: { type: 'string' }, description: 'Recipients' },
        source: { type: 'string', description: 'Contract source' },
        additionalContacts: { type: 'array', items: { type: 'string' }, description: 'Additional contacts' },
        signedBy: { type: 'string', description: 'Signed by (user ID)' },
        ownerId: { type: 'string', description: 'Owner ID' },
        mainContractId: { type: 'string', description: 'Main contract ID' },
        completedWorkRetentionPercent: { type: 'number', description: 'Completed work retention percent' },
        materialsRetentionPercent: { type: 'number', description: 'Materials retention percent' },
        retentionCap: { type: 'number', description: 'Retention cap' },
        status: { type: 'string', description: 'Contract status' },
        subStatus: { type: 'string', description: 'Contract sub-status' },
        currency: { type: 'string', description: 'Currency code' },
        exchangeRate: { type: 'number', description: 'Exchange rate' },
        forecastExchangeRate: { type: 'number', description: 'Forecast exchange rate' },
        forecastExchangeRateUpdatedAt: { type: 'string', description: 'Forecast exchange rate updated date (ISO 8601)' },
        awardedAt: { type: 'string', description: 'Awarded date (ISO 8601)' },
        sentAt: { type: 'string', description: 'Sent date (ISO 8601)' },
        respondedAt: { type: 'string', description: 'Responded date (ISO 8601)' },
        responseDue: { type: 'string', description: 'Response due date (ISO 8601)' },
        returnedAt: { type: 'string', description: 'Returned date (ISO 8601)' },
        onsiteAt: { type: 'string', description: 'Onsite date (ISO 8601)' },
        offsiteAt: { type: 'string', description: 'Offsite date (ISO 8601)' },
        procuredAt: { type: 'string', description: 'Procured date (ISO 8601)' },
        approvedAt: { type: 'string', description: 'Approved date (ISO 8601)' },
        executedAt: { type: 'string', description: 'Executed date (ISO 8601)' },
        internalId: { type: 'string', description: 'Internal ID' },
        internalSystem: { type: 'string', description: 'Internal system name' },
        externalId: { type: 'string', description: 'External ERP system ID' },
        externalSystem: { type: 'string', description: 'External ERP system name' },
        externalMessage: { type: 'string', description: 'External integration message' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'contractId'],
    },
  },
  {
    name: 'delete_contract',
    description: 'Delete a contract (returns 204 No Content)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        contractId: { type: 'string', description: 'Contract ID' },
      },
      required: ['containerId', 'contractId'],
    },
  },

  // ── Main Contracts ───────────────────────────────────────────────────────────
  {
    name: 'list_main_contracts',
    description: 'List all main contracts in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        include: {
          type: 'array',
          description: 'Nested resources to include: mainContractItems, attributes',
          items: { type: 'string' },
        },
        filter_id: { type: 'string', description: 'Filter by main contract IDs (comma-separated)' },
        filter_code: { type: 'string', description: 'Filter by codes (comma-separated, enclose in quotes)' },
        filter_status: { type: 'string', description: 'Filter by status: draft, pending, submitted, revise, sent, signed, executed, closed, inReview' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        filter_externalSystem: { type: 'string', description: 'Filter by external ERP system name (max 255 chars)' },
        filter_externalId: { type: 'string', description: 'Filter by external IDs (comma-separated)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'create_main_contract',
    description: 'Create a new main contract',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        code: { type: 'string', description: 'Main contract code (max 255 chars)' },
        name: { type: 'string', description: 'Main contract name (max 1024 chars)' },
        description: { type: 'string', description: 'Main contract description (max 2048 chars)' },
        note: { type: 'string', description: 'Note in Tiptap-formatted rich text' },
        scopeOfWork: { type: 'string', description: 'Scope of work in Tiptap-formatted rich text' },
        type: { type: 'string', description: 'Contract type (e.g., Fixed Price, Unit Price)' },
        contactId: { type: 'string', description: 'Supplier default contact ID' },
        ownerCompanyId: { type: 'string', description: 'Owner company ID' },
        ownerContactId: { type: 'string', description: 'Owner company primary contact ID' },
        architectCompanyId: { type: 'string', description: 'Architecture firm ID' },
        architectContactId: { type: 'string', description: 'Architecture firm primary contact ID' },
        ownerCompanyUid: { type: 'string', description: 'Owner company UUID' },
        contractorCompanyUid: { type: 'string', description: 'Contractor company UUID' },
        architectCompanyUid: { type: 'string', description: 'Architecture firm UUID' },
        notaryCompanyUid: { type: 'string', description: 'Notary company UUID' },
        startDate: { type: 'string', description: 'Start date (ISO 8601)' },
        executedDate: { type: 'string', description: 'Execution date (ISO 8601)' },
        plannedCompletionDate: { type: 'string', description: 'Planned completion date (ISO 8601)' },
        revisedCompletionDate: { type: 'string', description: 'Revised completion date (ISO 8601)' },
        actualCompletionDate: { type: 'string', description: 'Actual completion date (ISO 8601)' },
        closeDate: { type: 'string', description: 'Closing date (ISO 8601)' },
        status: { type: 'string', enum: ['closed', 'executed', 'review', 'signed'], description: 'Contract status' },
        isDefault: { type: 'boolean', description: 'Whether this is the default main contract' },
        completedWorkRetentionPercent: { type: 'number', description: 'Completed work retention percentage' },
        materialsRetentionPercent: { type: 'number', description: 'Materials retention percentage' },
        retentionCap: { type: 'number', description: 'Total retention percentage cap' },
        externalId: { type: 'string', description: 'External ERP system ID (max 255 chars)' },
        externalSystem: { type: 'string', description: 'External ERP system name (max 255 chars)' },
        externalMessage: { type: 'string', description: 'External system message (max 255 chars)' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'code', 'name'],
    },
  },
  {
    name: 'get_main_contract',
    description: 'Get a single main contract by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Main contract ID' },
        include: {
          type: 'array',
          description: 'Nested resources to include: mainContractItems, attributes',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'id'],
    },
  },
  {
    name: 'update_main_contract',
    description: 'Update a main contract',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Main contract ID' },
        code: { type: 'string', description: 'Main contract code (max 255 chars)' },
        name: { type: 'string', description: 'Main contract name (max 1024 chars)' },
        description: { type: 'string', description: 'Main contract description (max 2048 chars)' },
        note: { type: 'string', description: 'Note in Tiptap-formatted rich text' },
        scopeOfWork: { type: 'string', description: 'Scope of work in Tiptap-formatted rich text' },
        type: { type: 'string', description: 'Contract type (e.g., Fixed Price, Unit Price)' },
        contactId: { type: 'string', description: 'Supplier default contact ID' },
        ownerCompanyId: { type: 'string', description: 'Owner company ID' },
        ownerContactId: { type: 'string', description: 'Owner company primary contact ID' },
        architectCompanyId: { type: 'string', description: 'Architecture firm ID' },
        architectContactId: { type: 'string', description: 'Architecture firm primary contact ID' },
        additionalCollaborators: {
          type: 'array',
          description: 'Additional collaborator companies and contacts',
          items: { type: 'object' },
        },
        ownerCompanyUid: { type: 'string', description: 'Owner company UUID' },
        contractorCompanyUid: { type: 'string', description: 'Contractor company UUID' },
        architectCompanyUid: { type: 'string', description: 'Architecture firm UUID' },
        notaryCompanyUid: { type: 'string', description: 'Notary company UUID' },
        startDate: { type: 'string', description: 'Start date (ISO 8601)' },
        executedDate: { type: 'string', description: 'Execution date (ISO 8601)' },
        plannedCompletionDate: { type: 'string', description: 'Planned completion date (ISO 8601)' },
        revisedCompletionDate: { type: 'string', description: 'Revised completion date (ISO 8601)' },
        actualCompletionDate: { type: 'string', description: 'Actual completion date (ISO 8601)' },
        closeDate: { type: 'string', description: 'Closing date (ISO 8601)' },
        status: { type: 'string', enum: ['closed', 'executed', 'review', 'signed'], description: 'Contract status' },
        isDefault: { type: 'boolean', description: 'Whether this is the default main contract' },
        completedWorkRetentionPercent: { type: 'number', description: 'Completed work retention percentage' },
        materialsRetentionPercent: { type: 'number', description: 'Materials retention percentage' },
        retentionCap: { type: 'number', description: 'Total retention percentage cap' },
        externalId: { type: 'string', description: 'External ERP system ID (max 255 chars)' },
        externalSystem: { type: 'string', description: 'External ERP system name (max 255 chars)' },
        externalMessage: { type: 'string', description: 'External system message (max 255 chars)' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'id'],
    },
  },
  {
    name: 'delete_main_contract',
    description: 'Delete a main contract (returns 204 No Content)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Main contract ID' },
      },
      required: ['containerId', 'id'],
    },
  },

  // ── Main Contract Items ──────────────────────────────────────────────────────
  {
    name: 'list_main_contract_items',
    description: 'List main contract items for a specific main contract',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        mainContractId: { type: 'string', description: 'Main contract ID' },
        include: {
          type: 'array',
          description: 'Nested resources to include: budget, mainContract',
          items: { type: 'string' },
        },
        filter_id: { type: 'string', description: 'Filter by item IDs (comma-separated)' },
        filter_externalSystem: { type: 'string', description: 'Filter by external ERP system name (max 255 chars)' },
        filter_externalId: { type: 'string', description: 'Filter by external IDs (comma-separated)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId', 'mainContractId'],
    },
  },
  {
    name: 'create_main_contract_item',
    description: 'Create a new main contract item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        mainContractId: { type: 'string', description: 'Main contract ID' },
        id: { type: 'string', description: 'Main contract item ID (optional, auto-generated if not provided)' },
        code: { type: 'string', description: 'Main contract item code (max 255 chars)' },
        name: { type: 'string', description: 'Main contract item name (max 1024 chars)' },
        description: { type: 'string', description: 'Main contract item description (max 2048 chars)' },
        parentId: { type: 'string', description: 'Parent item ID' },
        budgetId: { type: 'string', description: 'Budget ID' },
        unit: { type: 'string', description: 'Unit of measure (max 255 chars)' },
        unitPrice: { type: 'number', description: 'Unit price' },
        quantity: { type: 'number', description: 'Quantity' },
        position: { type: 'number', description: 'Position in siblings' },
        externalId: { type: 'string', description: 'External ERP system ID (max 255 chars)' },
        externalSystem: { type: 'string', description: 'External ERP system name (max 255 chars)' },
        externalMessage: { type: 'string', description: 'External system message (max 255 chars)' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'mainContractId', 'code', 'name'],
    },
  },
  {
    name: 'get_main_contract_item',
    description: 'Get a single main contract item by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        mainContractId: { type: 'string', description: 'Main contract ID' },
        id: { type: 'string', description: 'Main contract item ID' },
        include: {
          type: 'array',
          description: 'Nested resources to include: budget, mainContract',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'mainContractId', 'id'],
    },
  },
  {
    name: 'update_main_contract_item',
    description: 'Update a main contract item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        mainContractId: { type: 'string', description: 'Main contract ID' },
        id: { type: 'string', description: 'Main contract item ID' },
        code: { type: 'string', description: 'Main contract item code (max 255 chars)' },
        name: { type: 'string', description: 'Main contract item name (max 1024 chars)' },
        description: { type: 'string', description: 'Main contract item description (max 2048 chars)' },
        unit: { type: 'string', description: 'Unit of measure (max 255 chars)' },
        lockedField: { type: 'string', enum: ['amount', 'quantity', 'unitPrice'], description: 'Field to lock for calculation' },
        unitPrice: { type: 'number', description: 'Unit price' },
        quantity: { type: 'number', description: 'Quantity' },
        amount: { type: 'number', description: 'Total amount' },
        position: { type: 'number', description: 'Position in siblings' },
        externalId: { type: 'string', description: 'External ERP system ID (max 255 chars)' },
        externalSystem: { type: 'string', description: 'External ERP system name (max 255 chars)' },
        externalMessage: { type: 'string', description: 'External system message (max 255 chars)' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'mainContractId', 'id'],
    },
  },
  {
    name: 'delete_main_contract_item',
    description: 'Delete a main contract item (returns 204 No Content)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        mainContractId: { type: 'string', description: 'Main contract ID' },
        id: { type: 'string', description: 'Main contract item ID' },
      },
      required: ['containerId', 'mainContractId', 'id'],
    },
  },

  // ── Cost Items ───────────────────────────────────────────────────────────────
  {
    name: 'list_cost_items',
    description: 'List all cost items in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 50)' },
        sort: { type: 'string', description: 'Sort field and direction' },
        filter_id: { type: 'string', description: 'Filter by cost item ID' },
        filter_number: { type: 'string', description: 'Filter by number' },
        filter_changeOrderId: { type: 'string', description: 'Filter by change order ID' },
        filter_budgetId: { type: 'string', description: 'Filter by budget ID' },
        filter_contractId: { type: 'string', description: 'Filter by contract ID' },
        filter_externalSystem: { type: 'string', description: 'Filter by external system' },
        filter_externalId: { type: 'string', description: 'Filter by external ID' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        filter_budgetStatus: { type: 'string', description: 'Filter by budget status' },
        filter_costStatus: { type: 'string', description: 'Filter by cost status' },
        include: { type: 'string', description: 'Include related data: budget, changeOrders, subCostItems, attributes' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'get_cost_item',
    description: 'Get a single cost item by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        costItemId: { type: 'string', description: 'Cost item ID' },
        include: { type: 'string', description: 'Include related data: budget, changeOrders, subCostItems, attributes' },
      },
      required: ['containerId', 'costItemId'],
    },
  },
  {
    name: 'create_cost_item',
    description: 'Create a new cost item (name required)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        name: { type: 'string', description: 'Cost item name (required)' },
        changeOrderId: { type: 'string', description: 'Change order ID' },
        budgetId: { type: 'string', description: 'Budget ID' },
        contractId: { type: 'string', description: 'Contract ID' },
        description: { type: 'string', description: 'Cost item description' },
        estimated: { type: 'number', description: 'Estimated amount' },
        proposed: { type: 'number', description: 'Proposed amount' },
        submitted: { type: 'number', description: 'Submitted amount' },
        approved: { type: 'number', description: 'Approved amount' },
        committed: { type: 'number', description: 'Committed amount' },
        inputQuantity: { type: 'number', description: 'Input quantity' },
        quantity: { type: 'number', description: 'Quantity' },
        unit: { type: 'string', description: 'Unit of measure' },
        proposedExchangeRate: { type: 'number', description: 'Proposed exchange rate' },
        committedExchangeRate: { type: 'number', description: 'Committed exchange rate' },
        locations: { type: 'array', items: { type: 'string' }, description: 'Location IDs' },
        externalId: { type: 'string', description: 'External ERP system ID' },
        externalSystem: { type: 'string', description: 'External ERP system name' },
        externalMessage: { type: 'string', description: 'External integration message' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'name'],
    },
  },
  {
    name: 'create_cost_items_batch',
    description: 'Create multiple cost items (max 200)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        data: {
          type: 'array',
          description: 'Array of cost item objects (max 200)',
          items: { type: 'object' },
        },
      },
      required: ['containerId', 'data'],
    },
  },
  {
    name: 'update_cost_item',
    description: 'Update a cost item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        costItemId: { type: 'string', description: 'Cost item ID' },
        name: { type: 'string', description: 'Cost item name' },
        description: { type: 'string', description: 'Cost item description' },
        type: { type: 'string', description: 'Cost item type' },
        estimated: { type: 'number', description: 'Estimated amount' },
        proposed: { type: 'number', description: 'Proposed amount' },
        submitted: { type: 'number', description: 'Submitted amount' },
        approved: { type: 'number', description: 'Approved amount' },
        committed: { type: 'number', description: 'Committed amount' },
        inputQuantity: { type: 'number', description: 'Input quantity' },
        quantity: { type: 'number', description: 'Quantity' },
        unit: { type: 'string', description: 'Unit of measure' },
        budgetId: { type: 'string', description: 'Budget ID' },
        contractId: { type: 'string', description: 'Contract ID' },
        proposedExchangeRate: { type: 'number', description: 'Proposed exchange rate' },
        committedExchangeRate: { type: 'number', description: 'Committed exchange rate' },
        budgetTransferItemId: { type: 'string', description: 'Budget transfer item ID' },
        locations: { type: 'array', items: { type: 'string' }, description: 'Location IDs' },
        externalId: { type: 'string', description: 'External ERP system ID' },
        externalSystem: { type: 'string', description: 'External ERP system name' },
        externalMessage: { type: 'string', description: 'External integration message' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'costItemId'],
    },
  },
  {
    name: 'delete_cost_item',
    description: 'Delete a cost item (returns 204 No Content)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        costItemId: { type: 'string', description: 'Cost item ID' },
      },
      required: ['containerId', 'costItemId'],
    },
  },

  // ── Change Orders (updated) ───────────────────────────────────────────────────
  {
    name: 'list_change_order_types',
    description: 'List all change order types available in the container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'list_change_orders_by_type',
    description: 'List change orders by type (pco|rfq|rco|oco|sco)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        changeOrder: { type: 'string', enum: ['pco', 'rfq', 'rco', 'oco', 'sco'], description: 'Change order type' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 50)' },
        sort: { type: 'string', description: 'Sort field and direction' },
        filter_id: { type: 'string', description: 'Filter by change order ID' },
        filter_number: { type: 'string', description: 'Filter by number' },
        filter_sourceId: { type: 'string', description: 'Filter by source ID' },
        filter_contractId: { type: 'string', description: 'Filter by contract ID' },
        filter_mainContractId: { type: 'string', description: 'Filter by main contract ID' },
        filter_budgetStatus: { type: 'string', description: 'Filter by budget status' },
        filter_costStatus: { type: 'string', description: 'Filter by cost status' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        filter_externalSystem: { type: 'string', description: 'Filter by external system' },
        filter_externalId: { type: 'string', description: 'Filter by external ID' },
        include: { type: 'string', description: 'Include related data' },
      },
      required: ['containerId', 'changeOrder'],
    },
  },
  {
    name: 'create_change_order',
    description: 'Create a change order',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        changeOrder: { type: 'string', enum: ['pco', 'rfq', 'rco', 'oco', 'sco'], description: 'Change order type' },
        name: { type: 'string', description: 'Change order name' },
        description: { type: 'string', description: 'Change order description' },
        scope: { type: 'string', description: 'Scope (e.g. "out")' },
        scopeOfWork: { type: 'string', description: 'Scope of work' },
        type: { type: 'string', description: 'Change order type label (e.g. "Owner Change Order")' },
        note: { type: 'string', description: 'Note' },
        sourceType: { type: 'string', description: 'Source type (e.g. "ASI", "RFI")' },
        sourceRef: { type: 'string', description: 'Source reference identifier (e.g. "ASI 002")' },
        externalId: { type: 'string', description: 'External ERP system ID' },
        externalSystem: { type: 'string', description: 'External ERP system name' },
        externalMessage: { type: 'string', description: 'External integration message' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'changeOrder', 'name'],
    },
  },
  {
    name: 'get_change_order',
    description: 'Get a single change order by type and ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        changeOrder: { type: 'string', enum: ['pco', 'rfq', 'rco', 'oco', 'sco'], description: 'Change order type' },
        id: { type: 'string', description: 'Change order ID' },
        include: { type: 'string', description: 'Include related data: costItems, costItems[changeOrders], attributes, comments' },
      },
      required: ['containerId', 'changeOrder', 'id'],
    },
  },
  {
    name: 'update_change_order',
    description: 'Update a change order',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        changeOrder: { type: 'string', enum: ['pco', 'rfq', 'rco', 'oco', 'sco'], description: 'Change order type' },
        id: { type: 'string', description: 'Change order ID' },
        name: { type: 'string', description: 'Change order name' },
        description: { type: 'string', description: 'Change order description' },
        type: { type: 'string', description: 'Change order type' },
        scope: { type: 'string', description: 'Scope' },
        scheduleChange: { type: 'string', description: 'Schedule change' },
        proposedRevisedCompletionDate: { type: 'string', description: 'Proposed revised completion date (ISO 8601)' },
        ownerId: { type: 'string', description: 'Owner ID' },
        scopeOfWork: { type: 'string', description: 'Scope of work' },
        note: { type: 'string', description: 'Note' },
        exchangeRate: { type: 'number', description: 'Exchange rate' },
        companyId: { type: 'string', description: 'Company ID' },
        companyUid: { type: 'string', description: 'Company UUID' },
        architectCompanyId: { type: 'string', description: 'Architect company ID' },
        architectCompanyUid: { type: 'string', description: 'Architect company UUID' },
        architectContactId: { type: 'string', description: 'Architect contact ID' },
        additionalCollaborators: { type: 'array', items: { type: 'string' }, description: 'Additional collaborators' },
        sourceType: { type: 'string', description: 'Source type' },
        externalId: { type: 'string', description: 'External ERP system ID' },
        externalSystem: { type: 'string', description: 'External ERP system name' },
        externalMessage: { type: 'string', description: 'External integration message' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'changeOrder', 'id'],
    },
  },
  {
    name: 'delete_change_order',
    description: 'Delete a change order (returns 204 No Content)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        changeOrder: { type: 'string', enum: ['pco', 'rfq', 'rco', 'oco', 'sco'], description: 'Change order type' },
        id: { type: 'string', description: 'Change order ID' },
      },
      required: ['containerId', 'changeOrder', 'id'],
    },
  },

  // ── Budgets-Contracts ─────────────────────────────────────────────────────────
  {
    name: 'link_budgets_contracts',
    description: 'Link or unlink budgets to contracts (max 50 pairs per request)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        create: {
          type: 'array',
          description: 'Pairs to link (contractId, budgetId)',
          items: { type: 'object' },
        },
        remove: {
          type: 'array',
          description: 'Pairs to unlink (contractId, budgetId)',
          items: { type: 'object' },
        },
      },
      required: ['containerId'],
    },
  },

  // ── Change Order and Cost Items ───────────────────────────────────────────────
  {
    name: 'attach_cost_items_to_change_order',
    description: 'Add existing cost items to a change order',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        attachments: {
          type: 'array',
          description: 'Array of {changeOrderId, costItemId} pairs',
          items: { type: 'object' },
        },
      },
      required: ['containerId', 'attachments'],
    },
  },
  {
    name: 'detach_cost_items_from_change_order',
    description: 'Remove cost items from a change order',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        detachments: {
          type: 'array',
          description: 'Array of {changeOrderId, costItemId} pairs',
          items: { type: 'object' },
        },
      },
      required: ['containerId', 'detachments'],
    },
  },

  // ── Documents ─────────────────────────────────────────────────────────────────
  {
    name: 'get_documents',
    description: 'Get generated documents (requires associationId and associationType query parameters)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        associationId: { type: 'string', description: 'Association ID (comma-separated for multiple, required)' },
        associationType: {
          type: 'string',
          enum: ['Budget', 'Contract', 'CostItem', 'FormInstance', 'Payment', 'BudgetPayment', 'Expense', 'OCO', 'SCO'],
          description: 'Association type (required)',
        },
        filter_latest: { type: 'boolean', description: 'Filter by latest documents' },
        filter_signed: { type: 'boolean', description: 'Filter by signed status' },
      },
      required: ['containerId', 'associationId', 'associationType'],
    },
  },

  // ── Expenses ─────────────────────────────────────────────────────────────────
  {
    name: 'list_expenses',
    description: 'List all expenses in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        limit: { type: 'number', description: 'Max results (default: all pages)' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'get_expense',
    description: 'Get a single expense by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        expenseId: { type: 'string', description: 'Expense ID' },
      },
      required: ['containerId', 'expenseId'],
    },
  },
  {
    name: 'create_expense',
    description: 'Create a new expense (name required)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        name: { type: 'string', description: 'Expense name (required)' },
        budgetPaymentId: { type: 'string', description: 'Budget Payment App ID' },
        supplierId: { type: 'string', description: 'Supplier ID' },
        supplierCompanyUid: { type: 'string', description: 'Supplier company UUID' },
        supplierName: { type: 'string', description: 'Supplier name' },
        description: { type: 'string', description: 'Expense description' },
        note: { type: 'string', description: 'Note (Tiptap formatted rich text)' },
        term: { type: 'string', description: 'Payment term' },
        referenceNumber: { type: 'string', description: 'Reference number' },
        type: { type: 'string', description: 'Expense type' },
        scope: { type: 'string', enum: ['full', 'partial'], description: 'Scope' },
        purchasedBy: { type: 'string', description: 'Purchased by (user ID)' },
        status: { type: 'string', enum: ['draft', 'pending', 'revise', 'rejected', 'approved', 'paid'], description: 'Status' },
        paymentDue: { type: 'string', description: 'Payment due date (ISO 8601)' },
        issuedAt: { type: 'string', description: 'Issued date (ISO 8601)' },
        receivedAt: { type: 'string', description: 'Received date (ISO 8601)' },
        mainContractId: { type: 'string', description: 'Main contract ID' },
        externalId: { type: 'string', description: 'External ERP system ID' },
        externalSystem: { type: 'string', description: 'External ERP system name' },
        externalMessage: { type: 'string', description: 'External integration message' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'name'],
    },
  },
  {
    name: 'update_expense',
    description: 'Update an expense',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        expenseId: { type: 'string', description: 'Expense ID' },
        name: { type: 'string', description: 'Expense name' },
        budgetPaymentId: { type: 'string', description: 'Budget Payment App ID' },
        supplierId: { type: 'string', description: 'Supplier ID' },
        supplierCompanyUid: { type: 'string', description: 'Supplier company UUID' },
        supplierName: { type: 'string', description: 'Supplier name' },
        description: { type: 'string', description: 'Expense description' },
        note: { type: 'string', description: 'Note (Tiptap formatted rich text)' },
        term: { type: 'string', description: 'Payment term' },
        referenceNumber: { type: 'string', description: 'Reference number' },
        type: { type: 'string', description: 'Expense type' },
        scope: { type: 'string', enum: ['full', 'partial'], description: 'Scope' },
        purchasedBy: { type: 'string', description: 'Purchased by (user ID)' },
        status: { type: 'string', enum: ['draft', 'pending', 'revise', 'rejected', 'approved', 'paid'], description: 'Status' },
        paymentDue: { type: 'string', description: 'Payment due date (ISO 8601)' },
        issuedAt: { type: 'string', description: 'Issued date (ISO 8601)' },
        receivedAt: { type: 'string', description: 'Received date (ISO 8601)' },
        mainContractId: { type: 'string', description: 'Main contract ID' },
        externalId: { type: 'string', description: 'External ERP system ID' },
        externalSystem: { type: 'string', description: 'External ERP system name' },
        externalMessage: { type: 'string', description: 'External integration message' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'expenseId'],
    },
  },
  {
    name: 'delete_expense',
    description: 'Delete an expense (returns 204 No Content)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        expenseId: { type: 'string', description: 'Expense ID' },
      },
      required: ['containerId', 'expenseId'],
    },
  },

  // ── Expense Items ────────────────────────────────────────────────────────────
  {
    name: 'list_expense_items',
    description: 'List expense items for a specific expense',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        expenseId: { type: 'string', description: 'Expense ID' },
        include: {
          type: 'array',
          description: 'Nested resources to include: budget, contract, attributes, externalRelationship',
          items: { type: 'string' },
        },
        filter_id: { type: 'string', description: 'Filter by item IDs (comma-separated)' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        filter_externalSystem: { type: 'string', description: 'Filter by external ERP system name (max 255 chars)' },
        filter_externalId: { type: 'string', description: 'Filter by external IDs (comma-separated)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId', 'expenseId'],
    },
  },
  {
    name: 'create_expense_item',
    description: 'Create a new expense item in an expense',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        expenseId: { type: 'string', description: 'Expense ID' },
        id: { type: 'string', description: 'Expense item ID (optional, auto-generated if not provided)' },
        budgetId: { type: 'string', description: 'Budget ID' },
        budgetCode: { type: 'string', description: 'Budget code of an existing budget' },
        contractId: { type: 'string', description: 'Contract ID' },
        number: { type: 'string', description: 'Sequence number (auto-generated if not provided)' },
        name: { type: 'string', description: 'Expense item name (max 1024 chars)' },
        description: { type: 'string', description: 'Expense item description (max 2048 chars)' },
        note: { type: 'string', description: 'Note in Tiptap-formatted rich text' },
        scope: { type: 'string', enum: ['full', 'partial'], description: 'Scope' },
        quantity: { type: 'number', description: 'Number of units' },
        unitPrice: { type: 'number', description: 'Price per unit' },
        unit: { type: 'string', description: 'Unit of measure' },
        amount: { type: 'number', description: 'Total price (quantity * unitPrice)' },
        exchangeRate: { type: 'number', description: 'Exchange rate (default: 1)' },
        externalId: { type: 'string', description: 'External ERP system ID (max 255 chars)' },
        externalSystem: { type: 'string', description: 'External ERP system name (max 255 chars)' },
        externalMessage: { type: 'string', description: 'External system message (max 255 chars)' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'expenseId', 'name'],
    },
  },
  {
    name: 'get_expense_item',
    description: 'Get a single expense item by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        expenseId: { type: 'string', description: 'Expense ID' },
        id: { type: 'string', description: 'Expense item ID' },
        include: {
          type: 'array',
          description: 'Nested resources to include: budget, contract, attributes, externalRelationship',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'expenseId', 'id'],
    },
  },
  {
    name: 'update_expense_item',
    description: 'Update an expense item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        expenseId: { type: 'string', description: 'Expense ID' },
        id: { type: 'string', description: 'Expense item ID' },
        name: { type: 'string', description: 'Expense item name (max 1024 chars)' },
        number: { type: 'string', description: 'Sequence number (max 255 chars)' },
        budgetId: { type: 'string', description: 'Budget ID' },
        contractId: { type: 'string', description: 'Contract ID' },
        description: { type: 'string', description: 'Expense item description (max 2048 chars)' },
        note: { type: 'string', description: 'Note in Tiptap-formatted rich text' },
        scope: { type: 'string', enum: ['full', 'partial'], description: 'Scope' },
        quantity: { type: 'number', description: 'Number of units' },
        unitPrice: { type: 'number', description: 'Price per unit' },
        unit: { type: 'string', description: 'Unit of measure' },
        amount: { type: 'number', description: 'Total price' },
        lockedField: { type: 'string', description: 'Field to lock when recalculating price' },
        aggregateBy: { type: 'string', enum: ['workCompleted', 'workCompletedQty', 'materialsOnSite', 'materialsBilled'], description: 'Aggregate type' },
        exchangeRate: { type: 'number', description: 'Exchange rate' },
        externalId: { type: 'string', description: 'External ERP system ID (max 255 chars)' },
        externalSystem: { type: 'string', description: 'External ERP system name (max 255 chars)' },
        externalMessage: { type: 'string', description: 'External system message (max 255 chars)' },
        lastSyncTime: { type: 'string', description: 'Last sync time (ISO 8601)' },
        integrationState: { type: 'string', enum: ['locked', 'integrated', 'failed', null], description: 'Integration state' },
      },
      required: ['containerId', 'expenseId', 'id'],
    },
  },
  {
    name: 'delete_expense_item',
    description: 'Delete an expense item (returns 204 No Content)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        expenseId: { type: 'string', description: 'Expense ID' },
        id: { type: 'string', description: 'Expense item ID' },
      },
      required: ['containerId', 'expenseId', 'id'],
    },
  },

  // ── Payments ─────────────────────────────────────────────────────────────────
  {
    name: 'list_payments',
    description: 'List all payments in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_associationType: { type: 'string', description: 'Filter by association type' },
        filter_associationId: { type: 'string', description: 'Filter by association IDs (comma-separated)' },
        filter_id: { type: 'string', description: 'Filter by payment IDs (comma-separated)' },
        filter_number: { type: 'string', description: 'Filter by payment number' },
        filter_status: { type: 'string', description: 'Filter by status' },
        filter_budgetPaymentId: { type: 'string', description: 'Filter by budget payment ID' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        filter_externalSystem: { type: 'string', description: 'Filter by external ERP system name' },
        filter_externalId: { type: 'string', description: 'Filter by external IDs (comma-separated)' },
        include: {
          type: 'array',
          description: 'Nested resources to include: paymentReferences, attributes, summaryCalculatedFields, complianceExpiration',
          items: { type: 'string' },
        },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., number asc)' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'list_payment_items',
    description: 'List all payment items in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_associationId: { type: 'string', description: 'Filter by association IDs (comma-separated)' },
        filter_paymentId: { type: 'string', description: 'Filter by payment IDs (comma-separated)' },
        filter_associationType: { type: 'string',
          enum: ['SOV', 'SCO', 'CostItem', 'MaterialsOnSite', 'MainContractItem', 'OCO', 'SubCostItem'],
          description: 'Filter by association type',
        },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId'],
    },
  },

  // ── Schedule of Values ───────────────────────────────────────────────────────
  {
    name: 'list_schedule_of_values',
    description: 'List all schedule of values items in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_id: { type: 'string', description: 'Filter by SOV IDs (comma-separated)' },
        filter_budgetId: { type: 'string', description: 'Filter by budget IDs (comma-separated)' },
        filter_contractId: { type: 'string', description: 'Filter by contract IDs (comma-separated)' },
        filter_includeChangeOrders: { type: 'boolean', description: 'Include change order items' },
        filter_externalSystem: { type: 'string', description: 'Filter by external ERP system name' },
        filter_externalId: { type: 'string', description: 'Filter by external IDs (comma-separated)' },
        include: {
          type: 'array',
          description: 'Nested resources to include: subitems, attributes, idOnly',
          items: { type: 'string' },
        },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., code asc)' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'create_schedule_of_values',
    description: 'Create a new schedule of values item (sub-items only, root items created when budgets allocated to contract)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        parentId: { type: 'string', description: 'Parent SOV item ID (required)' },
        code: { type: 'string', description: 'Item code (required)' },
        name: { type: 'string', description: 'Item name (required)' },
        id: { type: 'string', description: 'SOV item ID (optional, auto-generated if omitted)' },
        contractId: { type: 'string', description: 'Contract ID' },
        budgetId: { type: 'string', description: 'Budget ID' },
        quantity: { type: 'number', description: 'Item quantity' },
        unitPrice: { type: 'number', description: 'Unit price' },
        unit: { type: 'string', description: 'Unit of measurement' },
        amount: { type: 'number', description: 'Total amount' },
        quantityPerBulk: { type: 'number', description: 'Quantity per bulk unit' },
        bulkUnitPrice: { type: 'number', description: 'Bulk unit price' },
        bulk: { type: 'string', description: 'Bulk unit' },
        exchangeRate: { type: 'number', description: 'Exchange rate' },
        position: { type: 'number', description: 'Item position/order' },
        externalId: { type: 'string', description: 'External system ID' },
        externalSystem: { type: 'string', description: 'External ERP system name (max 255 chars)' },
        externalMessage: { type: 'string', description: 'External system message' },
        lastSyncTime: { type: 'string', description: 'Last sync timestamp (ISO 8601)' },
      },
      required: ['containerId', 'parentId', 'code', 'name'],
    },
  },
  {
    name: 'get_schedule_of_values',
    description: 'Get a single schedule of values item by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'SOV item ID' },
        include: {
          type: 'array',
          description: 'Nested resources to include: subitems, attributes, idOnly',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'id'],
    },
  },
  {
    name: 'update_schedule_of_values',
    description: 'Update a schedule of values item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'SOV item ID' },
        code: { type: 'string', description: 'Item code' },
        name: { type: 'string', description: 'Item name' },
        quantity: { type: 'number', description: 'Item quantity' },
        unitPrice: { type: 'number', description: 'Unit price' },
        unit: { type: 'string', description: 'Unit of measurement' },
        amount: { type: 'number', description: 'Total amount' },
        lockedField: { type: 'string', description: 'Field to lock (quantity, unitPrice, amount)' },
        quantityPerBulk: { type: 'number', description: 'Quantity per bulk unit' },
        exchangeRate: { type: 'number', description: 'Exchange rate' },
        position: { type: 'number', description: 'Item position/order' },
        externalId: { type: 'string', description: 'External system ID' },
        externalSystem: { type: 'string', description: 'External ERP system name (max 255 chars)' },
        externalMessage: { type: 'string', description: 'External system message' },
        lastSyncTime: { type: 'string', description: 'Last sync timestamp (ISO 8601)' },
      },
      required: ['containerId', 'id'],
    },
  },
  {
    name: 'delete_schedule_of_values',
    description: 'Delete a schedule of values item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'SOV item ID' },
      },
      required: ['containerId', 'id'],
    },
  },

  // ── Sub Cost Items ────────────────────────────────────────────────────────────
  {
    name: 'list_sub_cost_items',
    description: 'List all sub cost items for a specific cost item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        costItemId: { type: 'string', description: 'Cost item ID' },
        filter_type: { type: 'string',
          enum: ['estimated', 'proposed', 'submitted', 'approved', 'committed'],
          description: 'Filter by sub cost item type',
        },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId', 'costItemId'],
    },
  },
  {
    name: 'create_sub_cost_item',
    description: 'Create a new sub cost item within a cost item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        costItemId: { type: 'string', description: 'Cost item ID' },
        code: { type: 'string', description: 'Sub cost item code (required)' },
        parentId: { type: 'string', description: 'Parent sub cost item ID (null for root)' },
        type: {
          type: 'string',
          enum: ['estimated', 'proposed', 'submitted', 'approved', 'committed'],
          description: 'Sub cost item type',
        },
        name: { type: 'string', description: 'Sub cost item name' },
        quantity: { type: 'number', description: 'Planned quantity' },
        inputQuantity: { type: 'number', description: 'Recorded input quantity' },
        unitPrice: { type: 'number', description: 'Price per unit' },
        unit: { type: 'string', description: 'Unit of measurement' },
        value: { type: 'number', description: 'Total value' },
        position: { type: 'number', description: 'Item position/order' },
      },
      required: ['containerId', 'costItemId', 'code'],
    },
  },
  {
    name: 'copy_sub_cost_items',
    description: 'Copy sub cost items from source type to target type within a cost item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        costItemId: { type: 'string', description: 'Cost item ID' },
        from: {
          type: 'string',
          enum: ['contract', 'budget', 'estimated', 'proposed', 'submitted', 'approved', 'committed'],
          description: 'Source type (contract and budget can only be source)',
        },
        to: {
          type: 'string',
          enum: ['estimated', 'proposed', 'submitted', 'approved', 'committed'],
          description: 'Target type (contract and budget cannot be destination)',
        },
        sourceIds: {
          type: 'array',
          description: 'Budget IDs or Schedule of Value (SOV) IDs from contract',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'costItemId', 'from', 'to', 'sourceIds'],
    },
  },
  {
    name: 'update_sub_cost_item',
    description: 'Update a sub cost item within a cost item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        costItemId: { type: 'string', description: 'Cost item ID' },
        id: { type: 'string', description: 'Sub cost item ID' },
        code: { type: 'string', description: 'Sub cost item code' },
        name: { type: 'string', description: 'Sub cost item name' },
        lockedField: {
          type: 'string',
          enum: ['value', 'quantity', 'unitPrice'],
          description: 'Field to lock for cost calculations',
        },
        quantity: { type: 'number', description: 'Planned quantity' },
        inputQuantity: { type: 'number', description: 'Recorded input quantity' },
        unitPrice: { type: 'number', description: 'Price per unit' },
        unit: { type: 'string', description: 'Unit of measurement' },
        value: { type: 'number', description: 'Total value' },
      },
      required: ['containerId', 'costItemId', 'id'],
    },
  },
  {
    name: 'delete_sub_cost_item',
    description: 'Delete a sub cost item within a cost item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        costItemId: { type: 'string', description: 'Cost item ID' },
        id: { type: 'string', description: 'Sub cost item ID' },
      },
      required: ['containerId', 'costItemId', 'id'],
    },
  },

  // ── Taxes ────────────────────────────────────────────────────────────────────
  {
    name: 'list_taxes',
    description: 'List all tax formulas associated with specific cost objects',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_associationId: { type: 'string', description: 'Object IDs (comma-separated), e.g., budget or contract IDs' },
        filter_associationType: { type: 'string',
          enum: ['Contract', 'MainContract', 'BudgetPayment', 'CostPayment', 'OCO', 'SCO', 'PCO', 'RFQ', 'RCO'],
          description: 'Category of the object the tax is associated with',
        },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId', 'filter_associationId', 'filter_associationType'],
    },
  },

  // ── Timesheets ────────────────────────────────────────────────────────────────
  {
    name: 'list_timesheets',
    description: 'List all timesheets in a project',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_budgetCode: { type: 'string', description: 'Filter by associated budget code' },
        filter_trackingItemInstanceId: { type: 'string', description: 'Filter by tracking item instance ID' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        filter_startDate: { type: 'string', description: 'Filter by start date (ISO 8601 or range: value..value)' },
        filter_endDate: { type: 'string', description: 'Filter by end date (ISO 8601 or range: value..value)' },
        include: {
          type: 'array',
          description: 'Include additional resources: meta',
          items: { type: 'string' },
        },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., startDate asc)' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'create_timesheet',
    description: 'Create a new timesheet for a tracking item instance',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        trackingItemInstanceId: { type: 'string', description: 'Tracking item instance ID (required if trackingItemInstanceNumber and budgetCode omitted)' },
        trackingItemInstanceNumber: { type: 'string', description: 'Tracking item instance number (required if trackingItemInstanceId and budgetCode omitted)' },
        budgetCode: { type: 'string', description: 'Budget code (required if trackingItemInstanceId and trackingItemInstanceNumber omitted)' },
        startDate: { type: 'string', description: 'First date of timesheet period' },
        endDate: { type: 'string', description: 'Last date of timesheet period (required)' },
        inputQuantity: { type: 'number', description: 'Hours worked (required)' },
        outputQuantity: { type: 'number', description: 'Material quantity used (required)' },
      },
      required: ['containerId', 'endDate', 'inputQuantity', 'outputQuantity'],
    },
  },
  {
    name: 'get_timesheet',
    description: 'Get a single timesheet by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Timesheet ID' },
      },
      required: ['containerId', 'id'],
    },
  },
  {
    name: 'update_timesheet',
    description: 'Update a timesheet',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Timesheet ID' },
        trackingItemInstanceId: { type: 'string', description: 'Tracking item instance ID' },
        trackingItemInstanceNumber: { type: 'string', description: 'Tracking item instance number' },
        budgetCode: { type: 'string', description: 'Budget code' },
        startDate: { type: 'string', description: 'First date of timesheet period' },
        endDate: { type: 'string', description: 'Last date of timesheet period' },
        inputQuantity: { type: 'number', description: 'Hours worked' },
        outputQuantity: { type: 'number', description: 'Material quantity used' },
      },
      required: ['containerId', 'id'],
    },
  },
  {
    name: 'delete_timesheet',
    description: 'Delete a timesheet',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Timesheet ID' },
      },
      required: ['containerId', 'id'],
    },
  },

  // ── Performance Tracking Items ────────────────────────────────────────────────
  {
    name: 'list_performance_tracking_items',
    description: 'List all performance tracking items in a project',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_id: { type: 'string', description: 'Filter by tracking item IDs (comma-separated)' },
        filter_budgetId: { type: 'string', description: 'Filter by budget IDs (comma-separated, use "blank" for items not linked to budget)' },
        filter_budgetCode: { type: 'string', description: 'Filter by budget codes (comma-separated)' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'create_performance_tracking_item',
    description: 'Create a performance tracking item from a budget',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        budgetId: { type: 'string', description: 'Budget ID (required)' },
      },
      required: ['containerId', 'budgetId'],
    },
  },
  {
    name: 'get_performance_tracking_item',
    description: 'Get a single performance tracking item by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Performance tracking item ID' },
      },
      required: ['containerId', 'id'],
    },
  },
  {
    name: 'delete_performance_tracking_item',
    description: 'Delete a performance tracking item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Performance tracking item ID' },
      },
      required: ['containerId', 'id'],
    },
  },

  // ── Performance Tracking Item Instances ────────────────────────────────────────
  {
    name: 'list_performance_tracking_item_instances',
    description: 'List all performance tracking item instances in a project',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_id: { type: 'string', description: 'Filter by instance IDs (comma-separated)' },
        filter_budgetId: { type: 'string', description: 'Filter by budget IDs (comma-separated, use "blank" for items not linked to budget)' },
        filter_budgetCode: { type: 'string', description: 'Filter by budget codes (comma-separated)' },
        filter_number: { type: 'string', description: 'Filter by instance sequence numbers (comma-separated)' },
        filter_name: { type: 'string', description: 'Filter by instance names (comma-separated)' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'create_performance_tracking_item_instance',
    description: 'Create a new performance tracking item instance',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        budgetId: { type: 'string', description: 'Budget ID (required)' },
        number: { type: 'string', description: 'Instance number/code' },
        name: { type: 'string', description: 'Instance name' },
        inputUnit: { type: 'string', description: 'Input unit (should be hr)' },
        inputQuantity: { type: 'number', description: 'Input quantity (required)' },
        inputUnitPrice: { type: 'number', description: 'Input unit price (required)' },
        outputUnit: { type: 'string', description: 'Output unit' },
        outputQuantity: { type: 'number', description: 'Output quantity (required)' },
        outputUnitPrice: { type: 'number', description: 'Output unit price (required)' },
        trackedInputQuantity: { type: 'number', description: 'Reported hours worked' },
        trackedOutputQuantity: { type: 'number', description: 'Reported material quantity used' },
        adjustedOutputQuantity: { type: 'number', description: 'Overriding output quantity for scope changes' },
        locations: {
          type: 'array',
          description: 'Location IDs where item applies',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'budgetId', 'inputQuantity', 'inputUnitPrice', 'outputQuantity', 'outputUnitPrice'],
    },
  },
  {
    name: 'get_performance_tracking_item_instance',
    description: 'Get a single performance tracking item instance by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Performance tracking item instance ID' },
      },
      required: ['containerId', 'id'],
    },
  },
  {
    name: 'update_performance_tracking_item_instance',
    description: 'Update a performance tracking item instance',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Performance tracking item instance ID' },
        number: { type: 'string', description: 'Instance number/code' },
        name: { type: 'string', description: 'Instance name' },
        inputUnit: { type: 'string', description: 'Input unit' },
        inputQuantity: { type: 'number', description: 'Input quantity' },
        inputUnitPrice: { type: 'number', description: 'Input unit price' },
        outputUnit: { type: 'string', description: 'Output unit' },
        outputQuantity: { type: 'number', description: 'Output quantity' },
        outputUnitPrice: { type: 'number', description: 'Output unit price' },
        trackedInputQuantity: { type: 'number', description: 'Reported hours worked' },
        trackedOutputQuantity: { type: 'number', description: 'Reported material quantity used' },
        adjustedOutputQuantity: { type: 'number', description: 'Overriding output quantity for scope changes' },
        lockedFields: { type: 'string', description: 'Locked field name (plannedTotal)' },
        locations: {
          type: 'array',
          description: 'Location IDs where item applies',
          items: { type: 'string' },
        },
      },
      required: ['containerId', 'id'],
    },
  },
  {
    name: 'delete_performance_tracking_item_instance',
    description: 'Delete a performance tracking item instance',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Performance tracking item instance ID' },
      },
      required: ['containerId', 'id'],
    },
  },

  // ── Workflows ────────────────────────────────────────────────────────────────
  {
    name: 'list_workflow_action_histories',
    description: 'List action history records for workflow execution on cost items',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_associationId: { type: 'string', description: 'Object IDs (comma-separated), e.g., contract or cost item IDs (required)' },
        filter_associationType: { type: 'string',
          enum: ['Contract', 'Payment', 'BudgetPayment', 'CostPayment', 'Expense', 'PCO', 'OCO', 'SCO', 'RCO', 'RFQ', 'DistributionItem'],
          description: 'Type of object associated with action history (required)',
        },
        filter_type: { type: 'string',
          enum: ['Approval', 'Normal'],
          description: 'Filter by action history type (Approval or Normal)',
        },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., createdAt desc)' },
        cursorState: { type: 'string', description: 'Cursor token for pagination' },
      },
      required: ['containerId', 'filter_associationId', 'filter_associationType'],
    },
  },

  // ── Attribute Definitions ─────────────────────────────────────────────────────
  {
    name: 'list_attribute_definitions',
    description: 'List all attribute definitions in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_name: { type: 'string', description: 'Filter by attribute name' },
        filter_associationId: { type: 'string', description: 'Filter by associated item IDs (comma-separated)' },
        filter_associationType: { type: 'string', enum: ['Budget', 'Contract', 'CostItem', 'FormDefinition', 'Payment', 'BudgetPayment', 'Expense', 'ExpenseItem'], description: 'Filter by associated item type' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
      },
      required: ['containerId'],
    },
  },

  // ── Attribute Values ───────────────────────────────────────────────────────────
  {
    name: 'batch_update_attribute_values',
    description: 'Batch update custom attribute values for items',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        updates: {
          type: 'array',
          description: 'Array of attribute value updates',
          items: {
            type: 'object',
            properties: {
              associationId: { type: 'string', description: 'Item ID (required)' },
              associationType: {
                type: 'string',
                enum: ['Budget', 'Contract', 'ScheduleOfValue', 'FormInstance', 'CostItem', 'Payment', 'MainContract', 'BudgetPayment', 'Expense', 'CostPayment', 'ExpenseItem', 'PaymentItem', 'OCO', 'RCO', 'SCO', 'PCO', 'RFQ', 'DistributionItem', 'BudgetTransfer', 'Fee'],
                description: 'Item type (required)',
              },
              propertyDefinitionId: { type: 'string', description: 'Custom attribute definition ID (required)' },
              value: { description: 'Attribute value - string, number, boolean, or null (required)' },
            },
          },
        },
      },
      required: ['containerId', 'updates'],
    },
  },

  // ── Budget Code Segment Values ─────────────────────────────────────────────────
  {
    name: 'list_segment_values',
    description: 'List all budget code segment values in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_segmentId: { type: 'string', description: 'Filter by segment IDs (comma-separated)' },
        filter_code: { type: 'string', description: 'Filter by codes (comma-separated, must be in double quotes)' },
        filter_originalCode: { type: 'string', description: 'Filter by original codes with delimiters (comma-separated)' },
        filter_id: { type: 'string', description: 'Filter by segment value IDs (comma-separated)' },
        filter_parentId: { type: 'string', description: 'Filter by parent segment IDs (comma-separated) or "blank" for no parent' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
        cursorState: { type: 'string', description: 'Cursor token for pagination' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'get_segment_values',
    description: 'Get all budget code segment values for a specific segment',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        segmentId: { type: 'string', description: 'Segment ID' },
        filter_code: { type: 'string', description: 'Filter by codes (comma-separated, must be in double quotes)' },
        filter_originalCode: { type: 'string', description: 'Filter by original codes with delimiters (comma-separated)' },
        filter_parentId: { type: 'string', description: 'Filter by parent segment IDs (comma-separated) or "blank" for no parent' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId', 'segmentId'],
    },
  },
  {
    name: 'create_segment_value',
    description: 'Create a new budget code segment value',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        segmentId: { type: 'string', description: 'Segment ID' },
        code: { type: 'string', description: 'Display code (max 255 chars)' },
        description: { type: 'string', description: 'Description (max 2048 chars)' },
        id: { type: 'string', description: 'UUID for the code (optional)' },
        parentId: { type: 'string', description: 'Parent ID if this is a sub-item (optional)' },
        originalCode: { type: 'string', description: 'Original value before delimiters removed (optional)' },
      },
      required: ['containerId', 'segmentId', 'code', 'description'],
    },
  },
  {
    name: 'import_segment_values',
    description: 'Import budget code segment value definitions into a segment',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        segmentId: { type: 'string', description: 'Segment ID' },
        data: {
          type: 'array',
          description: 'Array of segment value objects to import',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'UUID for the code' },
              code: { type: 'string', description: 'Display code' },
              description: { type: 'string', description: 'Description' },
              parentId: { type: 'string', description: 'Parent ID (optional)' },
              originalCode: { type: 'string', description: 'Original value before delimiters removed (optional)' },
            },
          },
        },
        append: { type: 'boolean', description: 'true=append to existing, false=replace existing (default: false)' },
      },
      required: ['containerId', 'segmentId', 'data'],
    },
  },
  {
    name: 'get_segment_value',
    description: 'Get a single budget code segment value by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        segmentId: { type: 'string', description: 'Segment ID' },
        valueId: { type: 'string', description: 'Segment value ID' },
      },
      required: ['containerId', 'segmentId', 'valueId'],
    },
  },
  {
    name: 'update_segment_value',
    description: 'Update a budget code segment value by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        segmentId: { type: 'string', description: 'Segment ID' },
        valueId: { type: 'string', description: 'Segment value ID' },
        code: { type: 'string', description: 'Display code (max 255 chars)' },
        description: { type: 'string', description: 'Description (max 2048 chars)' },
        originalCode: { type: 'string', description: 'Original value before delimiters removed (optional)' },
      },
      required: ['containerId', 'segmentId', 'valueId'],
    },
  },
  {
    name: 'delete_segment_value',
    description: 'Delete a budget code segment value by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        segmentId: { type: 'string', description: 'Segment ID' },
        valueId: { type: 'string', description: 'Segment value ID' },
      },
      required: ['containerId', 'segmentId', 'valueId'],
    },
  },

  // ── Budget Code Segments ────────────────────────────────────────────────────────
  {
    name: 'list_segments',
    description: 'List all segments in a budget code template',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        templateId: { type: 'string', description: 'Budget code template ID' },
        filter_name: { type: 'string', description: 'Filter by segment name (max 255 chars)' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        offset: { type: 'number', description: 'Pagination offset (default: 0)' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId', 'templateId'],
    },
  },
  {
    name: 'create_segment',
    description: 'Create a new segment in a budget code template',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        templateId: { type: 'string', description: 'Budget code template ID' },
        name: { type: 'string', description: 'Segment name (max 1024 chars)' },
        type: { type: 'string', enum: ['code', 'column', 'info'], description: 'Segment type (default: code)' },
        delimiter: { type: 'string', enum: ['none', 'space', 'point', 'hyphen', 'underscore', 'tab'], description: 'Delimiter (default: none)' },
        length: { type: 'number', description: 'Characters allowed (1-100, default: 100)' },
        isVariableLength: { type: 'boolean', description: 'Whether segment is flexible length (default: false)' },
        position: { type: 'number', description: 'Order in the budget code template' },
        sampleCode: { type: 'string', description: 'Code sample for demonstration' },
      },
      required: ['containerId', 'templateId', 'name'],
    },
  },
  {
    name: 'get_segment',
    description: 'Get a segment by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        templateId: { type: 'string', description: 'Budget code template ID' },
        segmentId: { type: 'string', description: 'Segment ID' },
      },
      required: ['containerId', 'templateId', 'segmentId'],
    },
  },
  {
    name: 'update_segment',
    description: 'Update a segment by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        templateId: { type: 'string', description: 'Budget code template ID' },
        segmentId: { type: 'string', description: 'Segment ID' },
        name: { type: 'string', description: 'Segment name (max 1024 chars)' },
        type: { type: 'string', enum: ['code', 'column', 'info'], description: 'Segment type' },
        delimiter: { type: 'string', enum: ['none', 'space', 'point', 'hyphen', 'underscore', 'tab'], description: 'Delimiter' },
        length: { type: 'number', description: 'Characters allowed (1-100)' },
        sampleCode: { type: 'string', description: 'Code sample for demonstration' },
        isLocked: { type: 'boolean', description: 'Lock status of the segment' },
        force: { type: 'boolean', description: 'Force delete segment values when length changes (query param)' },
      },
      required: ['containerId', 'templateId', 'segmentId'],
    },
  },
  {
    name: 'delete_segment',
    description: 'Delete a segment by ID',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        templateId: { type: 'string', description: 'Budget code template ID' },
        segmentId: { type: 'string', description: 'Segment ID' },
      },
      required: ['containerId', 'templateId', 'segmentId'],
    },
  },

  // ── Budget Code Templates ───────────────────────────────────────────────────────
  {
    name: 'list_templates',
    description: 'List all budget code templates in a project (typically one per project)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
      },
      required: ['containerId'],
    },
  },

  // ── Cost Items - Change Orders ──────────────────────────────────────────────────
  {
    name: 'attach_cost_items',
    description: 'Attach existing cost items to a change order',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        items: {
          type: 'array',
          description: 'Array of cost item attachment objects',
          items: {
            type: 'object',
            properties: {
              changeOrderId: { type: 'string', description: 'Change order ID' },
              costItemId: { type: 'string', description: 'Cost item ID' },
            },
            required: ['changeOrderId', 'costItemId'],
          },
        },
      },
      required: ['containerId', 'items'],
    },
  },
  {
    name: 'detach_cost_items',
    description: 'Remove cost items from a change order',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        items: {
          type: 'array',
          description: 'Array of cost item detachment objects',
          items: {
            type: 'object',
            properties: {
              changeOrderId: { type: 'string', description: 'Change order ID' },
              costItemId: { type: 'string', description: 'Cost item ID' },
            },
            required: ['changeOrderId', 'costItemId'],
          },
        },
      },
      required: ['containerId', 'items'],
    },
  },

  // ── Actions ────────────────────────────────────────────────────────────────────
  {
    name: 'perform_action',
    description: 'Perform a specified action on an item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        actions: {
          type: 'array',
          description: 'Array of actions to perform',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string', description: 'Action name (required)' },
              associationId: { type: 'string', description: 'Item ID (required)' },
              associationType: {
                type: 'string',
                enum: ['FormInstance', 'OCO', 'PCO', 'RCO', 'RFQ', 'SCO', 'Expense', 'Contract', 'CostPayment', 'BudgetPayment', 'BudgetTransfer', 'MainContract', 'DistributionItem'],
                description: 'Item type (required)',
              },
              options: { type: 'object', description: 'Extra data required by the action' },
            },
          },
        },
      },
      required: ['containerId', 'actions'],
    },
  },
  {
    name: 'list_available_actions',
    description: 'List actions that can execute on an item based on its current state',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        associationType: {
          type: 'string',
          enum: ['FormInstance', 'CostItem', 'OCO', 'PCO', 'RCO', 'RFQ', 'SCO', 'Expense', 'Contract', 'CostPayment', 'BudgetPayment', 'BudgetTransfer', 'MainContract'],
          description: 'Item type',
        },
        associationId: { type: 'string', description: 'Item ID' },
      },
      required: ['containerId', 'associationType', 'associationId'],
    },
  },

  // ── Attachments ────────────────────────────────────────────────────────────────
  {
    name: 'list_attachments',
    description: 'List all attachments in a cost container',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        filter_associationId: { type: 'string', description: 'Filter by associated item IDs (comma-separated)' },
        filter_associationType: { type: 'string', enum: ['Budget', 'Contract', 'CostItem', 'FormInstance', 'CostPayment', 'BudgetPayment', 'Expense', 'ExpenseItem'], description: 'Filter by associated item type' },
        filter_lastModifiedSince: { type: 'string', description: 'Filter by last modified date (ISO 8601)' },
        include: { type: 'string', description: 'Include nested resources (e.g., complianceRequirement)' },
        offset: { type: 'number', description: 'Pagination offset' },
        limit: { type: 'number', description: 'Max results per page (default: 100)' },
        sort: { type: 'string', description: 'Sort order (e.g., name asc)' },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'create_attachment',
    description: 'Create an attachment for an item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        id: { type: 'string', description: 'Attachment ID' },
        type: { type: 'string', enum: ['Upload', 'DocsFile', 'Reference', 'Document'], description: 'Attachment type' },
        name: { type: 'string', description: 'Attachment name (required)' },
        folderId: { type: 'string', description: 'Folder ID' },
        urn: { type: 'string', description: 'File version URN from BIM 360 Docs' },
        templateId: { type: 'string', description: 'Document template ID' },
        associationId: { type: 'string', description: 'Item ID (required)' },
        associationType: {
          type: 'string',
          enum: ['Budget', 'Contract', 'ScheduleOfValue', 'FormInstance', 'CostItem', 'Payment', 'MainContract', 'BudgetPayment', 'Expense', 'CostPayment', 'ExpenseItem', 'PaymentItem', 'OCO', 'RCO', 'SCO', 'PCO', 'RFQ', 'DistributionItem', 'BudgetTransfer', 'Fee'],
          description: 'Item type (required)',
        },
      },
      required: ['containerId', 'name', 'associationId', 'associationType'],
    },
  },
  {
    name: 'create_attachments_batch',
    description: 'Batch create attachments',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        attachments: {
          type: 'array',
          description: 'Array of attachment objects',
          items: { type: 'object' },
        },
      },
      required: ['containerId', 'attachments'],
    },
  },
  {
    name: 'delete_attachment',
    description: 'Delete an attachment (returns 204 No Content)',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        attachmentId: { type: 'string', description: 'Attachment ID' },
      },
      required: ['containerId', 'attachmentId'],
    },
  },
  {
    name: 'create_attachment_folder',
    description: 'Create or find an attachment folder for an item',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: { type: 'string', description: 'Cost container ID (GUID)' },
        associationId: { type: 'string', description: 'Item ID (required)' },
        associationType: {
          type: 'string',
          enum: ['Budget', 'Contract', 'FormInstance', 'CostItem', 'Payment', 'MainContract', 'BudgetPayment'],
          description: 'Item type (required)',
        },
      },
      required: ['containerId', 'associationId', 'associationType'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleCostTool(name, args) {
  const base = `/cost/v1/containers/${args.containerId}`;

  switch (name) {
    // ── Budgets ────────────────────────────────────────────────────────────────
    case 'list_budgets': {
      const { include, limit, offset, sort, ...filters } = args;
      let path = `${base}/budgets?offset=${offset || 0}&limit=${limit || 100}`;

      if (include && Array.isArray(include) && include.length > 0) {
        path += `&include=${include.join(',')}`;
      }

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_budget': {
      const { include } = args;
      let path = `${base}/budgets/${args.budgetId}`;
      if (include && Array.isArray(include) && include.length > 0) {
        path += `?include=${include.join(',')}`;
      }
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_budget': {
      const { containerId, force, ...budgetFields } = args;
      const body = {};
      const fields = ['code', 'name', 'description', 'quantity', 'inputQuantity', 'unitPrice', 'unit', 'scope', 'parentId', 'segmentCodeMap', 'locations', 'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'];
      fields.forEach(field => {
        if (budgetFields[field] !== undefined) body[field] = budgetFields[field];
      });

      let path = `${base}/budgets`;
      if (force !== undefined) path += `?force=${force}`;

      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'import_budgets': {
      const { containerId, data, append, force } = args;
      const body = { data };
      if (append !== undefined) body.append = append;

      let path = `${base}/budgets:import`;
      if (force !== undefined) path += `?force=${force}`;

      const result = await apiRequest('POST', path, body);
      if (result === null) return { success: true, message: 'Budgets imported' };
      if (typeof result === 'string') return result;
      return result;
    }

    case 'update_budget': {
      const { containerId, budgetId, force, ...budgetFields } = args;
      const body = {};
      const fields = ['code', 'name', 'description', 'quantity', 'inputQuantity', 'unitPrice', 'actualQuantity', 'actualUnitPrice', 'actualCost', 'unit', 'lockedField', 'segmentCodeMap', 'locations', 'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'];
      fields.forEach(field => {
        if (budgetFields[field] !== undefined) body[field] = budgetFields[field];
      });

      let path = `${base}/budgets/${budgetId}`;
      if (force !== undefined) path += `?force=${force}`;

      const data = await apiRequest('PATCH', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_budget': {
      const { containerId, budgetId, force } = args;
      let path = `${base}/budgets/${budgetId}`;
      if (force !== undefined) path += `?force=${force}`;

      const result = await apiRequest('DELETE', path);
      if (result === null) return { success: true, message: 'Budget deleted' };
      if (typeof result === 'string') return result;
      return result;
    }

    // ── Contracts ──────────────────────────────────────────────────────────────
    case 'list_contracts': {
      const { limit, offset, sort, include, ...filters } = args;
      let path = `${base}/contracts?offset=${offset || 0}&limit=${limit || 50}`;
      if (sort) path += `&sort=${encodeURIComponent(sort)}`;
      if (include) path += `&include=${encodeURIComponent(include)}`;
      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const items = await paginate(async (off, pageSize) => {
        const pageUrl = path.includes('offset=')
          ? path.replace(/offset=\d+/, `offset=${off}`).replace(/limit=\d+/, `limit=${pageSize}`)
          : `${path}&offset=${off}&limit=${pageSize}`;
        const data = await apiRequest('GET', pageUrl);
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);
      return limit ? items.slice(0, limit) : items;
    }

    case 'get_contract': {
      let path = `${base}/contracts/${args.contractId}`;
      if (args.include) path += `?include=${encodeURIComponent(args.include)}`;
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_contract': {
      const { containerId, ...body } = args;
      // Build request body with all optional fields
      const contractBody = {};
      [
        'name', 'code', 'description', 'companyId', 'companyUid', 'type', 'contactId',
        'recipients', 'source', 'additionalContacts', 'signedBy', 'ownerId', 'mainContractId',
        'completedWorkRetentionPercent', 'materialsRetentionPercent', 'retentionCap',
        'status', 'subStatus', 'currency', 'exchangeRate', 'forecastExchangeRate',
        'forecastExchangeRateUpdatedAt', 'awardedAt', 'sentAt', 'respondedAt', 'responseDue',
        'returnedAt', 'onsiteAt', 'offsiteAt', 'procuredAt', 'approvedAt', 'executedAt',
        'internalId', 'internalSystem', 'externalId', 'externalSystem', 'externalMessage',
        'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) contractBody[field] = body[field];
      });

      const data = await apiRequest('POST', `${base}/contracts`, contractBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_contract': {
      const { containerId, contractId, ...body } = args;
      // Build request body with all optional fields
      const contractBody = {};
      [
        'name', 'code', 'description', 'companyId', 'companyUid', 'type', 'contactId',
        'recipients', 'source', 'additionalContacts', 'signedBy', 'ownerId', 'mainContractId',
        'completedWorkRetentionPercent', 'materialsRetentionPercent', 'retentionCap',
        'status', 'subStatus', 'currency', 'exchangeRate', 'forecastExchangeRate',
        'forecastExchangeRateUpdatedAt', 'awardedAt', 'sentAt', 'respondedAt', 'responseDue',
        'returnedAt', 'onsiteAt', 'offsiteAt', 'procuredAt', 'approvedAt', 'executedAt',
        'internalId', 'internalSystem', 'externalId', 'externalSystem', 'externalMessage',
        'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) contractBody[field] = body[field];
      });

      const data = await apiRequest('PATCH', `${base}/contracts/${contractId}`, contractBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_contract': {
      const data = await apiRequest('DELETE', `${base}/contracts/${args.contractId}`);
      if (data === null) return { deleted: true, contractId: args.contractId };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Main Contracts ─────────────────────────────────────────────────────────
    case 'list_main_contracts': {
      const { containerId, limit, offset, sort, include, ...filters } = args;
      let path = `${base}/main-contracts?offset=${offset || 0}&limit=${limit || 100}`;
      if (sort) path += `&sort=${encodeURIComponent(sort)}`;
      if (include && Array.isArray(include) && include.length > 0) {
        path += `&include=${include.join(',')}`;
      }
      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data.results || data;
    }

    case 'create_main_contract': {
      const { containerId, ...body } = args;
      const mcBody = {};
      [
        'code', 'name', 'description', 'note', 'scopeOfWork', 'type', 'contactId',
        'ownerCompanyId', 'ownerContactId', 'architectCompanyId', 'architectContactId',
        'ownerCompanyUid', 'contractorCompanyUid', 'architectCompanyUid', 'notaryCompanyUid',
        'startDate', 'executedDate', 'plannedCompletionDate', 'revisedCompletionDate',
        'actualCompletionDate', 'closeDate', 'status', 'isDefault',
        'completedWorkRetentionPercent', 'materialsRetentionPercent', 'retentionCap',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) mcBody[field] = body[field];
      });
      const data = await apiRequest('POST', `${base}/main-contracts`, mcBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_main_contract': {
      let path = `${base}/main-contracts/${args.id}`;
      if (args.include && Array.isArray(args.include) && args.include.length > 0) {
        path += `?include=${args.include.join(',')}`;
      }
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_main_contract': {
      const { containerId, id, ...body } = args;
      const mcBody = {};
      [
        'code', 'name', 'description', 'note', 'scopeOfWork', 'type', 'contactId',
        'ownerCompanyId', 'ownerContactId', 'architectCompanyId', 'architectContactId',
        'additionalCollaborators',
        'ownerCompanyUid', 'contractorCompanyUid', 'architectCompanyUid', 'notaryCompanyUid',
        'startDate', 'executedDate', 'plannedCompletionDate', 'revisedCompletionDate',
        'actualCompletionDate', 'closeDate', 'status', 'isDefault',
        'completedWorkRetentionPercent', 'materialsRetentionPercent', 'retentionCap',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) mcBody[field] = body[field];
      });
      const data = await apiRequest('PATCH', `${base}/main-contracts/${id}`, mcBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_main_contract': {
      const data = await apiRequest('DELETE', `${base}/main-contracts/${args.id}`);
      if (data === null) return { deleted: true, mainContractId: args.id };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Main Contract Items ─────────────────────────────────────────────────────
    case 'list_main_contract_items': {
      const { containerId, mainContractId, limit, offset, sort, include, ...filters } = args;
      let path = `${base}/main-contracts/${mainContractId}/items?offset=${offset || 0}&limit=${limit || 100}`;
      if (sort) path += `&sort=${encodeURIComponent(sort)}`;
      if (include && Array.isArray(include) && include.length > 0) {
        path += `&include=${include.join(',')}`;
      }
      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data.results || data;
    }

    case 'create_main_contract_item': {
      const { containerId, mainContractId, ...body } = args;
      const itemBody = {};
      [
        'id', 'code', 'name', 'description', 'parentId', 'budgetId',
        'unit', 'unitPrice', 'quantity', 'position',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) itemBody[field] = body[field];
      });
      const data = await apiRequest('POST', `${base}/main-contracts/${mainContractId}/items`, itemBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_main_contract_item': {
      let path = `${base}/main-contracts/${args.mainContractId}/items/${args.id}`;
      if (args.include && Array.isArray(args.include) && args.include.length > 0) {
        path += `?include=${args.include.join(',')}`;
      }
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_main_contract_item': {
      const { containerId, mainContractId, id, ...body } = args;
      const itemBody = {};
      [
        'code', 'name', 'description', 'unit', 'lockedField',
        'unitPrice', 'quantity', 'amount', 'position',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) itemBody[field] = body[field];
      });
      const data = await apiRequest('PATCH', `${base}/main-contracts/${mainContractId}/items/${id}`, itemBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_main_contract_item': {
      const data = await apiRequest('DELETE', `${base}/main-contracts/${args.mainContractId}/items/${args.id}`);
      if (data === null) return { deleted: true, mainContractItemId: args.id };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Change Orders ──────────────────────────────────────────────────────────
    case 'list_change_order_types': {
      const data = await apiRequest('GET', `${base}/change-orders`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_change_orders_by_type': {
      const { changeOrder, limit, offset, sort, include, ...filters } = args;
      let path = `${base}/change-orders/${changeOrder}?offset=${offset || 0}&limit=${limit || 50}`;
      if (sort) path += `&sort=${encodeURIComponent(sort)}`;
      if (include) path += `&include=${encodeURIComponent(include)}`;
      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const items = await paginate(async (off, pageSize) => {
        const pageUrl = path.replace(/offset=\d+/, `offset=${off}`).replace(/limit=\d+/, `limit=${pageSize}`);
        const data = await apiRequest('GET', pageUrl);
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);
      return limit ? items.slice(0, limit) : items;
    }

    case 'create_change_order': {
      const { containerId, changeOrder, ...body } = args;
      const coBody = {};
      [
        'name', 'description', 'scope', 'scopeOfWork', 'type', 'note', 'sourceType', 'sourceRef',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) coBody[field] = body[field];
      });

      const data = await apiRequest('POST', `${base}/change-orders/${changeOrder}`, coBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_change_order': {
      let path = `${base}/change-orders/${args.changeOrder}/${args.id}`;
      if (args.include) path += `?include=${encodeURIComponent(args.include)}`;
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_change_order': {
      const { containerId, changeOrder, id, ...body } = args;
      const coBody = {};
      [
        'name', 'description', 'type', 'scope', 'scheduleChange', 'proposedRevisedCompletionDate',
        'ownerId', 'scopeOfWork', 'note', 'exchangeRate', 'companyId', 'companyUid',
        'architectCompanyId', 'architectCompanyUid', 'architectContactId', 'additionalCollaborators',
        'sourceType', 'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) coBody[field] = body[field];
      });

      const data = await apiRequest('PATCH', `${base}/change-orders/${changeOrder}/${id}`, coBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_change_order': {
      const data = await apiRequest('DELETE', `${base}/change-orders/${args.changeOrder}/${args.id}`);
      if (data === null) return { deleted: true, changeOrderId: args.id };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Cost Items ─────────────────────────────────────────────────────────────
    case 'list_cost_items': {
      const { limit, offset, sort, include, ...filters } = args;
      let path = `${base}/cost-items?offset=${offset || 0}&limit=${limit || 50}`;
      if (sort) path += `&sort=${encodeURIComponent(sort)}`;
      if (include) path += `&include=${encodeURIComponent(include)}`;
      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const items = await paginate(async (off, pageSize) => {
        const pageUrl = path.replace(/offset=\d+/, `offset=${off}`).replace(/limit=\d+/, `limit=${pageSize}`);
        const data = await apiRequest('GET', pageUrl);
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);
      return limit ? items.slice(0, limit) : items;
    }

    case 'get_cost_item': {
      let path = `${base}/cost-items/${args.costItemId}`;
      if (args.include) path += `?include=${encodeURIComponent(args.include)}`;
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_cost_item': {
      const { containerId, ...body } = args;
      const ciBody = {};
      [
        'name', 'changeOrderId', 'budgetId', 'contractId', 'description',
        'estimated', 'proposed', 'submitted', 'approved', 'committed',
        'inputQuantity', 'quantity', 'unit', 'proposedExchangeRate', 'committedExchangeRate',
        'locations', 'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) ciBody[field] = body[field];
      });

      const data = await apiRequest('POST', `${base}/cost-items`, ciBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_cost_items_batch': {
      const data = await apiRequest('POST', `${base}/cost-items:batch-create`, { data: args.data });
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_cost_item': {
      const { containerId, costItemId, ...body } = args;
      const ciBody = {};
      [
        'name', 'description', 'type', 'estimated', 'proposed', 'submitted', 'approved', 'committed',
        'inputQuantity', 'quantity', 'unit', 'budgetId', 'contractId',
        'proposedExchangeRate', 'committedExchangeRate', 'budgetTransferItemId',
        'locations', 'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) ciBody[field] = body[field];
      });

      const data = await apiRequest('PATCH', `${base}/cost-items/${costItemId}`, ciBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_cost_item': {
      const data = await apiRequest('DELETE', `${base}/cost-items/${args.costItemId}`);
      if (data === null) return { deleted: true, costItemId: args.costItemId };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Expenses ───────────────────────────────────────────────────────────────
    case 'list_expenses': {
      const { limit, offset } = args;
      const items = await paginate(async (off, pageSize) => {
        const data = await apiRequest(
          'GET',
          `${base}/expenses?offset=${off}&limit=${pageSize}`,
        );
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 50);
      return limit ? items.slice(0, limit) : items;
    }

    case 'get_expense': {
      const data = await apiRequest('GET', `${base}/expenses/${args.expenseId}`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_expense': {
      const { containerId, ...body } = args;
      const expenseBody = {};
      [
        'name', 'budgetPaymentId', 'supplierId', 'supplierCompanyUid', 'supplierName',
        'description', 'note', 'term', 'referenceNumber', 'type', 'scope', 'purchasedBy',
        'status', 'paymentDue', 'issuedAt', 'receivedAt', 'mainContractId',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) expenseBody[field] = body[field];
      });

      const data = await apiRequest('POST', `${base}/expenses`, expenseBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_expense': {
      const { containerId, expenseId, ...body } = args;
      const expenseBody = {};
      [
        'name', 'budgetPaymentId', 'supplierId', 'supplierCompanyUid', 'supplierName',
        'description', 'note', 'term', 'referenceNumber', 'type', 'scope', 'purchasedBy',
        'status', 'paymentDue', 'issuedAt', 'receivedAt', 'mainContractId',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) expenseBody[field] = body[field];
      });

      const data = await apiRequest('PATCH', `${base}/expenses/${expenseId}`, expenseBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_expense': {
      const data = await apiRequest('DELETE', `${base}/expenses/${args.expenseId}`);
      if (data === null) return { deleted: true, expenseId: args.expenseId };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Expense Items ──────────────────────────────────────────────────────────
    case 'list_expense_items': {
      const { containerId, expenseId, limit, offset, sort, include, ...filters } = args;
      let path = `${base}/expenses/${expenseId}/items?offset=${offset || 0}&limit=${limit || 100}`;
      if (sort) path += `&sort=${encodeURIComponent(sort)}`;
      if (include && Array.isArray(include) && include.length > 0) {
        path += `&include=${include.join(',')}`;
      }
      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data.results || data;
    }

    case 'create_expense_item': {
      const { containerId, expenseId, ...body } = args;
      const itemBody = {};
      [
        'id', 'budgetId', 'budgetCode', 'contractId', 'number', 'name', 'description', 'note',
        'scope', 'quantity', 'unitPrice', 'unit', 'amount', 'exchangeRate',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) itemBody[field] = body[field];
      });
      const data = await apiRequest('POST', `${base}/expenses/${expenseId}/items`, itemBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_expense_item': {
      let path = `${base}/expenses/${args.expenseId}/items/${args.id}`;
      if (args.include && Array.isArray(args.include) && args.include.length > 0) {
        path += `?include=${args.include.join(',')}`;
      }
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_expense_item': {
      const { containerId, expenseId, id, ...body } = args;
      const itemBody = {};
      [
        'name', 'number', 'budgetId', 'contractId', 'description', 'note',
        'scope', 'quantity', 'unitPrice', 'unit', 'amount', 'lockedField', 'aggregateBy', 'exchangeRate',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime', 'integrationState'
      ].forEach(field => {
        if (body[field] !== undefined) itemBody[field] = body[field];
      });
      const data = await apiRequest('PATCH', `${base}/expenses/${expenseId}/items/${id}`, itemBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_expense_item': {
      const data = await apiRequest('DELETE', `${base}/expenses/${args.expenseId}/items/${args.id}`);
      if (data === null) return { deleted: true, expenseItemId: args.id };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Budgets-Contracts ──────────────────────────────────────────────────────
    case 'link_budgets_contracts': {
      const body = {};
      if (args.create) body.create = args.create;
      if (args.remove) body.remove = args.remove;

      const data = await apiRequest('POST', `${base}/budgets-contracts:link`, body);
      if (data === null) return { success: true, message: 'Budgets-contracts linked/unlinked' };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Change Order and Cost Items ────────────────────────────────────────────
    case 'attach_cost_items_to_change_order': {
      const data = await apiRequest('POST', `${base}/cost-items:attach`, args.attachments);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'detach_cost_items_from_change_order': {
      const data = await apiRequest('POST', `${base}/cost-items:detach`, args.detachments);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Documents ──────────────────────────────────────────────────────────────
    case 'get_documents': {
      let path = `${base}/documents?associationId=${encodeURIComponent(args.associationId)}&associationType=${args.associationType}`;
      if (args['filter_latest'] !== undefined) path += `&filter[latest]=${args['filter_latest']}`;
      if (args['filter_signed'] !== undefined) path += `&filter[signed]=${args['filter_signed']}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Payments ───────────────────────────────────────────────────────────────
    case 'list_payments': {
      const { containerId, offset: pageOffset, limit: pageLimit, sort, include, ...filters } = args;
      let path = `${base}/payments?offset=${pageOffset || 0}&limit=${pageLimit || 100}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      if (include && Array.isArray(include) && include.length > 0) {
        path += `&include=${include.join(',')}`;
      }

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_payment_items': {
      const { containerId, offset: pageOffset, limit: pageLimit, sort, ...filters } = args;
      let path = `${base}/payment-items?offset=${pageOffset || 0}&limit=${pageLimit || 100}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Schedule of Values ─────────────────────────────────────────────────────
    case 'list_schedule_of_values': {
      const { containerId, offset: pageOffset, limit: pageLimit, sort, include, ...filters } = args;
      let path = `${base}/schedule-of-values?offset=${pageOffset || 0}&limit=${pageLimit || 100}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          if (key === 'filter_includeChangeOrders') {
            path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${val === true ? 'true' : 'false'}`;
          } else {
            path += `&${key}=${encodeURIComponent(val)}`;
          }
        }
      });

      if (include && Array.isArray(include) && include.length > 0) {
        path += `&include=${include.join(',')}`;
      }

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_schedule_of_values': {
      const { containerId, parentId, code, name, ...body } = args;
      const sovBody = { parentId, code, name };

      [
        'id', 'contractId', 'budgetId', 'quantity', 'unitPrice', 'unit', 'amount',
        'quantityPerBulk', 'bulkUnitPrice', 'bulk', 'exchangeRate', 'position',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime'
      ].forEach(field => {
        if (body[field] !== undefined) sovBody[field] = body[field];
      });

      const data = await apiRequest('POST', `${base}/schedule-of-values`, sovBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_schedule_of_values': {
      const { containerId, id, include } = args;
      let path = `${base}/schedule-of-values/${id}`;

      if (include && Array.isArray(include) && include.length > 0) {
        path += `?include=${include.join(',')}`;
      }

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_schedule_of_values': {
      const { containerId, id, ...body } = args;
      const sovBody = {};

      [
        'code', 'name', 'quantity', 'unitPrice', 'unit', 'amount', 'lockedField',
        'quantityPerBulk', 'exchangeRate', 'position',
        'externalId', 'externalSystem', 'externalMessage', 'lastSyncTime'
      ].forEach(field => {
        if (body[field] !== undefined) sovBody[field] = body[field];
      });

      const data = await apiRequest('PATCH', `${base}/schedule-of-values/${id}`, sovBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_schedule_of_values': {
      const data = await apiRequest('DELETE', `${base}/schedule-of-values/${args.id}`);
      if (data === null) return { deleted: true, sovId: args.id };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Sub Cost Items ────────────────────────────────────────────────────────────
    case 'list_sub_cost_items': {
      const { containerId, costItemId, offset: pageOffset, limit: pageLimit, sort, ...filters } = args;
      let path = `${base}/cost-items/${costItemId}/sub-cost-items?offset=${pageOffset || 0}&limit=${pageLimit || 100}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_sub_cost_item': {
      const { containerId, costItemId, code, ...body } = args;
      const scBody = { code };

      [
        'parentId', 'type', 'name', 'quantity', 'inputQuantity', 'unitPrice', 'unit',
        'value', 'position'
      ].forEach(field => {
        if (body[field] !== undefined) scBody[field] = body[field];
      });

      const data = await apiRequest('POST', `${base}/cost-items/${costItemId}/sub-cost-items`, scBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'copy_sub_cost_items': {
      const { containerId, costItemId, from, to, sourceIds } = args;
      const copyBody = {
        from,
        to,
        source: { ids: sourceIds }
      };

      const data = await apiRequest('POST', `${base}/cost-items/${costItemId}/sub-cost-items:copy`, copyBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_sub_cost_item': {
      const { containerId, costItemId, id, ...body } = args;
      const scBody = {};

      [
        'code', 'name', 'lockedField', 'quantity', 'inputQuantity', 'unitPrice', 'unit', 'value'
      ].forEach(field => {
        if (body[field] !== undefined) scBody[field] = body[field];
      });

      const data = await apiRequest('PATCH', `${base}/cost-items/${costItemId}/sub-cost-items/${id}`, scBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_sub_cost_item': {
      const data = await apiRequest('DELETE', `${base}/cost-items/${args.costItemId}/sub-cost-items/${args.id}`);
      if (data === null) return { deleted: true, subCostItemId: args.id };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Taxes ────────────────────────────────────────────────────────────────────
    case 'list_taxes': {
      const { containerId, offset: pageOffset, limit: pageLimit, sort, ...filters } = args;
      let path = `${base}/taxes?offset=${pageOffset || 0}&limit=${pageLimit || 100}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Timesheets ────────────────────────────────────────────────────────────────
    case 'list_timesheets': {
      const { containerId, offset: pageOffset, limit: pageLimit, sort, include, ...filters } = args;
      let path = `${base}/time-sheets?offset=${pageOffset || 0}&limit=${pageLimit || 100}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      if (include && Array.isArray(include) && include.length > 0) {
        path += `&include=${include.join(',')}`;
      }

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_timesheet': {
      const { containerId, trackingItemInstanceId, trackingItemInstanceNumber, budgetCode, endDate, inputQuantity, outputQuantity, ...body } = args;
      const tsBody = { endDate, inputQuantity, outputQuantity };

      if (trackingItemInstanceId !== undefined) tsBody.trackingItemInstanceId = trackingItemInstanceId;
      if (trackingItemInstanceNumber !== undefined) tsBody.trackingItemInstanceNumber = trackingItemInstanceNumber;
      if (budgetCode !== undefined) tsBody.budgetCode = budgetCode;
      if (body.startDate !== undefined) tsBody.startDate = body.startDate;

      const data = await apiRequest('POST', `${base}/time-sheets`, tsBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_timesheet': {
      const data = await apiRequest('GET', `${base}/time-sheets/${args.id}`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_timesheet': {
      const { containerId, id, ...body } = args;
      const tsBody = {};

      [
        'trackingItemInstanceId', 'trackingItemInstanceNumber', 'budgetCode',
        'startDate', 'endDate', 'inputQuantity', 'outputQuantity'
      ].forEach(field => {
        if (body[field] !== undefined) tsBody[field] = body[field];
      });

      const data = await apiRequest('PATCH', `${base}/time-sheets/${id}`, tsBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_timesheet': {
      const data = await apiRequest('DELETE', `${base}/time-sheets/${args.id}`);
      if (data === null) return { deleted: true, timesheetId: args.id };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Performance Tracking Items ────────────────────────────────────────────────
    case 'list_performance_tracking_items': {
      const { containerId, offset: pageOffset, limit: pageLimit, sort, ...filters } = args;
      let path = `${base}/performance-tracking-items?offset=${pageOffset || 0}&limit=${pageLimit || 100}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_performance_tracking_item': {
      const { containerId, budgetId } = args;
      const ptBody = { budgetId };

      const data = await apiRequest('POST', `${base}/performance-tracking-items`, ptBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_performance_tracking_item': {
      const data = await apiRequest('GET', `${base}/performance-tracking-items/${args.id}`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_performance_tracking_item': {
      const data = await apiRequest('DELETE', `${base}/performance-tracking-items/${args.id}`);
      if (data === null) return { deleted: true, performanceTrackingItemId: args.id };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Performance Tracking Item Instances ────────────────────────────────────────
    case 'list_performance_tracking_item_instances': {
      const { containerId, offset: pageOffset, limit: pageLimit, sort, ...filters } = args;
      let path = `${base}/performance-tracking-item-instances?offset=${pageOffset || 0}&limit=${pageLimit || 100}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_performance_tracking_item_instance': {
      const { containerId, budgetId, inputQuantity, inputUnitPrice, outputQuantity, outputUnitPrice, ...body } = args;
      const ptiBody = { budgetId, inputQuantity, inputUnitPrice, outputQuantity, outputUnitPrice };

      [
        'number', 'name', 'inputUnit', 'outputUnit', 'trackedInputQuantity', 'trackedOutputQuantity',
        'adjustedOutputQuantity', 'locations'
      ].forEach(field => {
        if (body[field] !== undefined) ptiBody[field] = body[field];
      });

      const data = await apiRequest('POST', `${base}/performance-tracking-item-instances`, ptiBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_performance_tracking_item_instance': {
      const data = await apiRequest('GET', `${base}/performance-tracking-item-instances/${args.id}`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_performance_tracking_item_instance': {
      const { containerId, id, ...body } = args;
      const ptiBody = {};

      [
        'number', 'name', 'inputUnit', 'inputQuantity', 'inputUnitPrice', 'outputUnit',
        'outputQuantity', 'outputUnitPrice', 'trackedInputQuantity', 'trackedOutputQuantity',
        'adjustedOutputQuantity', 'lockedFields', 'locations'
      ].forEach(field => {
        if (body[field] !== undefined) ptiBody[field] = body[field];
      });

      const data = await apiRequest('PATCH', `${base}/performance-tracking-item-instances/${id}`, ptiBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_performance_tracking_item_instance': {
      const data = await apiRequest('DELETE', `${base}/performance-tracking-item-instances/${args.id}`);
      if (data === null) return { deleted: true, performanceTrackingItemInstanceId: args.id };
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Attribute Definitions ─────────────────────────────────────────────────────
    case 'list_attribute_definitions': {
      const { containerId, ...filters } = args;
      let path = `${base}/properties`;
      const filterEntries = Object.entries(filters).filter(([key, val]) => key.startsWith('filter_') && val !== undefined);

      if (filterEntries.length > 0) {
        path += '?' + filterEntries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      }

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Attribute Values ───────────────────────────────────────────────────────────
    case 'batch_update_attribute_values': {
      const data = await apiRequest('POST', `${base}/property-values:batch-update`, args.updates);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Budget Code Segment Values ─────────────────────────────────────────────────
    case 'list_segment_values': {
      const { containerId, limit, sort, cursorState, ...filters } = args;
      let path = `${base}/segment-values`;
      const params = new URLSearchParams();

      if (limit) params.append('limit', limit);
      if (sort) params.append('sort', sort);
      if (cursorState) params.append('cursorState', cursorState);

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          params.append(key, val);
        }
      });

      if (params.size > 0) path += '?' + params.toString();

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_segment_values': {
      const { containerId, segmentId, limit, offset, sort, ...filters } = args;
      let path = `${base}/segments/${segmentId}/values?offset=${offset || 0}&limit=${limit || 100}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_segment_value': {
      const { containerId, segmentId, code, description, id, parentId, originalCode } = args;
      const body = { code, description };
      if (id !== undefined) body.id = id;
      if (parentId !== undefined) body.parentId = parentId;
      if (originalCode !== undefined) body.originalCode = originalCode;
      const data = await apiRequest('POST', `${base}/segments/${segmentId}/values`, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'import_segment_values': {
      const { containerId, segmentId, data, append } = args;
      const body = { data };
      if (append !== undefined) body.append = append;
      const result = await apiRequest('POST', `${base}/segments/${segmentId}/values:import`, body);
      if (typeof result === 'string') return result;
      return result;
    }

    case 'get_segment_value': {
      const { containerId, segmentId, valueId } = args;
      const data = await apiRequest('GET', `${base}/segments/${segmentId}/values/${valueId}`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_segment_value': {
      const { containerId, segmentId, valueId, code, description, originalCode } = args;
      const body = {};
      if (code !== undefined) body.code = code;
      if (description !== undefined) body.description = description;
      if (originalCode !== undefined) body.originalCode = originalCode;
      const data = await apiRequest('PATCH', `${base}/segments/${segmentId}/values/${valueId}`, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_segment_value': {
      const { containerId, segmentId, valueId } = args;
      const result = await apiRequest('DELETE', `${base}/segments/${segmentId}/values/${valueId}`);
      if (result === null) return { success: true, message: 'Segment value deleted' };
      if (typeof result === 'string') return result;
      return result;
    }

    // ── Budget Code Segments ────────────────────────────────────────────────────
    case 'list_segments': {
      const { containerId, templateId, limit, offset, sort, ...filters } = args;
      let path = `${base}/templates/${templateId}/segments?offset=${offset || 0}&limit=${limit || 100}`;

      if (sort) path += `&sort=${encodeURIComponent(sort)}`;

      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_segment': {
      const { containerId, templateId, name, type, delimiter, length, isVariableLength, position, sampleCode } = args;
      const body = { name };
      if (type !== undefined) body.type = type;
      if (delimiter !== undefined) body.delimiter = delimiter;
      if (length !== undefined) body.length = length;
      if (isVariableLength !== undefined) body.isVariableLength = isVariableLength;
      if (position !== undefined) body.position = position;
      if (sampleCode !== undefined) body.sampleCode = sampleCode;
      const data = await apiRequest('POST', `${base}/templates/${templateId}/segments`, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_segment': {
      const { containerId, templateId, segmentId } = args;
      const data = await apiRequest('GET', `${base}/templates/${templateId}/segments/${segmentId}`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_segment': {
      const { containerId, templateId, segmentId, name, type, delimiter, length, sampleCode, isLocked, force } = args;
      const body = {};
      if (name !== undefined) body.name = name;
      if (type !== undefined) body.type = type;
      if (delimiter !== undefined) body.delimiter = delimiter;
      if (length !== undefined) body.length = length;
      if (sampleCode !== undefined) body.sampleCode = sampleCode;
      if (isLocked !== undefined) body.isLocked = isLocked;

      let path = `${base}/templates/${templateId}/segments/${segmentId}`;
      if (force !== undefined) path += `?force=${force}`;

      const data = await apiRequest('PATCH', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_segment': {
      const { containerId, templateId, segmentId } = args;
      const result = await apiRequest('DELETE', `${base}/templates/${templateId}/segments/${segmentId}`);
      if (result === null) return { success: true, message: 'Segment deleted' };
      if (typeof result === 'string') return result;
      return result;
    }

    // ── Budget Code Templates ───────────────────────────────────────────────────
    case 'list_templates': {
      const { containerId } = args;
      const data = await apiRequest('GET', `${base}/templates`);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Cost Items - Change Orders ──────────────────────────────────────────────
    case 'attach_cost_items': {
      const { containerId, items } = args;
      const data = await apiRequest('POST', `${base}/cost-items:attach`, items);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'detach_cost_items': {
      const { containerId, items } = args;
      const data = await apiRequest('POST', `${base}/cost-items:detach`, items);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Actions ────────────────────────────────────────────────────────────────
    case 'perform_action': {
      const data = await apiRequest('POST', `${base}/workflows/actions`, args.actions);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_available_actions': {
      const data = await apiRequest(
        'GET',
        `${base}/workflows/${args.associationType}/${args.associationId}/actions`
      );
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Attachments ────────────────────────────────────────────────────────────
    case 'list_attachments': {
      const { containerId, limit, offset, sort, include, ...filters } = args;
      let path = `${base}/attachments?offset=${offset || 0}&limit=${limit || 100}`;
      if (sort) path += `&sort=${encodeURIComponent(sort)}`;
      if (include) path += `&include=${encodeURIComponent(include)}`;
      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });

      const items = await paginate(async (off, pageSize) => {
        const pageUrl = path.replace(/offset=\d+/, `offset=${off}`).replace(/limit=\d+/, `limit=${pageSize}`);
        const data = await apiRequest('GET', pageUrl);
        if (typeof data === 'string') throw new Error(data);
        return data.results || [];
      }, 100);
      return limit ? items.slice(0, limit) : items;
    }

    case 'create_attachment': {
      const { containerId, ...body } = args;
      const attBody = {};
      [
        'id', 'type', 'name', 'folderId', 'urn', 'templateId',
        'associationId', 'associationType'
      ].forEach(field => {
        if (body[field] !== undefined) attBody[field] = body[field];
      });

      const data = await apiRequest('POST', `${base}/attachments`, attBody);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_attachments_batch': {
      const data = await apiRequest('POST', `${base}/attachments:batch-create`, args.attachments);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'delete_attachment': {
      const data = await apiRequest('DELETE', `${base}/attachments/${args.attachmentId}`);
      if (data === null) return { deleted: true, attachmentId: args.attachmentId };
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_attachment_folder': {
      const body = {
        associationId: args.associationId,
        associationType: args.associationType,
      };

      const data = await apiRequest('POST', `${base}/attachment-folders`, body);
      if (typeof data === 'string') return data;
      return data;
    }

    // ── Workflow ────────────────────────────────────────────────────────────────
    case 'list_workflow_action_histories': {
      const { containerId, limit, sort, cursorState, ...filters } = args;
      let path = `${base}/workflows/action-histories?limit=${limit || 100}`;
      if (sort) path += `&sort=${encodeURIComponent(sort)}`;
      if (cursorState) path += `&cursorState=${encodeURIComponent(cursorState)}`;
      Object.entries(filters).forEach(([key, val]) => {
        if (key.startsWith('filter_') && val !== undefined) {
          path += `&${key.replace(/^filter_(.+)$/, 'filter[$1]')}=${encodeURIComponent(val)}`;
        }
      });
      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    default:
      return `Unknown cost tool: ${name}`;
  }
}
