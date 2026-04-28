const express = require('express');
const router = express.Router();
const { handleUniversalPixel, handleShopifyWebhook } = require('../controllers/integrationController');

// Endpoint for Custom Websites JS Pixel
router.post('/pixel/track', handleUniversalPixel);

// Endpoint for Shopify / E-commerce
router.post('/shopify/webhook', handleShopifyWebhook);

module.exports = router;