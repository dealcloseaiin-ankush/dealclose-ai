const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// FORCE FIX: Ensured 'middleware' folder name has no 's'
const { protect } = require('../middleware/authMiddleware'); 

router.post('/generate', protect, campaignController.generateCampaign);
router.get('/', protect, campaignController.getCampaigns);

module.exports = router;