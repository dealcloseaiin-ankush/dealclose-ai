const Message = require('../models/messageModel');
const User = require('../models/userModel');
const whatsappService = require('../services/whatsappService');

// @desc    Get all chat history for a user (Grouped by customer)
exports.getChats = async (req, res) => {
  try {
    // Ab auth middleware se asli user ID aayegi
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized. Please login again.' });
    
    const messages = await Message.find({ userId }).sort({ timestamp: 1 });
    res.json(messages);
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
      sentBy: 'staff'
    });

    console.log(`➡️ [DEBUG Chat Flow] 4. Message saved to DB (ID: ${newMsg._id})`);

    const user = await User.findById(userId);
    
    console.log(`➡️ [DEBUG Chat Flow] 5. Database Check - User Found: ${user ? 'Yes' : 'No'}`);
    if (user) {
      console.log(`   - WhatsApp Config Exists: ${!!user.whatsappConfig}`);
      console.log(`   - Access Token Present: ${!!user.whatsappConfig?.accessToken}`);
      console.log(`   - Phone Number ID Present: ${!!user.whatsappConfig?.phoneNumberId}`);
    }

    if (!user || !user.whatsappConfig?.accessToken || !user.whatsappConfig?.phoneNumberId) {
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
        user.whatsappConfig.accessToken,
        user.whatsappConfig.phoneNumberId,
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