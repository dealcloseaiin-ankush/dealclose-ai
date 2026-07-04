// Controller for Auto-Marketer System
const GeneratedPost = require('../models/GeneratedPostModel.js');
const User = require('../models/userModel');
const instagramService = require('../services/instagramService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// 🌊 ULTRA COST-EFFECTIVE MODELS FOR AUTOMARKETER
const MODELS = {
  GEMINI_3_1_LIGHT: 'gemini-3.1-flash-light', // Priority 1 (Latest, Cheapest & Fast)
  GEMINI_2_5_LIGHT: 'gemini-2.5-flash-light', // Priority 2 (Backup Gemini)
  OPENAI_MINI: 'gpt-4o-mini',                  // Priority 3 (Final AI Fallback)
};

// @desc    Get all pending & approved posts
// @route   GET /api/automarketer/posts
exports.getGeneratedPosts = async (req, res) => {
  try {
    const posts = await GeneratedPost.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error('Error fetching automarketer posts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Generate a custom post via Prompt (Integrated with multi-model fallback chain)
// @route   POST /api/automarketer/generate
exports.generatePost = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    const systemPrompt = `You are a professional social media marketing assistant for small businesses. 
    Write a highly engaging, creative Instagram post caption based on the user's topic. 
    Include attractive emojis, a clear call-to-action (e.g., "Tap the link in bio to shop!"), and relevant hashtags.
    Keep your language friendly, clean, and modern. Do not use Devanagari script for captions; use clean Hinglish or English.`;

    const apiKey = process.env.GEMINI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy');

    let generatedCaption = "";
    let aiSuccess = false;

    // 🚀 MULTI-MODEL DYNAMIC CHAIN FOR CONTENT SCRIPT GENERATION
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);

      // Level 1: Try Gemini 3.1 Flash Light
      try {
        console.log(`[Auto-Marketer] 🤖 Requesting caption model: ${MODELS.GEMINI_3_1_LIGHT}`);
        const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_3_1_LIGHT });
        const result = await model.generateContent([systemPrompt, `Topic: "${prompt}"`]);
        generatedCaption = result.response.text();
        aiSuccess = true;
      } catch (gemini3Err) {
        console.warn(`⚠️ [Auto-Marketer] ${MODELS.GEMINI_3_1_LIGHT} busy/failed, trying ${MODELS.GEMINI_2_5_LIGHT}...`);
      }

      // Level 2: Try Gemini 2.5 Flash Light
      if (!aiSuccess) {
        try {
          console.log(`[Auto-Marketer] 🤖 Requesting caption model: ${MODELS.GEMINI_2_5_LIGHT}`);
          const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_2_5_LIGHT });
          const result = await model.generateContent([systemPrompt, `Topic: "${prompt}"`]);
          generatedCaption = result.response.text();
          aiSuccess = true;
        } catch (gemini2Err) {
          console.warn(`⚠️ [Auto-Marketer] ${MODELS.GEMINI_2_5_LIGHT} failed, falling back to OpenAI...`);
        }
      }
    }

    // Level 3: Final Fallback to OpenAI gpt-4o-mini
    if (!aiSuccess && hasOpenAI) {
      console.log(`[Auto-Marketer] 🤖 Requesting caption model: ${MODELS.OPENAI_MINI}`);
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const chatCompletion = await openaiClient.chat.completions.create({
        model: MODELS.OPENAI_MINI,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Topic: "${prompt}"` }
        ],
      });
      generatedCaption = chatCompletion.choices[0].message.content;
      aiSuccess = true;
    }

    // Fallback static caption structure if all AI keys are offline
    if (!aiSuccess) {
      generatedCaption = `[AI Draft for]: ${prompt}\n\n✨ Tap the link in bio to shop!\n#Automarketer #DealCloseAI`;
    }

    generatedCaption = generatedCaption.replace(/\*/g, '').trim();

    // Create entry in Database with final structured layout
    const newPost = await GeneratedPost.create({
      userId: req.user._id,
      caption: generatedCaption,
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", // Linked placeholder until Replicate image layer execution
      status: 'pending_approval'
    });

    res.status(200).json({ success: true, post: newPost });
  } catch (error) {
    console.error('Auto-Marketer Generation Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate post assets' });
  }
};

// @desc    Approve post and send to Instagram
// @route   POST /api/automarketer/posts/:id/approve
exports.approvePost = async (req, res) => {
  try {
    const post = await GeneratedPost.findOne({ _id: req.params.id, userId: req.user._id });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.status === 'posted') {
      return res.status(400).json({ success: false, message: 'Post is already published on Instagram.' });
    }

    const user = await User.findById(req.user._id);
    const igSettings = user.instagramConfig || user.igConfig || {};
    const igAccountId = igSettings.instagramAccountId || igSettings.accountId;

    if (!igAccountId || !igSettings.accessToken) {
      return res.status(400).json({ success: false, message: 'Instagram account is not connected properly. Please go to Settings and connect your page.' });
    }

    // Call existing Instagram Service to publish
    await instagramService.publishInstagramPost(igAccountId, igSettings.accessToken, post.imageUrl, post.caption);

    post.status = 'posted';
    post.postedAt = new Date();
    await post.save();

    res.status(200).json({ success: true, message: 'Post published successfully!' });
  } catch (error) {
    console.error('Error publishing post:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to publish post' });
  }
};

// @desc    Reject post
// @route   POST /api/automarketer/posts/:id/reject
exports.rejectPost = async (req, res) => {
  try {
    const post = await GeneratedPost.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { status: 'rejected' } },
      { new: true }
    );
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.status(200).json({ success: true, message: 'Post rejected' });
  } catch (error) {
    console.error('Error rejecting post:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};