const Post = require('../models/postModel');
const User = require('../models/userModel');
const instagramService = require('../services/instagramService');
const { uploadToCloudinary } = require('../services/cloudinaryService');

// @desc    Get all posts for a user/workspace
// @route   GET /api/posts
exports.getPosts = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { workspaceId, status } = req.query;

    const query = { userId };
    if (workspaceId && workspaceId !== 'main') {
      query.workspaceId = workspaceId;
    } else if (workspaceId === 'main') {
      query.workspaceId = { $in: ['main', null] };
    } else {
      // No workspaceId provided, fetch for all workspaces
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const posts = await Post.find(query).sort({ createdAt: -1 }).limit(100).lean();
    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch posts.', error: error.message });
  }
};

// @desc    Get a single post by ID
// @route   GET /api/posts/:id
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, userId: req.user?._id }).lean();
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch post.', error: error.message });
  }
};

// @desc    Create a new post
// @route   POST /api/posts
exports.createPost = async (req, res) => {
  try {
    const { caption, workspaceId, status, scheduledAt, platforms, designJson } = req.body;
    const userId = req.user?._id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Media file is required.' });
    }

    const mediaResult = await uploadToCloudinary(req.file.buffer, 'posts');

    const newPost = await Post.create({
      userId,
      workspaceId: workspaceId || 'main',
      caption,
      mediaUrls: [{ url: mediaResult.secure_url, type: req.file.mimetype.split('/')[0] }],
      status: status || 'draft',
      scheduledAt: status === 'scheduled' ? new Date(scheduledAt) : null,
      platforms: platforms ? JSON.parse(platforms) : ['instagram'],
      designJson: designJson ? JSON.parse(designJson) : null,
    });

    res.status(201).json({ success: true, post: newPost });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create post.', error: error.message });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    const userId = req.user?._id;
    const post = await Post.findOne({ _id: req.params.id, userId: userId });

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found or you do not have permission to delete it.' });
    }

    // TODO: Agar post Cloudinary par hai, to wahan se bhi delete karne ka logic add kar sakte hain.
    // if (post.mediaUrls && post.mediaUrls.length > 0) {
    //   const publicId = post.mediaUrls[0].url.split('/').pop().split('.')[0];
    //   await cloudinary.uploader.destroy(`posts/${publicId}`);
    // }

    await post.deleteOne();

    res.status(200).json({ success: true, message: 'Post deleted successfully.' });
  } catch (error) {
    console.error("Delete Post Error:", error);
    res.status(500).json({ success: false, message: 'Failed to delete post.', error: error.message });
  }
};

// @desc    Import existing posts from Instagram
// @route   POST /api/posts/import-instagram
exports.importInstagramPosts = async (req, res) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    
    // ✅ FIX: Find the first available Instagram connection, whether in root or workspaces.
    let igConfig = user.instagramConfig;
    let workspaceForPost = 'main';

    if (!igConfig?.accessToken && user.workspaces?.length > 0) {
      const firstActiveWorkspace = user.workspaces.find(ws => ws.instagramConfig?.accessToken);
      if (firstActiveWorkspace) {
        igConfig = firstActiveWorkspace.instagramConfig;
        workspaceForPost = firstActiveWorkspace._id.toString();
      }
    }

    const igAccountId = igConfig?.instagramAccountId || igConfig?.accountId;

    if (!igConfig?.accessToken || !igAccountId) {
      return res.status(400).json({ success: false, message: 'Instagram account not connected.' });
    }

    const recentPosts = await instagramService.getRecentMedia(igAccountId, igConfig.accessToken);

    let importedCount = 0;
    for (const post of recentPosts) {
      const existingPost = await Post.findOne({ "platformPostIds.instagram": post.id, userId });
      if (!existingPost) {
        await Post.create({
          userId,
          workspaceId: workspaceForPost, // Use the workspace where the IG account was found
          caption: post.caption,
          mediaUrls: [{ url: post.media_url, type: post.media_type.toLowerCase() === 'video' ? 'video' : 'image' }],
          status: 'published',
          publishedAt: new Date(post.timestamp),
          platformPostIds: { instagram: post.id },
          isImported: true,
          analytics: { likes: post.like_count || 0, comments: post.comments_count || 0 }
        });
        importedCount++;
      }
    }

    res.status(200).json({ success: true, message: `${importedCount} new posts imported.`, importedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to import posts.' });
  }
};