const express = require('express');
const router = express.Router();
const flowController = require('../controllers/flowController');
const { protect } = require('../middleware/authMiddleware');

// Flow Builder Routes
router.post('/flows', protect, flowController.saveFlow);
router.get('/flows', protect, flowController.getFlows);

module.exports = router;