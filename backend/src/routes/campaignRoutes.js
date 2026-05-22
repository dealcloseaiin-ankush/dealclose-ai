const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { protect } = require('../middlewares/authMiddleware'); // Make sure this middleware exists

router.post('/generate', protect, campaignController.generateCampaign);
router.get('/', protect, campaignController.getCampaigns);

module.exports = router;