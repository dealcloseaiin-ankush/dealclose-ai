// Controller for Auto-Marketer System
const GeneratedPost = require('../models/GeneratedPostModel');
const User = require('../models/userModel');
const instagramService = require('../services/instagramService');

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

// @desc    Generate a custom post via Prompt
// @route   POST /api/automarketer/generate
exports.generatePost = async (req, res) => {
  try {
    const { prompt } = req.body;
    // Placeholder logic for AI Image & Caption Generation (To be replaced with actual Replicate/Gemini API calls)
    const newPost = await GeneratedPost.create({
      userId: req.user._id,
      caption: `[AI Draft for]: ${prompt}\n\n✨ Tap the link in bio to shop!\n#Automarketer #DealCloseAI`,
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", // Placeholder until linked to Replicate Image Generator
      status: 'pending_approval'
    });
    res.status(200).json({ success: true, post: newPost });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
