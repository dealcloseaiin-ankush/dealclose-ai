const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authController = require('../controllers/authController');

// --- Auth Routes ---
router.post('/supabase-auth', authController.supabaseAuth);

// --- Settings & Integration Routes ---
// Make sure to add your auth protection middleware here in the future
router.post('/settings', settingsController.saveSettings);

module.exports = router;