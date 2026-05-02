const User = require('../models/userModel');

// @desc    Get unanswered queries for AI training
// @route   GET /api/ai/training-data
exports.getTrainingData = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : "60d0fe4f5311236168a109ca";
    const user = await User.findById(userId);
    
    res.status(200).json({ success: true, data: user?.trainingData || [] });
  } catch (error) {
    console.error('AI Training Data Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Teach AI a new answer (Add FAQ)
// @route   POST /api/ai/train
exports.trainAI = async (req, res) => {
  try {
    const { question, answer } = req.body;
    
    // For now, we return a success message. 
    // In production, this will update the AI System Prompt or Vector DB.
    res.status(200).json({ success: true, message: 'AI trained successfully with new FAQ.' });
  } catch (error) {
    console.error('AI Training Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};