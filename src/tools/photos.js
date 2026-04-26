/**
 * Photos tools — Photo and video retrieval and search.
 *
 * Tools: get_photo, filter_photos
 *
 * Autodesk Photos API v1. Paths:
 *   /construction/photos/v1/projects/{projectId}/photos/{photoId}
 *   /construction/photos/v1/projects/{projectId}/photos:filter
 *
 * All endpoints use 3LO auth (user context required).
 */

import { apiRequest } from '../auth/router.js';

// ─── Tool definitions ─────────────────────────────────────────────────────────

export const photoTools = [
  {
    name: 'get_photo',
    description: 'Get a single photo or video by ID (3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID)' },
        photoId: { type: 'string', description: 'Photo/video ID (UUID, required)' },
        include: {
          type: 'array',
          description: 'Extra fields to include: signedUrls',
          items: { type: 'string' },
        },
      },
      required: ['projectId', 'photoId'],
    },
  },
  {
    name: 'filter_photos',
    description: 'Search and filter photos/videos in a project (POST, 3LO auth)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (UUID, required)' },
        cursorState: { type: 'string', description: 'Cursor token for pagination' },
        filterIds: {
          type: 'array',
          description: 'Filter by photo/video IDs',
          items: { type: 'string' },
        },
        filterCreatedAt: { type: 'string', description: 'Filter by creation date range (ISO 8601 or range format)' },
        filterCreatedBy: {
          type: 'array',
          description: 'Filter by creator Autodesk IDs',
          items: { type: 'string' },
        },
        filterMediaType: {
          type: 'array',
          description: 'Filter by media type: NORMAL, INFRARED, PHOTOSPHERE, VIDEO',
          items: { type: 'string' },
        },
        filterTakenAt: { type: 'string', description: 'Filter by capture date range (ISO 8601 or range format)' },
        filterTitle: { type: 'string', description: 'Filter by title' },
        include: {
          type: 'array',
          description: 'Extra fields to include: signedUrls',
          items: { type: 'string' },
        },
        limit: { type: 'number', description: 'Max results per page (1-50, default 25)' },
        sort: {
          type: 'array',
          description: 'Sort by field and direction (e.g. ["createdAt", "asc"])',
          items: { type: 'string' },
        },
      },
      required: ['projectId'],
    },
  },
];

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function handlePhotoTool(name, args) {
  switch (name) {
    case 'get_photo': {
      let path = `/construction/photos/v1/projects/${args.projectId}/photos/${args.photoId}`;
      const params = [];

      if (args.include) params.push(`include=${args.include.join(',')}`);

      if (params.length > 0) path += `?${params.join('&')}`;

      const data = await apiRequest('GET', path);
      if (typeof data === 'string') return data;
      return data;
    }

    case 'filter_photos': {
      const path = `/construction/photos/v1/projects/${args.projectId}/photos:filter`;
      const body = {};

      if (args.cursorState) body.cursorState = args.cursorState;

      // Build filter object if any filter parameters provided
      const filter = {};
      if (args.filterIds) filter.id = args.filterIds;
      if (args.filterCreatedAt) filter.createdAt = args.filterCreatedAt;
      if (args.filterCreatedBy) filter.createdBy = args.filterCreatedBy;
      if (args.filterMediaType) filter.mediaType = args.filterMediaType;
      if (args.filterTakenAt) filter.takenAt = args.filterTakenAt;
      if (args.filterTitle) filter.title = args.filterTitle;

      if (Object.keys(filter).length > 0) body.filter = filter;

      if (args.include) body.include = args.include;
      if (args.limit) body.limit = args.limit;
      if (args.sort) body.sort = args.sort;

      const data = await apiRequest('POST', path, body);
      if (typeof data === 'string') return data;
      return data;
    }

    default:
      return `Unknown photo tool: ${name}`;
  }
}
