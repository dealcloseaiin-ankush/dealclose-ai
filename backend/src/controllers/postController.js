const Post = require('../models/postModel');
const User = require('../models/userModel');
const instagramService = require('../services/instagramService');
const { uploadToCloudinary } = require('../services/cloudinaryService');

// @desc    Get all posts for a user/workspace
// @route   GET /api/posts
exports.getPosts = async (req, res) => {
  try {
    console.log("\n🚀 [DEBUG] getPosts controller hit!");
    const userId = req.user?._id;
    const { workspaceId, status } = req.query;

    const query = { userId };
    if (workspaceId && workspaceId !== 'main') {
      query.workspaceId = workspaceId;
    } else if (workspaceId === 'main') {
      query.workspaceId = { $in: ['main', null, ''] }; // Also include posts where workspaceId is empty
    } else if (!workspaceId) {
      // No workspaceId provided, fetch for all workspaces
      // This means query.workspaceId is not set, so it should match all posts for the user.
    }

    if (status && status !== 'all') {
      // ✅ FIX: Handle the new 'live' filter from the frontend
      if (status === 'live') {
        query.status = 'published';
      } else {
        query.status = status;
      }
    }
    console.log("🔍 [DEBUG] Querying posts with:", JSON.stringify(query));

    const posts = await Post.find(query).sort({ createdAt: -1 }).limit(100).lean();
    console.log(`✅ [DEBUG] Found ${posts.length} posts for user ${userId}.`);
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

/**
 * @desc    Get aggregated analytics for all posts
 * @route   GET /api/posts/analytics
 * @access  Private
 */
exports.getPostAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { workspaceId } = req.query;

    const query = { userId, status: 'published' };
    if (workspaceId && workspaceId !== 'main') {
      query.workspaceId = workspaceId;
    }

    const posts = await Post.find(query).sort({ 'analytics.engagement': -1 }).lean();

    if (posts.length === 0) {
      return res.status(200).json({ success: true, analytics: { totalReach: 0, totalLikes: 0, totalComments: 0, totalSaves: 0, totalProfileVisits: 0, engagementRate: 0, topPosts: [], bestTimeToPost: 'N/A', aiRecommendation: 'Not enough data to generate recommendations. Publish more posts to get insights.' } });
    }

    let totalReach = 0, totalLikes = 0, totalComments = 0, totalSaves = 0, totalProfileVisits = 0, totalEngagement = 0;
    const timeMap = {}; // { 'day-hour': { count: x, engagement: y } }

    posts.forEach(post => {
      const a = post.analytics || {};
      totalReach += a.reach || 0;
      totalLikes += a.likes || 0;
      totalComments += a.comments || 0;
      totalSaves += a.saves || 0;
      totalProfileVisits += a.profileVisits || 0;
      
      const engagement = (a.likes || 0) + (a.comments || 0) + (a.saves || 0);
      totalEngagement += engagement;

      if (post.publishedAt) {
        const date = new Date(post.publishedAt);
        const day = date.getDay();
        const hour = date.getHours();
        const key = `${day}-${hour}`;
        if (!timeMap[key]) timeMap[key] = { count: 0, engagement: 0 };
        timeMap[key].count++;
        timeMap[key].engagement += engagement;
      }
    });

    const engagementRate = totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : 0;

    const topPosts = posts.slice(0, 5).map(p => ({ _id: p._id, caption: p.caption, mediaUrl: p.mediaUrls?.[0]?.url, ...p.analytics }));
    const bestTimeToPost = 'N/A'; // Placeholder for now
    const aiRecommendation = `Your top post about "${topPosts[0]?.caption.substring(0, 30)}..." received high engagement. Try creating more content with similar themes.`;

    res.status(200).json({
      success: true,
      analytics: { totalReach, totalLikes, totalComments, totalSaves, totalProfileVisits, engagementRate, topPosts, bestTimeToPost, aiRecommendation }
    });

  } catch (error) {
    console.error('Error fetching post analytics:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching analytics.' });
  }
};