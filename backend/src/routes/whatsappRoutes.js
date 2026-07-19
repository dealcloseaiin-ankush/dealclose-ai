const express = require('express');
const router = express.Router();
const { saveFlow, getFlows, deleteFlow, renameFlow } = require('../controllers/flowController');
const { protect } = require('../middleware/authMiddleware');

// Flow Builder Routes
router.route('/flows')
  .post(protect, saveFlow)
  .get(protect, getFlows);

router.route('/flows/:flowId')
  .delete(protect, deleteFlow);

router.route('/flows/:flowId/rename')
  .patch(protect, renameFlow);

module.exports = router;