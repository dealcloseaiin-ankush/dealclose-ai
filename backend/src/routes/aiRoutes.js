const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Get pending questions for training
router.get('/training-data', aiController.getTrainingData);

// Handle Landing Page AI Chat Widget
router.post('/webchat', aiController.handleWebChat);

// Submit answer to train AI
router.post('/train', aiController.trainAI);

// Handle Dashboard Setup Assistant Chat
router.post('/dashboard-assistant', protect, aiController.handleDashboardAssistant);

module.exports = router;