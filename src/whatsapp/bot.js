/**
 * WhatsApp Bot — Autodesk Construction Cloud
 *
 * Mirrors telegram-bot.js but driven by Meta WhatsApp Cloud API webhooks
 * instead of Telegraf long-polling. Uses the same two-phase routing pattern
 * with Claude Haiku 4.5: phase 1 picks tool categories, phase 2 runs the
 * agent loop with only those tools.
 *
 * Entry point: handleIncomingMessage(message, metadata) — called by the
 * webhook handler for each inbound message.
 */

import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';
import fetch from 'node-fetch';

import { projectTools, handleProjectTool }                     from '../tools/projects.js';
import { documentTools, handleDocumentTool }                   from '../tools/documents.js';
import { issueTools, handleIssueTool }                         from '../tools/issues.js';
import { rfiTools, handleRfiTool }                             from '../tools/rfis.js';
import { formTools, handleFormTool }                           from '../tools/forms.js';
import { permissionTools, handlePermissionTool }               from '../tools/permissions.js';
import { assetTools, handleAssetTool }                         from '../tools/assets.js';
import { submittalTools, handleSubmittalTool }                 from '../tools/submittals.js';
import { dataConnectorTools, handleDataConnectorTool }         from '../tools/data-connector.js';
import { costTools, handleCostTool }                           from '../tools/cost.js';
import { takeoffTools, handleTakeoffTool }                     from '../tools/takeoff.js';
import { reviewsTools, handleReviewsTool }                     from '../tools/reviews.js';
import { transmittalTools, handleTransmittalTool }             from '../tools/transmittals.js';
import { relationshipTools, handleRelationshipTool }           from '../tools/relationships.js';
import { hubAdminTools, handleHubAdminTool }                   from '../tools/hub-admin.js';
import { locationTools, handleLocationTool }                   from '../tools/locations.js';
import { photoTools, handlePhotoTool }                         from '../tools/photos.js';
import { sheetTools, handleSheetTool }                         from '../tools/sheets.js';
import { modelCoordinationTools, handleModelCoordinationTool } from '../tools/model-coordination.js';
import { modelPropertiesTools, handleModelPropertiesTool }     from '../tools/model-properties.js';
import { autospecsTools, handleAutospecsTool }                 from '../tools/autospecs.js';
import { authTools, handleAuthTool }                           from '../tools/auth.js';
import { apiRequest, withBPrefix }                             from '../auth/router.js';

import {
  sendText,
  getMediaUrl,
  downloadMedia,
  sendTypingIndicator,
} from './client.js';

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

// NOTE: 'auth' is intentionally excluded — end users must never see auth URLs
// or be asked to authenticate. Auth is managed by the server admin only.
const TOOL_CATEGORIES = {
  projects:          { tools: [...projectTools],           handler: (n) => (a) => handleProjectTool(n, a) },
  documents:         { tools: [...documentTools],          handler: (n) => (a) => handleDocumentTool(n, a) },
  issues:            { tools: [...issueTools],             handler: (n) => (a) => handleIssueTool(n, a) },
  rfis:              { tools: [...rfiTools],               handler: (n) => (a) => handleRfiTool(n, a) },
  forms:             { tools: [...formTools],              handler: (n) => (a) => handleFormTool(n, a) },
  assets:            { tools: [...assetTools],             handler: (n) => (a) => handleAssetTool(n, a) },
  submittals:        { tools: [...submittalTools],         handler: (n) => (a) => handleSubmittalTool(n, a) },
  data_connector:    { tools: [...dataConnectorTools],     handler: (n) => (a) => handleDataConnectorTool(n, a) },
  cost:              { tools: [...costTools],              handler: (n) => (a) => handleCostTool(n, a) },
  takeoff:           { tools: [...takeoffTools],           handler: (n) => (a) => handleTakeoffTool(n, a) },
  reviews:           { tools: [...reviewsTools],           handler: (n) => (a) => handleReviewsTool(n, a) },
  transmittals:      { tools: [...transmittalTools],       handler: (n) => (a) => handleTransmittalTool(n, a) },
  relationships:     { tools: [...relationshipTools],      handler: (n) => (a) => handleRelationshipTool(n, a) },
  hub_admin:         { tools: [...hubAdminTools],          handler: (n) => (a) => handleHubAdminTool(n, a) },
  locations:         { tools: [...locationTools],          handler: (n) => (a) => handleLocationTool(n, a) },
  photos:            { tools: [...photoTools],             handler: (n) => (a) => handlePhotoTool(n, a) },
  sheets:            { tools: [...sheetTools],             handler: (n) => (a) => handleSheetTool(n, a) },
  model_coordination:{ tools: [...modelCoordinationTools], handler: (n) => (a) => handleModelCoordinationTool(n, a) },
  model_properties:  { tools: [...modelPropertiesTools],   handler: (n) => (a) => handleModelPropertiesTool(n, a) },
  autospecs:         { tools: [...autospecsTools],         handler: (n) => (a) => handleAutospecsTool(n, a) },
  permissions:       { tools: [...permissionTools],        handler: (n) => (a) => handlePermissionTool(n, a) },
};

// ─── Custom bot-only tool: upload_photo_to_issue ──────────────────────────────

const uploadPhotoTool = {
  name: 'upload_photo_to_issue',
  description: 'Upload the photo the user just sent in WhatsApp as an attachment to an ACC issue. The photo must have been sent in the current conversation. Call this AFTER creating or identifying the issue.',
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

TOOL_CATEGORIES.issues.tools.push(uploadPhotoTool);

const CATEGORY_SUMMARY = Object.entries(TOOL_CATEGORIES).map(([key, val]) => {
  const names = val.tools.map(t => t.name).join(', ');
  return `• ${key}: ${names}`;
}).join('\n');

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
// E.164 numbers in env can be stored with or without leading +; we normalize
// by stripping it. WhatsApp's `from` field never has the +.

const ALLOWED_NUMBERS = new Set(
  (process.env.WHATSAPP_ALLOWED_NUMBERS || '')
    .split(',')
    .map(n => n.trim().replace(/^\+/, ''))
    .filter(Boolean)
);

function isAuthorized(from) {
  return ALLOWED_NUMBERS.has(from);
}

// Normalize WhatsApp's per-country quirks so the `from` we use everywhere
// (whitelist, recipient of outbound replies) matches what Meta's outbound
// whitelist accepts. Today we handle:
//   • Mexico (52): WhatsApp prefixes mobiles with a historical "1" in webhooks
//                  but Meta's "To" list stores them without it.
//                  +5218119148454 (inbound) → +528119148454 (outbound)
function normalizeWhatsappNumber(from) {
  if (from.length === 13 && from.startsWith('521')) {
    return '52' + from.slice(3);
  }
  return from;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Per-sender conversation history (in-memory; resets on process restart)
const conversations = new Map(); // from → messages[]

// Pending photo bytes keyed by sender — populated when an image arrives so the
// upload_photo_to_issue tool can find it on the next turn.
const pendingPhotos = new Map(); // from → { buffer, fileName, mediaType }

// ─── OSS upload + issue attachment helper (identical to telegram-bot.js) ─────

async function uploadPhotoToIssue(projectId, issueId, photoBuffer, displayName) {
  const pid = withBPrefix(projectId);
  const accountId = process.env.APS_ACCOUNT_ID;
  const hubId = `b.${accountId}`;
  const uuid = randomUUID();
  const ext = displayName.split('.').pop() || 'jpg';
  const ossFileName = `${uuid}.${ext}`;

  console.log('[upload] Step 0: Getting project folder...');
  const topFolders = await apiRequest('GET', `/project/v1/hubs/${hubId}/projects/${pid}/topFolders`);
  if (typeof topFolders === 'string') throw new Error(`Failed to get folders: ${topFolders}`);
  const folders = topFolders.data || [];
  const targetFolder = folders.find(f => f.attributes?.name === 'Project Files') || folders[0];
  if (!targetFolder) throw new Error('No folders found in project');
  const folderUrn = targetFolder.id;
  console.log(`[upload] Using folder: ${targetFolder.attributes?.name} (${folderUrn})`);

  console.log('[upload] Step 1: Creating OSS storage...');
  const storageResp = await apiRequest('POST', `/data/v1/projects/${pid}/storage`, {
    jsonapi: { version: '1.0' },
    data: {
      type: 'objects',
      attributes: { name: ossFileName },
      relationships: { target: { data: { type: 'folders', id: folderUrn } } },
    },
  });
  if (typeof storageResp === 'string') throw new Error(`Storage creation failed: ${storageResp}`);
  const storageUrn = storageResp.data?.id;
  if (!storageUrn) throw new Error('No storage URN in response');
  console.log(`[upload] Storage URN: ${storageUrn}`);

  const urnMatch = storageUrn.match(/^urn:adsk\.objects:os\.object:([^/]+)\/(.+)$/);
  if (!urnMatch) throw new Error(`Cannot parse storage URN: ${storageUrn}`);
  const [, bucketKey, objectKey] = urnMatch;

  console.log('[upload] Step 2: Getting signed upload URL...');
  const signedResp = await apiRequest('GET',
    `/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3upload`
  );
  if (typeof signedResp === 'string') throw new Error(`Signed URL failed: ${signedResp}`);
  const uploadUrl = signedResp.urls?.[0];
  const uploadKey = signedResp.uploadKey;
  if (!uploadUrl) throw new Error('No upload URL in response');

  console.log(`[upload] Step 3: Uploading ${Math.round(photoBuffer.length / 1024)}KB...`);
  const putResp = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: photoBuffer,
  });
  if (!putResp.ok) throw new Error(`S3 upload failed: ${putResp.status}`);

  console.log('[upload] Step 4: Completing upload...');
  const completeResp = await apiRequest('POST',
    `/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(objectKey)}/signeds3upload`,
    { uploadKey }
  );
  if (typeof completeResp === 'string') throw new Error(`Upload completion failed: ${completeResp}`);

  console.log('[upload] Step 5: Attaching to issue...');
  const pid2 = projectId.startsWith('b.') ? projectId.slice(2) : projectId;
  const attachResp = await apiRequest('POST',
    `/construction/issues/v1/projects/${pid2}/attachments`,
    {
      domainEntityId: issueId,
      attachments: [{
        attachmentId: uuid,
        displayName,
        fileName: ossFileName,
        attachmentType: 'issue-attachment',
        storageUrn,
      }],
    }
  );

  console.log('[upload] Done!');
  return attachResp;
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
- NEVER select "auth" — authentication is handled by the server admin, not end users.

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

// ─── History repair ───────────────────────────────────────────────────────────
// If a previous turn threw mid-loop, the history may end with an orphaned
// assistant(tool_use) + user(tool_result) pair that was never followed by an
// assistant text response.  Sending that to Claude causes a 400 error on the
// *next* user turn.  This function strips those trailing orphaned pairs so
// every conversation always ends with a clean user or assistant text message.

function repairHistory(messages) {
  while (messages.length >= 2) {
    const last = messages[messages.length - 1];
    const prev = messages[messages.length - 2];

    const lastHasToolResult = Array.isArray(last.content) &&
      last.content.some(b => b.type === 'tool_result');
    const prevHasToolUse = Array.isArray(prev.content) &&
      prev.content.some(b => b.type === 'tool_use');

    if (last.role === 'user' && lastHasToolResult &&
        prev.role === 'assistant' && prevHasToolUse) {
      console.warn('[history] Removing orphaned tool_use/tool_result pair from history');
      messages.splice(messages.length - 2, 2);
    } else {
      break;
    }
  }
  // Also remove a lone trailing assistant tool_use with no following tool_result
  if (messages.length >= 1) {
    const last = messages[messages.length - 1];
    const lastHasToolUse = Array.isArray(last.content) &&
      last.content.some(b => b.type === 'tool_use');
    if (last.role === 'assistant' && lastHasToolUse) {
      console.warn('[history] Removing lone trailing assistant tool_use from history');
      messages.pop();
    }
  }
}

// ─── Phase 2: Agent loop with only the selected tools ────────────────────────

async function runAgentLoop(messages, selectedCategories, onToolCall, from) {
  const tools = [];
  const handlers = new Map();

  for (const catKey of selectedCategories) {
    const cat = TOOL_CATEGORIES[catKey];
    if (!cat) continue;
    for (const t of cat.tools) {
      if (t.name === 'upload_photo_to_issue') {
        tools.push({
          name: t.name,
          description: t.description,
          input_schema: sanitizeSchema(t.inputSchema),
        });
        handlers.set(t.name, async (args) => {
          const photo = pendingPhotos.get(from);
          if (!photo) throw new Error('No photo found in this conversation. Ask the user to send a photo first.');
          const name = args.displayName || photo.fileName || 'photo.jpg';
          const result = await uploadPhotoToIssue(args.projectId, args.issueId, photo.buffer, name);
          pendingPhotos.delete(from);
          return result;
        });
        continue;
      }

      tools.push({
        name: t.name,
        description: t.description,
        input_schema: sanitizeSchema(t.inputSchema),
      });
      handlers.set(t.name, cat.handler(t.name));
    }
  }

  console.log(`[phase2] ${tools.length} tools loaded from ${selectedCategories.length} categories`);

  const systemPrompt = `You are an Autodesk Construction Cloud field assistant operating over WhatsApp. You have FULL access to live ACC data through your tools. Today is ${new Date().toISOString().split('T')[0]}.

## GOLDEN RULES — never break these

1. **NEVER ask the user for IDs, technical codes, or API values.** Always look them up yourself using the available tools (get_hubs → get_projects, list_issue_types, etc.).
2. **NEVER ask the user for authentication or show auth URLs.** If there is an auth error, reply: "Hay un problema de configuración del sistema, por favor contacta al administrador."
3. **ACT, don't ask.** If the user's intent is clear, execute immediately. Only ask for clarification when two equally valid interpretations exist and the choice truly matters.
4. **Fill required fields automatically.** Use the first available issue type/subtype, status="open", published=true. Do not ask the user to choose a category unless they specified one.

## WORKFLOW FOR CREATING AN ISSUE

When the user asks to create an issue:
1. Call get_hubs → get_projects to find the project (match by name if the user mentioned one, otherwise use the first/only project).
2. Call list_issue_types to get the first available issueTypeId + issueSubtypeId.
3. Call create_issue with: title (from user), issueSubtypeId (from step 2), status="open", published=true, and description if provided. Nothing else is required.
4. If the user sent a photo in this conversation, attach it automatically using upload_photo_to_issue after creating the issue.
5. Report the result — include the real issue ID from the API response.

## RESPONSE FORMAT

Always follow this structure:
1. Status line: ✅ or ⚠️ + *bold title* (e.g. "✅ *Issue #84 Created — Falta pintura*")
2. Key fields summary (ID, Project, Status, Description)
3. 📎 if a photo was attached
4. One short follow-up suggestion
5. Use WhatsApp formatting: *bold*, _italic_, • bullets. Keep it concise.`;

  if (tools.length > 0) {
    tools[tools.length - 1].cache_control = { type: 'ephemeral' };
  }

  // Strip any orphaned tool_use/tool_result pairs left by a previous failed turn
  repairHistory(messages);

  while (true) {
    // Snapshot length so we can roll back if the continuation API call fails
    const snapshotLen = messages.length;

    let response;
    try {
      response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages,
        tools: tools.length > 0 ? tools : undefined,
      });
    } catch (err) {
      // Roll back any messages pushed in this iteration before re-throwing
      messages.splice(snapshotLen);
      throw err;
    }

    if (response.stop_reason === 'end_turn') return response;

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        await onToolCall(block.name);

        let resultText;
        try {
          const handler = handlers.get(block.name);
          if (!handler) throw new Error(`Unknown tool: ${block.name}`);
          const raw = await handler(block.input);
          resultText = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
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

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Process a single inbound WhatsApp message.
 *
 * @param {object} message  Normalized message from the webhook payload.
 *                          See src/whatsapp/webhook.js for the shape.
 *                          Required: { from, id, type } plus type-specific fields.
 * @param {object} _metadata  { phoneNumberId } — not currently used but kept
 *                            so future multi-number support is cheap.
 */
export async function handleIncomingMessage(message, _metadata = {}) {
  const from = normalizeWhatsappNumber(message.from);

  if (!isAuthorized(from)) {
    console.log(`[whatsapp] ignoring message from unauthorized number: ${message.from} (normalized: ${from})`);
    return;
  }

  // Show typing indicator immediately so the user sees we received the message.
  sendTypingIndicator(message.id).catch(() => {});

  try {
    if (message.type === 'text') {
      await handleTextMessage(from, message.text?.body || '');
      return;
    }
    if (message.type === 'image') {
      await handleImageMessage(from, message);
      return;
    }
    await sendText(from, 'Por ahora solo proceso texto e imágenes.');
  } catch (err) {
    console.error('[whatsapp] handler error', err);
    try {
      await sendText(from, `Sorry, something went wrong: ${err.message}`);
    } catch { /* swallow */ }
  }
}

async function handleTextMessage(from, body) {
  if (!body.trim()) return;

  if (!conversations.has(from)) conversations.set(from, []);
  const history = conversations.get(from);
  history.push({ role: 'user', content: body });

  const categories = await routeMessage(body);

  let response;
  try {
    response = await runAgentLoop(history, categories, async (toolName) => {
      console.log(`[tool] ${toolName}`);
    }, from);
  } catch (err) {
    // Clear corrupted history so the next message starts fresh
    console.error(`[whatsapp] runAgentLoop failed, clearing history for ${from}:`, err.message);
    conversations.delete(from);
    throw err;
  }

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  if (text) {
    history.push({ role: 'assistant', content: text });
    await sendText(from, text);
  } else {
    await sendText(from, 'Done.');
  }

  if (history.length > 20) {
    conversations.set(from, history.slice(-20));
  }
}

async function handleImageMessage(from, message) {
  const mediaId = message.image?.id;
  if (!mediaId) {
    await sendText(from, 'No pude leer la imagen, intenta de nuevo.');
    return;
  }
  const caption = (message.image?.caption || '').trim()
    || 'The user sent a photo. Describe what you see and ask how you can help.';

  console.log('[photo] Fetching media URL from Meta...');
  const meta = await getMediaUrl(mediaId);
  console.log(`[photo] Downloading ${meta.mime_type} (${meta.file_size} bytes)...`);
  const buffer = await downloadMedia(meta.url);

  const mediaType = meta.mime_type || 'image/jpeg';
  const ext = mediaType.split('/').pop().split(';')[0] || 'jpg';
  const fileName = `${mediaId}.${ext === 'jpeg' ? 'jpg' : ext}`;

  pendingPhotos.set(from, { buffer, fileName, mediaType });

  if (!conversations.has(from)) conversations.set(from, []);
  const history = conversations.get(from);

  history.push({
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: buffer.toString('base64'),
        },
      },
      { type: 'text', text: caption },
    ],
  });

  const categories = await routeMessage(caption);

  const response = await runAgentLoop(history, categories, async (toolName) => {
    console.log(`[tool] ${toolName}`);
  }, from);

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  if (text) {
    history.push({ role: 'assistant', content: text });
    await sendText(from, text);
  } else {
    await sendText(from, 'Done.');
  }

  if (history.length > 20) {
    conversations.set(from, history.slice(-20));
  }
}

// ─── Diagnostics (called by webhook on boot) ─────────────────────────────────

export function logBotStartup() {
  const cats = Object.keys(TOOL_CATEGORIES).length;
  const tools = Object.values(TOOL_CATEGORIES).reduce((sum, c) => sum + c.tools.length, 0);
  console.log(`[whatsapp] bot ready — ${tools} tools across ${cats} categories`);
  console.log(`[whatsapp] allowed numbers: ${[...ALLOWED_NUMBERS].join(', ') || '(none — bot will silently drop all messages)'}`);
}
