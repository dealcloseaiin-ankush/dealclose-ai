const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Get pending questions for training
router.get('/training-data', aiController.getTrainingData);

// Submit answer to train AI
router.post('/train', aiController.trainAI);

module.exports = router;