/**
 * Permissions tools — all use 2LO.
 *
 * ══════════════════════════════════════════════════════════════════
 * SECTION A — Project Members & Roles  (/hq/v1/ endpoints)
 * ══════════════════════════════════════════════════════════════════
 * Tools: list_project_users, get_project_user, add_project_user,
 *        update_project_user_role, remove_project_user,
 *        list_roles, list_account_users
 *
 * ══════════════════════════════════════════════════════════════════
 * SECTION B — Folder-level Permissions  (/data/v1/ endpoints)
 * ══════════════════════════════════════════════════════════════════
 * Tools: get_folder_permissions, batch_create_folder_permissions,
 *        batch_update_folder_permissions,
 *        get_folder_permissions_recursive  (compound),
 *        audit_user_folder_access          (compound)
 *
 * PERMISSION LEVELS (actions array values):
 *   VIEW        → read-only; can add private markups, create issues
 *   DOWNLOAD    → VIEW + can download files
 *   UPLOAD      → upload only (cannot see folder contents)
 *   COLLABORATE → VIEW + DOWNLOAD + UPLOAD
 *   CONTROL     → full folder admin (manage permissions, title blocks, members)
 *
 * PROJECT ID NOTE:
 *   /data/v1/ endpoints require "b." prefix  → withBPrefix()
 *   /hq/v1/  endpoints use accountId as-is (starts with 'a.')
 */

import { apiRequest, withBPrefix, withoutBPrefix } from '../auth/router.js';
import { paginate } from '../utils/paginate.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const permissionTools = [
  // ── Section A ──────────────────────────────────────────────────────────────
  // Note: list_project_users, get_project_user, add_project_user, remove_project_user,
  // update_project_user, import_project_users are in hub-admin.js (ACC Admin API v1).

  {
    name: 'resolve_user',
    description:
      'Look up a project member by email in one call. ' +
      'Returns { id, autodeskId, email, name, companyId, roleIds } or null if not found. ' +
      'Use autodeskId for Issues/RFIs assignedTo. Use id (UUID) for Admin API and folder permissions.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        email: { type: 'string', description: 'Exact email address to look up' },
      },
      required: ['projectId', 'email'],
    },
  },
  {
    name: 'whoami',
    description:
      'Returns the authenticated user\'s own identity. ' +
      'autodeskId in the response is the short uppercase ID used for Issues/RFIs assignedTo.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'update_project_user_role',
    description: "Update a project member's role. userId = UUID id from list_project_users.",
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        projectId: { type: 'string' },
        userId: { type: 'string', description: 'UUID id (not autodeskId)' },
        roleId: { type: 'string', description: 'New role ID' },
      },
      required: ['accountId', 'projectId', 'userId', 'roleId'],
    },
  },
  {
    name: 'list_roles',
    description: 'List all industry roles defined for a project',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        projectId: { type: 'string' },
      },
      required: ['accountId', 'projectId'],
    },
  },
  {
    name: 'list_account_users',
    description:
      'List users in the account. Returns autodeskId alongside UUID id. ' +
      'Use autodeskId for Issues/RFIs assignedTo. Use id (UUID) for Admin API.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        email: { type: 'string', description: 'Filter by exact email (optional)' },
        limit: { type: 'number', description: 'Max results to return (optional)' },
      },
      required: ['accountId'],
    },
  },

  // ── Section B ──────────────────────────────────────────────────────────────
  // Folder permissions use the BIM360 Docs API: /bim360/docs/v1/projects/{cleanId}/...
  // projectId b. prefix is stripped automatically. folderId is the full URN.
  //
  // Effective permissions = actions ∪ inheritActions.
  // Project admins show inheritActions only on non-root folders.
  //
  // Common action combinations:
  //   View only:                   VIEW, COLLABORATE
  //   View + Download:             VIEW, DOWNLOAD, COLLABORATE
  //   Upload only:                 PUBLISH
  //   View + Download + Upload:    PUBLISH, VIEW, DOWNLOAD, COLLABORATE
  //   View + Download + Upload + Edit: PUBLISH, VIEW, DOWNLOAD, COLLABORATE, EDIT
  //   Full control:                PUBLISH, VIEW, DOWNLOAD, COLLABORATE, EDIT, CONTROL

  {
    name: 'get_folder_permissions',
    description:
      'Get all permission entries for a folder. Each entry includes subjectId, autodeskId, ' +
      'name, email, subjectType, actions (direct), and inheritActions (inherited from parent). ' +
      'Effective access = actions ∪ inheritActions.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        folderId: { type: 'string', description: 'Full folder URN' },
      },
      required: ['projectId', 'folderId'],
    },
  },
  {
    name: 'batch_create_folder_permissions',
    description:
      'Grant new permissions on a folder for users, roles, or companies. ' +
      'Use for subjects with no existing permissions on this folder. ' +
      'Requires CONTROL permission on the folder. ' +
      'Common combos — View only: [VIEW, COLLABORATE]; Full control: [PUBLISH, VIEW, DOWNLOAD, COLLABORATE, EDIT, CONTROL].',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        folderId: { type: 'string' },
        permissions: {
          type: 'array',
          description: 'Array of permission grants',
          items: {
            type: 'object',
            properties: {
              subjectId: { type: 'string', description: 'UUID id (not autodeskId) for USER; roleId or companyId for ROLE/COMPANY' },
              subjectType: { type: 'string', enum: ['USER', 'ROLE', 'COMPANY'] },
              actions: {
                type: 'array',
                items: { type: 'string', enum: ['VIEW', 'DOWNLOAD', 'PUBLISH', 'COLLABORATE', 'EDIT', 'CONTROL', 'PUBLISH_MARKUP'] },
              },
            },
            required: ['subjectId', 'subjectType', 'actions'],
          },
        },
      },
      required: ['projectId', 'folderId', 'permissions'],
    },
  },
  {
    name: 'batch_update_folder_permissions',
    description:
      'Replace existing permission entries on a folder (subject must already have permissions — use batch_create for new subjects). ' +
      'Requires CONTROL permission on the folder.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        folderId: { type: 'string' },
        permissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              subjectId: { type: 'string', description: 'UUID id (not autodeskId) for USER; roleId or companyId for ROLE/COMPANY' },
              subjectType: { type: 'string', enum: ['USER', 'ROLE', 'COMPANY'] },
              actions: {
                type: 'array',
                items: { type: 'string', enum: ['VIEW', 'DOWNLOAD', 'PUBLISH', 'COLLABORATE', 'EDIT', 'CONTROL', 'PUBLISH_MARKUP'] },
              },
            },
            required: ['subjectId', 'subjectType', 'actions'],
          },
        },
      },
      required: ['projectId', 'folderId', 'permissions'],
    },
  },
  {
    name: 'batch_delete_folder_permissions',
    description:
      'Remove direct permissions for users, roles, or companies from a folder. ' +
      'Inherited permissions from parent folders are NOT affected. ' +
      'Project admins cannot have their permissions deleted. ' +
      'Requires CONTROL permission on the folder.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        folderId: { type: 'string' },
        subjects: {
          type: 'array',
          description: 'Subjects whose permissions to remove (no actions field)',
          items: {
            type: 'object',
            properties: {
              subjectId: { type: 'string', description: 'UUID id (not autodeskId) for USER; roleId or companyId for ROLE/COMPANY' },
              subjectType: { type: 'string', enum: ['USER', 'ROLE', 'COMPANY'] },
            },
            required: ['subjectId', 'subjectType'],
          },
        },
      },
      required: ['projectId', 'folderId', 'subjects'],
    },
  },
  {
    name: 'get_folder_permissions_recursive',
    description:
      'Walk a folder tree up to 3 levels deep and return permissions for every folder. ' +
      'Each node includes permissions (direct) + inheritActions per entry. ' +
      'Errors per folder are surfaced as permissionsError, not silently swallowed.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        folderId: { type: 'string', description: 'Root folder to start from (full URN)' },
      },
      required: ['projectId', 'folderId'],
    },
  },
  {
    name: 'audit_user_folder_access',
    description:
      "Show all top-level folders a specific user has explicit permissions on. " +
      "Answers: 'What folders can this user access in the project?' " +
      "userId = UUID id from list_project_users (not autodeskId).",
    inputSchema: {
      type: 'object',
      properties: {
        hubId: { type: 'string', description: 'Hub ID (needed to get top folders)' },
        projectId: { type: 'string' },
        userId: { type: 'string', description: 'UUID id (not autodeskId) from list_project_users' },
      },
      required: ['hubId', 'projectId', 'userId'],
    },
  },
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

function rawProjectId(projectId) {
  // HQ endpoints use raw IDs — strip "b." if caller passed it
  return projectId.startsWith('b.') ? projectId.slice(2) : projectId;
}

/** BIM360 Docs permissions API: strip b. prefix from projectId */
function stripBimPrefix(projectId) {
  return projectId.startsWith('b.') ? projectId.slice(2) : projectId;
}

/**
 * Fetch permissions for a single folder via the BIM360 Docs API.
 * Throws (does NOT return []) on non-200 so callers can propagate the error.
 */
async function getFolderPermissionsRaw(projectId, folderId) {
  const cleanId = stripBimPrefix(projectId);
  const data = await apiRequest(
    'GET',
    `/bim360/docs/v1/projects/${cleanId}/folders/${folderId}/permissions`,
  );
  if (typeof data === 'string') throw new Error(data);
  return Array.isArray(data) ? data : [];
}

async function getFolderContentsRaw(projectId, folderId) {
  const bPid = withBPrefix(projectId);
  const data = await apiRequest(
    'GET',
    `/data/v1/projects/${bPid}/folders/${folderId}/contents?page[limit]=100`,
  );
  if (typeof data === 'string') return [];
  return (data.data || []).filter((item) => item.type === 'folders');
}

async function recursivePermissions(projectId, folderId, folderName, depth) {
  let permissions = [];
  let permissionsError = null;
  try {
    permissions = await getFolderPermissionsRaw(projectId, folderId);
  } catch (err) {
    permissionsError = err.message;
  }

  const node = { folder: folderName, folderId, permissions };
  if (permissionsError) node.permissionsError = permissionsError;

  if (depth < 3) {
    const subfolders = await getFolderContentsRaw(projectId, folderId);
    if (subfolders.length > 0) {
      node.subfolders = await Promise.all(
        subfolders.map((sf) =>
          recursivePermissions(
            projectId,
            sf.id,
            sf.attributes?.displayName || sf.attributes?.name || sf.id,
            depth + 1,
          ),
        ),
      );
    }
  }

  return node;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handlePermissionTool(name, args) {
  switch (name) {
    // ── Section A ────────────────────────────────────────────────────────────

    case 'resolve_user': {
      const { projectId, email } = args;
      const pid = withoutBPrefix(projectId);
      const params = new URLSearchParams({ 'filter[email]': email, limit: '1', offset: '0' });
      const data = await apiRequest(
        'GET',
        `/construction/admin/v1/projects/${pid}/users?${params.toString()}`,
      );
      if (typeof data === 'string') return data;
      const u = (data.results || [])[0];
      if (!u) return null;
      return {
        id: u.id,
        autodeskId: u.autodeskId,
        email: u.email,
        name: u.name,
        companyId: u.companyId,
        roleIds: u.roleIds,
      };
    }

    case 'whoami': {
      const data = await apiRequest('GET', '/userprofile/v1/users/@me');
      if (typeof data === 'string') return data;
      return {
        autodeskId: data.userId,
        email: data.emailId,
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      };
    }

    case 'update_project_user_role': {
      const { accountId, projectId, userId, roleId } = args;
      const pid = rawProjectId(projectId);
      const data = await apiRequest(
        'PATCH',
        `/hq/v1/accounts/${accountId}/projects/${pid}/users/${userId}`,
        { role_id: roleId },
      );
      if (typeof data === 'string') return data;
      return data;
    }

    case 'list_roles': {
      const { accountId, projectId } = args;
      const pid = rawProjectId(projectId);
      const data = await apiRequest(
        'GET',
        `/hq/v2/accounts/${accountId}/projects/${pid}/industry_roles`,
      );
      if (typeof data === 'string') return data;
      const roles = Array.isArray(data) ? data : data.data || [];
      return roles.map((r) => ({
        roleId: r.id,
        name: r.name,
        projectAdmin: r.project_admin,
      }));
    }

    case 'list_account_users': {
      const { accountId, email, limit } = args;

      const users = await paginate(async (offset, pageSize) => {
        const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
        if (email) params.set('email', email);

        const data = await apiRequest(
          'GET',
          `/hq/v1/accounts/${accountId}/users?${params.toString()}`,
        );
        if (typeof data === 'string') throw new Error(data);
        return Array.isArray(data) ? data : data.results || [];
      }, 100);

      const results = users.map((u) => ({
        id: u.id,
        autodeskId: u.uid || u.autodeskId,
        email: u.email,
        name: u.name,
        firstName: u.first_name || u.firstName,
        lastName: u.last_name || u.lastName,
        companyId: u.company_id || u.companyId,
        companyName: u.company_name || u.companyName,
        status: u.status,
        accessLevel: u.access_level,
      }));

      return limit ? results.slice(0, limit) : results;
    }

    // ── Section B ────────────────────────────────────────────────────────────
    // All use /bim360/docs/v1/projects/{cleanId}/... with b. prefix stripped.

    case 'get_folder_permissions': {
      const { projectId, folderId } = args;
      const cleanId = stripBimPrefix(projectId);
      const data = await apiRequest(
        'GET',
        `/bim360/docs/v1/projects/${cleanId}/folders/${folderId}/permissions`,
      );
      if (typeof data === 'string') return data;
      return Array.isArray(data) ? data : [];
    }

    case 'batch_create_folder_permissions': {
      const { projectId, folderId, permissions } = args;
      const cleanId = stripBimPrefix(projectId);
      const data = await apiRequest(
        'POST',
        `/bim360/docs/v1/projects/${cleanId}/folders/${folderId}/permissions:batch-create`,
        permissions,
      );
      if (typeof data === 'string') return data;
      return data.results ?? data;
    }

    case 'batch_update_folder_permissions': {
      const { projectId, folderId, permissions } = args;
      const cleanId = stripBimPrefix(projectId);
      const data = await apiRequest(
        'POST',
        `/bim360/docs/v1/projects/${cleanId}/folders/${folderId}/permissions:batch-update`,
        permissions,
      );
      if (typeof data === 'string') return data;
      return data.results ?? data;
    }

    case 'batch_delete_folder_permissions': {
      const { projectId, folderId, subjects } = args;
      const cleanId = stripBimPrefix(projectId);
      const data = await apiRequest(
        'POST',
        `/bim360/docs/v1/projects/${cleanId}/folders/${folderId}/permissions:batch-delete`,
        subjects,
      );
      if (typeof data === 'string') return data;
      return { success: true };
    }

    case 'get_folder_permissions_recursive': {
      const { projectId, folderId } = args;
      const result = await recursivePermissions(projectId, folderId, folderId, 1);
      return result;
    }

    case 'audit_user_folder_access': {
      const { hubId, projectId, userId } = args;
      const bPid = withBPrefix(projectId);

      // 1. Get top-level folders (Data Management — needs b. prefix)
      const topData = await apiRequest(
        'GET',
        `/project/v1/hubs/${hubId}/projects/${bPid}/topFolders`,
      );
      if (typeof topData === 'string') return topData;
      const topFolders = topData.data || [];

      // 2. For each folder, fetch permissions (BIM360 Docs — strips b. internally)
      const results = await Promise.all(
        topFolders.map(async (folder) => {
          let perms;
          try {
            perms = await getFolderPermissionsRaw(projectId, folder.id);
          } catch {
            return null;
          }
          const userPerms = perms.filter((p) => p.subjectId === userId);
          if (userPerms.length === 0) return null;
          return {
            folder: folder.attributes?.displayName || folder.attributes?.name || folder.id,
            folderId: folder.id,
            permissions: userPerms.map((p) => ({
              subjectType: p.subjectType,
              actions: p.actions,
              inheritActions: p.inheritActions,
            })),
          };
        }),
      );

      const found = results.filter(Boolean);
      if (found.length === 0) {
        return `User ${userId} has no explicit folder permissions in the top-level folders of this project.`;
      }
      return found;
    }

    default:
      return `Unknown permission tool: ${name}`;
  }
}
