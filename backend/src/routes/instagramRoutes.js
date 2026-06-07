const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');
const { protect } = require('../middleware/authMiddleware');

// --- Webhook Routes (Called directly by Meta, no protection needed) ---
router.get('/webhook', instagramController.verifyWebhook);
router.post('/webhook', instagramController.handleWebhook);

// --- Dashboard Routes (Called by Frontend React) ---
router.get('/dashboard', protect, instagramController.getDashboardData);

module.exports = router;