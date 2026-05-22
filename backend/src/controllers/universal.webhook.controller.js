const aiService = require('../services/aiService');
const whatsappService = require('../services/whatsappService');
const User = require('../models/userModel');

// @desc    Universal Data Webhook (For Vyapar, Shopify, Custom POS, etc.)
// @route   POST /api/webhooks/universal
exports.handleUniversalData = async (req, res) => {
  try {
    const { apiKey, platformName, eventType, customerPhone, data } = req.body;
    
    const user = await User.findOne({ apiKey: apiKey });
    if (!user && !apiKey) return res.status(401).json({ message: "Invalid or missing API Key" });

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