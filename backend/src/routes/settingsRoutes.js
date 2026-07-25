const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authController = require('../controllers/authController');
const googleSheetsController = require('../controllers/googleSheetsController');
const { protect } = require('../middleware/authMiddleware');

// --- Auth Routes ---
router.post('/login', authController.supabaseAuth);

// --- Settings & Integration Routes ---
router.get('/', protect, settingsController.getSettings);
router.post('/', protect, settingsController.saveSettings);
router.post('/whatsapp-connect', protect, authController.whatsappConnect);
router.post('/instagram-connect', protect, authController.instagramConnect);
router.post('/instagram-connect-selected', protect, authController.instagramConnectSelected);
router.post('/instagram-basic-connect', protect, authController.instagramBasicConnect);
router.post('/meta-connect', protect, settingsController.connectMetaAccount); // For Embedded Signup
router.post('/instagram-disconnect', protect, settingsController.instagramDisconnect);
router.post('/whatsapp-disconnect', protect, settingsController.whatsappDisconnect);

// --- Google Sheets Integration (Premium Only) ---
router.get('/google/auth-url', protect, googleSheetsController.getAuthUrl);
router.post('/google/connect', protect, googleSheetsController.connectGoogleAccount);

module.exports = router;