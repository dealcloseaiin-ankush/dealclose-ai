const express = require('express');
const router = express.Router();
const { supabaseAuth } = require('../controllers/authController');
const { updateSettings } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// Route for handling Google Login sync
router.post('/supabase-auth', supabaseAuth);

// Route for saving setup/settings (Protected with token)
router.post('/settings', protect, updateSettings);

module.exports = router;