const express = require('express');
const router = express.Router();
const trackerController = require('../controllers/trackerController');

// Public route for the tracking pixel
router.post('/', trackerController.trackEvent);

module.exports = router;