/**
 * Hub Admin tools — Projects, Companies, Hub Users, and Project Users categories.
 *
 * Tools: list_projects, get_project, create_project, update_project_image,
 *        import_companies, list_companies, get_company, search_companies,
 *        get_project_companies, update_company, update_company_image,
 *        create_user, import_users, list_users, get_user, get_user_projects,
 *        get_user_products, get_user_roles, search_users, update_user,
 *        list_project_users, get_project_user, add_project_user,
 *        import_project_users, update_project_user, remove_project_user
 *
 * Autodesk Hub Admin API v1/v2. Paths:
 *   /construction/admin/v1/accounts/{accountId}/projects
 *   /construction/admin/v1/projects/{projectId}
 *   /construction/admin/v1/accounts/{accountId}/companies
 *   /construction/admin/v1/accounts/{accountId}/users/{userId}/...
 *   /construction/admin/v1/projects/{projectId}/users/...
 *   /construction/admin/v2/projects/{projectId}/users:import
 *   /hq/v1/accounts/{accountId}/projects/{projectId}/image
 *   /hq/v1/accounts/{accountId}/companies/...
 *   /hq/v1/accounts/{accountId}/users/...
 *
 * GET endpoints use 2LO or 3LO (user context optional).
 * POST/PATCH/DELETE endpoints use 3LO auth (user context required for construction APIs).
 */

import { apiRequest, withBPrefix } from '../auth/router.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const hubAdminTools = [
  {
    name: 'list_projects',
    description: 'List projects in a hub with filtering, sorting, pagination (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        fields: {
          type: 'array',
          description: 'Comma-separated fields to include in response',
          items: { type: 'string' },
        },
        filterClassification: {
          type: 'array',
          description: 'Filter by classification: production, template, component, sample',
          items: { type: 'string' },
        },
        filterPlatform: {
          type: 'array',
          description: 'Filter by platform: acc (Forma), bim360 (BIM 360)',
          items: { type: 'string' },
        },
        filterProducts: {
          type: 'array',
          description: 'Filter by products used in projects',
          items: { type: 'string' },
        },
        filterName: { type: 'string', description: 'Filter by project name' },
        filterType: {
          type: 'array',
          description: 'Filter by project type (prefix with - to exclude)',
          items: { type: 'string' },
        },
        filterStatus: {
          type: 'array',
          description: 'Filter by status: active, pending, archived, suspended',
          items: { type: 'string' },
        },
        filterBusinessUnitId: { type: 'string', description: 'Filter by business unit ID' },
        filterJobNumber: { type: 'string', description: 'Filter by job number' },
        filterUpdatedAt: { type: 'string', description: 'Filter by update date range (ISO 8601)' },
        filterTextMatch: {
          type: 'string',
          description: 'Text match mode: contains, startsWith, endsWith, equals',
        },
        sort: {
          type: 'array',
          description: 'Sort fields with optional asc/desc (default asc)',
          items: { type: 'string' },
        },
        limit: { type: 'number', description: 'Max results per page (1-200, default 20)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'get_project',
    description: 'Get a single project by ID with optional fields (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, no b. prefix)' },
        fields: {
          type: 'array',
          description: 'Comma-separated fields to include in response',
          items: { type: 'string' },
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project in a hub (optionally from template, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        name: { type: 'string', description: 'Project name (required, max 255)' },
        type: { type: 'string', description: 'Project type (required, e.g. Hospital, Office)' },
        classification: {
          type: 'string',
          description: 'Classification: production, template, component, sample',
        },
        startDate: { type: 'string', description: 'Start date (ISO 8601)' },
        endDate: { type: 'string', description: 'End date (ISO 8601)' },
        jobNumber: { type: 'string', description: 'User-defined job identifier (max 100)' },
        addressLine1: { type: 'string', description: 'Address line 1 (max 255)' },
        addressLine2: { type: 'string', description: 'Address line 2 (max 255)' },
        city: { type: 'string', description: 'City (max 255)' },
        stateOrProvince: { type: 'string', description: 'State or province (max 255)' },
        postalCode: { type: 'string', description: 'Postal code (max 255)' },
        country: { type: 'string', description: 'Country (ISO 3166-1 alpha-2)' },
        latitude: { type: 'string', description: 'Latitude coordinate (max 25)' },
        longitude: { type: 'string', description: 'Longitude coordinate (max 25)' },
        timezone: { type: 'string', description: 'IANA timezone name' },
        constructionType: { type: 'string', description: 'Construction type (e.g. New Construction)' },
        deliveryMethod: { type: 'string', description: 'Delivery method (e.g. Design-Bid-Build)' },
        contractType: { type: 'string', description: 'Contract type (e.g. Lump Sum)' },
        currentPhase: { type: 'string', description: 'Current phase (e.g. Design)' },
        businessUnitId: { type: 'string', description: 'Business unit ID (UUID)' },
        projectValue: {
          type: 'object',
          description: 'Project value with amount and currency',
          properties: {
            value: { type: 'number', description: 'Amount (default 0)' },
            currency: { type: 'string', description: 'Currency code (default USD)' },
          },
        },
        templateProjectId: { type: 'string', description: 'Template project ID to clone from' },
      },
      required: ['accountId', 'name', 'type'],
    },
  },
  {
    name: 'update_project_image',
    description: 'Upload or update project image (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        projectId: { type: 'string', description: 'Project ID (UUID, no b. prefix)' },
        imageData: { type: 'string', description: 'Base64-encoded image data (PNG, JPEG, BMP, GIF)' },
        imageMimeType: {
          type: 'string',
          description: 'MIME type: image/png, image/jpeg, image/jpg, image/bmp, image/gif',
        },
      },
      required: ['accountId', 'projectId', 'imageData', 'imageMimeType'],
    },
  },
  {
    name: 'create_company',
    description: 'Create a new partner company in a hub (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        name: { type: 'string', description: 'Company name (required, max 255, must be unique)' },
        trade: { type: 'string', description: 'Trade type based on specialization (required)' },
        addressLine1: { type: 'string', description: 'Address line 1 (max 255)' },
        addressLine2: { type: 'string', description: 'Address line 2 (max 255)' },
        city: { type: 'string', description: 'City (max 255)' },
        stateOrProvince: { type: 'string', description: 'State or province (max 255)' },
        postalCode: { type: 'string', description: 'Postal code (max 255)' },
        country: { type: 'string', description: 'Country' },
        phone: { type: 'string', description: 'Business phone (max 255)' },
        websiteUrl: { type: 'string', description: 'Company website URL (max 255)' },
        description: { type: 'string', description: 'Company description (max 255)' },
        erpId: { type: 'string', description: 'ERP system ID for company association' },
        taxId: { type: 'string', description: 'Tax ID for company association' },
      },
      required: ['accountId', 'name', 'trade'],
    },
  },
  {
    name: 'import_companies',
    description: 'Bulk import up to 50 partner companies to a hub (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        companies: {
          type: 'array',
          description: 'Array of company objects to import (max 50)',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Company name (required, max 255)' },
              trade: { type: 'string', description: 'Trade type (required)' },
              addressLine1: { type: 'string', description: 'Address line 1 (max 255)' },
              addressLine2: { type: 'string', description: 'Address line 2 (max 255)' },
              city: { type: 'string', description: 'City (max 255)' },
              stateOrProvince: { type: 'string', description: 'State or province (max 255)' },
              postalCode: { type: 'string', description: 'Postal code (max 255)' },
              country: { type: 'string', description: 'Country' },
              phone: { type: 'string', description: 'Business phone (max 255)' },
              websiteUrl: { type: 'string', description: 'Company website URL (max 255)' },
              description: { type: 'string', description: 'Company description (max 255)' },
              erpId: { type: 'string', description: 'ERP system ID' },
              taxId: { type: 'string', description: 'Tax ID' },
            },
            required: ['name', 'trade'],
          },
        },
      },
      required: ['accountId', 'companies'],
    },
  },
  {
    name: 'list_companies',
    description: 'List companies in a hub with filters, sorting, pagination (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        filterName: { type: 'string', description: 'Filter by company name (max 255)' },
        filterTrade: { type: 'string', description: 'Filter by trade (max 255)' },
        filterErpId: { type: 'string', description: 'Filter by ERP ID (max 255)' },
        filterTaxId: { type: 'string', description: 'Filter by tax ID (max 255)' },
        filterUpdatedAt: { type: 'string', description: 'Filter by update date range (ISO 8601, e.g. from..to)' },
        filterStatus: { type: 'string', description: 'Filter by status: active, inactive, all (default: active)' },
        orFilters: {
          type: 'array',
          description: 'Fields to apply OR operator: erpId, name, taxId, trade, updatedAt',
          items: { type: 'string' },
        },
        filterTextMatch: {
          type: 'string',
          description: 'Text match mode: contains (default), startsWith, endsWith, equals',
        },
        sort: {
          type: 'array',
          description: 'Sort fields with optional asc/desc direction',
          items: { type: 'string' },
        },
        fields: {
          type: 'array',
          description: 'Fields to return in response (defaults to all)',
          items: { type: 'string' },
        },
        limit: { type: 'number', description: 'Max results per page (1-200, default 20)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'get_company',
    description: 'Get a specific company by ID (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        companyId: { type: 'string', description: 'Company ID (UUID)' },
      },
      required: ['accountId', 'companyId'],
    },
  },
  {
    name: 'search_companies',
    description: 'Search companies by name or trade (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        name: { type: 'string', description: 'Company name to match (max 255)' },
        trade: { type: 'string', description: 'Company trade to match (max 255)' },
        operator: { type: 'string', description: 'Boolean operator: OR (default) or AND' },
        partial: { type: 'boolean', description: 'Fuzzy match if true (default true)' },
        limit: { type: 'number', description: 'Response size (1-100, default 10)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
        sort: { type: 'string', description: 'Comma-separated fields to sort by (prepend - for desc)' },
        field: { type: 'string', description: 'Comma-separated fields to include in response' },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'get_project_companies',
    description: 'Get companies assigned to a specific project (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        projectId: { type: 'string', description: 'Project ID (UUID, no b. prefix)' },
        limit: { type: 'number', description: 'Response size (1-100, default 10)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
        sort: { type: 'string', description: 'Comma-separated fields to sort by (prepend - for desc)' },
        field: { type: 'string', description: 'Comma-separated fields to include in response' },
      },
      required: ['accountId', 'projectId'],
    },
  },
  {
    name: 'update_company',
    description: 'Update company properties (PATCH, 2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        companyId: { type: 'string', description: 'Company ID (UUID)' },
        name: { type: 'string', description: 'Company name (max 255)' },
        trade: { type: 'string', description: 'Trade type' },
        addressLine1: { type: 'string', description: 'Address line 1 (max 255)' },
        addressLine2: { type: 'string', description: 'Address line 2 (max 255)' },
        city: { type: 'string', description: 'City (max 255)' },
        stateOrProvince: { type: 'string', description: 'State or province (max 255)' },
        postalCode: { type: 'string', description: 'Postal code (max 255)' },
        country: { type: 'string', description: 'Country' },
        phone: { type: 'string', description: 'Business phone (max 255)' },
        websiteUrl: { type: 'string', description: 'Company website URL (max 255)' },
        description: { type: 'string', description: 'Company description (max 255)' },
        erpId: { type: 'string', description: 'ERP system ID' },
        taxId: { type: 'string', description: 'Tax ID' },
      },
      required: ['accountId', 'companyId'],
    },
  },
  {
    name: 'update_company_image',
    description: 'Upload or update company image (PATCH, 2LO auth, app only, multipart/form-data)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        companyId: { type: 'string', description: 'Company ID (UUID)' },
        imageData: { type: 'string', description: 'Base64-encoded image data (PNG, JPEG, BMP, GIF)' },
        imageMimeType: {
          type: 'string',
          description: 'MIME type: image/png, image/jpeg, image/jpg, image/bmp, image/gif',
        },
      },
      required: ['accountId', 'companyId', 'imageData', 'imageMimeType'],
    },
  },
  {
    name: 'create_user',
    description: 'Create a new user in a hub member directory (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        email: { type: 'string', description: 'User email (required, max 255)' },
        companyId: { type: 'string', description: 'User\'s default company ID in BIM 360' },
        nickname: { type: 'string', description: 'Nickname (max 255)' },
        firstName: { type: 'string', description: 'First name (max 255)' },
        lastName: { type: 'string', description: 'Last name (max 255)' },
        imageUrl: { type: 'string', description: 'Profile image URL (max 255)' },
        addressLine1: { type: 'string', description: 'Address line 1 (max 255)' },
        addressLine2: { type: 'string', description: 'Address line 2 (max 255)' },
        city: { type: 'string', description: 'City (max 255)' },
        stateOrProvince: { type: 'string', description: 'State or province (max 255)' },
        postalCode: { type: 'string', description: 'Postal code (max 255)' },
        country: { type: 'string', description: 'Country' },
        phone: { type: 'string', description: 'Phone number (max 255)' },
        company: { type: 'string', description: 'Company from Autodesk profile (max 255)' },
        jobTitle: { type: 'string', description: 'Job title (max 255)' },
        industry: { type: 'string', description: 'Industry (max 255)' },
        aboutMe: { type: 'string', description: 'Short description (max 255)' },
        defaultRole: { type: 'string', description: 'Default role (max 255)' },
      },
      required: ['accountId', 'email'],
    },
  },
  {
    name: 'import_users',
    description: 'Bulk import up to 50 users to a hub member directory (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        users: {
          type: 'array',
          description: 'Array of user objects to import (max 50)',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'User email (required, max 255)' },
              companyId: { type: 'string', description: 'Company ID' },
              nickname: { type: 'string', description: 'Nickname (max 255)' },
              firstName: { type: 'string', description: 'First name (max 255)' },
              lastName: { type: 'string', description: 'Last name (max 255)' },
              imageUrl: { type: 'string', description: 'Profile image URL (max 255)' },
              addressLine1: { type: 'string', description: 'Address line 1 (max 255)' },
              addressLine2: { type: 'string', description: 'Address line 2 (max 255)' },
              city: { type: 'string', description: 'City (max 255)' },
              stateOrProvince: { type: 'string', description: 'State or province (max 255)' },
              postalCode: { type: 'string', description: 'Postal code (max 255)' },
              country: { type: 'string', description: 'Country' },
              phone: { type: 'string', description: 'Phone number (max 255)' },
              company: { type: 'string', description: 'Company from Autodesk profile (max 255)' },
              jobTitle: { type: 'string', description: 'Job title (max 255)' },
              industry: { type: 'string', description: 'Industry (max 255)' },
              aboutMe: { type: 'string', description: 'Short description (max 255)' },
              defaultRole: { type: 'string', description: 'Default role (max 255)' },
            },
            required: ['email'],
          },
        },
      },
      required: ['accountId', 'users'],
    },
  },
  {
    name: 'list_users',
    description: 'List all users in a hub member directory (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        limit: { type: 'number', description: 'Response size (default 10, max 100)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
        sort: { type: 'string', description: 'Comma-separated fields to sort by (prepend - for desc)' },
        field: { type: 'string', description: 'Comma-separated fields to include in response' },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'get_user',
    description: 'Get a specific user by ID (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        userId: { type: 'string', description: 'User ID (UUID)' },
      },
      required: ['accountId', 'userId'],
    },
  },
  {
    name: 'get_user_projects',
    description: 'Get projects for a user (2LO/3LO auth, user context optional)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        userId: { type: 'string', description: 'User ID (UUID or Autodesk ID)' },
        filterIds: {
          type: 'array',
          description: 'Filter by project IDs',
          items: { type: 'string' },
        },
        fields: {
          type: 'array',
          description: 'Fields to include in response',
          items: { type: 'string' },
        },
        filterClassification: {
          type: 'array',
          description: 'Filter by classification: production, template, component, sample',
          items: { type: 'string' },
        },
        filterName: { type: 'string', description: 'Filter by project name' },
        filterPlatform: {
          type: 'array',
          description: 'Filter by platform: acc, bim360',
          items: { type: 'string' },
        },
        filterStatus: {
          type: 'array',
          description: 'Filter by status: active, pending, archived, suspended',
          items: { type: 'string' },
        },
        filterType: {
          type: 'array',
          description: 'Filter by project type (prefix with - to exclude)',
          items: { type: 'string' },
        },
        filterJobNumber: { type: 'string', description: 'Filter by job number' },
        filterUpdatedAt: { type: 'string', description: 'Filter by update date range (ISO 8601)' },
        filterAccessLevels: {
          type: 'array',
          description: 'Filter by access level: projectAdmin, projectMember',
          items: { type: 'string' },
        },
        filterTextMatch: { type: 'string', description: 'Text match mode: contains, startsWith, endsWith, equals' },
        sort: {
          type: 'array',
          description: 'Sort fields with optional asc/desc',
          items: { type: 'string' },
        },
        limit: { type: 'number', description: 'Max results (1-200, default 20)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
      },
      required: ['accountId', 'userId'],
    },
  },
  {
    name: 'get_user_products',
    description: 'Get Forma products for a user (2LO/3LO auth, user context optional)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        userId: { type: 'string', description: 'User ID (UUID or Autodesk ID)' },
        filterProjectIds: {
          type: 'array',
          description: 'Filter by project IDs',
          items: { type: 'string' },
        },
        filterKeys: {
          type: 'array',
          description: 'Filter by product keys: build, docs, cost, etc.',
          items: { type: 'string' },
        },
        fields: {
          type: 'array',
          description: 'Fields to include: projectIds, name, icon',
          items: { type: 'string' },
        },
        sort: {
          type: 'array',
          description: 'Sort fields with optional asc/desc',
          items: { type: 'string' },
        },
        limit: { type: 'number', description: 'Max results (1-200, default 20)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
      },
      required: ['accountId', 'userId'],
    },
  },
  {
    name: 'get_user_roles',
    description: 'Get roles assigned to a user (2LO/3LO auth, user context optional)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        userId: { type: 'string', description: 'User ID (UUID or Autodesk ID)' },
        filterProjectIds: {
          type: 'array',
          description: 'Filter by project IDs',
          items: { type: 'string' },
        },
        filterStatus: {
          type: 'array',
          description: 'Filter by status: active, inactive',
          items: { type: 'string' },
        },
        filterName: { type: 'string', description: 'Filter by role name' },
        filterTextMatch: { type: 'string', description: 'Text match mode: contains, startsWith, endsWith, equals' },
        fields: {
          type: 'array',
          description: 'Fields to include in response',
          items: { type: 'string' },
        },
        sort: {
          type: 'array',
          description: 'Sort fields with optional asc/desc',
          items: { type: 'string' },
        },
        limit: { type: 'number', description: 'Max results (1-200, default 20)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
      },
      required: ['accountId', 'userId'],
    },
  },
  {
    name: 'search_users',
    description: 'Search users by name, email, or company (2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        name: { type: 'string', description: 'User name to match (max 255)' },
        email: { type: 'string', description: 'User email to match (max 255)' },
        companyName: { type: 'string', description: 'Company name to match (max 255)' },
        operator: { type: 'string', description: 'Boolean operator: OR (default) or AND' },
        partial: { type: 'boolean', description: 'Fuzzy match if true (default true)' },
        limit: { type: 'number', description: 'Response size (1-100, default 10)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
        sort: { type: 'string', description: 'Comma-separated fields to sort by (prepend - for desc)' },
        field: { type: 'string', description: 'Comma-separated fields to include in response' },
      },
      required: ['accountId'],
    },
  },
  {
    name: 'update_user',
    description: 'Update user status or default company (PATCH, 2LO auth, app only)',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Hub/account ID (UUID, no b. prefix)' },
        userId: { type: 'string', description: 'User ID (UUID)' },
        status: { type: 'string', description: 'Status: active, inactive' },
        companyId: { type: 'string', description: 'User\'s default company ID in BIM 360' },
        defaultRole: { type: 'string', description: 'Default role (max 255)' },
      },
      required: ['accountId', 'userId'],
    },
  },
  {
    name: 'list_project_users',
    description: 'List users in a project with filtering, sorting, pagination (2LO/3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, no b. prefix)' },
        filterProducts: {
          type: 'array',
          description: 'Filter by products: build, docs, cost, etc.',
          items: { type: 'string' },
        },
        filterName: { type: 'string', description: 'Filter by user name' },
        filterEmail: { type: 'string', description: 'Filter by user email' },
        filterAccessLevels: {
          type: 'array',
          description: 'Filter by access level: accountAdmin, projectAdmin, executive',
          items: { type: 'string' },
        },
        filterAddedOn: { type: 'string', description: 'Filter by date added (YYYY-MM-DD)' },
        filterCompanyId: { type: 'string', description: 'Filter by company ID' },
        filterCompanyName: { type: 'string', description: 'Filter by company name' },
        filterAutodeskIds: {
          type: 'array',
          description: 'Filter by Autodesk IDs',
          items: { type: 'string' },
        },
        filterIds: {
          type: 'array',
          description: 'Filter by Forma user IDs',
          items: { type: 'string' },
        },
        filterRoleId: { type: 'string', description: 'Filter by role ID' },
        filterRoleIds: {
          type: 'array',
          description: 'Filter by role IDs',
          items: { type: 'string' },
        },
        filterStatus: {
          type: 'array',
          description: 'Filter by status: active, pending, deleted',
          items: { type: 'string' },
        },
        orFilters: {
          type: 'array',
          description: 'Fields to apply OR operator: id, name, email, autodeskId, status, accessLevels',
          items: { type: 'string' },
        },
        filterTextMatch: { type: 'string', description: 'Text match mode: contains, startsWith, endsWith, equals' },
        sort: {
          type: 'array',
          description: 'Sort fields with optional asc/desc',
          items: { type: 'string' },
        },
        fields: {
          type: 'array',
          description: 'Fields to include in response',
          items: { type: 'string' },
        },
        limit: { type: 'number', description: 'Max results (1-200, default 20)' },
        offset: { type: 'number', description: 'Pagination offset (default 0)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_project_user',
    description: 'Get a specific user in a project (2LO/3LO auth, user context optional)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, no b. prefix)' },
        userId: { type: 'string', description: 'User ID (UUID or Autodesk ID)' },
        fields: {
          type: 'array',
          description: 'Fields to include in response',
          items: { type: 'string' },
        },
      },
      required: ['projectId', 'userId'],
    },
  },
  {
    name: 'add_project_user',
    description: 'Assign a user to a project with roles and products (POST, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, no b. prefix)' },
        email: { type: 'string', description: 'User email (required, max 255)' },
        companyId: { type: 'string', description: 'Company ID for user representation in project' },
        roleIds: {
          type: 'array',
          description: 'Role IDs to assign to user',
          items: { type: 'string' },
        },
        products: {
          type: 'array',
          description: 'Products to grant access to',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Product key (required): build, docs, cost, etc.' },
              access: { type: 'string', description: 'Access level (required): administrator, member, none' },
            },
            required: ['key', 'access'],
          },
        },
        suppressAdministrativeEmails: { type: 'boolean', description: 'Suppress project invite emails (default false)' },
      },
      required: ['projectId', 'email'],
    },
  },
  {
    name: 'import_project_users',
    description: 'Bulk import up to 200 users to a project (POST, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, no b. prefix)' },
        users: {
          type: 'array',
          description: 'Array of users to import (max 200)',
          items: {
            type: 'object',
            properties: {
              firstName: { type: 'string', description: 'First name (max 255)' },
              lastName: { type: 'string', description: 'Last name (max 255)' },
              email: { type: 'string', description: 'Email (required, max 255)' },
              userId: { type: 'string', description: 'User ID (not relevant)' },
              companyId: { type: 'string', description: 'Company ID for user representation' },
              roleIds: {
                type: 'array',
                description: 'Role IDs to assign to user',
                items: { type: 'string' },
              },
              products: {
                type: 'array',
                description: 'Products to grant access to',
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string', description: 'Product key (required)' },
                    access: { type: 'string', description: 'Access level (required): administrator, member, none' },
                  },
                  required: ['key', 'access'],
                },
              },
            },
            required: ['email'],
          },
        },
        suppressAdministrativeEmails: { type: 'boolean', description: 'Suppress project invite emails (default false)' },
      },
      required: ['projectId', 'users'],
    },
  },
  {
    name: 'update_project_user',
    description: 'Update user in project (roles, company, products, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, no b. prefix)' },
        userId: { type: 'string', description: 'User ID (UUID or Autodesk ID)' },
        companyId: { type: 'string', description: 'Company ID for user representation in project' },
        companyName: { type: 'string', description: 'Company name (max 255)' },
        roleIds: {
          type: 'array',
          description: 'Role IDs to assign to user',
          items: { type: 'string' },
        },
        products: {
          type: 'array',
          description: 'Products to grant access to',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Product key (required)' },
              access: { type: 'string', description: 'Access level (required): administrator, member, none' },
            },
            required: ['key', 'access'],
          },
        },
      },
      required: ['projectId', 'userId'],
    },
  },
  {
    name: 'remove_project_user',
    description: 'Remove user from a project (DELETE, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, no b. prefix)' },
        userId: { type: 'string', description: 'User ID (UUID or Autodesk ID)' },
      },
      required: ['projectId', 'userId'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handleHubAdminTool(name, args) {
  switch (name) {
    case 'list_projects': {
      let path = `/construction/admin/v1/accounts/${args.accountId}/projects`;
      const params = [];

      if (args.fields) params.push(`fields=${args.fields.join(',')}`);
      if (args.filterClassification) params.push(`filter[classification]=${args.filterClassification.join(',')}`);
      if (args.filterPlatform) params.push(`filter[platform]=${args.filterPlatform.join(',')}`);
      if (args.filterProducts) params.push(`filter[products]=${args.filterProducts.join(',')}`);
      if (args.filterName) params.push(`filter[name]=${encodeURIComponent(args.filterName)}`);
      if (args.filterType) params.push(`filter[type]=${args.filterType.join(',')}`);
      if (args.filterStatus) params.push(`filter[status]=${args.filterStatus.join(',')}`);
      if (args.filterBusinessUnitId) params.push(`filter[businessUnitId]=${args.filterBusinessUnitId}`);
      if (args.filterJobNumber) params.push(`filter[jobNumber]=${encodeURIComponent(args.filterJobNumber)}`);
      if (args.filterUpdatedAt) params.push(`filter[updatedAt]=${encodeURIComponent(args.filterUpdatedAt)}`);
      if (args.filterTextMatch) params.push(`filterTextMatch=${args.filterTextMatch}`);
      if (args.sort) params.push(`sort=${args.sort.join(',')}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_project': {
      let path = `/construction/admin/v1/projects/${args.projectId}`;
      if (args.fields) path += `?fields=${args.fields.join(',')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'create_project': {
      const path = `/construction/admin/v1/accounts/${args.accountId}/projects`;
      const body = {
        name: args.name,
        type: args.type,
      };

      if (args.classification) body.classification = args.classification;
      if (args.startDate) body.startDate = args.startDate;
      if (args.endDate) body.endDate = args.endDate;
      if (args.jobNumber) body.jobNumber = args.jobNumber;
      if (args.addressLine1) body.addressLine1 = args.addressLine1;
      if (args.addressLine2) body.addressLine2 = args.addressLine2;
      if (args.city) body.city = args.city;
      if (args.stateOrProvince) body.stateOrProvince = args.stateOrProvince;
      if (args.postalCode) body.postalCode = args.postalCode;
      if (args.country) body.country = args.country;
      if (args.latitude) body.latitude = args.latitude;
      if (args.longitude) body.longitude = args.longitude;
      if (args.timezone) body.timezone = args.timezone;
      if (args.constructionType) body.constructionType = args.constructionType;
      if (args.deliveryMethod) body.deliveryMethod = args.deliveryMethod;
      if (args.contractType) body.contractType = args.contractType;
      if (args.currentPhase) body.currentPhase = args.currentPhase;
      if (args.businessUnitId) body.businessUnitId = args.businessUnitId;
      if (args.projectValue) body.projectValue = args.projectValue;
      if (args.templateProjectId) {
        body.template = { projectId: args.templateProjectId };
      }

      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_project_image': {
      const path = `/hq/v1/accounts/${args.accountId}/projects/${args.projectId}/image`;

      // For image upload, we need to send multipart form data
      // Since apiRequest sends JSON, we'll need to create a custom implementation
      // For now, return a message indicating this needs special handling
      return `Image upload not yet supported via this interface. Use multipart/form-data with chunk field containing base64 image data.`;
    }

    case 'create_company': {
      const path = `/hq/v1/accounts/${args.accountId}/companies`;
      const body = {
        name: args.name,
        trade: args.trade,
      };

      if (args.addressLine1) body.address_line_1 = args.addressLine1;
      if (args.addressLine2) body.address_line_2 = args.addressLine2;
      if (args.city) body.city = args.city;
      if (args.stateOrProvince) body.state_or_province = args.stateOrProvince;
      if (args.postalCode) body.postal_code = args.postalCode;
      if (args.country) body.country = args.country;
      if (args.phone) body.phone = args.phone;
      if (args.websiteUrl) body.website_url = args.websiteUrl;
      if (args.description) body.description = args.description;
      if (args.erpId) body.erp_id = args.erpId;
      if (args.taxId) body.tax_id = args.taxId;

      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'import_companies': {
      const path = `/hq/v1/accounts/${args.accountId}/companies/import`;
      const body = args.companies.map(company => {
        const item = {
          name: company.name,
          trade: company.trade,
        };

        if (company.addressLine1) item.address_line_1 = company.addressLine1;
        if (company.addressLine2) item.address_line_2 = company.addressLine2;
        if (company.city) item.city = company.city;
        if (company.stateOrProvince) item.state_or_province = company.stateOrProvince;
        if (company.postalCode) item.postal_code = company.postalCode;
        if (company.country) item.country = company.country;
        if (company.phone) item.phone = company.phone;
        if (company.websiteUrl) item.website_url = company.websiteUrl;
        if (company.description) item.description = company.description;
        if (company.erpId) item.erp_id = company.erpId;
        if (company.taxId) item.tax_id = company.taxId;

        return item;
      });

      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_companies': {
      let path = `/construction/admin/v1/accounts/${args.accountId}/companies`;
      const params = [];

      if (args.filterName) params.push(`filter[name]=${encodeURIComponent(args.filterName)}`);
      if (args.filterTrade) params.push(`filter[trade]=${encodeURIComponent(args.filterTrade)}`);
      if (args.filterErpId) params.push(`filter[erpId]=${encodeURIComponent(args.filterErpId)}`);
      if (args.filterTaxId) params.push(`filter[taxId]=${encodeURIComponent(args.filterTaxId)}`);
      if (args.filterUpdatedAt) params.push(`filter[updatedAt]=${encodeURIComponent(args.filterUpdatedAt)}`);
      if (args.filterStatus) params.push(`filter[status]=${args.filterStatus}`);
      if (args.orFilters) params.push(`orFilters=${args.orFilters.join(',')}`);
      if (args.filterTextMatch) params.push(`filterTextMatch=${args.filterTextMatch}`);
      if (args.sort) params.push(`sort=${args.sort.join(',')}`);
      if (args.fields) params.push(`fields=${args.fields.join(',')}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_company': {
      const path = `/hq/v1/accounts/${args.accountId}/companies/${args.companyId}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'search_companies': {
      let path = `/hq/v1/accounts/${args.accountId}/companies/search`;
      const params = [];

      if (args.name) params.push(`name=${encodeURIComponent(args.name)}`);
      if (args.trade) params.push(`trade=${encodeURIComponent(args.trade)}`);
      if (args.operator) params.push(`operator=${args.operator}`);
      if (args.partial !== undefined) params.push(`partial=${args.partial}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);
      if (args.sort) params.push(`sort=${args.sort}`);
      if (args.field) params.push(`field=${args.field}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_project_companies': {
      let path = `/hq/v1/accounts/${args.accountId}/projects/${args.projectId}/companies`;
      const params = [];

      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);
      if (args.sort) params.push(`sort=${args.sort}`);
      if (args.field) params.push(`field=${args.field}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_company': {
      const path = `/hq/v1/accounts/${args.accountId}/companies/${args.companyId}`;
      const body = {};

      if (args.name) body.name = args.name;
      if (args.trade) body.trade = args.trade;
      if (args.addressLine1) body.address_line_1 = args.addressLine1;
      if (args.addressLine2) body.address_line_2 = args.addressLine2;
      if (args.city) body.city = args.city;
      if (args.stateOrProvince) body.state_or_province = args.stateOrProvince;
      if (args.postalCode) body.postal_code = args.postalCode;
      if (args.country) body.country = args.country;
      if (args.phone) body.phone = args.phone;
      if (args.websiteUrl) body.website_url = args.websiteUrl;
      if (args.description) body.description = args.description;
      if (args.erpId) body.erp_id = args.erpId;
      if (args.taxId) body.tax_id = args.taxId;

      const data = await apiRequest('PATCH', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_company_image': {
      const path = `/hq/v1/accounts/${args.accountId}/companies/${args.companyId}/image`;

      // For image upload, we need to send multipart form data
      // Since apiRequest sends JSON, we'll need to create a custom implementation
      // For now, return a message indicating this needs special handling
      return `Image upload not yet supported via this interface. Use multipart/form-data with chunk field containing base64 image data.`;
    }

    case 'create_user': {
      const path = `/hq/v1/accounts/${args.accountId}/users`;
      const body = { email: args.email };

      if (args.companyId) body.company_id = args.companyId;
      if (args.nickname) body.nickname = args.nickname;
      if (args.firstName) body.first_name = args.firstName;
      if (args.lastName) body.last_name = args.lastName;
      if (args.imageUrl) body.image_url = args.imageUrl;
      if (args.addressLine1) body.address_line_1 = args.addressLine1;
      if (args.addressLine2) body.address_line_2 = args.addressLine2;
      if (args.city) body.city = args.city;
      if (args.stateOrProvince) body.state_or_province = args.stateOrProvince;
      if (args.postalCode) body.postal_code = args.postalCode;
      if (args.country) body.country = args.country;
      if (args.phone) body.phone = args.phone;
      if (args.company) body.company = args.company;
      if (args.jobTitle) body.job_title = args.jobTitle;
      if (args.industry) body.industry = args.industry;
      if (args.aboutMe) body.about_me = args.aboutMe;
      if (args.defaultRole) body.default_role = args.defaultRole;

      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'import_users': {
      const path = `/hq/v1/accounts/${args.accountId}/users/import`;
      const body = args.users.map(user => {
        const item = { email: user.email };

        if (user.companyId) item.company_id = user.companyId;
        if (user.nickname) item.nickname = user.nickname;
        if (user.firstName) item.first_name = user.firstName;
        if (user.lastName) item.last_name = user.lastName;
        if (user.imageUrl) item.image_url = user.imageUrl;
        if (user.addressLine1) item.address_line_1 = user.addressLine1;
        if (user.addressLine2) item.address_line_2 = user.addressLine2;
        if (user.city) item.city = user.city;
        if (user.stateOrProvince) item.state_or_province = user.stateOrProvince;
        if (user.postalCode) item.postal_code = user.postalCode;
        if (user.country) item.country = user.country;
        if (user.phone) item.phone = user.phone;
        if (user.company) item.company = user.company;
        if (user.jobTitle) item.job_title = user.jobTitle;
        if (user.industry) item.industry = user.industry;
        if (user.aboutMe) item.about_me = user.aboutMe;
        if (user.defaultRole) item.default_role = user.defaultRole;

        return item;
      });

      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_users': {
      let path = `/hq/v1/accounts/${args.accountId}/users`;
      const params = [];

      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);
      if (args.sort) params.push(`sort=${args.sort}`);
      if (args.field) params.push(`field=${args.field}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_user': {
      const path = `/hq/v1/accounts/${args.accountId}/users/${args.userId}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_user_projects': {
      let path = `/construction/admin/v1/accounts/${args.accountId}/users/${args.userId}/projects`;
      const params = [];

      if (args.filterIds) params.push(`filter[id]=${args.filterIds.join(',')}`);
      if (args.fields) params.push(`fields=${args.fields.join(',')}`);
      if (args.filterClassification) params.push(`filter[classification]=${args.filterClassification.join(',')}`);
      if (args.filterName) params.push(`filter[name]=${encodeURIComponent(args.filterName)}`);
      if (args.filterPlatform) params.push(`filter[platform]=${args.filterPlatform.join(',')}`);
      if (args.filterStatus) params.push(`filter[status]=${args.filterStatus.join(',')}`);
      if (args.filterType) params.push(`filter[type]=${args.filterType.join(',')}`);
      if (args.filterJobNumber) params.push(`filter[jobNumber]=${encodeURIComponent(args.filterJobNumber)}`);
      if (args.filterUpdatedAt) params.push(`filter[updatedAt]=${encodeURIComponent(args.filterUpdatedAt)}`);
      if (args.filterAccessLevels) params.push(`filter[accessLevels]=${args.filterAccessLevels.join(',')}`);
      if (args.filterTextMatch) params.push(`filterTextMatch=${args.filterTextMatch}`);
      if (args.sort) params.push(`sort=${args.sort.join(',')}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_user_products': {
      let path = `/construction/admin/v1/accounts/${args.accountId}/users/${args.userId}/products`;
      const params = [];

      if (args.filterProjectIds) params.push(`filter[projectId]=${args.filterProjectIds.join(',')}`);
      if (args.filterKeys) params.push(`filter[key]=${args.filterKeys.join(',')}`);
      if (args.fields) params.push(`fields=${args.fields.join(',')}`);
      if (args.sort) params.push(`sort=${args.sort.join(',')}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_user_roles': {
      let path = `/construction/admin/v1/accounts/${args.accountId}/users/${args.userId}/roles`;
      const params = [];

      if (args.filterProjectIds) params.push(`filter[projectId]=${args.filterProjectIds.join(',')}`);
      if (args.filterStatus) params.push(`filter[status]=${args.filterStatus.join(',')}`);
      if (args.filterName) params.push(`filter[name]=${encodeURIComponent(args.filterName)}`);
      if (args.filterTextMatch) params.push(`filterTextMatch=${args.filterTextMatch}`);
      if (args.fields) params.push(`fields=${args.fields.join(',')}`);
      if (args.sort) params.push(`sort=${args.sort.join(',')}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'search_users': {
      let path = `/hq/v1/accounts/${args.accountId}/users/search`;
      const params = [];

      if (args.name) params.push(`name=${encodeURIComponent(args.name)}`);
      if (args.email) params.push(`email=${encodeURIComponent(args.email)}`);
      if (args.companyName) params.push(`company_name=${encodeURIComponent(args.companyName)}`);
      if (args.operator) params.push(`operator=${args.operator}`);
      if (args.partial !== undefined) params.push(`partial=${args.partial}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);
      if (args.sort) params.push(`sort=${args.sort}`);
      if (args.field) params.push(`field=${args.field}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_user': {
      const path = `/hq/v1/accounts/${args.accountId}/users/${args.userId}`;
      const body = {};

      if (args.status) body.status = args.status;
      if (args.companyId) body.company_id = args.companyId;
      if (args.defaultRole) body.default_role = args.defaultRole;

      const data = await apiRequest('PATCH', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_project_users': {
      let path = `/construction/admin/v1/projects/${args.projectId}/users`;
      const params = [];

      if (args.filterProducts) params.push(`filter[products]=${args.filterProducts.join(',')}`);
      if (args.filterName) params.push(`filter[name]=${encodeURIComponent(args.filterName)}`);
      if (args.filterEmail) params.push(`filter[email]=${encodeURIComponent(args.filterEmail)}`);
      if (args.filterAccessLevels) params.push(`filter[accessLevels]=${args.filterAccessLevels.join(',')}`);
      if (args.filterAddedOn) params.push(`filter[addedOn]=${args.filterAddedOn}`);
      if (args.filterCompanyId) params.push(`filter[companyId]=${args.filterCompanyId}`);
      if (args.filterCompanyName) params.push(`filter[companyName]=${encodeURIComponent(args.filterCompanyName)}`);
      if (args.filterAutodeskIds) params.push(`filter[autodeskId]=${args.filterAutodeskIds.join(',')}`);
      if (args.filterIds) params.push(`filter[id]=${args.filterIds.join(',')}`);
      if (args.filterRoleId) params.push(`filter[roleId]=${args.filterRoleId}`);
      if (args.filterRoleIds) params.push(`filter[roleIds]=${args.filterRoleIds.join(',')}`);
      if (args.filterStatus) params.push(`filter[status]=${args.filterStatus.join(',')}`);
      if (args.orFilters) params.push(`orFilters=${args.orFilters.join(',')}`);
      if (args.filterTextMatch) params.push(`filterTextMatch=${args.filterTextMatch}`);
      if (args.sort) params.push(`sort=${args.sort.join(',')}`);
      if (args.fields) params.push(`fields=${args.fields.join(',')}`);
      if (args.limit) params.push(`limit=${args.limit}`);
      if (args.offset !== undefined) params.push(`offset=${args.offset}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'get_project_user': {
      let path = `/construction/admin/v1/projects/${args.projectId}/users/${args.userId}`;

      if (args.fields) path += `?fields=${args.fields.join(',')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'add_project_user': {
      const path = `/construction/admin/v1/projects/${args.projectId}/users`;
      const body = { email: args.email };

      if (args.companyId) body.companyId = args.companyId;
      if (args.roleIds) body.roleIds = args.roleIds;
      if (args.products) body.products = args.products;
      if (args.suppressAdministrativeEmails !== undefined) body.suppressAdministrativeEmails = args.suppressAdministrativeEmails;

      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'import_project_users': {
      let path = `/construction/admin/v2/projects/${args.projectId}/users:import`;
      if (args.suppressAdministrativeEmails !== undefined) {
        path += `?suppressAdministrativeEmails=${args.suppressAdministrativeEmails}`;
      }
      // API expects array directly as body (not wrapped in object)
      const data = await apiRequest('POST', path, args.users);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'update_project_user': {
      const path = `/construction/admin/v1/projects/${args.projectId}/users/${args.userId}`;
      const body = {};

      if (args.companyId) body.companyId = args.companyId;
      if (args.companyName) body.companyName = args.companyName;
      if (args.roleIds) body.roleIds = args.roleIds;
      if (args.products) body.products = args.products;

      const data = await apiRequest('PATCH', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'remove_project_user': {
      const path = `/construction/admin/v1/projects/${args.projectId}/users/${args.userId}`;

      const data = await apiRequest('DELETE', path);
      if (typeof data === 'string') return data;
      return data;
    }

    default:
      return `Unknown hub admin tool: ${name}`;
  }
}
