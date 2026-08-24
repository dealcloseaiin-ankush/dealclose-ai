const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, getStaff, addStaff, deleteStaff } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); 

// @route   GET /api/users/profile
router.get('/profile', protect, getProfile);

// @route   PUT /api/users/profile
router.put('/profile', protect, updateProfile);

// Staff Management Routes
router.get('/staff', protect, getStaff);
router.post('/staff', protect, addStaff);
router.delete('/staff/:staffId', protect, deleteStaff);

module.exports = router;