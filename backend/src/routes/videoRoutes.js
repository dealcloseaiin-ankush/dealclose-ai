const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');

// Image Generation Route
router.post('/generate-image', videoController.generateImage);

// Image to Video Animation Route
router.post('/animate-image', videoController.animateImage);

// 🚀 Complete End-to-End AI Product Video Ad Pipeline
router.post('/generate-product-ad', videoController.createProductAdPipeline);

module.exports = router;