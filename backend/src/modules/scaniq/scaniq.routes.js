const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const scaniqController = require('./scaniq.controller');
const { scanLimiter } = require('./rateLimit.middleware'); // 5 scans/month limiter

// Configure Multer to save uploaded screenshots in the local public/uploads folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'scaniq-' + uniqueSuffix + path.extname(file.originalname));
  }
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