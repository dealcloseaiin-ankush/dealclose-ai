const express = require('express');
const router = express.Router();
const { saveFlow, getFlows, deleteFlow, renameFlow, reassignFlow, getIndustryStarterFlows } = require('../controllers/flowController');
const { protect } = require('../middleware/authMiddleware');

// Industry Flow Blueprints
router.get('/flows/industry-templates', protect, getIndustryStarterFlows);

// Flow Builder Routes
router.route('/flows')
  .post(protect, saveFlow)
  .get(protect, getFlows);

router.route('/flows/:flowId')
  .delete(protect, deleteFlow);

router.route('/flows/:flowId/rename')
  .patch(protect, renameFlow);

router.route('/flows/:flowId/reassign')
  .patch(protect, reassignFlow);

module.exports = router;