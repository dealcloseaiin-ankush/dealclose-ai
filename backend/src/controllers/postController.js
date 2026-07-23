const Post = require('../models/postModel');
const SocialPost = require('../models/SocialPostModel');
const User = require('../models/userModel');
const instagramService = require('../services/instagramService');
const { uploadToCloudinary } = require('../services/cloudinaryService');
const { automationQueue } = require('../workers/automationWorker'); // 🚀 NEW: Import BullMQ queue

const migrateLegacyPosts = async (userId) => {
  const legacyPosts = await SocialPost.find({ userId }).lean();
  for (const legacy of legacyPosts) {
    if (await Post.exists({ legacySocialPostId: legacy._id })) continue;
    const duplicate = legacy.platformPostIds?.instagram
      ? await Post.findOne({ userId, 'platformPostIds.instagram': legacy.platformPostIds.instagram })
      : null;
    if (duplicate) {
      await Post.updateOne({ _id: duplicate._id }, { $set: { legacySocialPostId: legacy._id } });
      continue;
    }
    await Post.create({
      userId,
      workspaceId: legacy.workspaceId || 'main',
      caption: legacy.caption,
      mediaUrls: legacy.mediaUrls || [],
      platforms: legacy.platforms || [],
      status: legacy.status || 'draft',
      scheduledAt: legacy.scheduledAt,
      publishedAt: legacy.publishedAt,
      platformPostIds: legacy.platformPostIds || {},
      failureReason: legacy.failureReason,
      legacySocialPostId: legacy._id,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
    });
  }
};

// @desc    Get all posts for a user/workspace
// @route   GET /api/posts
exports.getPosts = async (req, res) => {
  try {
    console.log("\n🚀 [DEBUG] getPosts controller hit!");
    const userId = req.user?._id;
    const { workspaceId, status } = req.query;
    await migrateLegacyPosts(userId);

    const query = { userId };
    if (workspaceId && workspaceId !== 'main') {
      // If a specific branch/workspace is selected, filter by it.
      query.workspaceId = workspaceId;
    } else {
      // If 'main' is selected or no workspaceId is provided (for 'All' filter),
      // do not add a workspaceId filter to the query. This will fetch posts
      // from ALL workspaces belonging to the user.
    }

    if (status && status !== 'all') {
      // ✅ FIX: Handle the new 'live' filter from the frontend
      if (status === 'live') {
        query.status = 'published';
        query['platformPostIds.instagram'] = { $exists: true, $nin: [null, ''] };
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
  console.log("\n================== [POST CREATION START] ==================");
  console.log("🚀 [DEBUG] 1. /api/posts (postController) endpoint hit.");
  try {
    const { caption, workspaceId, status, scheduledAt, platforms, designJson } = req.body;
    const userId = req.user?._id;

    if (!req.file) {
      console.log("❌ [DEBUG] Post creation failed: Media file is required.");
      return res.status(400).json({ success: false, message: 'Media file is required.' });
    }

    let requestedPlatforms;
    let parsedDesignJson = null;
    try {
      requestedPlatforms = platforms ? JSON.parse(platforms) : ['instagram'];
      parsedDesignJson = designJson ? JSON.parse(designJson) : null;
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Post design or platform data is invalid.' });
    }
    if (!Array.isArray(requestedPlatforms) || requestedPlatforms.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one platform.' });
    }
    const supportedPlatforms = ['instagram', 'facebook'];
    if (requestedPlatforms.some(platform => !supportedPlatforms.includes(platform))) {
      return res.status(400).json({ success: false, message: 'Threads publishing is not available yet. Please select Instagram or Facebook.' });
    }
    if (status === 'scheduled' && (!scheduledAt || new Date(scheduledAt) <= new Date())) {
      return res.status(400).json({ success: false, message: 'Choose a future date and time for scheduling.' });
    }
    console.log(`🚀 [DEBUG] 2. User: ${userId}, Status: ${status}, Platforms: ${requestedPlatforms}`);

    console.log(`🚀 [DEBUG] 3. Uploading media file to Cloudinary...`);
    const mediaResult = await uploadToCloudinary(req.file.buffer, 'posts');
    console.log(`✅ [DEBUG] 4. Media uploaded successfully.`);

    const post = new Post({
      userId,
      workspaceId: workspaceId || 'main',
      caption,
      mediaUrls: [{ url: mediaResult.secure_url, type: req.file.mimetype.split('/')[0] }],
      status: status === 'now' ? 'publishing' : (status || 'draft'),
      scheduledAt: status === 'scheduled' ? new Date(scheduledAt) : null,
      platforms: requestedPlatforms,
      designJson: parsedDesignJson,
    });

    console.log(`🚀 [DEBUG] 5. Saving post to database with status: '${post.status}'`);
    await post.save();
    console.log(`✅ [DEBUG] 6. Post saved with ID: ${post._id}`);

    if (post.status === 'scheduled') {
      const delay = new Date(post.scheduledAt).getTime() - Date.now();
      console.log(`🚀 [DEBUG] 7a. Adding post to BullMQ worker queue for scheduling (delay: ${delay}ms).`);
      await automationQueue.add(
        'publish_scheduled_post',
        { postId: post._id },
        { delay: Math.max(0, delay) }
      );
      return res.status(201).json({ success: true, message: 'Post scheduled successfully!', post });
    }

    if (post.status === 'publishing') {
      console.log(`🚀 [DEBUG] 7b. Adding post to BullMQ worker queue for immediate publishing.`);
      await automationQueue.add('publish_scheduled_post', { postId: post._id });
      return res.status(201).json({ success: true, message: 'Post is being published now!', post });
    }

    console.log(`✅ [DEBUG] 7c. Post saved as draft.`);
    res.status(201).json({ success: true, post: post, message: 'Draft saved successfully!' });
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
    const { workspaceId, refreshInsights = false } = req.body;
    let igConfig = user.instagramConfig;
    let workspaceForPost = 'main';

    if (workspaceId && workspaceId !== 'main') {
      const selectedWorkspace = user.workspaces?.find(ws => String(ws._id) === String(workspaceId));
      igConfig = selectedWorkspace?.instagramConfig;
      workspaceForPost = String(workspaceId);
    }

    if ((!workspaceId || workspaceId === 'main') && !igConfig?.accessToken && user.workspaces?.length > 0) {
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

    const recentPosts = await instagramService.fetchRecentPosts(igAccountId, igConfig.accessToken, 100);

    let importedCount = 0;
    let updatedCount = 0;
    for (const [index, post] of recentPosts.entries()) {
      const existingPost = await Post.findOne({ "platformPostIds.instagram": post.id, userId });
      // Analytics view requests a fresh Meta insight pull for the newest posts.
      // Keep it bounded so an account with a large history cannot exhaust API quota.
      let liveInsights = null;
      if (refreshInsights && index < 20) {
        try {
          liveInsights = await instagramService.getPostInsights(post.id, igConfig.accessToken);
        } catch (error) {
          console.warn(`[Instagram sync] Insights unavailable for ${post.id}: ${error.message}`);
        }
      }
      if (!existingPost) {
        await Post.create({
          userId,
          workspaceId: workspaceForPost, // Use the workspace where the IG account was found
          caption: post.caption,
          mediaUrls: [{
            url: post.media_type.toLowerCase() === 'video' ? (post.thumbnail_url || post.media_url) : post.media_url,
            type: 'image',
          }],
          status: 'published',
          publishedAt: new Date(post.timestamp),
          platformPostIds: { instagram: post.id },
          platforms: ['instagram'],
          isImported: true,
          analytics: {
            likes: liveInsights?.likes ?? post.like_count ?? 0,
            comments: liveInsights?.comments ?? post.comments_count ?? 0,
            reach: liveInsights?.reach ?? 0,
          }
        });
        importedCount++;
      } else {
        await Post.updateOne(
          { _id: existingPost._id },
          {
            $set: {
              caption: post.caption || existingPost.caption,
              'mediaUrls.0.url': post.media_type?.toLowerCase() === 'video'
                ? (post.thumbnail_url || post.media_url || existingPost.mediaUrls?.[0]?.url)
                : (post.media_url || existingPost.mediaUrls?.[0]?.url),
              'analytics.likes': liveInsights?.likes ?? post.like_count ?? 0,
              'analytics.comments': liveInsights?.comments ?? post.comments_count ?? 0,
              'analytics.reach': liveInsights?.reach ?? existingPost.analytics?.reach ?? 0,
            },
          }
        );
        updatedCount++;
      }
    }

    res.status(200).json({ success: true, message: `${importedCount} new posts imported and ${updatedCount} existing posts refreshed.`, importedCount, updatedCount });
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

    // Publisher analytics are for posts that actually exist on Instagram.
    const query = {
      userId,
      status: 'published',
      'platformPostIds.instagram': { $exists: true, $nin: [null, ''] },
    };
    if (workspaceId && workspaceId !== 'main') {
      query.workspaceId = workspaceId;
    }

    const posts = await Post.find(query).sort({ 'analytics.engagement': -1 }).lean();

    if (posts.length === 0) {
      return res.status(200).json({ success: true, analytics: { totalReach: 0, totalLikes: 0, totalComments: 0, totalSaves: 0, totalProfileVisits: 0, engagementRate: 0, topPosts: [], bestTimeToPost: 'N/A', aiRecommendation: 'Not enough data to generate recommendations. Publish more posts to get insights.' } });
    }

    let totalReach = 0, totalLikes = 0, totalComments = 0, totalShares = 0, totalSaves = 0, totalProfileVisits = 0, totalEngagement = 0;
    const timeMap = {}; // { 'day-hour': { count: x, engagement: y } }

    posts.forEach(post => {
      const a = post.analytics || {};
      totalReach += a.reach || 0;
      totalLikes += a.likes || 0;
      totalComments += a.comments || 0;
      totalShares += a.shares || 0;
      totalSaves += a.saves || 0;
      totalProfileVisits += a.profileVisits || 0;
      
      const engagement = (a.likes || 0) + (a.comments || 0) + (a.shares || 0) + (a.saves || 0);
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
      analytics: { totalReach, totalLikes, totalComments, totalShares, totalSaves, totalProfileVisits, engagementRate, topPosts, bestTimeToPost, aiRecommendation }
    });

  } catch (error) {
    console.error('Error fetching post analytics:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching analytics.' });
  }
};

// @desc    Get live insights for a single post from Instagram
// @route   GET /api/posts/:platformPostId/insights
exports.getPostInsights = async (req, res) => {
  try {
    const { platformPostId } = req.params;
    const { workspaceId } = req.query;
    const userId = req.user?._id;

    if (!platformPostId) {
      return res.status(400).json({ success: false, message: 'Platform Post ID is required.' });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const igConfig = (workspaceId && workspaceId !== 'main')
      ? user.workspaces.find(ws => ws._id.toString() === workspaceId)?.instagramConfig
      : user.instagramConfig;

    if (!igConfig?.accessToken) {
      return res.status(400).json({ success: false, message: 'Instagram not connected for this workspace.' });
    }

    const insights = await instagramService.getPostInsights(platformPostId, igConfig.accessToken);

    // Update the post in our database with the fresh analytics
    await Post.updateOne(
      { userId, "platformPostIds.instagram": platformPostId },
      { $set: {
        "analytics.likes": insights.likes,
        "analytics.comments": insights.comments,
        "analytics.reach": insights.reach,
        "analytics.saves": insights.saved,
        "analytics.shares": insights.shares,
      } }
    );

    res.status(200).json({ success: true, insights });
  } catch (error) {
    console.error('Get Post Insights Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch post insights.' });
  }
};
