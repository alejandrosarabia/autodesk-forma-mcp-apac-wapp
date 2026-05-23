/**
 * WhatsApp webhook — Express route registration for Meta Cloud API.
 *
 * Two endpoints:
 *   GET  /webhook/whatsapp   ← one-time verification handshake from Meta
 *   POST /webhook/whatsapp   ← inbound messages (and status callbacks)
 *
 * Meta retries failed deliveries for up to 24 hours if we don't return 2xx
 * within ~20s, so the POST handler responds 200 IMMEDIATELY and processes
 * the message asynchronously.
 *
 * Payload shape we expect (Cloud API v21):
 *   {
 *     object: "whatsapp_business_account",
 *     entry: [{
 *       changes: [{
 *         value: {
 *           messaging_product: "whatsapp",
 *           metadata: { phone_number_id, display_phone_number },
 *           contacts: [{ wa_id, profile: { name } }],
 *           messages: [
 *             { from, id, timestamp, type: "text",  text:  { body } },
 *             { from, id, timestamp, type: "image", image: { id, mime_type, caption? } },
 *             ...
 *           ],
 *           statuses: [ ... ]   ← delivery/read receipts, we ignore these
 *         }
 *       }]
 *     }]
 *   }
 */

import { handleIncomingMessage, logBotStartup } from './bot.js';

export function registerWhatsappRoutes(app) {
  app.get('/webhook/whatsapp', handleVerify);
  app.post('/webhook/whatsapp', handleMessage);
  logBotStartup();
}

function handleVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expected = process.env.META_WHATSAPP_VERIFY_TOKEN;
  if (!expected) {
    console.error('[whatsapp] META_WHATSAPP_VERIFY_TOKEN not set — rejecting verify');
    res.sendStatus(500);
    return;
  }

  if (mode === 'subscribe' && token === expected) {
    console.log('[whatsapp] webhook verified');
    res.status(200).send(String(challenge ?? ''));
    return;
  }

  console.warn('[whatsapp] webhook verification failed', { mode, tokenMatches: token === expected });
  res.sendStatus(403);
}

function handleMessage(req, res) {
  // Acknowledge IMMEDIATELY so Meta doesn't retry.
  res.sendStatus(200);

  const entries = req.body?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;
      const messages = value.messages || [];

      for (const msg of messages) {
        // Fire-and-forget; never await — the response is already sent.
        handleIncomingMessage(msg, { phoneNumberId }).catch(err => {
          console.error('[whatsapp] uncaught error in handleIncomingMessage', err);
        });
      }
    }
  }
}
