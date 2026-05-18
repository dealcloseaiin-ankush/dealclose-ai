const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); 

// @route   GET /api/users/profile
router.get('/profile', protect, getProfile);

// @route   PUT /api/users/profile
router.put('/profile', protect, updateProfile);

module.exports = router;