const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Lead = require('../models/leadModel');
const PostAnalysis = require('../models/PostAnalysisModel'); // Naya model import karein
const axios = require('axios');
const instagramService = require('../services/instagramService');
const IORedis = require('ioredis');

const redis = process.env.REDIS_URL ? new IORedis(process.env.REDIS_URL) : new IORedis({ host: '127.0.0.1', port: 6379 });
const THREAD_STATE_TTL = 30 * 24 * 60 * 60; // 30 days

const loadThreadState = async (threadKey) => {
  try {
    const raw = await redis.get(threadKey);
    if (!raw) return {
      lastAuthorId: null,
      aiReplyCount: 0,
      humanTookOver: false,
      pausedUntil: null,
      manualOverride: false,
      lastAiReplyAt: null
    };
    return JSON.parse(raw);
  } catch (error) {
    console.error('⚠️ [Redis ThreadState] Load error:', error.message);
    return {
      lastAuthorId: null,
      aiReplyCount: 0,
      humanTookOver: false,
      pausedUntil: null,
      manualOverride: false,
      lastAiReplyAt: null
    };
  }
};

const saveThreadState = async (threadKey, state) => {
  try {
    await redis.set(threadKey, JSON.stringify(state), 'EX', THREAD_STATE_TTL);
  } catch (error) {
    console.error('⚠️ [Redis ThreadState] Save error:', error.message);
  }
};

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
      status: { $nin: ['visitor', 'unqualified'] } 
    });

    const workspaceId = req.query.workspaceId || 'main';
    const selectedWorkspace = workspaceId !== 'main'
      ? user.workspaces?.find((workspace) => String(workspace._id) === String(workspaceId))
      : null;

    res.status(200).json({
      success: true,
      stats: {
        totalCommentsAnalyzed: totalComments,
        totalDMsReceived: totalDMsReceived,
        leadsExtracted: leadsExtracted,
        dmsSent: dmsSent,
        whatsappConversationsStarted: 0, 
        conversionRate: totalDMsReceived > 0 ? ((leadsExtracted / totalDMsReceived) * 100).toFixed(1) + '%' : '0%'
      },
      config: {
        aiSmartReply: selectedWorkspace ? selectedWorkspace.aiAgentEnabled !== false : user.aiAgentEnabled !== false,
        commentAiReplyEnabled: selectedWorkspace ? selectedWorkspace.commentAiReplyEnabled === true : user.commentAiReplyEnabled === true,
        autoDmOnComment: true,
        extractPhoneNumbers: true,
        forceWhatsappRedirect: true
      },
      igLeads: await Lead.find({ userId, source: { $regex: /Instagram/i } }).sort({ createdAt: -1 }).limit(5),
      recentPosts: [], 
      commentGroups: [] 
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

    const workspaceId = req.query.workspaceId || 'main';
    let selectedWorkspace = workspaceId !== 'main'
      ? user.workspaces?.find((workspace) => String(workspace._id) === String(workspaceId))
      : null;
    let selectedInstagram = selectedWorkspace
      ? selectedWorkspace.instagramConfig
      : user.instagramConfig;
    let accessToken = selectedInstagram?.accessToken;
    let accountId = selectedInstagram?.instagramAccountId || selectedInstagram?.accountId;
    let source = selectedWorkspace ? `Workspace: ${selectedWorkspace.name}` : 'Main Config';

    if (workspaceId === 'main' && !accessToken && user?.workspaces) {
      const ws = user.workspaces.find(w => w.instagramConfig?.accessToken);
      if (ws) {
        selectedWorkspace = ws;
        const workspaceInstagram = ws.instagramConfig;
        accessToken = workspaceInstagram.accessToken;
        accountId = workspaceInstagram.instagramAccountId || workspaceInstagram.accountId;
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
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v19.0';
    
    const url = `https://graph.facebook.com/${graphVersion}/${accountId}/media`;
    const response = await axios.get(url, {
      params: {
        fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
        limit: req.query.limit || 15,
        access_token: accessToken
      }
    });
    
    if (!response.data || !response.data.data) {
      console.log(`⚠️ 4. Meta API responded but 'data' array is empty or missing!`);
      return res.status(200).json({ success: true, posts: [] });
    } else {
      console.log(`✅ 4. Meta API Success! Found ${response.data.data.length} posts.`);
    }

    const workspaceAutomations = selectedWorkspace ? selectedWorkspace.postAutomations : user.postAutomations;
    const workspacePostSettings = selectedWorkspace ? selectedWorkspace.commentAiPostSettings || [] : user.commentAiPostSettings || [];
    const currentAutomations = workspaceAutomations || [];
    console.log("[IG POSTS DEBUG] Automation hydrate source:", {
      workspaceId,
      source,
      ruleCount: currentAutomations.length,
      rules: currentAutomations.map(r => ({ postId: r.postId, triggerWord: r.triggerWord, deliveryMode: r.deliveryMode, hasFileUrl: Boolean(r.fileUrl) }))
    });

    const posts = response.data.data.map(post => {
      const dbRule = currentAutomations.find(r => String(r.postId) === String(post.id));
      
      let resolvedMode = 'off';
      if (dbRule) {
        if (dbRule.deliveryMode === 'instant_shortcut') resolvedMode = 'instant_shortcut';
        else if (dbRule.deliveryMode === 'button' || dbRule.deliveryMode === 'hybrid') resolvedMode = 'hybrid';
        else resolvedMode = 'chatbot';
      }

      const postSetting = workspacePostSettings.find(setting => String(setting.postId) === String(post.id));
      const commentAiReplyEnabled = postSetting ? postSetting.commentAiReplyEnabled !== false : true;
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
        impressions: post.like_count * 3, 
        botMode: resolvedMode,
        chatBotKeyword: dbRule ? dbRule.triggerWord : '',
        chatBotReply: dbRule ? dbRule.replyMessage : '',
        fileUrl: dbRule ? dbRule.fileUrl : '',
        publicReply: dbRule ? dbRule.publicReply : 'Check your DM! 📩',
        commentAiReplyEnabled,
        stats: dbRule?.stats || { dmsSent: 0, buttonClicks: 0, pending: 0, chatBotReplied: 0, aiCaught: 0 }
      };
    });

    console.log(`======================================================\n`);
    res.status(200).json({ success: true, posts });
  } catch (error) {
    const status = error.response?.status || 500;
    const metaMsg = error.response?.data?.error?.message || error.message;
    console.error(`❌ IG Fetch Posts Error:`);
    console.error(`   - Status: ${status}`);
    console.error(`   - Meta Error Msg: ${metaMsg}`);
    console.error(`======================================================\n`);
    res.status(status).json({ success: false, message: `Failed to fetch posts: ${metaMsg}` });
  }
};

// @desc    Get saved Post Automations (Workspace Aware)
// @route   GET /api/instagram/automations
exports.getPostAutomations = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const workspaceId = req.query.workspaceId || 'main';
    const user = await User.findById(userId).lean();

    if (workspaceId !== 'main') {
      const workspace = user.workspaces?.find(w => String(w._id) === String(workspaceId));
      console.log("[GET AUTOMATIONS DEBUG] Workspace rules loaded:", {
        workspaceId,
        foundWorkspace: Boolean(workspace),
        count: workspace?.postAutomations?.length || 0
      });
      return res.status(200).json({ success: true, automations: workspace?.postAutomations || [] });
    }

    console.log("[GET AUTOMATIONS DEBUG] Main rules loaded:", {
      workspaceId,
      count: user.postAutomations?.length || 0
    });
    res.status(200).json({ success: true, automations: user.postAutomations || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Comment AI Configuration (Global or Workspace Specific)
// @route   PATCH /api/instagram/comment-ai/config
exports.updateCommentAiConfig = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { workspaceId = 'main', commentAiReplyEnabled, aiAgentEnabled } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (workspaceId && workspaceId !== 'main') {
      const workspaceIndex = user.workspaces.findIndex(w => String(w._id) === String(workspaceId));
      if (workspaceIndex === -1) {
        return res.status(404).json({ success: false, message: 'Workspace not found.' });
      }
      if (typeof commentAiReplyEnabled === 'boolean') {
        user.workspaces[workspaceIndex].commentAiReplyEnabled = commentAiReplyEnabled;
      }
      if (typeof aiAgentEnabled === 'boolean') {
        user.workspaces[workspaceIndex].aiAgentEnabled = aiAgentEnabled;
      }
      await user.save();
      return res.status(200).json({ success: true, message: 'Workspace comment AI config updated.', config: {
        workspaceId,
        commentAiReplyEnabled: user.workspaces[workspaceIndex].commentAiReplyEnabled,
        aiAgentEnabled: user.workspaces[workspaceIndex].aiAgentEnabled
      }});
    }

    if (typeof commentAiReplyEnabled === 'boolean') {
      user.commentAiReplyEnabled = commentAiReplyEnabled;
    }
    if (typeof aiAgentEnabled === 'boolean') {
      user.aiAgentEnabled = aiAgentEnabled;
    }
    await user.save();
    res.status(200).json({ success: true, message: 'Comment AI config updated.', config: {
      commentAiReplyEnabled: user.commentAiReplyEnabled,
      aiAgentEnabled: user.aiAgentEnabled
    }});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update per-post Comment AI enable/disable setting
// @route   PATCH /api/instagram/comment-ai/post-toggle
exports.updateCommentAiPostSetting = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { workspaceId = 'main', postId, commentAiReplyEnabled } = req.body;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!postId) return res.status(400).json({ success: false, message: 'postId is required.' });
    if (typeof commentAiReplyEnabled !== 'boolean') return res.status(400).json({ success: false, message: 'commentAiReplyEnabled must be boolean.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (workspaceId !== 'main') {
      const workspaceIndex = user.workspaces.findIndex(w => String(w._id) === String(workspaceId));
      if (workspaceIndex === -1) return res.status(404).json({ success: false, message: 'Workspace not found.' });

      const workspace = user.workspaces[workspaceIndex];
      const settingIndex = workspace.commentAiPostSettings?.findIndex(setting => String(setting.postId) === String(postId));
      if (settingIndex >= 0) {
        user.workspaces[workspaceIndex].commentAiPostSettings[settingIndex].commentAiReplyEnabled = commentAiReplyEnabled;
      } else {
        user.workspaces[workspaceIndex].commentAiPostSettings = workspace.commentAiPostSettings || [];
        user.workspaces[workspaceIndex].commentAiPostSettings.push({ postId: String(postId), commentAiReplyEnabled });
      }
      await user.save();
      return res.status(200).json({ success: true, message: 'Workspace post-level comment AI setting updated.', setting: { postId, commentAiReplyEnabled, workspaceId } });
    }

    const settingIndex = user.commentAiPostSettings?.findIndex(setting => String(setting.postId) === String(postId));
    if (settingIndex >= 0) {
      user.commentAiPostSettings[settingIndex].commentAiReplyEnabled = commentAiReplyEnabled;
    } else {
      user.commentAiPostSettings = user.commentAiPostSettings || [];
      user.commentAiPostSettings.push({ postId: String(postId), commentAiReplyEnabled });
    }
    await user.save();
    res.status(200).json({ success: true, message: 'Post-level comment AI setting updated.', setting: { postId, commentAiReplyEnabled, workspaceId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Comment AI thread state controls (pause/resume/handover/clear)
// @route   PATCH /api/instagram/comment-ai/thread
exports.updateCommentAiThreadState = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { igAccountId, threadId, action, pauseMinutes } = req.body;
    if (!igAccountId || !threadId || !action) {
      return res.status(400).json({ success: false, message: 'igAccountId, threadId and action are required.' });
    }

    const threadKey = `ig_thread_state:${igAccountId}:${threadId}`;
    let state = await loadThreadState(threadKey);

    switch (action) {
      case 'pause':
        state.pausedUntil = new Date(Date.now() + ((pauseMinutes || 15) * 60 * 1000));
        state.manualOverride = true;
        break;
      case 'resume':
        state.pausedUntil = null;
        state.manualOverride = false;
        break;
      case 'human_took_over':
        state.humanTookOver = true;
        state.manualOverride = false;
        break;
      case 'clear':
        state = {
          lastAuthorId: null,
          aiReplyCount: 0,
          humanTookOver: false,
          pausedUntil: null,
          manualOverride: false,
          lastAiReplyAt: null
        };
        break;
      default:
        return res.status(400).json({ success: false, message: `Unsupported action: ${action}` });
    }

    await saveThreadState(threadKey, state);
    res.status(200).json({ success: true, message: 'Thread state updated.', threadState: state });
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
    
    const workspace = workspaceId && workspaceId !== 'main' ? user.workspaces?.find(w => w._id.toString() === workspaceId) : null;
    const igSettings = workspace ? workspace.instagramConfig : user.instagramConfig;
    const igToken = igSettings?.accessToken;
    const igAccountId = igSettings?.instagramAccountId || igSettings?.accountId;

    if (!igToken || !igAccountId) {
       return res.status(400).json({ success: false, message: 'Instagram not connected.' });
    }

    const result = await instagramService.publishInstagramMedia(igAccountId, igToken, mediaUrl, mediaType, caption);
    res.status(200).json(result);
  } catch (error) {
     res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save a new Post-Specific Automation (🚀 UPGRADED WITH BOTH MODE AND PREMIUM CORES)
// @route   POST /api/instagram/automations
exports.savePostAutomation = async (req, res) => {
  console.log(`\n================== [SAVE AUTOMATION DEBUG ENGINE] ==================`);
  try {
    const userId = req.user?._id || req.user?.id;
    const { postId, thumbnailUrl, triggerWord, replyMessage, fileUrl, deliveryMode, publicReply, workspaceId, commentAiReplyEnabled } = req.body;

    console.log("➡️ Received Body Payload:", JSON.stringify(req.body, null, 2));

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User runtime not found.' });

    // 🔒 PREMIUM AI LEVEL VERIFICATION SECURITY FILTER
    const isPremium = user.isPremium === true || user.role === 'superadmin' || user.email === 'ankush.bani@gmail.com';
    if (deliveryMode === 'hybrid' && !isPremium) {
      return res.status(403).json({ 
        success: false, 
        message: '❌ AI Intent Recovery Mode is a Premium Feature. Please upgrade your dashboard plan to unlock AI Agents.' 
      });
    }

    const cleanPostId = postId ? String(postId).trim() : "";
    const cleanTrigger = triggerWord && triggerWord.trim() !== "" ? triggerWord.trim() : "LINK";
    const cleanReply = replyMessage && replyMessage.trim() !== "" ? replyMessage.trim() : "Check your DM! Details sent.";
    const cleanPublic = publicReply && publicReply.trim() !== "" ? publicReply.trim() : "Check your DM! 📩";
    const cleanFile = fileUrl || "";
    const cleanThumb = thumbnailUrl || "";
    const cleanMode = deliveryMode || "direct";
    const pullFilter = cleanPostId
      ? { postId: cleanPostId }
      : { postId: "", triggerWord: cleanTrigger };

    const currentWorkspaceId = workspaceId || 'main';
    console.log("[SAVE AUTOMATION DEBUG] Normalized rule:", {
      workspaceId: currentWorkspaceId,
      postId: cleanPostId || "[GLOBAL]",
      triggerWord: cleanTrigger,
      deliveryMode: cleanMode,
      hasFileUrl: Boolean(cleanFile)
    });
    console.log(`🔍 Processing workspace data stream node: ${currentWorkspaceId}`);

    if (currentWorkspaceId !== 'main' && currentWorkspaceId !== '') {
      await User.updateOne(
        { _id: userId, "workspaces._id": currentWorkspaceId },
        { $pull: { "workspaces.$.postAutomations": pullFilter } }
      );

      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, "workspaces._id": currentWorkspaceId },
        { 
          $push: { 
            "workspaces.$.postAutomations": { 
              postId: cleanPostId, 
              thumbnailUrl: cleanThumb, 
              triggerWord: cleanTrigger, 
              replyMessage: cleanReply, 
              publicReply: cleanPublic,
              fileUrl: cleanFile, 
              deliveryMode: cleanMode,
              commentAiReplyEnabled: Boolean(commentAiReplyEnabled),
              stats: { sentCount: 0, clickedCount: 0 }
            } 
          } 
        },
        { new: true }
      );

      const wsNode = updatedUser?.workspaces?.find(w => String(w._id) === String(currentWorkspaceId));
      console.log(`✅ Success: Workspace branch automation rules pushed successfully.`);
      console.log(`====================================================================\n`);
      return res.status(200).json({ success: true, message: 'Workspace branch automation saved!', automations: wsNode?.postAutomations || [] });
    }

    await User.updateOne(
      { _id: userId },
      { $pull: { postAutomations: pullFilter } }
    );

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $push: { 
          postAutomations: { 
            postId: cleanPostId, 
            thumbnailUrl: cleanThumb, 
            triggerWord: cleanTrigger, 
            replyMessage: cleanReply, 
            publicReply: cleanPublic,
            fileUrl: cleanFile, 
            deliveryMode: cleanMode,
            commentAiReplyEnabled: Boolean(commentAiReplyEnabled),
            stats: { sentCount: 0, clickedCount: 0 }
          } 
        } 
      },
      { new: true }
    );

    console.log(`✅ Success: Core Main business channel post rules saved seamlessly.`);
    console.log(`====================================================================\n`);
    res.status(200).json({ success: true, message: 'Main post automation saved successfully!', automations: updatedUser.postAutomations });
  } catch (error) {
    console.error("❌ Fatal Crash in Save Automation Endpoint:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a Post-Specific Automation
// @route   DELETE /api/instagram/automations/:postId
exports.deletePostAutomation = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { postId } = req.params;
    const workspaceId = req.query.workspaceId || 'main';

    if (workspaceId !== 'main') {
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, "workspaces._id": workspaceId },
        { $pull: { "workspaces.$.postAutomations": { postId } } },
        { new: true }
      );
      const wsNode = updatedUser.workspaces.find(w => String(w._id) === String(workspaceId));
      return res.status(200).json({ success: true, message: 'Branch automation rule deleted.', automations: wsNode?.postAutomations || [] });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { postAutomations: { postId } } },
      { new: true }
    );

    res.status(200).json({ success: true, message: 'Main automation deleted.', automations: updatedUser.postAutomations });
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
    
    const instagramConfig = user?.instagramConfig;
    if (!instagramConfig?.accessToken || !instagramConfig.instagramAccountId) {
      return res.status(400).json({ success: false, message: 'Instagram not connected.' });
    }
    
    const ice_breakers = questions.map(q => ({ question: q, payload: `ICEBREAKER_${q.toUpperCase().replace(/\s+/g, '_')}` }));
    const igAccountId = instagramConfig.instagramAccountId;

    await axios.post(`https://graph.facebook.com/v19.0/${igAccountId}/messenger_profile`, {
      ice_breakers
    }, { params: { access_token: instagramConfig.accessToken } });
    
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
    const instagramConfig = user?.instagramConfig;
    if (!instagramConfig?.accessToken) return res.status(400).json({ success: false, message: 'Instagram not connected.' });
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentMessages = await Message.find({ userId, direction: 'incoming', timestamp: { $gte: twentyFourHoursAgo }, customerPhone: { $regex: /^IG_/ } }).distinct('customerPhone');
    
    if (recentMessages.length === 0) return res.status(400).json({ success: false, message: 'No active users found in the last 24 hours.' });
    
    let successCount = 0;
    for (const phone of recentMessages) {
      try {
        const igUserId = phone.replace('IG_', '');
        await axios.post(`https://graph.facebook.com/v19.0/me/messages`, { recipient: { id: igUserId }, message: { text: messageText } }, { params: { access_token: instagramConfig.accessToken } });
        successCount++;
      } catch(e) {}
    }
    res.status(200).json({ success: true, message: `Broadcast sent to ${successCount} users.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Insights for a specific Instagram Post
// @route   GET /api/instagram/posts/:id/insights
exports.getPostInsights = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id: mediaId } = req.params;
    const { workspaceId } = req.query;

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Sahi workspace se token nikalein
    const selectedWorkspace = workspaceId && workspaceId !== 'main'
      ? user.workspaces?.find(w => String(w._id) === String(workspaceId))
      : null;
    const igConfig = selectedWorkspace ? selectedWorkspace.instagramConfig : user.instagramConfig;
    const accessToken = igConfig?.accessToken;

    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Instagram not connected.' });
    }

    const insights = await instagramService.getPostInsights(mediaId, accessToken);
    res.status(200).json({ success: true, insights });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Analyze a post's performance with AI
// @route   POST /api/instagram/posts/:id/analyze
exports.analyzePostPerformance = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id: mediaId } = req.params;
    const { workspaceId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // AI Credit Check
    if (user.aiCredits <= 0 && user.role !== 'superadmin') {
      return res.status(402).json({ message: 'Insufficient AI credits for analysis.' });
    }

    const selectedWorkspace = workspaceId && workspaceId !== 'main'
      ? user.workspaces?.find(w => String(w._id) === String(workspaceId))
      : null;
    const igConfig = selectedWorkspace ? selectedWorkspace.instagramConfig : user.instagramConfig;
    const accessToken = igConfig?.accessToken;

    if (!accessToken) {
      return res.status(400).json({ message: 'Instagram not connected.' });
    }

    // Fetch post insights
    const insights = await instagramService.getPostInsights(mediaId, accessToken);

    // 🚀 NEW: Fetch the most recent previous analysis for this post
    const previousAnalysis = await PostAnalysis.findOne({
      userId: user._id,
      postId: mediaId,
    }).sort({ createdAt: -1 });

    // Check if it's too soon to re-analyze
    if (previousAnalysis) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (previousAnalysis.createdAt > sevenDaysAgo) {
        return res.status(429).json({ 
          message: `You can re-analyze this post after 7 days. Last analysis was on ${new Date(previousAnalysis.createdAt).toLocaleDateString()}.` 
        });
      }
    }

    const prompt = `
      Analyze the performance of this Instagram post and provide actionable suggestions.
      
      Post Metrics:
      - Reach: ${insights.reach || 'N/A'}
      - Impressions: ${insights.impressions || 'N/A'}
      - Likes: ${insights.likes || 'N/A'}
      - Comments: ${insights.comments || 'N/A'}
      - Saves: ${insights.saved || 'N/A'}
      - Video Views: ${insights.video_views || 'N/A'}

      ${previousAnalysis ? `
      ---
      PREVIOUS ANALYSIS (from ${new Date(previousAnalysis.createdAt).toLocaleDateString()}):
      Previous Metrics: Reach: ${previousAnalysis.metrics?.reach || 'N/A'}, Likes: ${previousAnalysis.metrics?.likes || 'N/A'}
      Previous AI Summary: "${previousAnalysis.analysisText}"
      ---
      ` : ''}

      Based on these numbers, provide:
      1. A one-sentence summary of the performance.
      2. Two strengths of this post.
      3. Two weaknesses or areas for improvement.
      4. A concrete suggestion for the next post to get better engagement.
      ${previousAnalysis ? '5. A "Then vs. Now" comparison highlighting the growth or changes since the last analysis.' : ''}
    `;

    const analysis = await aiService.generateAIResponse(prompt, "You are a social media expert.", "instagram-analysis");

    // Delete the old analysis to save space
    if (previousAnalysis) {
      await PostAnalysis.findByIdAndDelete(previousAnalysis._id);
    }

    // 🚀 NEW: Save the analysis to the database
    await PostAnalysis.create({
      userId: user._id,
      workspaceId: workspaceId || 'main',
      postId: mediaId,
      analysisText: analysis,
      metrics: insights, // Save the stats at the time of analysis
    });

    // Deduct 1 credit for the analysis
    if (user.role !== 'superadmin') {
      user.aiCredits -= 1;
      await user.save();
    }

    res.status(200).json({ success: true, analysis, remainingCredits: user.aiCredits });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
