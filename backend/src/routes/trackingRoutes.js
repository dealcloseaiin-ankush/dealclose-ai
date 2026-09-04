const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/event', trackingController.recordEvent);
router.post('/view-card', trackingController.recordCardView);
router.post('/click-link', trackingController.clickLink);
router.get('/logs', protect, trackingController.getLogs);
router.get('/link-analytics', protect, trackingController.getLinkAnalytics);

module.exports = router;