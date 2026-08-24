const express = require('express');
const router = express.Router();

const whatsappController = require('../controllers/whatsapp.webhook.controller');
const instagramController = require('../controllers/instagram.webhook.controller');
const exotelController = require('../controllers/exotel.webhook.controller');
const universalController = require('../controllers/universal.webhook.controller');
const twilioWebhookController = require('../controllers/twilio.webhook.controller');

// Exotel (Voice Calls)
router.post('/voice', exotelController.handleIncomingVoice);
router.post('/voice/respond', exotelController.handleVoiceRespond);

// Twilio (Fast Voice Streams & IVR)
router.post('/twilio/voice', twilioWebhookController.handleTwilioVoice);
router.post('/twilio/ivr', twilioWebhookController.handleTwilioIVR);
router.post('/twilio/ivr-gather', twilioWebhookController.handleTwilioIVRGather);
router.post('/twilio/whisper', twilioWebhookController.handleTwilioWhisper);

// WhatsApp (Meta)
router.get('/whatsapp', whatsappController.verifyWhatsAppWebhook);
router.post('/whatsapp', whatsappController.handleWhatsApp);

// Instagram
router.get('/instagram', instagramController.verifyInstagramWebhook);
router.post('/instagram', instagramController.handleInstagramWebhook);

// Universal (Shopify, Vyapar, etc.)
router.post('/universal', universalController.handleUniversalData);

// Outbound CRM Webhook (NewPropertyHub Broadcast)
router.post('/outbound', universalController.handleOutboundMessage);

// Meta Privacy & Compliance Webhooks
router.post('/meta-deauthorize', whatsappController.handleMetaDeauthorize);
router.post('/meta-data-deletion', whatsappController.handleMetaDataDeletion);

module.exports = router;
