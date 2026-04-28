const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Meta WhatsApp API Webhooks (For Auto-reply, Images, Property extraction)
router.get('/whatsapp', webhookController.verifyWhatsAppWebhook); // Meta Verification
router.post('/whatsapp', webhookController.handleWhatsApp);       // Message Handling

// Twilio Voice API Webhooks (For AI Outbound & Inbound Calls)
router.post('/voice', webhookController.handleIncomingVoice);
router.post('/voice/respond', webhookController.handleVoiceRespond);

// Universal Webhook (For Shopify, Vyapar, Insiya, Custom Website data)
router.post('/universal', webhookController.handleUniversalData);

module.exports = router;