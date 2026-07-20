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
  try {
    const { caption, platforms, status, scheduledAt, workspaceId } = req.body;
    const userId = req.user._id;

    if (!caption || !platforms) {
      return res.status(400).json({ success: false, message: 'Caption and platforms are required.' });
    }

    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, 'social_posts');
        mediaUrls.push({
          type: file.mimetype.startsWith('video') ? 'video' : 'image',
          url: result.secure_url,
        });
      }
    }

    const post = new SocialPost({
      userId,
      workspaceId: workspaceId || 'main',
      caption,
      platforms: JSON.parse(platforms),
      status,
      scheduledAt: status === 'scheduled' ? new Date(scheduledAt) : null,
      mediaUrls,
    });

    await post.save();

    if (status === 'scheduled') {
      const delay = new Date(scheduledAt).getTime() - Date.now();
      if (delay > 0) {
        await automationQueue.add('publish_scheduled_post', { postId: post._id }, { delay });
        return res.status(201).json({ success: true, message: 'Post scheduled successfully!', post });
      }
    }

    if (status === 'now') {
      post.status = 'publishing';
      await post.save();
      // Immediately add to queue for publishing
      await automationQueue.add('publish_scheduled_post', { postId: post._id });
      return res.status(201).json({ success: true, message: 'Post is being published now!', post });
    }

    res.status(201).json({ success: true, message: 'Draft saved successfully!', post });

  } catch (error) {
    console.error('Error creating post:', error);
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