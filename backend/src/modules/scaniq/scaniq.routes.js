const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const scaniqController = require('./scaniq.controller');
const { scanLimiter } = require('./rateLimit.middleware'); // 5 scans/month limiter
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dealclose_scaniq', // Cloudinary me is folder me save hoga
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// --- SCANIQ ROUTES --- //

// 1. Upload Screenshot (Protected by Rate Limiter)
router.post('/screenshot', scanLimiter, upload.single('file'), scaniqController.scanScreenshot);

// 2. Scan via URL (Protected by Rate Limiter)
router.post('/url', scanLimiter, scaniqController.scanUrl);

// 3. Search and Compare Ads (Protected by Rate Limiter)
router.post('/search', scanLimiter, scaniqController.searchAd);

// 4. Get results of a scan (Polling)
router.get('/:scanId', scaniqController.getScanResult);

module.exports = router;