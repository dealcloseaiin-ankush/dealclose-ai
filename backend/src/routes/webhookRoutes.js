const express = require('express');
const router = express.Router();

const whatsappController = require('../controllers/whatsapp.webhook.controller');
const instagramController = require('../controllers/instagram.webhook.controller');
const exotelController = require('../controllers/exotel.webhook.controller');
const universalController = require('../controllers/universal.webhook.controller');

// Exotel (Voice Calls)
router.post('/voice', exotelController.handleIncomingVoice);
router.post('/voice/respond', exotelController.handleVoiceRespond);

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

module.exports = router;
