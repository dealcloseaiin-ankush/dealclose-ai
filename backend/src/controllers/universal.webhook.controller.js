const aiService = require('../services/aiService');
const whatsappService = require('../services/whatsappService');
const User = require('../models/userModel');
const Message = require('../models/messageModel');

// @desc    Universal Data Webhook (For Vyapar, Shopify, Custom POS, etc.)
// @route   POST /api/webhooks/universal
exports.handleUniversalData = async (req, res) => {
  try {
    const { apiKey, platformName, eventType, customerPhone, data } = req.body;
    
    if (!apiKey) return res.status(401).json({ success: false, message: "API Key is required" });
    const user = await User.findOne({ apiKey: apiKey });
    if (!user) return res.status(401).json({ success: false, message: "Invalid API Key" });

    console.log(`[Universal Webhook] Received ${eventType} from ${platformName}`);

    if (eventType === 'order_created' || eventType === 'appointment_booked') {
      const systemContext = `You are a helpful AI assistant for a business using ${platformName}. An event '${eventType}' just occurred. Data: ${JSON.stringify(data)}. Write a short, friendly WhatsApp confirmation message to the customer.`;
      
      const aiMessage = await aiService.generateAIResponse("Generate a confirmation notification for the customer.", systemContext);

      if (customerPhone && user?.whatsappConfig?.accessToken) {
        await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, customerPhone, aiMessage);
      }
      
      if (user?.whatsappConfig?.accessToken) {
        const adminPhone = user.phone || 'ADMIN_PHONE_NUMBER_HERE'; 
        await whatsappService.sendTextMessage(
          user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, adminPhone, 
          `🚨 [AI System Alert] New order/deal finalized via ${platformName}.\n\nCustomer: ${customerPhone}\nDetails: ${JSON.stringify(data)}\n\n*Action Required:* What would you like to do next?`
        );
      }
    }

    return res.status(200).json({ success: true, message: "Universal Data processed and automated by AI successfully." });
  } catch (error) {
    console.error('Universal Webhook Error:', error);
    return res.status(500).json({ error: "Server Error" });
  }
};

// @desc    Handle outbound WhatsApp message from external CRM (like NewPropertyHub)
// @route   POST /api/webhooks/outbound
exports.handleOutboundMessage = async (req, res) => {
  try {
    const { apiKey, phone, message, mediaUrl } = req.body;
    
    // Validate API Key from NPH
    if (apiKey !== (process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024')) {
      return res.status(401).json({ success: false, message: "Invalid API Key" });
    }

    // Find the main business owner account
    const user = await User.findOne({ role: 'owner' }); 
    
    if (!user || !user.whatsappConfig?.accessToken) {
      return res.status(400).json({ success: false, message: "WhatsApp configuration missing." });
    }

    let formattedPhone = phone.replace(/\D/g, ''); 
    if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

    let finalMessage = message;
    if (mediaUrl) finalMessage += `\n\n🔗 Link: ${mediaUrl}`;

    await whatsappService.sendTextMessage(
      user.whatsappConfig.accessToken, 
      user.whatsappConfig.phoneNumberId, 
      formattedPhone, 
      finalMessage
    );

    await Message.create({
      userId: user._id,
      customerPhone: formattedPhone,
      messageText: finalMessage,
      direction: 'outgoing',
      status: 'sent',
      sentBy: 'crm_broadcast'
    });

    return res.status(200).json({ success: true, message: "Message sent via DealClose AI." });
  } catch (error) {
    console.error('Outbound Message Error:', error.message);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};