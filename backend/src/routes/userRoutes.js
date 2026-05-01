const express = require('express');
const router = express.Router();
const { supabaseAuth } = require('../controllers/authController');

// Route for handling Google Login sync
router.post('/supabase-auth', supabaseAuth);

module.exports = router;