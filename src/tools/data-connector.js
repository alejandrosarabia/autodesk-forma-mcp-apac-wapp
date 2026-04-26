/**
 * Data Connector tools — uses 3LO (three-legged OAuth).
 *
 * Tools:
 *   Requests — list_data_connector_requests, get_data_connector_request,
 *              create_data_connector_request, update_data_connector_request,
 *              delete_data_connector_request
 *   Jobs     — list_data_connector_request_jobs, list_data_connector_jobs,
 *              get_data_connector_job, delete_data_connector_job,
 *              trigger_data_connector_job
 *   Data     — list_data_connector_job_data, get_data_connector_job_data_url
 *
 * ACC Data Connector API v1. Path shape:
 *   /data-connector/v1/accounts/{accountId}/requests[/{requestId}[/jobs]]
 *   /data-connector/v1/accounts/{accountId}/jobs[/{jobId}[/data-listing|/data/{name}]]
 *
 * Auth: 3LO — router routes /data-connector/ paths to three-legged token.
 *
 * Flow:
 *   1. create_data_connector_request  — schedule a recurring or one-time export
 *   2. trigger_data_connector_job     — optionally trigger a manual run
 *   3. list_data_connector_request_jobs / get_data_connector_job — poll until status=complete
 *   4. list_data_connector_job_data   — list available data files (CSV, README, ZIP)
 *   5. get_data_connector_job_data_url — get signed URL (valid 60s) to download a file
 *
 * Service groups: all, activities, admin, assets, checklists, cost, dailylogs,
 *   forms, iq, issues, locations, markups, meetingminutes, photos, relationships,
 *   reviews, rfis, schedule, sheets, submittals, submittalsacc, transmittals
 * Schedule intervals: ONE_TIME, DAY, WEEK, MONTH, YEAR
 * Job status: queued, running, complete
 * Job completionStatus: success, failed, cancelled
 *
 * Rate limits: max 24 jobs per hub per 24 hours; max 24 jobs per user per 24 hours.
 */

import { apiRequest } from '../auth/router.js';

// ─── Pagination helper ────────────────────────────────────────────────────────

async function paginate(fetchFn, pageSize = 20, max = undefined) {
  const items = [];
  let offset = 0;
  while (true) {
    const data = await fetchFn(offset, pageSize);
    if (typeof data === 'string') throw new Error(data);
    const page = data.results || data.data || [];
    items.push(...page);
    if (max !== undefined && items.length >= max) return items.slice(0, max);
    const total = data.pagination?.totalResults ?? page.length;
    if (items.length >= total || page.length < pageSize) break;
    offset += page.length;
  }
  return items;
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const SERVICE_GROUPS_DESC =
  'Data types to export. Values: all, activities, admin, assets, checklists, cost, dailylogs, ' +
  'forms, iq, issues, locations, markups, meetingminutes, photos, relationships, reviews, rfis, ' +
  'schedule, sheets, submittals, submittalsacc, transmittals. ' +
  'Use "all" for a complete extract. "admin" includes both project and hub admin.';

const SCHEDULE_INTERVAL_ENUM = ['ONE_TIME', 'DAY', 'WEEK', 'MONTH', 'YEAR'];
const DATE_RANGE_ENUM = ['TODAY', 'YESTERDAY', 'PAST_7_DAYS', 'MONTH_TO_DATE', 'LAST_MONTH'];
const PROJECT_STATUS_ENUM = ['all', 'active', 'archived'];

export const dataConnectorTools = [
  // ── Requests ───────────────────────────────────────────────────────────────
  {
    name: 'list_data_connector_requests',
    description:
      'List all Data Connector extraction requests created by the authenticated user in a hub. ' +
      'Supports sorting and filtering. Auto-paginates unless limit is specified. ' +
      'Filter format for date ranges: "2020-01-01T00:00:00Z..2020-12-31T23:59:59Z" (omit either end for open range).',
    inputSchema: {
      type: 'object',
      properties: {
        accountId:              { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        sort:                   { type: 'string', enum: ['asc', 'desc'], description: 'Sort order by date' },
        sortFields:             { type: 'string', description: 'Comma-separated field names to sort by. Prepend - for descending. E.g. "createdByEmail,-createdAt"' },
        limit:                  { type: 'number', description: 'Max results to return (default 20, omit to fetch all)' },
        filterProjectId:        { type: 'string', description: 'Filter by project UUID. Use "null" to get requests for all projects.' },
        filterIsActive:         { type: 'boolean', description: 'Filter by active/inactive status' },
        filterScheduleInterval: { type: 'string', enum: SCHEDULE_INTERVAL_ENUM, description: 'Filter by schedule interval' },
        filterCreatedAt:        { type: 'string', description: 'Filter by creation date range (format: from..to in ISO 8601)' },
        filterUpdatedAt:        { type: 'string', description: 'Filter by update date range (format: from..to in ISO 8601)' },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'get_data_connector_request',
    description: 'Get full details of a single Data Connector extraction request including schedule, service groups, and project configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId:  { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        requestId:  { type: 'string', description: 'Extraction request UUID' },
      },
      required: ['accountId', 'requestId'],
    },
  },
  {
    name: 'create_data_connector_request',
    description:
      'Create a new Data Connector extraction request to schedule data exports. ' +
      'scheduleInterval and effectiveFrom are required. ' +
      'reoccuringInterval is required for all scheduleInterval values except ONE_TIME. ' +
      'effectiveTo is required for recurring schedules (not ONE_TIME). ' +
      'projectIdList supersedes projectId. Required for project admins; optional for executive overview users. ' +
      'startDate/endDate control the data extraction date range (which rows to include), ' +
      'separate from effectiveFrom/effectiveTo which control when the schedule runs. ' +
      'Rate limit: max 24 jobs per hub and per user per 24 hours.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId:          { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        description:        { type: 'string', description: 'Human-readable description of this extraction request' },
        isActive:           { type: 'boolean', description: 'Whether the request is active (default: true)' },
        scheduleInterval:   { type: 'string', enum: SCHEDULE_INTERVAL_ENUM, description: 'How often to run. ONE_TIME = single run.' },
        reoccuringInterval: { type: 'number', description: 'Number of scheduleInterval units between runs (required for non-ONE_TIME). E.g. 2 + WEEK = every 2 weeks.' },
        effectiveFrom:      { type: 'string', description: 'ISO 8601 datetime when schedule begins. Required.' },
        effectiveTo:        { type: 'string', description: 'ISO 8601 datetime when recurring schedule ends. Required for non-ONE_TIME. Must not be set for ONE_TIME.' },
        serviceGroups:      { type: 'array', items: { type: 'string' }, description: SERVICE_GROUPS_DESC },
        projectId:          { type: 'string', description: '(Legacy) Single project UUID. Use projectIdList instead.' },
        projectIdList:      { type: 'array', items: { type: 'string' }, description: 'Up to 50 project UUIDs to export. Supersedes projectId.' },
        callbackUrl:        { type: 'string', description: 'Webhook URL called on job completion with POST { accountId, requestId, jobId, state, success }' },
        sendEmail:          { type: 'boolean', description: 'Send email on job completion (default: true)' },
        startDate:          { type: 'string', description: 'ISO 8601 start of data extraction range (which rows to include, not when to run)' },
        endDate:            { type: 'string', description: 'ISO 8601 end of data extraction range' },
        dateRange:          { type: 'string', enum: DATE_RANGE_ENUM, description: 'Relative date range for extraction (Activities service only)' },
        projectStatus:      { type: 'string', enum: PROJECT_STATUS_ENUM, description: 'Which project types to include (default: all)' },
      },
      required: ['accountId', 'scheduleInterval', 'serviceGroups', 'effectiveFrom'],
    },
  },
  {
    name: 'update_data_connector_request',
    description:
      'Update an existing Data Connector extraction request. Only provided fields are updated. ' +
      'scheduleInterval is required in the body when updating schedule-related fields.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId:          { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        requestId:          { type: 'string', description: 'Extraction request UUID' },
        description:        { type: 'string', description: 'New description' },
        isActive:           { type: 'boolean', description: 'Set to false to pause the schedule' },
        scheduleInterval:   { type: 'string', enum: SCHEDULE_INTERVAL_ENUM },
        reoccuringInterval: { type: 'number', description: 'Number of interval units between runs' },
        effectiveFrom:      { type: 'string', description: 'ISO 8601 datetime when schedule begins' },
        effectiveTo:        { type: 'string', description: 'ISO 8601 datetime when recurring schedule ends' },
        serviceGroups:      { type: 'array', items: { type: 'string' }, description: SERVICE_GROUPS_DESC },
        projectId:          { type: 'string', description: '(Legacy) Single project UUID' },
        projectIdList:      { type: 'array', items: { type: 'string' }, description: 'Up to 50 project UUIDs' },
        callbackUrl:        { type: 'string', description: 'Webhook URL on job completion' },
        sendEmail:          { type: 'boolean' },
        startDate:          { type: 'string', description: 'ISO 8601 start of data extraction range' },
        endDate:            { type: 'string', description: 'ISO 8601 end of data extraction range' },
        dateRange:          { type: 'string', enum: DATE_RANGE_ENUM },
        projectStatus:      { type: 'string', enum: PROJECT_STATUS_ENUM },
      },
      required: ['accountId', 'requestId'],
    },
  },
  {
    name: 'delete_data_connector_request',
    description: 'Delete a Data Connector extraction request and cancel its schedule. Already-generated jobs are not deleted.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId:  { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        requestId:  { type: 'string', description: 'Extraction request UUID' },
      },
      required: ['accountId', 'requestId'],
    },
  },

  // ── Jobs ───────────────────────────────────────────────────────────────────
  {
    name: 'list_data_connector_request_jobs',
    description:
      'List all jobs (individual export runs) scoped to a specific Data Connector request. ' +
      'Job status: queued, running, complete. ' +
      'completionStatus (on complete jobs): success, failed, cancelled. ' +
      'Poll until status=complete, then use list_data_connector_job_data to see available files.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        requestId: { type: 'string', description: 'Extraction request UUID' },
        sort:      { type: 'string', enum: ['asc', 'desc'], description: 'Sort order by date' },
        limit:     { type: 'number', description: 'Max results to return (default 20, omit to fetch all)' },
      },
      required: ['accountId', 'requestId'],
    },
  },
  {
    name: 'list_data_connector_jobs',
    description:
      'List ALL extraction jobs across all requests for a hub (not scoped to a single request). ' +
      'Supports filtering by status, completionStatus, project, and date ranges. ' +
      'Filter date range format: "from..to" in ISO 8601 (omit either end for open range).',
    inputSchema: {
      type: 'object',
      properties: {
        accountId:              { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        projectId:              { type: 'string', description: 'Filter to a specific project UUID' },
        sort:                   { type: 'string', enum: ['asc', 'desc'], description: 'Sort order by date' },
        sortFields:             { type: 'string', description: 'Comma-separated sort fields with optional - prefix for desc. E.g. "createdByEmail,-createdAt"' },
        limit:                  { type: 'number', description: 'Max results to return (default 20, omit to fetch all)' },
        filterStatus:           { type: 'string', enum: ['queued', 'running', 'complete'], description: 'Filter by job status' },
        filterCompletionStatus: { type: 'string', enum: ['success', 'failed', 'cancelled'], description: 'Filter by completion status' },
        filterCreatedAt:        { type: 'string', description: 'Filter by creation date range (from..to)' },
        filterStartedAt:        { type: 'string', description: 'Filter by start date range (from..to)' },
        filterCompletedAt:      { type: 'string', description: 'Filter by completion date range (from..to)' },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'get_data_connector_job',
    description: 'Get details of a single extraction job by jobId, including status, completionStatus, progress (0-100), timing, and download tracking.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        jobId:     { type: 'string', description: 'Job UUID' },
      },
      required: ['accountId', 'jobId'],
    },
  },
  {
    name: 'delete_data_connector_job',
    description:
      'Cancel a running extraction job. A cancelled job still appears with completionStatus="cancelled". ' +
      'Returns 204 No Content on success.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        jobId:     { type: 'string', description: 'Job UUID' },
      },
      required: ['accountId', 'jobId'],
    },
  },
  {
    name: 'trigger_data_connector_job',
    description:
      'Manually trigger an immediate extraction job for an existing request, outside its regular schedule. ' +
      'Useful for on-demand exports. Subject to rate limits (24 jobs/hub/24h, 24 jobs/user/24h).',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        requestId: { type: 'string', description: 'Extraction request UUID' },
      },
      required: ['accountId', 'requestId'],
    },
  },

  // ── Data ───────────────────────────────────────────────────────────────────
  {
    name: 'list_data_connector_job_data',
    description:
      'List all files available in a completed job\'s data extract. ' +
      'Returns file name, size (bytes), and creation date for each file. ' +
      'Each extract contains: one CSV per service group, a README with schema docs, and a master ZIP. ' +
      'Returns 404 if the job was cancelled or failed to produce an extract. ' +
      'Use get_data_connector_job_data_url to get a download URL for each file.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        jobId:     { type: 'string', description: 'Job UUID (must have completionStatus=success)' },
      },
      required: ['accountId', 'jobId'],
    },
  },
  {
    name: 'get_data_connector_job_data_url',
    description:
      'Get a signed download URL for a specific file from a completed job\'s data extract. ' +
      'The signed URL is valid for 60 seconds — use it immediately after calling this tool. ' +
      'Use list_data_connector_job_data first to get available file names. ' +
      'To download the entire extract, use the master ZIP file name.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'ACC hub UUID — no b. prefix' },
        jobId:     { type: 'string', description: 'Job UUID' },
        fileName:  { type: 'string', description: 'File name from list_data_connector_job_data (e.g. "issues.csv", "README.txt", or the ZIP file name)' },
      },
      required: ['accountId', 'jobId', 'fileName'],
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRequest(r) {
  return {
    id: r.id,
    description: r.description,
    isActive: r.isActive,
    accountId: r.accountId,
    projectId: r.projectId || undefined,
    projectIdList: r.projectIdList || undefined,
    createdBy: r.createdBy,
    createdByEmail: r.createdByEmail,
    createdAt: r.createdAt,
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt,
    scheduleInterval: r.scheduleInterval,
    reoccuringInterval: r.reoccuringInterval ?? undefined,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo || undefined,
    lastQueuedAt: r.lastQueuedAt || undefined,
    serviceGroups: r.serviceGroups,
    callbackUrl: r.callbackUrl || undefined,
    sendEmail: r.sendEmail,
    startDate: r.startDate || undefined,
    endDate: r.endDate || undefined,
    dateRange: r.dateRange || undefined,
    projectStatus: r.projectStatus || undefined,
  };
}

function mapJob(j) {
  return {
    id: j.id,
    requestId: j.requestId,
    accountId: j.accountId,
    projectId: j.projectId || undefined,
    projectIdList: j.projectIdList || undefined,
    createdBy: j.createdBy,
    createdByEmail: j.createdByEmail,
    createdAt: j.createdAt,
    status: j.status,
    completionStatus: j.completionStatus || undefined,
    startedAt: j.startedAt || undefined,
    completedAt: j.completedAt || undefined,
    progress: j.progress ?? undefined,
    sendEmail: j.sendEmail,
    lastDownloadedBy: j.lastDownloadedBy || undefined,
    lastDownloadedAt: j.lastDownloadedAt || undefined,
    startDate: j.startDate || undefined,
    endDate: j.endDate || undefined,
  };
}

function buildRequestBody(args) {
  const body = {};
  if (args.description !== undefined)        body.description = args.description;
  if (args.isActive !== undefined)           body.isActive = args.isActive;
  if (args.scheduleInterval !== undefined)   body.scheduleInterval = args.scheduleInterval;
  if (args.reoccuringInterval !== undefined) body.reoccuringInterval = args.reoccuringInterval;
  if (args.effectiveFrom !== undefined)      body.effectiveFrom = args.effectiveFrom;
  if (args.effectiveTo !== undefined)        body.effectiveTo = args.effectiveTo;
  if (args.serviceGroups !== undefined)      body.serviceGroups = args.serviceGroups;
  if (args.projectId !== undefined)          body.projectId = args.projectId;
  if (args.projectIdList !== undefined)      body.projectIdList = args.projectIdList;
  if (args.callbackUrl !== undefined)        body.callbackUrl = args.callbackUrl;
  if (args.sendEmail !== undefined)          body.sendEmail = args.sendEmail;
  if (args.startDate !== undefined)          body.startDate = args.startDate;
  if (args.endDate !== undefined)            body.endDate = args.endDate;
  if (args.dateRange !== undefined)          body.dateRange = args.dateRange;
  if (args.projectStatus !== undefined)      body.projectStatus = args.projectStatus;
  return body;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleDataConnectorTool(name, args) {
  const { accountId } = args;
  const base = `/data-connector/v1/accounts/${accountId}`;

  switch (name) {

    // ── Requests ─────────────────────────────────────────────────────────────

    case 'list_data_connector_requests': {
      const { sort, sortFields, limit, filterProjectId, filterIsActive, filterScheduleInterval, filterCreatedAt, filterUpdatedAt } = args;
      const items = await paginate(async (offset, pageSize) => {
        const p = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
        if (sort)                    p.set('sort', sort);
        if (sortFields)              p.set('sortFields', sortFields);
        if (filterProjectId)         p.set('filter[projectId]', filterProjectId);
        if (filterIsActive !== undefined) p.set('filter[isActive]', String(filterIsActive));
        if (filterScheduleInterval)  p.set('filter[scheduleInterval]', filterScheduleInterval);
        if (filterCreatedAt)         p.set('filter[createdAt]', filterCreatedAt);
        if (filterUpdatedAt)         p.set('filter[updatedAt]', filterUpdatedAt);
        return apiRequest('GET', `${base}/requests?${p}`);
      }, 20, limit);
      return items.map(mapRequest);
    }

    case 'get_data_connector_request': {
      const data = await apiRequest('GET', `${base}/requests/${args.requestId}`);
      if (typeof data === 'string') return data;
      return mapRequest(data);
    }

    case 'create_data_connector_request': {
      const body = buildRequestBody(args);
      const data = await apiRequest('POST', `${base}/requests`, body);
      if (typeof data === 'string') return data;
      return mapRequest(data);
    }

    case 'update_data_connector_request': {
      const body = buildRequestBody(args);
      const data = await apiRequest('PATCH', `${base}/requests/${args.requestId}`, body);
      if (typeof data === 'string') return data;
      return mapRequest(data);
    }

    case 'delete_data_connector_request': {
      const data = await apiRequest('DELETE', `${base}/requests/${args.requestId}`);
      if (typeof data === 'string') return data;
      return { deleted: true, requestId: args.requestId };
    }

    // ── Jobs ─────────────────────────────────────────────────────────────────

    case 'list_data_connector_request_jobs': {
      const { requestId, sort, limit } = args;
      const items = await paginate(async (offset, pageSize) => {
        const p = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
        if (sort) p.set('sort', sort);
        return apiRequest('GET', `${base}/requests/${requestId}/jobs?${p}`);
      }, 20, limit);
      return items.map(mapJob);
    }

    case 'list_data_connector_jobs': {
      const { projectId, sort, sortFields, limit, filterStatus, filterCompletionStatus, filterCreatedAt, filterStartedAt, filterCompletedAt } = args;
      const items = await paginate(async (offset, pageSize) => {
        const p = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
        if (projectId)               p.set('projectId', projectId);
        if (sort)                    p.set('sort', sort);
        if (sortFields)              p.set('sortFields', sortFields);
        if (filterStatus)            p.set('filter[status]', filterStatus);
        if (filterCompletionStatus)  p.set('filter[completionStatus]', filterCompletionStatus);
        if (filterCreatedAt)         p.set('filter[createdAt]', filterCreatedAt);
        if (filterStartedAt)         p.set('filter[startedAt]', filterStartedAt);
        if (filterCompletedAt)       p.set('filter[completedAt]', filterCompletedAt);
        return apiRequest('GET', `${base}/jobs?${p}`);
      }, 20, limit);
      return items.map(mapJob);
    }

    case 'get_data_connector_job': {
      const data = await apiRequest('GET', `${base}/jobs/${args.jobId}`);
      if (typeof data === 'string') return data;
      return mapJob(data);
    }

    case 'delete_data_connector_job': {
      const data = await apiRequest('DELETE', `${base}/jobs/${args.jobId}`);
      if (typeof data === 'string') return data;
      return { cancelled: true, jobId: args.jobId };
    }

    case 'trigger_data_connector_job': {
      const data = await apiRequest('POST', `${base}/requests/${args.requestId}/jobs`, {});
      if (typeof data === 'string') return data;
      return mapJob(data);
    }

    // ── Data ─────────────────────────────────────────────────────────────────

    case 'list_data_connector_job_data': {
      const data = await apiRequest('GET', `${base}/jobs/${args.jobId}/data-listing`);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_data_connector_job_data_url': {
      const data = await apiRequest('GET', `${base}/jobs/${args.jobId}/data/${encodeURIComponent(args.fileName)}`);
      if (typeof data === 'string') return data;
      return data;
    }

    default:
      return `Unknown data connector tool: ${name}`;
  }
}
