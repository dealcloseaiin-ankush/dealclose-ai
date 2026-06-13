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
    
    const { search } = req.query; // Search query from frontend

    const messages = await Message.find({ userId }).lean().sort({ timestamp: 1 });

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
      leadDataMap[lead.phoneNumber] = {
        name: norm.name,
        city: norm.city,
        workspaceId: lead.lastSelectedWorkspaceId || 'main'
      };
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
        customerName: leadDataMap[msg.customerPhone]?.name || (platform !== 'whatsapp' ? msg.customerPhone.replace('IG_', '@') : 'Unknown'),
        customerCity: leadDataMap[msg.customerPhone]?.city || '',
        workspaceId: leadDataMap[msg.customerPhone]?.workspaceId || 'main'
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
      
      // 🚀 FIX: Find the exact workspace this lead belongs to
      const leadForIg = await Lead.findOne({ phoneNumber: customerPhone, userId: userId }).lean();
      const wsIdIg = leadForIg?.lastSelectedWorkspaceId || 'main';
      
      let igToken = null;
      
      // 1. Target exact Branch token
      if (wsIdIg !== 'main' && user?.workspaces) {
         const ws = user.workspaces.find(w => w._id.toString() === wsIdIg);
         if (ws?.igConfig?.accessToken) igToken = ws.igConfig.accessToken;
      }
      
      // 2. Fallback to Main Business
      if (!igToken) igToken = user?.igConfig?.accessToken;
      
      // 3. Super Fallback (Any available token)
      if (!igToken && user?.workspaces) {
         const wsWithToken = user.workspaces.find(w => w.igConfig?.accessToken);
         if (wsWithToken) igToken = wsWithToken.igConfig?.accessToken;
      }

      if (!user || !igToken) {
        console.log(`❌ [DEBUG Chat Flow] Instagram config missing.`);
        return res.status(400).json({ message: 'Instagram connection missing. Please link Instagram in Settings.' });
      }

      const newMsg = await Message.create({
        userId, 
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
          
          // 🚀 DIRECT AXIOS CALL TO BYPASS ANY HIDDEN BUGS IN META_ADS_SERVICE
          await require('axios').post(`https://graph.facebook.com/v19.0/me/messages`, {
             recipient: { id: recipientId },
             message: { text: messageText }
          }, { params: { access_token: igToken } });
          
        console.log(`✅ [DEBUG Chat Flow] Manual IG DM sent successfully to ${recipientId}`);
      } catch (igError) {
        newMsg.messageText = `${messageText}\n\n[⚠️ Failed to Send IG DM: ${igError.response?.data?.error?.message || igError.message}]`;
        newMsg.status = 'failed';
        await newMsg.save();
        console.error(`❌ [DEBUG Chat Flow] Error sending IG DM:`, igError.response?.data || igError.message);
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

    // 1. Target exact Branch token
    if (wsIdWa !== 'main' && user?.workspaces) {
       const ws = user.workspaces.find(w => w._id.toString() === wsIdWa);
       if (ws?.whatsappConfig?.accessToken) {
           waToken = ws.whatsappConfig.accessToken;
           waPhoneId = ws.whatsappConfig.phoneNumberId;
       }
    }
    
    // 2. Fallback to Main Business (This handles your Shared Number logic automatically!)
    if (!waToken) {
       waToken = user?.whatsappConfig?.accessToken;
       waPhoneId = user?.whatsappConfig?.phoneNumberId;
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
      await whatsappService.sendTextMessage(
        waToken,
        waPhoneId,
        formattedPhone,
        messageText
      );
      
      console.log(`✅ [DEBUG Chat Flow] 7. SUCCESS! Meta API accepted the message for ${formattedPhone}`);
      
      return res.status(201).json({ message: newMsg });
    } catch (metaError) {
      // Agar Meta ne reject kiya, toh exact error chat me likh do aur status 'failed' kardo
      const exactError = metaError.response?.data?.error?.message || metaError.message;
      newMsg.messageText = `${messageText}\n\n[⚠️ Failed to Send: ${exactError}]`;
      await newMsg.save();
      
      console.error(`❌ [DEBUG Chat Flow] 7. ERROR: Meta API Rejected the message. Reason: ${exactError}`);
      if (exactError.includes('24 hours') || exactError.includes('131047')) {
        console.error(`🚨 [CRITICAL]: Meta blocked the message! The customer ${formattedPhone} MUST message you first to open the 24-hour session. Sending a message from Dashboard does NOT open the window!`);
      }
      // Return 201 instead of 500 so the frontend adds the "failed" message to the UI seamlessly
      return res.status(201).json({ message: newMsg });
    }
  } catch (error) {
    console.error("🚨 [Chat] CRITICAL BACKEND ERROR (Before reaching Meta):", error);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
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