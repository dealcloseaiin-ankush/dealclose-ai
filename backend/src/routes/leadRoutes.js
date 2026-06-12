const express = require('express');
const router = express.Router();
const { getLeads, createLead, exportLeads, shareLeadsToWhatsApp, getLeadAnalytics, updateLeadStatus, updateLead, deleteLead, getMarketInsights, analyzeCampaignROI } = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secures all lead routes below

router.get('/export', exportLeads);
router.post('/share-whatsapp', shareLeadsToWhatsApp);
router.get('/analytics', getLeadAnalytics);

router.route('/')
  .get(getLeads)
  .post(createLead);

// Update Status (Kanban Drop)
router.patch('/:id/status', updateLeadStatus);

// Manual Edit & Delete
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

module.exports = router;
