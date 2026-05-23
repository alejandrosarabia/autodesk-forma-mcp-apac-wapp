/**
 * Meta WhatsApp Cloud API — outbound client
 *
 * Thin wrapper around the Graph API for sending messages, fetching media URLs,
 * downloading media bytes, and showing typing indicators.
 *
 * All functions read credentials lazily from process.env so .env is loaded
 * before any call is made.
 */

import fetch from 'node-fetch';

const GRAPH_HOST = 'https://graph.facebook.com';

function apiVersion() {
  return process.env.META_WHATSAPP_API_VERSION || 'v21.0';
}

function accessToken() {
  const t = process.env.META_WHATSAPP_ACCESS_TOKEN;
  if (!t) throw new Error('META_WHATSAPP_ACCESS_TOKEN is not set');
  return t;
}

function phoneNumberId() {
  const id = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error('META_WHATSAPP_PHONE_NUMBER_ID is not set');
  return id;
}

function authHeaders() {
  return {
    'Authorization': `Bearer ${accessToken()}`,
    'Content-Type': 'application/json',
  };
}

/** Split text into WhatsApp-safe chunks (body limit 4096 chars). */
export function splitMessage(text, limit = 4096) {
  const chunks = [];
  while (text.length > limit) {
    chunks.push(text.slice(0, limit));
    text = text.slice(limit);
  }
  if (text) chunks.push(text);
  return chunks;
}

/**
 * Send a text message. Long bodies are split automatically and sent as
 * multiple messages preserving order.
 */
export async function sendText(to, body) {
  const url = `${GRAPH_HOST}/${apiVersion()}/${phoneNumberId()}/messages`;
  const chunks = splitMessage(body);
  const results = [];
  for (const chunk of chunks) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: chunk, preview_url: false },
      }),
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error('[whatsapp] sendText failed', resp.status, json);
      throw new Error(`WhatsApp sendText failed: ${resp.status} ${JSON.stringify(json)}`);
    }
    results.push(json);
  }
  return results;
}

/** Fetch the (short-lived) signed URL for a media id. */
export async function getMediaUrl(mediaId) {
  const url = `${GRAPH_HOST}/${apiVersion()}/${mediaId}`;
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken()}` },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`getMediaUrl failed: ${resp.status} ${text}`);
  }
  return resp.json(); // { url, mime_type, sha256, file_size, id, messaging_product }
}

/** Download bytes from a Meta media URL (requires Bearer header). */
export async function downloadMedia(mediaUrl) {
  const resp = await fetch(mediaUrl, {
    headers: { 'Authorization': `Bearer ${accessToken()}` },
  });
  if (!resp.ok) {
    throw new Error(`downloadMedia failed: ${resp.status}`);
  }
  const arrayBuf = await resp.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/** Mark an incoming message as read (blue ticks). */
export async function markAsRead(messageId) {
  const url = `${GRAPH_HOST}/${apiVersion()}/${phoneNumberId()}/messages`;
  await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  }).catch(err => console.error('[whatsapp] markAsRead error', err.message));
}

/**
 * Show "typing…" in the chat for ~25 seconds. Also marks the message as read.
 * Best-effort: errors are swallowed so the bot keeps working if Meta returns
 * a transient failure.
 */
export async function sendTypingIndicator(messageId) {
  const url = `${GRAPH_HOST}/${apiVersion()}/${phoneNumberId()}/messages`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: { type: 'text' },
      }),
    });
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      console.error('[whatsapp] typing indicator failed', resp.status, j);
    }
  } catch (err) {
    console.error('[whatsapp] typing indicator error', err.message);
  }
}
