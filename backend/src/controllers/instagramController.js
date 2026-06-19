const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Lead = require('../models/leadModel');
const axios = require('axios');
const instagramService = require('../services/instagramService');

// @desc    Get Instagram Dashboard Analytics
// @route   GET /api/instagram/dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(userId).lean();
    
    // Fetch real metrics from DB
    const totalComments = await Message.countDocuments({ userId, tags: { $in: ['ig_comment'] } });
    const totalDMsReceived = await Message.countDocuments({ userId, direction: 'incoming', customerPhone: { $regex: /^IG_/ } });
    const dmsSent = await Message.countDocuments({ userId, direction: 'outgoing', customerPhone: { $regex: /^IG_/ } });
    const leadsExtracted = await Lead.countDocuments({ 
      userId, 
      source: { $regex: /Instagram/i },
      status: { $nin: ['visitor', 'unqualified'] } // 🚀 FIX: Ignore hidden/junk leads from total count
    });

    res.status(200).json({
      success: true,
      stats: {
        totalCommentsAnalyzed: totalComments,
        totalDMsReceived: totalDMsReceived,
        leadsExtracted: leadsExtracted,
        dmsSent: dmsSent,
        whatsappConversationsStarted: 0, // Tracked later if IG to WA redirection happens
        conversionRate: totalDMsReceived > 0 ? ((leadsExtracted / totalDMsReceived) * 100).toFixed(1) + '%' : '0%'
      },
      config: {
        aiSmartReply: user?.aiAgentEnabled !== false,
        autoDmOnComment: true,
        extractPhoneNumbers: true,
        forceWhatsappRedirect: true
      },
      igLeads: await Lead.find({ userId, source: { $regex: /Instagram/i } }).sort({ createdAt: -1 }).limit(5),
      recentPosts: [], // Requires Content Publishing API (Future scope)
      commentGroups: [] // Requires advanced grouping logic (Future scope)
    });
  } catch (error) {
    console.error("IG Dashboard Error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Fetch Recent Instagram Posts/Reels for Post-Specific Automation
// @route   GET /api/instagram/posts
exports.getRecentPosts = async (req, res) => {
  console.log(`\n================== [IG POSTS DEBUG] ==================`);
  try {
    const userId = req.user?._id || req.user?.id;
    console.log(`🔍 1. Fetching posts for User ID: ${userId}`);
    const user = await User.findById(userId).lean();

    if (!user) {
      console.log(`❌ 2. User not found in DB!`);
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let accessToken = user?.igConfig?.accessToken;
    let accountId = user?.igConfig?.accountId;
    let source = 'Main Config';

    // 🚀 FIX: Also check if Instagram was connected inside a Workspace!
    if (!accessToken && user?.workspaces) {
      const ws = user.workspaces.find(w => w.igConfig && w.igConfig.accessToken);
      if (ws) {
        accessToken = ws.igConfig.accessToken;
        accountId = ws.igConfig.accountId;
        source = `Workspace: ${ws.name}`;
      }
    }

    console.log(`🔍 2. Checking IG Credentials...`);
    console.log(`   - Account ID: ${accountId ? accountId : 'MISSING ❌'}`);
    console.log(`   - Access Token: ${accessToken ? 'PRESENT ✅' : 'MISSING ❌'}`);
    console.log(`   - Found In: ${source}`);

    if (!accessToken || !accountId) {
      console.log(`❌ 3. Failed: Instagram is not properly connected.`);
      console.log(`======================================================\n`);
      return res.status(400).json({ success: false, message: 'Instagram is not properly connected. Please reconnect in Settings.' });
    }

    console.log(`📡 3. Calling Meta Graph API for Account ID: ${accountId}...`);
    // Fetch latest 15 media items from Meta Graph API
    // 🚀 FIX: Added 'impressions' to fetch real post views
    const url = `https://graph.facebook.com/v19.0/${accountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,insights.metric(impressions)&limit=15&access_token=${accessToken}`;
    const response = await axios.get(url);
    
    if (!response.data || !response.data.data) {
      console.log(`⚠️ 4. Meta API responded but 'data' array is empty or missing!`);
    } else {
      console.log(`✅ 4. Meta API Success! Found ${response.data.data.length} posts.`);
    }

    // 🚀 FIX: Map the new 'impressions' field to 'views' for the frontend
    const posts = response.data.data.map(post => {
      const insightsData = post.insights?.data[0]?.values[0]?.value;
      return {
        id: post.id,
        caption: post.caption || '',
        media_type: post.media_type,
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url || post.media_url,
        permalink: post.permalink,
        timestamp: post.timestamp,
        like_count: post.like_count || 0,
        comments_count: post.comments_count || 0,
        impressions: insightsData || 0, // This is the 'views' count
      };
    });

    console.log(`======================================================\n`);
    res.status(200).json({ success: true, posts });
  } catch (error) {
    console.error("❌ IG Fetch Posts Error:");
    if (error.response) {
        console.error(`   - Status: ${error.response.status}`);
        console.error(`   - Meta Error Msg: ${error.response.data?.error?.message}`);
        console.error(`   - Meta Error Type: ${error.response.data?.error?.type}`);
        console.error(`   - Meta Error Code: ${error.response.data?.error?.code}`);
        console.error(`   - Meta Subcode: ${error.response.data?.error?.error_subcode}`);
    } else {
        console.error(`   - Message: ${error.message}`);
    }
    console.log(`======================================================\n`);
    // 🚀 FIX: Send the exact Meta error to the frontend so you know WHY it failed
    res.status(500).json({ success: false, message: `Failed to fetch posts: ${error.response?.data?.error?.message || error.message}` });
  }
};

// @desc    Get saved Post Automations
// @route   GET /api/instagram/automations
exports.getPostAutomations = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const user = await User.findById(userId).lean();
    res.status(200).json({ success: true, automations: user.postAutomations || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Publish Media (Image/Reel) to Instagram
// @route   POST /api/instagram/publish-media
exports.publishMedia = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { mediaUrl, mediaType, caption, workspaceId } = req.body;
    
    const user = await User.findById(userId).lean();
    
    const igSettings = workspaceId && workspaceId !== 'main' ? user.workspaces?.find(w => w._id.toString() === workspaceId)?.igConfig : user.igConfig;
    const igToken = igSettings?.accessToken;
    const igAccountId = igSettings?.accountId;

    if (!igToken || !igAccountId) {
       return res.status(400).json({ success: false, message: 'Instagram not connected. Please go to Settings to connect your account.' });
    }

    const result = await instagramService.publishInstagramMedia(igAccountId, igToken, mediaUrl, mediaType, caption);
    res.status(200).json(result);
  } catch (error) {
     res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save a new Post-Specific Automation
// @route   POST /api/instagram/automations
exports.savePostAutomation = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { postId, thumbnailUrl, triggerWord, replyMessage, fileUrl, deliveryMode } = req.body;

    if (!postId || !triggerWord || !replyMessage) {
      return res.status(400).json({ success: false, message: 'Post ID, Trigger Word, and Reply Message are required.' });
    }

    // Pehle agar same post ka koi purana rule hai, toh use hata do (Overwrite)
    await User.updateOne(
      { _id: userId },
      { $pull: { postAutomations: { postId } } }
    );

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $push: { postAutomations: { postId, thumbnailUrl, triggerWord, replyMessage, fileUrl, deliveryMode } } 
      },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Post automation saved successfully!', automations: updatedUser.postAutomations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a Post-Specific Automation
// @route   DELETE /api/instagram/automations/:postId
exports.deletePostAutomation = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { postId } = req.params;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { postAutomations: { postId } } },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Automation deleted.', automations: updatedUser.postAutomations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set Instagram Ice Breakers (FAQ Buttons for New Chats)
// @route   POST /api/instagram/icebreakers
exports.setIceBreakers = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { questions } = req.body; 
    const user = await User.findById(userId).lean();
    
    if (!user?.igConfig?.accessToken || !user?.igConfig?.accountId) {
      return res.status(400).json({ success: false, message: 'Instagram not connected.' });
    }
    
    const ice_breakers = questions.map(q => ({ question: q, payload: `ICEBREAKER_${q.toUpperCase().replace(/\s+/g, '_')}` }));
    
    await axios.post(`https://graph.facebook.com/v19.0/${user.igConfig.accountId}/messenger_profile`, {
      ice_breakers
    }, { params: { access_token: user.igConfig.accessToken } });
    
    res.status(200).json({ success: true, message: 'Ice Breakers updated successfully on Instagram App!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to set Ice Breakers on Meta.' });
  }
};

// @desc    Send 24H Marketing Broadcast
// @route   POST /api/instagram/broadcast
exports.sendBroadcast = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { messageText } = req.body;
    const user = await User.findById(userId).lean();
    if (!user?.igConfig?.accessToken) return res.status(400).json({ success: false, message: 'Instagram not connected.' });
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMessages = await Message.find({ userId, direction: 'incoming', timestamp: { $gte: twentyFourHoursAgo }, customerPhone: { $regex: /^IG_/ } }).distinct('customerPhone');
    
    if (recentMessages.length === 0) return res.status(400).json({ success: false, message: 'No active users found in the last 24 hours.' });
    
    let successCount = 0;
    for (const phone of recentMessages) {
      try {
        const igUserId = phone.replace('IG_', '');
        await axios.post(`https://graph.facebook.com/v19.0/me/messages`, { recipient: { id: igUserId }, message: { text: messageText } }, { params: { access_token: user.igConfig.accessToken }});
        successCount++;
      } catch(e) {}
    }
    res.status(200).json({ success: true, message: `Broadcast sent to ${successCount} users.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};