const express = require('express');
const router = express.Router();
const { saveFlow, getFlows, deleteFlow, renameFlow, reassignFlow, getIndustryStarterFlows } = require('../controllers/flowController');
const { protect } = require('../middleware/authMiddleware');

// Industry Flow Blueprints
router.get('/flows/industry-templates', protect, getIndustryStarterFlows);

// WhatsApp Automation Rules Route
router.get('/rules', protect, async (req, res) => {
  try {
    const User = require('../models/userModel');
    const user = await User.findById(req.user._id || req.user.id);
    const { workspaceId = 'main' } = req.query;
    let rules = user?.autoReplies || [];
    if (workspaceId !== 'main' && user?.workspaces) {
      const ws = user.workspaces.find(w => w._id?.toString() === workspaceId || w.name === workspaceId);
      if (ws && ws.autoReplies) rules = ws.autoReplies;
    }
    res.json({ success: true, data: rules });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

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