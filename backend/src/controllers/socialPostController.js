const SocialPost = require('../models/SocialPostModel');
const { uploadToCloudinary } = require('../services/cloudinaryService'); // This path seems correct, but let's ensure the file exists.
const { automationQueue } = require('../workers/automationWorker');
const instagramService = require('../services/instagramService');

/**
 * @desc    Create a new social post (publish now, schedule, or save as draft)
 * @route   POST /api/posts
 * @access  Private
 */
exports.createPost = async (req, res) => {
  console.log("\n================== [SOCIAL POST START] ==================");
  console.log("🚀 [DEBUG] 1. /api/posts endpoint hit for create/schedule.");
  try {
    const { caption, platforms, status, scheduledAt, workspaceId } = req.body;
    const userId = req.user._id;

    if (!caption || !platforms) {
      return res.status(400).json({ success: false, message: 'Caption and platforms are required.' });
    }
    console.log(`🚀 [DEBUG] 2. User: ${userId}, Status: ${status}, Platforms: ${platforms}`);
    const requestedPlatforms = JSON.parse(platforms);
    if (!Array.isArray(requestedPlatforms) || requestedPlatforms.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one platform.' });
    }
    if (status === 'scheduled' && (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime()) || new Date(scheduledAt) <= new Date())) {
      return res.status(400).json({ success: false, message: 'Choose a future date and time for scheduling.' });
    }

    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        console.log(`🚀 [DEBUG] 3. Uploading media file to Cloudinary...`);
        const result = await uploadToCloudinary(file.path, 'social_posts');
        mediaUrls.push({
          type: file.mimetype.startsWith('video') ? 'video' : 'image',
          url: result.secure_url,
        });
      }
      console.log(`✅ [DEBUG] 4. Media uploaded successfully.`);
    }

    const post = new SocialPost({
      userId,
      workspaceId: workspaceId || 'main',
      caption,
      platforms: requestedPlatforms, // ✅ FIX: Change 'now' to 'publishing' before saving to DB
      // ✅ FIX: The database model does not accept 'now' as a status. We must convert it to a valid enum value ('publishing') BEFORE saving.
      // For drafts or scheduled posts, the status is already valid.
      status: status === 'now' ? 'publishing' : status,
      scheduledAt: status === 'scheduled' ? new Date(scheduledAt) : null,
      mediaUrls,
    });

    console.log(`🚀 [DEBUG] 5. Saving post to database with status: '${post.status}'`);
    await post.save();
    console.log(`✅ [DEBUG] 6. Post saved with ID: ${post._id}`);

    if (status === 'scheduled') {
      const delay = new Date(scheduledAt).getTime() - Date.now();
      if (delay > 0) {
        console.log(`🚀 [DEBUG] 7a. Adding post to BullMQ worker queue for scheduling (delay: ${delay}ms).`);
        await automationQueue.add('publish_scheduled_post', { postId: post._id }, { delay });
        console.log("================== [SOCIAL POST END] ==================\n");
        return res.status(201).json({ success: true, message: 'Post scheduled successfully!', post });
      }
    }

    // The status is already set to 'publishing' from the constructor, so we just need to check for it.
    if (post.status === 'publishing') {
      console.log(`🚀 [DEBUG] 7. Adding post to BullMQ worker queue for immediate publishing.`);
      // Immediately add to queue for publishing
      await automationQueue.add('publish_scheduled_post', { postId: post._id });
      console.log("================== [SOCIAL POST END] ==================\n");
      return res.status(201).json({ success: true, message: 'Post is being published now!', post });
    }

    console.log(`✅ [DEBUG] 7. Post saved as draft.`);
    console.log("================== [SOCIAL POST END] ==================\n");
    res.status(201).json({ success: true, message: 'Draft saved successfully!', post });

  } catch (error) {
    console.error('❌ [CRITICAL ERROR] Post creation failed:', error);
    res.status(500).json({ success: false, message: 'Server error while creating post.' });
  }
};

/**
 * @desc    Get all social posts for the user
 * @route   GET /api/posts
 * @access  Private
 */
exports.getPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, workspaceId } = req.query;

    const query = { userId };
    if (status) query.status = status;
    if (workspaceId) query.workspaceId = workspaceId;

    const posts = await SocialPost.find(query).sort({ createdAt: -1 }).lean();

    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching posts.' });
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

    const posts = await SocialPost.find(query).sort({ 'analytics.engagement': -1 }).lean();

    if (posts.length === 0) {
      return res.status(200).json({ success: true, analytics: { totalReach: 0, totalLikes: 0, totalComments: 0, totalShares: 0, totalSaves: 0, totalProfileVisits: 0, engagementRate: 0, topPosts: [], bestTimeToPost: 'N/A', aiRecommendation: 'Not enough data to generate recommendations. Publish more posts to get insights.' } });
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
        const day = date.getDay(); // 0=Sun, 1=Mon...
        const hour = date.getHours();
        const key = `${day}-${hour}`;
        if (!timeMap[key]) timeMap[key] = { count: 0, engagement: 0 };
        timeMap[key].count++;
        timeMap[key].engagement += engagement;
      }
    });

    const engagementRate = totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : 0;

    // Find best time to post
    let bestTimeKey = '';
    let maxAvgEngagement = -1;
    for (const key in timeMap) {
      const avg = timeMap[key].engagement / timeMap[key].count;
      if (avg > maxAvgEngagement) {
        maxAvgEngagement = avg;
        bestTimeKey = key;
      }
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const [dayIndex, hour] = bestTimeKey.split('-').map(Number);
    const bestTimeToPost = bestTimeKey ? `${days[dayIndex]} around ${hour}:00` : 'N/A';

    const topPosts = posts.slice(0, 5).map(p => ({
      _id: p._id,
      caption: p.caption,
      mediaUrl: p.mediaUrls?.[0]?.url,
      ...p.analytics
    }));

    // Simple AI Recommendation
    const topPost = topPosts[0];
    let aiRecommendation = `Your top post about "${topPost?.caption.substring(0, 30)}..." received high engagement. Try creating more content with similar themes or visual styles. Posting on ${bestTimeToPost} seems to work well for your audience.`;

    res.status(200).json({
      success: true,
      analytics: {
        totalReach, totalLikes, totalComments, totalShares, totalSaves, totalProfileVisits, engagementRate,
        topPosts, bestTimeToPost, aiRecommendation
      }
    });

  } catch (error) {
    console.error('Error fetching post analytics:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching analytics.' });
  }
};
