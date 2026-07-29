// Controller for Auto-Marketer System
const GeneratedPost = require('../models/GeneratedPostModel.js');
const User = require('../models/userModel');
const instagramService = require('../services/instagramService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Replicate = require('replicate'); // 🚀 NEW: For AI Image Generation
const OpenAI = require('openai');

// 🌊 ULTRA COST-EFFECTIVE MODELS FOR AUTOMARKETER
const MODELS = {
  // ✅ FIX: Removed deprecated 'gemini-1.5-flash' which was causing 404 errors.
  GEMINI_3_1_LITE: 'gemini-3.1-flash-lite', // Priority 1 (Latest, Cheapest & Fast)
  GEMINI_2_5_LITE: 'gemini-2.5-flash-lite', // Priority 2 (Backup Gemini)
  OPENAI_MINI: 'gpt-4o-mini',                  // Priority 3 (Final AI Fallback)
};

// 🚀 NEW: Replicate client for image generation
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

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

    // 🚀 NEW: Fetch user's business data for context
    const user = await User.findById(req.user._id).lean();
    const businessContext = user?.businessDescription ? `My business is about: ${user.businessDescription}.` : '';

    // 🚀 UPGRADED: AI prompt now supports carousel generation for long content.
    const systemPrompt = `You are a viral social media post creator. Your task is to generate a complete Instagram post based on the user's topic.
    ${businessContext}
    
    RULES:
    1.  If the content is short, generate a single post.
    2.  If the content is long (e.g., a list, a story, multiple points), split it into a carousel post with 2-4 pages.
    3.  The output MUST be a single, valid JSON object.
    
    JSON Structure:
    - "caption": A main, engaging caption for the entire post with a clear call-to-action and hashtags.
    - "pages": An array of objects, where each object represents one image/page of the post. Each object must have:
        - "imagePrompt": A detailed, descriptive prompt for an AI image generator (like DALL-E) to create a visually stunning image for this page.
        - "textOverlay": A short, punchy text (max 15 words) to be displayed on the image. This is for carousel pages. For single posts, this can be an empty string.`;

    const apiKey = process.env.GEMINI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy');

    let generatedCaption = "";
    let aiSuccess = false;

    let rawAiResponse = "";
    // 🚀 MULTI-MODEL DYNAMIC CHAIN FOR CONTENT SCRIPT GENERATION
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);

      // Level 1: Try Gemini 3.1 Flash Light
      try {
        console.log(`[Auto-Marketer] 🤖 Requesting caption model: ${MODELS.GEMINI_3_1_LITE}`);
        const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_3_1_LITE });
        const result = await model.generateContent([systemPrompt, `Topic: "${prompt}"`]);
        console.log(`✅ [Auto-Marketer] Responded using model: ${MODELS.GEMINI_3_1_LITE}`);
        rawAiResponse = result.response.text();
        aiSuccess = true;
      } catch (gemini3Err) {
        console.warn(`⚠️ [Auto-Marketer] ${MODELS.GEMINI_3_1_LITE} busy/failed, trying ${MODELS.GEMINI_2_5_LITE}...`);
      }

      // Level 2: Try Gemini 2.5 Flash Light
      if (!aiSuccess) {
        try {
          console.log(`[Auto-Marketer] 🤖 Requesting caption model: ${MODELS.GEMINI_2_5_LITE}`);
          const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_2_5_LITE });
          const result = await model.generateContent([systemPrompt, `Topic: "${prompt}"`]);
          console.log(`✅ [Auto-Marketer] Responded using model: ${MODELS.GEMINI_2_5_LITE}`);
          rawAiResponse = result.response.text();
          aiSuccess = true;
        } catch (gemini2Err) {
          console.warn(`⚠️ [Auto-Marketer] ${MODELS.GEMINI_2_5_LITE} failed, falling back to OpenAI...`);
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
      console.log(`✅ [Auto-Marketer] Responded using model: ${MODELS.OPENAI_MINI}`);
      rawAiResponse = chatCompletion.choices[0].message.content;
      aiSuccess = true;
    }

    // Fallback static caption structure if all AI keys are offline
    if (!aiSuccess) {
      rawAiResponse = JSON.stringify({
        caption: `[AI Draft for]: ${prompt}\n\n✨ Tap the link in bio to shop!\n#Automarketer #DealCloseAI`,
        pages: [{ imagePrompt: prompt, textOverlay: prompt.substring(0, 50) }]
      });
    }

    const postContent = JSON.parse(rawAiResponse.replace(/```json|```/g, '').trim());

    // 🚀 NEW: Generate images for each page using Replicate
    const mediaPromises = postContent.pages.map(page => {
      console.log(`[Auto-Marketer] 🖼️ Generating image for prompt: "${page.imagePrompt}"`);
      return replicate.run(
        "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637",
        { input: { prompt: page.imagePrompt } }
      ).then(output => ({
        type: 'image',
        url: Array.isArray(output) ? output[0] : output,
        textOverlay: page.textOverlay || ''
      })).catch(err => {
        console.error(`[Auto-Marketer] Image generation failed for a page:`, err.message);
        return { // Fallback image
          type: 'image',
          url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
          textOverlay: page.textOverlay || ''
        };
      });
    });

    const generatedMedia = await Promise.all(mediaPromises);

    // Create entry in Database with final structured layout
    const newPost = await GeneratedPost.create({
      userId: req.user._id,
      caption: postContent.caption.replace(/\*/g, '').trim(),
      media: generatedMedia,
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

    // 🚀 UPGRADE: Check if it's a carousel or single post
    if (post.media.length > 1) {
      // This is a carousel post. We need a new service function for this.
      // For now, we'll just post the first image as a single post to prevent errors.
      // In a future step, we will implement `publishCarouselPost`.
      console.warn(`[Auto-Marketer] Carousel post detected, but only single image publishing is supported for now. Publishing first image.`);
      if (post.media[0]?.url) {
        await instagramService.publishImagePost(igAccountId, igSettings.accessToken, post.media[0].url, post.caption);
      } else {
        throw new Error("Carousel media is missing a valid URL for the first image.");
      }
    } else {
      await instagramService.publishImagePost(igAccountId, igSettings.accessToken, post.media[0].url, post.caption);
    }

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