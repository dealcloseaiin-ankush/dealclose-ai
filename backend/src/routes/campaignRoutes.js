const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// Get all campaigns
router.get('/', campaignController.getCampaigns);

// Create a new campaign
router.post('/', campaignController.createCampaign);

module.exports = router;