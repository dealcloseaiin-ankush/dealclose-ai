const express = require('express');
const router = express.Router();
const { getBillingSummary } = require('../controllers/billingController');
const { protect } = require('../middleware/authMiddleware'); // Assuming you have auth middleware

// GET /api/billing/summary
router.get('/summary', protect, getBillingSummary);

module.exports = router;