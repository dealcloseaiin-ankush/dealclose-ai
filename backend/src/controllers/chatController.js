const Message = require('../models/messageModel');
const User = require('../models/userModel');
const Lead = require('../models/leadModel');
const whatsappService = require('../services/whatsappService');
const metaAdsService = require('../services/metaAdsService');
const axios = require('axios');

// @desc    Get all chat history for a user (Grouped by customer)
exports.getChats = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized. Please login again.' });
    
    const { search, platform, workspaceId: requestedWorkspaceId } = req.query;
    const normalizedWorkspaceId = requestedWorkspaceId === 'main_business' ? 'main' : requestedWorkspaceId;

    const leads = await Lead.find({ userId }).lean();
    const leadDataMap = {};
    const matchingLeadPhones = [];
    
    // 🚀 SMART NORMALIZER: Retroactively fix Old Names and extract City dynamically
    const normalizeData = (nameStr, cityStr) => {
      let n = nameStr || '';
      let c = cityStr || '';
      let idMatch = n.match(/(?:#|ID:\s*)(\d+)/i);
      let seqId = idMatch ? `#${idMatch[1]}` : '';
      let cleanName = n.replace(/\s*\(?(?:#|ID:\s*)\d+\)?/i, '').trim();
      
      if (!c && !cleanName.toLowerCase().startsWith('user')) {
        if (cleanName.includes(',')) {
           const parts = cleanName.split(',');
           cleanName = parts[0].trim();
           c = parts.slice(1).join(' ').trim();
        } else {
           let parts = cleanName.split(/\s+/);
           if (parts.length >= 3) {
             c = parts.pop();
             cleanName = parts.join(' ');
           }
        }
      }
      let finalName = cleanName || 'Unknown';
      if (seqId && !finalName.includes(seqId)) finalName += ` ${seqId}`;
      return { name: finalName, city: c };
    };

    leads.forEach(lead => {
      const norm = normalizeData(lead.name, lead.city);
      const identifier = String(lead.phoneNumber || lead.phone || '').trim();
      const wsId = lead.lastSelectedWorkspaceId || lead.workspaceId || 'main';
      if (identifier) {
        const leadObj = {
          _id: lead._id,
          name: norm.name,
          city: norm.city,
          email: lead.email || '',
          phoneNumber: lead.phoneNumber || identifier,
          status: lead.status || 'new',
          dealValue: lead.dealValue || 0,
          notes: lead.notes || '',
          source: lead.source || '',
          workspaceId: wsId,
          isAiPaused: lead.isAiPaused || false,
          aiPausedUntil: lead.aiPausedUntil || null,
          customFields: lead.customFields || {},
          activeFlowState: lead.activeFlowState || null,
          callingBucket: lead.callingBucket || 'fresh_pool',
          followUpDate: lead.followUpDate || null
        };
        leadDataMap[identifier] = leadObj;
        const cleanDigits = identifier.replace(/\D/g, '');
        if (cleanDigits && cleanDigits.length >= 10) {
          leadDataMap[cleanDigits] = leadObj;
          leadDataMap[`+${cleanDigits}`] = leadObj;
          leadDataMap[`91${cleanDigits.slice(-10)}`] = leadObj;
          leadDataMap[`+91${cleanDigits.slice(-10)}`] = leadObj;
        }
        if (lead.customFields && lead.customFields.igSenderId) {
          leadDataMap[`IG_${lead.customFields.igSenderId}`] = leadObj;
        }

        if (normalizedWorkspaceId && normalizedWorkspaceId !== 'all') {
          if (normalizedWorkspaceId === 'main' && (wsId === 'main' || wsId === 'default' || !wsId)) {
            matchingLeadPhones.push(identifier);
          } else if (wsId === normalizedWorkspaceId) {
            matchingLeadPhones.push(identifier);
          }
        }
      }
    });

    const messageQuery = { userId, isDeleted: { $ne: true } };
    if (normalizedWorkspaceId && normalizedWorkspaceId !== 'all') {
      if (normalizedWorkspaceId === 'main') {
        messageQuery.$or = [
          { workspaceId: 'main' },
          { workspaceId: { $exists: false } },
          { workspaceId: null },
          { workspaceId: 'default' },
          ...(matchingLeadPhones.length > 0 ? [{ customerPhone: { $in: matchingLeadPhones } }] : [])
        ];
      } else {
        messageQuery.$or = [
          { workspaceId: normalizedWorkspaceId },
          ...(matchingLeadPhones.length > 0 ? [{ customerPhone: { $in: matchingLeadPhones } }] : [])
        ];
      }
    }

    const messages = await Message.find(messageQuery).lean().sort({ timestamp: 1 });

    let enrichedMessages = messages.map(msg => {
      let platform = 'whatsapp';
      if (msg.channel === 'instagram_comment' || (msg.tags && msg.tags.includes('ig_comment'))) {
        platform = 'instagram_comment';
      } else if (msg.channel === 'instagram_dm' || (msg.customerPhone && msg.customerPhone.startsWith('IG_'))) {
        platform = 'instagram_dm';
      } else if (msg.channel === 'whatsapp') {
        platform = 'whatsapp';
      } else if (msg.customerPhone && isNaN(msg.customerPhone.replace('+', ''))) {
        platform = 'instagram_comment'; // Fallback for pure text usernames
      }

      const cleanPhone = String(msg.customerPhone || '').replace(/\D/g, '');
      const leadInfo = leadDataMap[msg.customerPhone] || (cleanPhone ? leadDataMap[cleanPhone] : null) || null;

      return {
        ...msg,
        platform, // Added Platform Tag for Frontend Filters
        customerName: leadInfo?.name || (platform !== 'whatsapp' ? String(msg.customerPhone).replace('IG_', '@') : 'Unknown'),
        customerCity: leadInfo?.city || '',
        workspaceId: msg.workspaceId || leadInfo?.workspaceId || 'main',
        isAiPaused: leadInfo?.isAiPaused || false,
        aiPausedUntil: leadInfo?.aiPausedUntil || null,
        leadContext: leadInfo, // 🚀 Rich Lead Context attached!
        sentAt: msg.timestamp || msg.createdAt || new Date(),
        deliveredAt: msg.deliveredAt || undefined,
        readAt: msg.readAt || undefined
      };
    });

    // If there's a search query, filter the results
    if (search) {
      const searchTerm = search.toLowerCase();
      // We need to get all messages for a customer if any of their messages match
      const matchingPhones = new Set();
      enrichedMessages.forEach(msg => {
        if ((msg.customerName && msg.customerName.toLowerCase().includes(searchTerm)) ||
            (msg.customerCity && msg.customerCity.toLowerCase().includes(searchTerm))) {
          matchingPhones.add(msg.customerPhone);
        }
      });
      enrichedMessages = enrichedMessages.filter(msg => matchingPhones.has(msg.customerPhone));
    }

    // If there's a platform filter (e.g., 'whatsapp', 'instagram'), filter the results
    if (platform && platform !== 'all') {
      const matchingPhones = new Set();
      enrichedMessages.forEach(msg => {
        if (msg.platform === platform || (platform === 'instagram' && msg.platform.startsWith('instagram'))) {
          matchingPhones.add(msg.customerPhone);
        }
      });
      enrichedMessages = enrichedMessages.filter(msg => matchingPhones.has(msg.customerPhone));
    }

    res.json(enrichedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a manual message from Staff via Dashboard
exports.sendManualMessage = async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  console.log(`\n➡️ [DEBUG Chat Flow] 1. Request Received. User ID from token: ${userId}`);
  try {
    const { customerPhone, messageText, replyMode, commentId, mediaId } = req.body;

    console.log(`➡️ [DEBUG Chat Flow] 2. Payload details - Phone: ${customerPhone}, Mode: ${replyMode || 'standard'}, Message: "${messageText}"`);

    // SAFETY CHECK: Ensure phone number and message are not empty
    if (!customerPhone || !messageText) {
      console.log(`❌ [DEBUG Chat Flow] Failed at Step 2: Missing phone or message.`);
      return res.status(400).json({ message: 'Phone number and message text are required.' });
    }

    if (!userId) {
      console.log(`❌ [DEBUG Chat Flow] Failed: User ID is missing from Auth Token.`);
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }

    // 🚀 NEW: HANDLE INSTAGRAM (Public Comment Reply vs Private DM)
    if (customerPhone.startsWith('IG_') || isNaN(customerPhone.replace('+', ''))) {
      console.log(`➡️ [DEBUG Chat Flow] Handling Manual Reply for Instagram: ${customerPhone} (Mode: ${replyMode || 'private_dm'})`);
      
      // .lean() is REQUIRED to read fields bypassing Mongoose strict schema
      const user = await User.findById(userId).lean();
      
      // ✅ BUG FIX: Don't use Lead.lastSelectedWorkspaceId for IG. Instead, find the
      // last message in this conversation to reliably get the correct workspace context.
      const lastMessage = await Message.findOne({ customerPhone, userId }).sort({ timestamp: -1 }).lean();
      const wsIdIg = lastMessage?.workspaceId || 'main';
      console.log(`[Manual IG Reply] Determined workspace context: '${wsIdIg}' from last message.`);
      
      // 🛡️ BULLETPROOF TOKEN EXTRACTION (Prevents 'Cannot read properties of undefined' crashes)
      let igToken = null;
      let igPageId = null;
      if (user && wsIdIg !== 'main') {
         const ws = user.workspaces?.find(w => w && w._id && w._id.toString() === wsIdIg);
         const workspaceInstagram = ws?.instagramConfig || ws?.igConfig;
         if (workspaceInstagram?.accessToken) {
           igToken = workspaceInstagram.accessToken;
           igPageId = workspaceInstagram.facebookPageId || null;
         }
      }
      if (!igToken && user && (user.instagramConfig || user.igConfig)?.accessToken) {
         igToken = (user.instagramConfig || user.igConfig).accessToken;
         igPageId = (user.instagramConfig || user.igConfig).facebookPageId || null;
      }
      if (!igToken && user && user.workspaces) {
          const wsWithToken = user.workspaces.find(w => (w?.instagramConfig || w?.igConfig)?.accessToken);
          if (wsWithToken) {
            igToken = (wsWithToken.instagramConfig || wsWithToken.igConfig).accessToken;
            igPageId = (wsWithToken.instagramConfig || wsWithToken.igConfig).facebookPageId || null;
          }
      }

      if (!user || !igToken) {
        console.log(`❌ [DEBUG Chat Flow] Instagram config missing.`);
        return res.status(400).json({ message: 'Instagram connection missing. Please link Instagram in Settings.' });
      }

      const isPublicCommentMode = replyMode === 'public_comment';
      const targetChannel = isPublicCommentMode ? 'instagram_comment' : 'instagram_dm';

      const newMsg = await Message.create({
        userId,
        workspaceId: wsIdIg,
        customerPhone: customerPhone,
        channel: targetChannel,
        messageText,
        direction: 'outgoing',
        status: 'sent',
        sentBy: 'staff',
        tags: isPublicCommentMode ? ['public_comment_reply', ...(mediaId ? [`post_${mediaId}`] : [])] : ['staff_dm', ...(mediaId ? [`post_${mediaId}`] : [])],
        timestamp: new Date()
      });

      // 🚀 PAUSE AI FOR THIS CUSTOMER (HUMAN TAKEOVER)
      const pauseUntilIg = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      await Lead.findOneAndUpdate(
        { phoneNumber: customerPhone, userId: userId },
        { $set: { isAiPaused: true, aiPausedUntil: pauseUntilIg } }
      );
      console.log(`⏸️ [DEBUG Chat Flow] AI Paused for IG customer ${customerPhone} for 24 hours.`);

      let recipientId = customerPhone.replace('IG_', '');
      const loginType = (user.instagramConfig || user.igConfig)?.loginType || 'facebook_business';
      const isNative = loginType === 'instagram_basic_display' || loginType === 'instagram_business_login';

      if (isPublicCommentMode) {
        // 💬 PUBLIC COMMENT REPLY VIA GRAPH API
        try {
          // Find the real Meta comment ID (stored in wamid on incoming instagram_comment messages)
          let targetCommentId = commentId;
          if (!targetCommentId) {
            const lastCommentMsg = await Message.findOne({
              customerPhone,
              userId,
              channel: 'instagram_comment',
              direction: 'incoming',
              wamid: { $exists: true, $ne: null }
            }).sort({ timestamp: -1 }).lean();
            targetCommentId = lastCommentMsg?.wamid;
          }

          if (!targetCommentId) {
            throw new Error("No valid Instagram Comment ID found for this customer. Please reply using 'Send Private DM' instead.");
          }

          console.log(`💬 Posting Public Reply to Meta Comment ID: ${targetCommentId}`);

          const commentReplyUrl = isNative
            ? `https://graph.instagram.com/v21.0/${targetCommentId}/replies`
            : `https://graph.facebook.com/v19.0/${targetCommentId}/replies`;

          const response = await axios.post(commentReplyUrl, {
            message: messageText
          }, { params: { access_token: igToken } });

          console.log(`✅ PUBLIC COMMENT REPLY POSTED!`, response.data);
          newMsg.wamid = response.data?.id;
          await newMsg.save();
        } catch (publicErr) {
          console.error(`❌ META REJECTED PUBLIC COMMENT REPLY:`, publicErr.response?.data || publicErr.message);
          newMsg.messageText = `${messageText}\n\n[⚠️ Failed to Post Public Reply: ${publicErr.response?.data?.error?.message || publicErr.message}]`;
          newMsg.status = 'failed';
          await newMsg.save();
        }
      } else {
        // ✉️ PRIVATE DIRECT MESSAGE (DM)
        try {
          console.log(`\n================== [MANUAL REPLY MEGA DEBUG] ==================`);
          console.log(`Sending manual DM to IG ID: ${recipientId}`);
          console.log(`Using loginType: ${loginType}`);
          
          const response = await metaAdsService.sendInstagramDM(igToken, recipientId, messageText, loginType);
          
          console.log(`✅ META RETURNED SUCCESS (200 OK)! Response:`, JSON.stringify(response.data));
          console.log(`===============================================================\n`);
          newMsg.wamid = response.data?.message_id;
          await newMsg.save();
        } catch (igError) {
          console.error(`❌ META REJECTED MANUAL REPLY:`, igError.response?.data || igError.message);
          newMsg.messageText = `${messageText}\n\n[⚠️ Failed to Send IG DM: ${igError.response?.data?.error?.message || igError.message}]`;
          newMsg.status = 'failed';
          await newMsg.save();
        }
      }

      // Broadcast the new message to all connected chat dashboards
      const wssChat = req.app.get('wssChat');
      if (wssChat) {
        wssChat.clients.forEach(client => {
          if (client.readyState === require('ws').OPEN) {
            client.send(JSON.stringify({ type: 'NEW_MESSAGE', payload: newMsg }));
          }
        });
      }

      return res.status(201).json({ message: newMsg });
    }

    // 1. SMART PHONE NUMBER FORMATTING
    // Saare spaces, +, aur extra characters hata do
    let formattedPhone = customerPhone.replace(/\D/g, ''); 
    
    // Agar sirf 10 digit ka number hai, toh automatically '91' laga do
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    console.log(`➡️ [DEBUG Chat Flow] 3. Formatted Number: ${formattedPhone}`);

    // 2. SAVE MESSAGE TO DB FIRST (Taaki chat hamesha save ho, chahe koi bhi error aaye)
    const newMsg = await Message.create({
      userId, 
      customerPhone: formattedPhone, 
      messageText, 
      direction: 'outgoing', 
      status: 'sent', 
      sentBy: 'staff',
      timestamp: new Date()
    });

    console.log(`➡️ [DEBUG Chat Flow] 4. Message saved to DB (ID: ${newMsg._id})`);

    // 🚀 NEW: PAUSE AI FOR THIS CUSTOMER (HUMAN TAKEOVER)
    // Agar human ne reply kiya hai, toh AI ko agle 24 ghante ke liye shant (pause) kar do
    const pauseUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    await Lead.findOneAndUpdate(
      { phoneNumber: formattedPhone, userId: userId },
      { $set: { isAiPaused: true, aiPausedUntil: pauseUntil } },
      { upsert: true }
    );
    console.log(`⏸️ [DEBUG Chat Flow] AI Paused for customer ${formattedPhone} for 24 hours.`);

    const user = await User.findById(userId).lean();
    const leadForWa = await Lead.findOne({ phoneNumber: formattedPhone, userId: userId }).lean();
    const wsIdWa = leadForWa?.lastSelectedWorkspaceId || 'main';
    
    let waToken = null;
    let waPhoneId = null;

    // 🛡️ BULLETPROOF WHATSAPP EXTRACTION
    if (user && user.workspaces && wsIdWa !== 'main') {
       const ws = user.workspaces.find(w => w && w._id && w._id.toString() === wsIdWa);
       if (ws && ws.whatsappConfig && ws.whatsappConfig.accessToken) {
           waToken = ws.whatsappConfig.accessToken;
           waPhoneId = ws.whatsappConfig.phoneNumberId;
       }
    }
    
    if (!waToken && user && user.whatsappConfig && user.whatsappConfig.accessToken) {
       waToken = user.whatsappConfig.accessToken;
       waPhoneId = user.whatsappConfig.phoneNumberId;
    }
    
    console.log(`➡️ [DEBUG Chat Flow] 5. Database Check - User Found: ${user ? 'Yes' : 'No'}`);
    if (user) {
      console.log(`   - WhatsApp Config Exists: ${!!waToken}`);
      console.log(`   - Access Token Present: ${!!waToken}`);
      console.log(`   - Phone Number ID Present: ${!!waPhoneId}`);
    }

    if (!user || !waToken || !waPhoneId) {
      console.log(`❌ [DEBUG Chat Flow] Failed at Step 5: WhatsApp config is missing in DB for this user.`);
      newMsg.messageText = `${messageText}\n\n[⚠️ Failed: WhatsApp keys not found. Please save them in Settings.]`;
      await newMsg.save();
      // Return 201 with object so frontend adds the "failed" message to the UI seamlessly
      return res.status(201).json({ message: newMsg });
    }

    // 3. TRY SENDING VIA META API
    console.log(`➡️ [DEBUG Chat Flow] 6. Calling Meta WhatsApp API now for ${formattedPhone}...`);
    try {
      const metaResponse = await whatsappService.sendTextMessage(
        waToken,
        waPhoneId,
        formattedPhone,
        messageText
      );
      
      newMsg.wamid = metaResponse.messages[0].id;
      await newMsg.save();
      console.log(`✅ [DEBUG Chat Flow] 7. SUCCESS! Meta API accepted the message for ${formattedPhone}`);
      
      // Broadcast the new message to all connected chat dashboards
      const wssChat = req.app.get('wssChat');
      if (wssChat) {
        wssChat.clients.forEach(client => {
          if (client.readyState === require('ws').OPEN) {
            client.send(JSON.stringify({ type: 'NEW_MESSAGE', payload: newMsg }));
          }
        });
      }
      return res.status(201).json({ message: newMsg });
    } catch (metaError) {
      // Agar Meta ne reject kiya, toh exact error chat me likh do aur status 'failed' kardo
      const exactError = metaError.response?.data?.error?.message || metaError.message;
      newMsg.messageText = `${messageText}\n\n[⚠️ Failed to Send: ${exactError}]`;
      newMsg.status = 'failed';
      await newMsg.save();
      
      console.error(`❌ [DEBUG Chat Flow] 7. ERROR: Meta API Rejected the message. Reason: ${exactError}`);
      if (exactError.includes('24 hours') || exactError.includes('131047')) {
        console.error(`🚨 [CRITICAL 24-HOUR RULE]: Meta ne message block kar diya! Customer (${formattedPhone}) ko pehle aapko message karna hoga. Dashboard se message bhejkar 24-ghante ki window shuru nahi hoti hai.`);
      }

      // Broadcast the FAILED message to all connected chat dashboards
      const wssChat = req.app.get('wssChat');
      if (wssChat) {
        wssChat.clients.forEach(client => {
          if (client.readyState === require('ws').OPEN) {
            client.send(JSON.stringify({ type: 'NEW_MESSAGE', payload: newMsg }));
          }
        });
      }
      // Return 201 instead of 500 so the frontend adds the "failed" message to the UI seamlessly
      return res.status(201).json({ message: newMsg });
    }
  } catch (error) {
    console.error("🚨 [Chat] CRITICAL BACKEND ERROR (Before reaching Meta):", error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};

// @desc    Delete a single message
// @route   DELETE /api/chats/:messageId
exports.deleteMessage = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, userId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found or you do not have permission to delete it.' });
    }

    // Soft delete logic - mark deleted so it disappears from chat feed
    message.isDeleted = true;
    message.deletedBy = userId;
    message.deletedAt = new Date();
    message.deleteScope = 'message';
    message.messageText = 'This message was deleted.';
    await message.save();

    res.status(200).json({ success: true, message: 'Message deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a whole conversation (soft delete)
// @route   DELETE /api/chats/conversation/:customerPhone
exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { customerPhone } = req.params;

    await Message.updateMany(
      { userId, customerPhone },
      {
        $set: {
          isDeleted: true,
          deletedBy: userId,
          deletedAt: new Date(),
          deleteScope: 'chat'
        }
      }
    );
    res.status(200).json({ success: true, message: 'Conversation deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Chat Tags or Resolve Status
// @route   PATCH /api/chats/:customerPhone/status
exports.updateChatStatus = async (req, res) => {
  try {
    const { customerPhone } = req.params;
    const { tags, isResolved } = req.body;
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Updates all messages for this customer with the new status/tags
    // Note: In a real CRM, you'd have a separate 'Conversation' model.
    // Updating message collection directly for MVP.
    await Message.updateMany(
      { userId, customerPhone },
      { $set: { tags: tags, isResolved: isResolved } }
    );

    res.status(200).json({ message: "Chat status updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle AI on/off for a specific customer chat
// @route   POST /api/chats/toggle-ai
exports.toggleAiForChat = async (req, res) => {
  try {
    const { customerPhone, isAiPaused } = req.body;
    const userId = req.user?._id || req.user?.id;
    
    if (!userId || !customerPhone) return res.status(400).json({ message: 'Missing parameters' });
    
    // Agar Pause karna hai toh 10 saal ke liye pause kardo (Effectively Manual Off)
    const pauseUntil = isAiPaused ? new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000) : null;
    
    await Lead.findOneAndUpdate(
      { phoneNumber: customerPhone.replace(/\D/g, ''), userId: userId },
      { $set: { isAiPaused: isAiPaused, aiPausedUntil: pauseUntil } },
      { upsert: true }
    );
    
    res.status(200).json({ success: true, isAiPaused, message: isAiPaused ? "AI has been paused for this chat." : "AI has been resumed for this chat." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all incoming messages for a customer/chat as read (live sync mobile & desktop)
// @route   POST /api/chats/mark-read
exports.markAsRead = async (req, res) => {
  try {
    const { customerPhone } = req.body;
    const phone = customerPhone || req.params.customerPhone;
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!phone) return res.status(400).json({ success: false, message: 'customerPhone is required' });

    await Message.updateMany(
      { userId, customerPhone: phone, direction: 'incoming', status: { $ne: 'read' } },
      { $set: { status: 'read', readAt: new Date() } }
    );

    res.status(200).json({ success: true, message: 'Chat marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark ALL incoming unread messages as read for this user/workspace
// @route   POST /api/chats/mark-all-read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { workspaceId } = req.body;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const query = { userId, direction: 'incoming', status: { $ne: 'read' } };
    if (workspaceId && workspaceId !== 'all') {
      if (workspaceId === 'main') {
        query.$or = [
          { workspaceId: 'main' },
          { workspaceId: { $exists: false } },
          { workspaceId: null },
          { workspaceId: 'default' }
        ];
      } else {
        query.workspaceId = workspaceId;
      }
    }

    const result = await Message.updateMany(query, { $set: { status: 'read', readAt: new Date() } });
    console.log(`[markAllAsRead] Marked ${result.modifiedCount} incoming messages as read for user ${userId} (workspace: ${workspaceId || 'all'})`);
    res.status(200).json({ success: true, count: result.modifiedCount, message: 'All messages marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer lead details from Chat Context Sidebar
// @route   PATCH /api/chats/:customerPhone/lead-context
exports.updateLeadContext = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { customerPhone } = req.params;
    const { name, email, status, dealValue, notes, customFields, city, phoneNumber } = req.body;
    if (!userId || !customerPhone) return res.status(400).json({ message: 'Missing required parameters' });

    let cleanPhone = customerPhone.replace(/\D/g, '');
    let lead = await Lead.findOne({
      userId,
      $or: [
        { phoneNumber: customerPhone },
        ...(cleanPhone.length >= 10 ? [{ phoneNumber: { $regex: new RegExp(cleanPhone.slice(-10) + '$') } }] : []),
        { 'customFields.igSenderId': customerPhone.replace('IG_', '') }
      ]
    });

    if (lead) {
      if (name) lead.name = name;
      if (email !== undefined) lead.email = email;
      if (status) lead.status = status;
      if (dealValue !== undefined) lead.dealValue = dealValue;
      if (notes !== undefined) lead.notes = notes;
      if (city !== undefined) lead.city = city;
      if (phoneNumber) lead.phoneNumber = phoneNumber;
      if (customFields) {
        lead.customFields = { ...(lead.customFields || {}), ...customFields };
      }
      await lead.save();
      return res.status(200).json({ success: true, lead, message: 'Lead updated successfully' });
    } else {
      // Create new verified lead
      lead = await Lead.create({
        userId,
        name: name || customerPhone,
        phoneNumber: customerPhone.startsWith('IG_') ? (cleanPhone.length >= 10 ? cleanPhone : customerPhone) : customerPhone,
        email: email || '',
        status: status || 'new',
        dealValue: dealValue || 0,
        notes: notes || '',
        city: city || '',
        customFields: { ...(customFields || {}), ...(customerPhone.startsWith('IG_') ? { igSenderId: customerPhone.replace('IG_', '') } : {}) },
        source: customerPhone.startsWith('IG_') ? 'Instagram' : 'WhatsApp',
        createdBy: userId
      });
      return res.status(201).json({ success: true, lead, message: 'Lead created successfully' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


