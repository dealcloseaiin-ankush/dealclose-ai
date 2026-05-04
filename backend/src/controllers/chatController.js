const Message = require('../models/messageModel');
const User = require('../models/userModel');
const whatsappService = require('../services/whatsappService');

// @desc    Get all chat history for a user (Grouped by customer)
exports.getChats = async (req, res) => {
  try {
    // Ab auth middleware se asli user ID aayegi
    const userId = req.user._id; 
    
    const messages = await Message.find({ userId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a manual message from Staff via Dashboard
exports.sendManualMessage = async (req, res) => {
  try {
    const { customerPhone, messageText } = req.body;
    const userId = req.user._id; 

    const user = await User.findById(userId);
    if (!user || !user.whatsappConfig?.accessToken || !user.whatsappConfig?.phoneNumberId) {
      return res.status(400).json({ message: 'WhatsApp configuration is incomplete. Please go to the Setup page and save your Access Token and Phone Number ID.' });
    }

    // 1. SMART PHONE NUMBER FORMATTING
    // Saare spaces, +, aur extra characters hata do
    let formattedPhone = customerPhone.replace(/\D/g, ''); 
    
    // Agar sirf 10 digit ka number hai, toh automatically '91' laga do
    if (formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    // 2. SAVE MESSAGE TO DB FIRST (Taaki gayab na ho)
    const newMsg = await Message.create({
      userId, 
      customerPhone: formattedPhone, 
      messageText, 
      direction: 'outgoing', 
      status: 'pending', 
      sentBy: 'staff'
    });

    // 3. TRY SENDING VIA META API
    try {
      await whatsappService.sendTextMessage(
        user.whatsappConfig.accessToken,
        user.whatsappConfig.phoneNumberId,
        formattedPhone,
        messageText
      );
      
      // Agar success ho gaya, toh status 'sent' kardo
      newMsg.status = 'sent';
      await newMsg.save();
      
      return res.status(201).json(newMsg);
    } catch (metaError) {
      // Agar Meta ne reject kiya, toh exact error chat me likh do aur status 'failed' kardo
      const exactError = metaError.response?.data?.error?.message || metaError.message;
      newMsg.status = 'failed';
      newMsg.messageText = `${messageText}\n\n[⚠️ Failed to Send: ${exactError}]`;
      await newMsg.save();
      
      console.error("Meta API Error:", exactError);
      // Return 201 instead of 500 so the frontend adds the "failed" message to the UI seamlessly
      return res.status(201).json(newMsg);
    }
  } catch (error) {
    console.error("Error in sendManualMessage:", error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// @desc    Update Chat Tags or Resolve Status
// @route   PATCH /api/chats/:customerPhone/status
exports.updateChatStatus = async (req, res) => {
  try {
    const { customerPhone } = req.params;
    const { tags, isResolved } = req.body;
    const userId = req.user._id;

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