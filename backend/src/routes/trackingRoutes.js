const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/event', trackingController.recordEvent);
router.get('/logs', protect, trackingController.getLogs);

module.exports = router;