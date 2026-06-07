const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');
const { protect } = require('../middleware/authMiddleware');

// --- Dashboard Routes (Called by Frontend React) ---
router.get('/dashboard', protect, instagramController.getDashboardData);

module.exports = router;