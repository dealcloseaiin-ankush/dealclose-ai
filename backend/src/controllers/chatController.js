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
    if (!user || !user.whatsappConfig.accessToken) {
      return res.status(400).json({ message: 'WhatsApp configuration missing' });
    }

    // Send physical message via Meta API
    await whatsappService.sendTextMessage(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId,
      customerPhone,
      messageText
    );

    // Save outgoing message so it appears in the Dashboard Chat UI
    const newMsg = await Message.create({
      userId, customerPhone, messageText, direction: 'outgoing', status: 'sent', sentBy: 'staff'
    });

    res.status(201).json(newMsg);
  } catch (error) {
    res.status(500).json({ message: error.message });
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