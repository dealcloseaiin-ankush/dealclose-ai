const Message = require('../models/messageModel');
const User = require('../models/userModel');
const Lead = require('../models/leadModel');
const whatsappService = require('../services/whatsappService');
const metaAdsService = require('../services/metaAdsService');

// @desc    Get all chat history for a user (Grouped by customer)
exports.getChats = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized. Please login again.' });
    
    const { search, platform, workspaceId: requestedWorkspaceId } = req.query;
    const normalizedWorkspaceId = requestedWorkspaceId === 'main_business' ? 'main' : requestedWorkspaceId;

    const messageQuery = { userId, isDeleted: { $ne: true } };
    if (normalizedWorkspaceId && normalizedWorkspaceId !== 'all') {
      if (normalizedWorkspaceId === 'main') {
        messageQuery.$or = [
          { workspaceId: 'main' },
          { workspaceId: { $exists: false } },
          { workspaceId: null },
          { workspaceId: 'default' }
        ];
      } else {
        messageQuery.workspaceId = normalizedWorkspaceId;
      }
    }

    const messages = await Message.find(messageQuery).lean().sort({ timestamp: 1 });

    const leads = await Lead.find({ userId }).lean();
    const leadDataMap = {};
    
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
      // 🚀 FIX: Exact mapping for both regular phones and IG IDs to show real names
      const identifier = String(lead.phoneNumber || lead.phone || '').trim();
      if (identifier) {
        leadDataMap[identifier] = {
          name: norm.name,
          city: norm.city,
          workspaceId: lead.lastSelectedWorkspaceId || 'main',
          isAiPaused: lead.isAiPaused || false,
          aiPausedUntil: lead.aiPausedUntil || null
        };
      }
    });

    let enrichedMessages = messages.map(msg => {
      let platform = 'whatsapp';
      if (msg.customerPhone && msg.customerPhone.startsWith('IG_')) {
        platform = 'instagram_dm';
      } else if (msg.tags && msg.tags.includes('ig_comment')) {
        platform = 'instagram_comment';
      } else if (msg.customerPhone && isNaN(msg.customerPhone.replace('+', ''))) {
        platform = 'instagram_comment'; // Fallback for pure text usernames
      }

      return {
        ...msg,
        platform, // Added Platform Tag for Frontend Filters
        customerName: leadDataMap[msg.customerPhone]?.name || (platform !== 'whatsapp' ? String(msg.customerPhone).replace('IG_', '@') : 'Unknown'),
        customerCity: leadDataMap[msg.customerPhone]?.city || '',
        workspaceId: msg.workspaceId || leadDataMap[msg.customerPhone]?.workspaceId || 'main',
        isAiPaused: leadDataMap[msg.customerPhone]?.isAiPaused || false,
        aiPausedUntil: leadDataMap[msg.customerPhone]?.aiPausedUntil || null,
        // 🚀 NEW: Pass detailed timestamps for delivery status tooltips
        // ✅ CRITICAL FIX v2: The frontend crashes with a `RangeError` if `deliveredAt` or `readAt`
        // are `null`. By using `|| undefined`, we ensure that if these fields are falsy (null, undefined),
        // they are passed as `undefined`. The frontend can safely handle `new Date(undefined)`
        // which results in an "Invalid Date", preventing the crash that `new Date(null)` would cause.
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
    const { customerPhone, messageText } = req.body;

    console.log(`➡️ [DEBUG Chat Flow] 2. Payload details - Phone: ${customerPhone}, Message: "${messageText}"`);

    // SAFETY CHECK: Ensure phone number and message are not empty
    if (!customerPhone || !messageText) {
      console.log(`❌ [DEBUG Chat Flow] Failed at Step 2: Missing phone or message.`);
      return res.status(400).json({ message: 'Phone number and message text are required.' });
    }

    if (!userId) {
      console.log(`❌ [DEBUG Chat Flow] Failed: User ID is missing from Auth Token.`);
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }

    // 🚀 NEW: HANDLE INSTAGRAM DIRECT MESSAGES (Manual Reply from UI)
    if (customerPhone.startsWith('IG_') || isNaN(customerPhone.replace('+', ''))) {
      console.log(`➡️ [DEBUG Chat Flow] Handling Manual Reply for Instagram: ${customerPhone}`);
      
      // .lean() is REQUIRED to read fields bypassing Mongoose strict schema
      const user = await User.findById(userId).lean();
      
      // ✅ BUG FIX: Don't use Lead.lastSelectedWorkspaceId for IG. Instead, find the
      // last message in this conversation to reliably get the correct workspace context.
      const lastMessage = await Message.findOne({ customerPhone, userId }).sort({ timestamp: -1 }).lean();
      const wsIdIg = lastMessage?.workspaceId || 'main';
      console.log(`[Manual IG Reply] Determined workspace context: '${wsIdIg}' from last message.`);
      
      // 🛡️ BULLETPROOF TOKEN EXTRACTION (Prevents 'Cannot read properties of undefined' crashes)
      let igToken = null;
      // 🐛 FIX: Added optional chaining `?.` to prevent `TypeError: Cannot read properties of null (reading 'find')`
      if (user && wsIdIg !== 'main') {
         const ws = user.workspaces?.find(w => w && w._id && w._id.toString() === wsIdIg);
          const workspaceInstagram = ws?.instagramConfig || ws?.instagramConfig;
          if (workspaceInstagram?.accessToken) igToken = workspaceInstagram.accessToken;
      }
      if (!igToken && user && (user.instagramConfig || user.instagramConfig)?.accessToken) {
         igToken = (user.instagramConfig || user.instagramConfig).accessToken;
      }
      if (!igToken && user && user.workspaces) {
          const wsWithToken = user.workspaces.find(w => (w?.instagramConfig || w?.instagramConfig)?.accessToken);
          if (wsWithToken) igToken = (wsWithToken.instagramConfig || wsWithToken.instagramConfig).accessToken;
      }

      if (!user || !igToken) {
        console.log(`❌ [DEBUG Chat Flow] Instagram config missing.`);
        return res.status(400).json({ message: 'Instagram connection missing. Please link Instagram in Settings.' });
      }

      const newMsg = await Message.create({
        userId,
        workspaceId: wsIdIg,
        customerPhone: customerPhone,
        messageText,
        direction: 'outgoing',
        status: 'sent',
        sentBy: 'staff',
        timestamp: new Date()
      });

      // Dispatch IG message via Meta Graph API
      try {
        let recipientId = customerPhone.replace('IG_', '');
        const loginType = (user.instagramConfig || user.igConfig)?.loginType || 'facebook_business';
          
          console.log(`\n================== [MANUAL REPLY MEGA DEBUG] ==================`);
          console.log(`Sending manual reply to IG ID: ${recipientId}`);
          console.log(`Using loginType: ${loginType}`);
          
          // ✅ FIX: Use the centralized, loginType-aware service instead of a raw axios call.
          // This was the source of the "Invalid OAuth access token" error for native IG connections.
          const response = await metaAdsService.sendInstagramDM(igToken, recipientId, messageText, loginType);
          
          console.log(`✅ META RETURNED SUCCESS (200 OK)! Response:`, JSON.stringify(response.data));
          console.log(`⚠️ IF THIS IS INVISIBLE IN IG APP, CHECK MESSAGE REQUESTS FOLDER OR META APP MODE.`);
          console.log(`===============================================================\n`);
          newMsg.wamid = response.data?.message_id;
          await newMsg.save();
      } catch (igError) {
        console.error(`❌ META REJECTED MANUAL REPLY:`, igError.response?.data || igError.message);
        newMsg.messageText = `${messageText}\n\n[⚠️ Failed to Send IG DM: ${igError.response?.data?.error?.message || igError.message}]`;
        newMsg.status = 'failed'; // Update status to failed
        await newMsg.save();
      }

      // 🚀 NEW: Broadcast the new message to all connected chat dashboards
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
    const userRole = req.user?.role;
    const { messageId } = req.params;

    if (userRole !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only account owner can delete messages.' });
    }

    const message = await Message.findOne({ _id: messageId, userId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found or you do not have permission to delete it.' });
    }

    // Soft delete logic
    message.isDeleted = true;
    message.deletedBy = userId;
    message.deletedAt = new Date();
    message.deleteScope = 'message';
    message.messageText = 'This message was deleted.'; // Placeholder text
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
    const userRole = req.user?.role;
    const { customerPhone } = req.params;

    if (userRole !== 'owner') {
      return res.status(403).json({ success: false, message: 'Only account owner can delete conversations.' });
    }

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
