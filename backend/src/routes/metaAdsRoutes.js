const express = require('express');
const router = express.Router();
const metaAdsController = require('../controllers/metaAdsController');
const { protect } = require('../middleware/authMiddleware');

router.post('/create-audience', protect, metaAdsController.createAudience);

module.exports = router;