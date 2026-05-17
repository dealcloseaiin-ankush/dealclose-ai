const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');

// Image Generation Route
router.post('/generate-image', videoController.generateImage);

// Image to Video Animation Route
router.post('/animate-image', videoController.animateImage);

module.exports = router;