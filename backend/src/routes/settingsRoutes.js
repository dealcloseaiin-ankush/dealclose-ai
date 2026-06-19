const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authController = require('../controllers/authController');
const googleSheetsController = require('../controllers/googleSheetsController');
const { protect } = require('../middleware/authMiddleware');

// --- Auth Routes ---
router.post('/login', authController.supabaseAuth);

// --- Settings & Integration Routes ---
router.get('/settings', protect, settingsController.getSettings);
router.post('/settings', protect, settingsController.saveSettings);
router.post('/settings/whatsapp-connect', protect, authController.whatsappConnect);
router.post('/settings/instagram-connect', protect, authController.instagramConnect);
router.post('/settings/meta-connect', protect, settingsController.connectMetaAccount); // For Embedded Signup

// --- Google Sheets Integration (Premium Only) ---
router.get('/google/auth-url', protect, googleSheetsController.getAuthUrl);
router.post('/google/connect', protect, googleSheetsController.connectGoogleAccount);

module.exports = router;