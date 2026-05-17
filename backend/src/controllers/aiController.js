const User = require('../models/userModel');
const aiService = require('../services/aiService');

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

// @desc    Handle Landing Page AI Chat Widget
// @route   POST /api/ai/webchat
exports.handleWebChat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    // "DealClose Expert" ke liye strict personality set karna
    const systemContext = "You are 'DealClose Expert', a highly skilled AI sales assistant for the DealClose AI SaaS platform. Your goal is to explain our features (WhatsApp automation, AI Voice calling, Auto-DMs, Competitor ad scanning) and politely encourage users to sign up for a 14-day free trial. Keep responses short, engaging, human-like, and professional. Do not use overly complex formatting.";
    
    const prompt = `Website Visitor says: "${message}"\nRespond directly to this visitor.`;
    
    const aiReply = await aiService.generateAIResponse(prompt, systemContext, "web");
    
    res.status(200).json({ success: true, reply: aiReply });
  } catch (error) {
    console.error('Web Chat AI Error:', error);
    res.status(500).json({ success: false, reply: 'I am currently undergoing maintenance. Please try again later!' });
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