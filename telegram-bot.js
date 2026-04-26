/**
 * Telegram Bot — Autodesk Construction Cloud
 *
 * Connects Telegram users to the ACC MCP tools via Claude as the AI layer.
 * Claude receives the user's natural language message, decides which tools
 * to call, executes them against the existing MCP tool handlers, and returns
 * a formatted reply.
 *
 * Usage:
 *   node telegram-bot.js
 *
 * Required env vars (add to .env):
 *   TELEGRAM_BOT_TOKEN   — from @BotFather
 *   TELEGRAM_ALLOWED_USERS — comma-separated Telegram user IDs (whitelist)
 *   ANTHROPIC_API_KEY    — from console.anthropic.com
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { Telegraf } from 'telegraf';
import { get as httpsGet } from 'node:https';
import { get as httpGet } from 'node:http';

import { projectTools, handleProjectTool }               from './src/tools/projects.js';
import { documentTools, handleDocumentTool }             from './src/tools/documents.js';
import { issueTools, handleIssueTool }                   from './src/tools/issues.js';
import { rfiTools, handleRfiTool }                       from './src/tools/rfis.js';
import { formTools, handleFormTool }                     from './src/tools/forms.js';
import { permissionTools, handlePermissionTool }         from './src/tools/permissions.js';
import { assetTools, handleAssetTool }                   from './src/tools/assets.js';
import { submittalTools, handleSubmittalTool }           from './src/tools/submittals.js';
import { dataConnectorTools, handleDataConnectorTool }   from './src/tools/data-connector.js';
import { costTools, handleCostTool }                     from './src/tools/cost.js';
import { takeoffTools, handleTakeoffTool }               from './src/tools/takeoff.js';
import { reviewsTools, handleReviewsTool }               from './src/tools/reviews.js';
import { transmittalTools, handleTransmittalTool }       from './src/tools/transmittals.js';
import { relationshipTools, handleRelationshipTool }     from './src/tools/relationships.js';
import { hubAdminTools, handleHubAdminTool }             from './src/tools/hub-admin.js';
import { locationTools, handleLocationTool }             from './src/tools/locations.js';
import { photoTools, handlePhotoTool }                   from './src/tools/photos.js';
import { sheetTools, handleSheetTool }                   from './src/tools/sheets.js';
import { modelCoordinationTools, handleModelCoordinationTool } from './src/tools/model-coordination.js';
import { modelPropertiesTools, handleModelPropertiesTool }     from './src/tools/model-properties.js';
import { autospecsTools, handleAutospecsTool }           from './src/tools/autospecs.js';
import { authTools, handleAuthTool }                     from './src/tools/auth.js';
import { apiRequest, withBPrefix }                       from './src/auth/router.js';
import { randomUUID }                                    from 'node:crypto';
import fetch                                             from 'node-fetch';

// ─── Tool registry (mirrors src/index.js) ─────────────────────────────────────

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
  ...permissionTools,
];

const TOOL_HANDLERS = new Map();

for (const t of authTools)               TOOL_HANDLERS.set(t.name, () => handleAuthTool(t.name));
for (const t of projectTools)            TOOL_HANDLERS.set(t.name, (a) => handleProjectTool(t.name, a));
for (const t of documentTools)           TOOL_HANDLERS.set(t.name, (a) => handleDocumentTool(t.name, a));
for (const t of issueTools)              TOOL_HANDLERS.set(t.name, (a) => handleIssueTool(t.name, a));
for (const t of rfiTools)               TOOL_HANDLERS.set(t.name, (a) => handleRfiTool(t.name, a));
for (const t of formTools)              TOOL_HANDLERS.set(t.name, (a) => handleFormTool(t.name, a));
for (const t of assetTools)             TOOL_HANDLERS.set(t.name, (a) => handleAssetTool(t.name, a));
for (const t of submittalTools)         TOOL_HANDLERS.set(t.name, (a) => handleSubmittalTool(t.name, a));
for (const t of dataConnectorTools)     TOOL_HANDLERS.set(t.name, (a) => handleDataConnectorTool(t.name, a));
for (const t of costTools)              TOOL_HANDLERS.set(t.name, (a) => handleCostTool(t.name, a));
for (const t of takeoffTools)           TOOL_HANDLERS.set(t.name, (a) => handleTakeoffTool(t.name, a));
for (const t of reviewsTools)           TOOL_HANDLERS.set(t.name, (a) => handleReviewsTool(t.name, a));
for (const t of transmittalTools)       TOOL_HANDLERS.set(t.name, (a) => handleTransmittalTool(t.name, a));
for (const t of relationshipTools)      TOOL_HANDLERS.set(t.name, (a) => handleRelationshipTool(t.name, a));
for (const t of hubAdminTools)          TOOL_HANDLERS.set(t.name, (a) => handleHubAdminTool(t.name, a));
for (const t of locationTools)          TOOL_HANDLERS.set(t.name, (a) => handleLocationTool(t.name, a));
for (const t of photoTools)             TOOL_HANDLERS.set(t.name, (a) => handlePhotoTool(t.name, a));
for (const t of sheetTools)             TOOL_HANDLERS.set(t.name, (a) => handleSheetTool(t.name, a));
for (const t of modelCoordinationTools) TOOL_HANDLERS.set(t.name, (a) => handleModelCoordinationTool(t.name, a));
for (const t of modelPropertiesTools)   TOOL_HANDLERS.set(t.name, (a) => handleModelPropertiesTool(t.name, a));
for (const t of autospecsTools)         TOOL_HANDLERS.set(t.name, (a) => handleAutospecsTool(t.name, a));
for (const t of permissionTools)        TOOL_HANDLERS.set(t.name, (a) => handlePermissionTool(t.name, a));

// ─── Convert MCP inputSchema → Claude input_schema ────────────────────────────

function sanitizeSchema(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  const result = { ...schema };
  if (result.properties) {
    const clean = {};
    for (const [key, val] of Object.entries(result.properties)) {
      if (/^[a-zA-Z0-9_.\-]{1,64}$/.test(key)) {
        clean[key] = sanitizeSchema(val);
      }
    }
    result.properties = clean;
    if (result.required) {
      result.required = result.required.filter(k => clean[k] !== undefined);
    }
  }
  return result;
}

// ─── Tool categories for two-phase routing ────────────────────────────────────
// Phase 1: Claude picks a category. Phase 2: only those tools are sent.
// This keeps each API call small and fast.

const TOOL_CATEGORIES = {
  auth:              { tools: authTools,              handler: (n) => () => handleAuthTool(n) },
  projects:          { tools: projectTools,           handler: (n) => (a) => handleProjectTool(n, a) },
  documents:         { tools: documentTools,          handler: (n) => (a) => handleDocumentTool(n, a) },
  issues:            { tools: issueTools,             handler: (n) => (a) => handleIssueTool(n, a) },
  rfis:              { tools: rfiTools,               handler: (n) => (a) => handleRfiTool(n, a) },
  forms:             { tools: formTools,              handler: (n) => (a) => handleFormTool(n, a) },
  assets:            { tools: assetTools,             handler: (n) => (a) => handleAssetTool(n, a) },
  submittals:        { tools: submittalTools,         handler: (n) => (a) => handleSubmittalTool(n, a) },
  data_connector:    { tools: dataConnectorTools,     handler: (n) => (a) => handleDataConnectorTool(n, a) },
  cost:              { tools: costTools,              handler: (n) => (a) => handleCostTool(n, a) },
  takeoff:           { tools: takeoffTools,           handler: (n) => (a) => handleTakeoffTool(n, a) },
  reviews:           { tools: reviewsTools,           handler: (n) => (a) => handleReviewsTool(n, a) },
  transmittals:      { tools: transmittalTools,       handler: (n) => (a) => handleTransmittalTool(n, a) },
  relationships:     { tools: relationshipTools,      handler: (n) => (a) => handleRelationshipTool(n, a) },
  hub_admin:         { tools: hubAdminTools,          handler: (n) => (a) => handleHubAdminTool(n, a) },
  locations:         { tools: locationTools,          handler: (n) => (a) => handleLocationTool(n, a) },
  photos:            { tools: photoTools,             handler: (n) => (a) => handlePhotoTool(n, a) },
  sheets:            { tools: sheetTools,             handler: (n) => (a) => handleSheetTool(n, a) },
  model_coordination:{ tools: modelCoordinationTools, handler: (n) => (a) => handleModelCoordinationTool(n, a) },
  model_properties:  { tools: modelPropertiesTools,   handler: (n) => (a) => handleModelPropertiesTool(n, a) },
  autospecs:         { tools: autospecsTools,         handler: (n) => (a) => handleAutospecsTool(n, a) },
  permissions:       { tools: permissionTools,        handler: (n) => (a) => handlePermissionTool(n, a) },
};

// ─── Custom bot-only tool: upload_photo_to_issue ──────────────────────────────
// This tool bridges Telegram photos → ACC issue attachments. Only available in the bot.

const uploadPhotoTool = {
  name: 'upload_photo_to_issue',
  description: 'Upload the photo the user just sent in Telegram as an attachment to an ACC issue. The photo must have been sent in the current conversation. Call this AFTER creating or identifying the issue.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID (with or without b. prefix)' },
      issueId: { type: 'string', description: 'UUID of the issue to attach the photo to' },
      displayName: { type: 'string', description: 'Filename for the attachment, e.g. "defect-photo.jpg"' },
    },
    required: ['projectId', 'issueId'],
  },
};

// Add it to the issues category
TOOL_CATEGORIES.issues.tools.push(uploadPhotoTool);

// Build a compact summary of each category for Phase 1
const CATEGORY_SUMMARY = Object.entries(TOOL_CATEGORIES).map(([key, val]) => {
  const names = val.tools.map(t => t.name).join(', ');
  return `• ${key}: ${names}`;
}).join('\n');

// The Phase 1 routing tool — Claude picks one or more categories
const ROUTER_TOOL = {
  name: 'select_tool_categories',
  description: 'Select which tool categories are needed to answer the user\'s question. Pick the minimum set needed.',
  input_schema: {
    type: 'object',
    properties: {
      categories: {
        type: 'array',
        items: { type: 'string', enum: Object.keys(TOOL_CATEGORIES) },
        description: 'The tool categories needed',
      },
      plan: {
        type: 'string',
        description: 'Brief plan of what you\'ll do with these tools',
      },
    },
    required: ['categories'],
  },
};

// ─── Access control ───────────────────────────────────────────────────────────

const ALLOWED_USERS = new Set(
  (process.env.TELEGRAM_ALLOWED_USERS || '')
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(Boolean)
);

const ALLOWED_GROUPS = new Set(
  (process.env.TELEGRAM_ALLOWED_GROUPS || '')
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(Boolean)
);

/** Check if a message is authorized */
function isAuthorized(ctx) {
  const chatType = ctx.chat.type;
  // DMs: check user whitelist
  if (chatType === 'private') {
    return ALLOWED_USERS.has(ctx.from.id);
  }
  // Groups: allow if group is whitelisted, OR if no groups are configured (open to any group the bot is in)
  if (chatType === 'group' || chatType === 'supergroup') {
    return ALLOWED_GROUPS.size === 0 || ALLOWED_GROUPS.has(ctx.chat.id);
  }
  return false;
}

/** Check if the bot was mentioned or replied to in a group message */
function isBotAddressed(ctx, botUsername) {
  const chatType = ctx.chat.type;
  if (chatType === 'private') return true; // DMs always addressed

  const text = ctx.message.text || ctx.message.caption || '';

  // Check if @mentioned
  if (text.includes(`@${botUsername}`)) return true;

  // Check if replied to the bot
  if (ctx.message.reply_to_message?.from?.username === botUsername) return true;

  return false;
}

/** Strip bot @mention from message text */
function stripBotMention(text, botUsername) {
  return text.replace(new RegExp(`@${botUsername}\\b`, 'gi'), '').trim();
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Per-chat conversation history (in-memory; resets on bot restart)
const conversations = new Map();

// ─── Photo helpers ────────────────────────────────────────────────────────────

/** Download a file from a URL and return it as a Buffer */
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const getter = url.startsWith('https') ? httpsGet : httpGet;
    getter(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/** Get the highest-resolution photo from a Telegram message and return base64 */
async function downloadTelegramPhoto(ctx) {
  const photos = ctx.message.photo;
  const best = photos[photos.length - 1]; // highest resolution
  const file = await ctx.telegram.getFile(best.file_id);
  const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
  const buffer = await downloadBuffer(url);
  const ext = file.file_path.split('.').pop().toLowerCase();
  const mediaType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  return {
    base64: buffer.toString('base64'),
    mediaType,
    buffer,
    fileName: file.file_path.split('/').pop(),
  };
}

// ─── Pending photo storage (per chat) ─────────────────────────────────────────
// When a user sends a photo, we store the buffer here so the upload tool can use it.
const pendingPhotos = new Map(); // chatId → { buffer, fileName, mediaType }

// ─── OSS upload + issue attachment helper ─────────────────────────────────────

/**
 * Full pipeline: get folder → create OSS storage → upload bytes via signed URL → attach to issue.
 * Returns the attachment result or throws on failure.
 */
async function uploadPhotoToIssue(projectId, issueId, photoBuffer, displayName) {
  const pid = withBPrefix(projectId);
  const accountId = process.env.APS_ACCOUNT_ID;
  const hubId = `b.${accountId}`;
  const uuid = randomUUID();
  const ext = displayName.split('.').pop() || 'jpg';
  const ossFileName = `${uuid}.${ext}`;

  // Step 0: Get a folder URN from the project (needed for storage creation)
  console.log('[upload] Step 0: Getting project folder...');
  const topFolders = await apiRequest('GET', `/project/v1/hubs/${hubId}/projects/${pid}/topFolders`);
  if (typeof topFolders === 'string') throw new Error(`Failed to get folders: ${topFolders}`);
  const folders = topFolders.data || [];
  // Use "Project Files" folder, or fall back to first available folder
  const targetFolder = folders.find(f => f.attributes?.name === 'Project Files') || folders[0];
  if (!targetFolder) throw new Error('No folders found in project');
  const folderUrn = targetFolder.id;
  console.log(`[upload] Using folder: ${targetFolder.attributes?.name} (${folderUrn})`);

  // Step 1: Create storage object in Data Management
  console.log('[upload] Step 1: Creating OSS storage...');
  const storageResp = await apiRequest('POST', `/data/v1/projects/${pid}/storage`, {
    jsonapi: { version: '1.0' },
    data: {
      type: 'objects',
      attributes: { name: ossFileName },
      relationships: {
        target: {
          data: { type: 'folders', id: folderUrn }
        }
      }
    }
  });

  if (typeof storageResp === 'string') throw new Error(`Storage creation failed: ${storageResp}`);
  const storageUrn = storageResp.data?.id;
  if (!storageUrn) throw new Error('No storage URN in response');
  console.log(`[upload] Storage URN: ${storageUrn}`);

  // Parse bucket key and object key from URN: urn:adsk.objects:os.object:{bucket}/{objectKey}
  const urnMatch = storageUrn.match(/^urn:adsk\.objects:os\.object:([^/]+)\/(.+)$/);
  if (!urnMatch) throw new Error(`Cannot parse storage URN: ${storageUrn}`);
  const [, bucketKey, objectKey] = urnMatch;

  // Step 2: Get signed S3 upload URL
  console.log('[upload] Step 2: Getting signed upload URL...');
  const signedResp = await apiRequest('GET',
    `/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3upload`
  );
  if (typeof signedResp === 'string') throw new Error(`Signed URL failed: ${signedResp}`);
  const uploadUrl = signedResp.urls?.[0];
  const uploadKey = signedResp.uploadKey;
  if (!uploadUrl) throw new Error('No upload URL in response');

  // Step 3: PUT file bytes to S3 (no auth header needed)
  console.log(`[upload] Step 3: Uploading ${Math.round(photoBuffer.length / 1024)}KB...`);
  const putResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: photoBuffer,
  });
  if (!putResp.ok) throw new Error(`S3 upload failed: ${putResp.status}`);

  // Step 4: Complete the upload
  console.log('[upload] Step 4: Completing upload...');
  const completeResp = await apiRequest('POST',
    `/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3upload`,
    { uploadKey }
  );
  if (typeof completeResp === 'string') throw new Error(`Upload completion failed: ${completeResp}`);

  // Step 5: Attach to the issue
  console.log('[upload] Step 5: Attaching to issue...');
  const pid2 = projectId.startsWith('b.') ? projectId.slice(2) : projectId;
  const attachResp = await apiRequest('POST',
    `/construction/issues/v1/projects/${pid2}/attachments`,
    {
      domainEntityId: issueId,
      attachments: [{
        attachmentId: uuid,
        displayName: displayName,
        fileName: ossFileName,
        attachmentType: 'issue-attachment',
        storageUrn: storageUrn,
      }],
    }
  );

  console.log('[upload] Done!');
  return attachResp;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Split long text into Telegram-safe chunks (max 4096 chars) */
function splitMessage(text, limit = 4096) {
  const chunks = [];
  while (text.length > limit) {
    chunks.push(text.slice(0, limit));
    text = text.slice(limit);
  }
  if (text) chunks.push(text);
  return chunks;
}

// ─── Phase 1: Route the user's message to the right tool categories ──────────

async function routeMessage(userMessage) {
  const routerSystemPrompt = `You route user requests to the right Autodesk Construction Cloud tool categories.

RULES:
- Be GENEROUS — include ALL categories that MIGHT be needed, not just the obvious one.
- If the user mentions "issues", include both "projects" AND "issues".
- If the user sends a photo or mentions uploading/attaching a photo, include "issues" (it has upload_photo_to_issue).
- If the user mentions "RFIs", include both "projects" AND "rfis".
- If a task involves creating/updating content in a project, ALWAYS include "projects" AND the relevant content category.
- When in doubt, include more categories rather than fewer. Extra categories cost nothing.
- For general greetings or questions not needing tools, pick no categories.

Available categories and their tools:
${CATEGORY_SUMMARY}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: [{ type: 'text', text: routerSystemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userMessage }],
    tools: [ROUTER_TOOL],
    tool_choice: { type: 'tool', name: 'select_tool_categories' },
  });

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'select_tool_categories') {
      console.log(`[route] categories: ${block.input.categories.join(', ')}${block.input.plan ? ' | plan: ' + block.input.plan : ''}`);
      return block.input.categories;
    }
  }
  return [];
}

// ─── Phase 2: Run the agentic loop with only the selected tools ──────────────

async function runAgentLoop(messages, selectedCategories, onToolCall, chatId) {
  // Build tool list and handler map for selected categories only
  const tools = [];
  const handlers = new Map();

  for (const catKey of selectedCategories) {
    const cat = TOOL_CATEGORIES[catKey];
    if (!cat) continue;
    for (const t of cat.tools) {
      // Custom handler for upload_photo_to_issue
      if (t.name === 'upload_photo_to_issue') {
        const claudeTool = {
          name: t.name,
          description: t.description,
          input_schema: sanitizeSchema(t.inputSchema),
        };
        tools.push(claudeTool);
        handlers.set(t.name, async (args) => {
          const photo = pendingPhotos.get(chatId);
          if (!photo) throw new Error('No photo found in this conversation. Ask the user to send a photo first.');
          const name = args.displayName || photo.fileName || 'photo.jpg';
          const result = await uploadPhotoToIssue(args.projectId, args.issueId, photo.buffer, name);
          pendingPhotos.delete(chatId); // clean up after use
          return result;
        });
        continue;
      }

      const claudeTool = {
        name: t.name,
        description: t.description,
        input_schema: sanitizeSchema(t.inputSchema),
      };
      tools.push(claudeTool);
      handlers.set(t.name, cat.handler(t.name));
    }
  }

  console.log(`[phase2] ${tools.length} tools loaded from ${selectedCategories.length} categories`);

  const systemPrompt = `You are an Autodesk Construction Cloud assistant connected to a live ACC environment with FULL access to all loaded tools. You CAN create, update, list, and manage everything that your available tools support — issues, RFIs, forms, submittals, assets, cost, and more. USE the tools provided to fulfill the user's request. Today is ${new Date().toISOString().split('T')[0]}.

Key project IDs:
• Your Project: b.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

RESPONSE FORMAT — always follow this structure when reporting completed actions:
1. Start with a status line: ✅ or ⚠️ + bold title (e.g. "✅ **Issue #84 Created — Wall Crack Defect**")
2. Include a summary table with key fields (ID, Category, Status, Description, dates, assignee, etc.)
3. If a photo/file was attached, mention it with 📎
4. End with a helpful follow-up suggestion (e.g. "Would you like to assign it or set a due date?")
5. Use Telegram markdown formatting: **bold**, bullet points, and clear sections
6. Be thorough and detailed — give the user a complete picture of what happened`;

  // Add cache_control to the last tool so all tool definitions get cached
  if (tools.length > 0) {
    tools[tools.length - 1].cache_control = { type: 'ephemeral' };
  }

  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
      tools: tools.length > 0 ? tools : undefined,
    });

    if (response.stop_reason === 'end_turn') {
      return response;
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        await onToolCall(block.name);

        let resultText;
        try {
          const handler = handlers.get(block.name) || TOOL_HANDLERS.get(block.name);
          if (!handler) throw new Error(`Unknown tool: ${block.name}`);
          const raw = await handler(block.input);
          resultText = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
          // Truncate very large results to avoid token limits
          if (resultText.length > 20000) {
            resultText = resultText.slice(0, 20000) + '\n... [truncated]';
          }
        } catch (err) {
          resultText = `Error: ${err.message}`;
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: resultText,
        });
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    return response;
  }
}

// ─── Bot handlers ─────────────────────────────────────────────────────────────

// Catch errors so bot doesn't crash
bot.catch((err, ctx) => {
  console.error('[bot error]', err.message);
  ctx.reply('Sorry, something went wrong. Try again.').catch(() => {});
});

bot.command('start', (ctx) => {
  if (!isAuthorized(ctx)) return ctx.reply('Not authorized.');
  ctx.reply(
    'Hi! I\'m your Autodesk Construction Cloud assistant.\n\n' +
    'Ask me anything — issues, RFIs, submittals, cost, takeoff, and more.\n\n' +
    'Examples:\n' +
    '• "List all open issues in my project"\n' +
    '• "Create an RFI about the column alignment"\n' +
    '• "What\'s the budget status?"\n\n' +
    '/clear to reset conversation'
  );
});

bot.command('clear', (ctx) => {
  conversations.delete(ctx.chat.id);
  ctx.reply('Conversation cleared.');
});

bot.on('text', async (ctx) => {
  if (!isAuthorized(ctx)) return;
  if (!isBotAddressed(ctx, botUsername)) return; // In groups, ignore unless @mentioned or replied to

  const chatId = ctx.chat.id;
  const userMessage = stripBotMention(ctx.message.text, botUsername);

  if (!conversations.has(chatId)) {
    conversations.set(chatId, []);
  }
  const history = conversations.get(chatId);
  history.push({ role: 'user', content: userMessage });

  await ctx.sendChatAction('typing');

  try {
    // Phase 1: route to categories
    const categories = await routeMessage(userMessage);

    // Phase 2: run with selected tools (or no tools for simple chat)
    const response = await runAgentLoop(history, categories, async (toolName) => {
      await ctx.sendChatAction('typing');
      console.log(`[tool] ${toolName}`);
    }, chatId);

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    if (text) {
      history.push({ role: 'assistant', content: text });
      for (const chunk of splitMessage(text)) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply('Done.');
    }

    // Keep history from growing too large (last 20 messages)
    if (history.length > 20) {
      conversations.set(chatId, history.slice(-20));
    }

  } catch (err) {
    console.error('[error]', err.message);
    await ctx.reply(`Sorry, something went wrong: ${err.message}`);
  }
});

// ─── Photo handler ────────────────────────────────────────────────────────────

bot.on('photo', async (ctx) => {
  if (!isAuthorized(ctx)) return;
  // Photos in groups are always processed (sending a photo to the bot is intentional)

  const chatId = ctx.chat.id;
  const rawCaption = ctx.message.caption || 'The user sent a photo. Describe what you see and ask how you can help.';
  const caption = stripBotMention(rawCaption, botUsername);

  await ctx.sendChatAction('typing');

  try {
    // Download photo from Telegram
    console.log('[photo] Downloading photo from Telegram...');
    const photo = await downloadTelegramPhoto(ctx);
    console.log(`[photo] Downloaded: ${photo.fileName} (${Math.round(photo.buffer.length / 1024)}KB)`);

    // Store photo buffer so upload_photo_to_issue tool can access it
    pendingPhotos.set(chatId, { buffer: photo.buffer, fileName: photo.fileName, mediaType: photo.mediaType });

    if (!conversations.has(chatId)) {
      conversations.set(chatId, []);
    }
    const history = conversations.get(chatId);

    // Add as a multimodal message (image + text)
    history.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: photo.mediaType,
            data: photo.base64,
          },
        },
        {
          type: 'text',
          text: caption,
        },
      ],
    });

    // Route based on caption text
    const categories = await routeMessage(caption);

    const response = await runAgentLoop(history, categories, async (toolName) => {
      await ctx.sendChatAction('typing');
      console.log(`[tool] ${toolName}`);
    }, chatId);

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    if (text) {
      history.push({ role: 'assistant', content: text });
      for (const chunk of splitMessage(text)) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply('Done.');
    }

    if (history.length > 20) {
      conversations.set(chatId, history.slice(-20));
    }

  } catch (err) {
    console.error('[error]', err.message);
    await ctx.reply(`Sorry, something went wrong: ${err.message}`);
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

let botUsername = '';

console.log(`Loaded ${ALL_TOOLS.length} tools across ${Object.keys(TOOL_CATEGORIES).length} categories`);
console.log(`Allowed users (DM): ${[...ALLOWED_USERS].join(', ') || 'none'}`);
console.log(`Allowed groups: ${ALLOWED_GROUPS.size > 0 ? [...ALLOWED_GROUPS].join(', ') : 'any group the bot is added to'}`);

bot.launch().then(async () => {
  const me = await bot.telegram.getMe();
  botUsername = me.username;
  console.log(`Bot @${botUsername} started. In groups, @ mention me or reply to me.`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
