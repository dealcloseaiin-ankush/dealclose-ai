const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const { protect } = require('../middleware/authMiddleware');

// Saare CRM routes ko auth se protect kar rahe hain
router.use(protect);

// @route GET /api/crm/market-insights - AI based trend analysis
const leadController = require('../controllers/leadController');
router.get('/market-insights', leadController.getMarketInsights);

// @route GET /api/crm/pipeline - Pipeline ka data fetch karne ke liye (Kanban Board)
router.get('/pipeline', crmController.getPipeline);

// @route PUT /api/crm/contacts/:id/stage - Drag & drop ke baad stage update karne ke liye
router.put('/contacts/:id/stage', crmController.updateStage);

// @route DELETE /api/crm/contacts/:id - Lead ya Contact ko permanently delete karne ke liye
router.delete('/contacts/:id', crmController.deleteContact);

module.exports = router;