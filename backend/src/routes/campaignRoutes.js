const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// FORCE FIX: Ensured 'middleware' folder name has no 's'
const { protect } = require('../middleware/authMiddleware'); 

router.post('/generate', protect, campaignController.generateCampaign);
router.get('/', protect, campaignController.getCampaigns);
router.get('/ivr', protect, campaignController.getIvrCampaigns);
router.post('/ivr/:id/test', protect, campaignController.testIvrCampaign);
router.post('/ivr/:id/bulk-dial', protect, campaignController.bulkDialIvr);

module.exports = router;