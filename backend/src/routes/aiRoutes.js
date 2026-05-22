const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Get pending questions for training
router.get('/training-data', protect, aiController.getTrainingData);

// Handle Landing Page AI Chat Widget
router.post('/webchat', aiController.handleWebChat);

// Submit answer to train AI
router.post('/train', protect, aiController.trainAI);

// Answer a specific pending question
router.put('/training-data/:id/answer', protect, aiController.answerTrainingQuestion);

// Handle Dashboard Setup Assistant Chat
router.post('/dashboard-assistant', protect, aiController.handleDashboardAssistant);

module.exports = router;