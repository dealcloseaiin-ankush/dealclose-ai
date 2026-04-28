const express = require('express');
const router = express.Router();
const { generateVideo, getVideoStatus, createVideoFromImage, generateAudio, generateImage, animateImage, generateLipSync, getLibraryAssets } = require('../controllers/videoController');

router.post('/generate', generateVideo);
router.post('/from-image', createVideoFromImage);
router.get('/status/:id', getVideoStatus);

// New AI Pipeline Routes
router.post('/generate-audio', generateAudio);
router.post('/generate-image', generateImage);
router.post('/animate-image', animateImage);
router.post('/generate-lipsync', generateLipSync);
router.get('/library', getLibraryAssets);

module.exports = router;