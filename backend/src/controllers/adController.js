const renderService = require('../services/renderService');
const templateService = require('../services/templateService');
const User = require('../models/userModel');

exports.getTemplates = async (req, res) => {
  try {
    const templates = await templateService.getTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAd = async (req, res) => {
  try {
    const { templateId, productImageUrl, text, userId } = req.body;

    // Cost Deduction Logic (Wallet Tracking)
    const user = await User.findById(userId || "60d0fe4f5311236168a109ca");
    if (user && user.walletBalance < 10) {
      return res.status(402).json({ message: "Insufficient wallet balance. Please recharge." });
    }
    if (user) {
      await User.findByIdAndUpdate(user._id, { $inc: { walletBalance: -10 } }); // Deduct 10
    }

    const resultUrl = await renderService.renderImage(templateId, productImageUrl, text);
    res.json({ url: resultUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateFashionImage = async (req, res) => {
  try {
    const { poseId, productImageUrl, userId } = req.body;

    // Cost Deduction Logic for AI Generation
    const user = await User.findById(userId || "60d0fe4f5311236168a109ca");
    if (user && user.walletBalance < 20) {
      return res.status(402).json({ message: "Insufficient wallet balance for AI Generation." });
    }
    if (user) {
      await User.findByIdAndUpdate(user._id, { $inc: { walletBalance: -20 } }); // Deduct 20
    }

    // Mock AI generation logic
    // In real app: Call Stable Diffusion / Midjourney API with pose controlnet
    const generatedUrl = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop"; 
    res.json({ url: generatedUrl, message: "Fashion image generated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};