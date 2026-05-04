const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// --- Auth Routes ---
router.post('/supabase-auth', authController.supabaseAuth);

// --- Settings & Integration Routes ---
router.get('/settings', protect, settingsController.getSettings);
router.post('/settings', protect, settingsController.saveSettings);

module.exports = router;