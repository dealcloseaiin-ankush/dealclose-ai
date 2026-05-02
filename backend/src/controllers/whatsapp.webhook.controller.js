const aiService = require('../services/aiService');
const whatsappService = require('../services/whatsappService');
const ocrService = require('../services/ocrService');
const Lead = require('../models/leadModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const callService = require('../services/callService');
const billing = require('../utils/billing');

// @desc    Verify Meta Webhook Setup (Required by Meta)
// @route   GET /api/webhooks/whatsapp
exports.verifyWhatsAppWebhook = async (req, res) => {
  console.log("➡️ [Webhook Hit] Meta is trying to verify:", req.query);

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const mySecretToken = "ankush@7828289433";

  if (mode && token) {
    if (mode === 'subscribe' && (token === process.env.META_WEBHOOK_VERIFY_TOKEN || token === mySecretToken)) {
      console.log('✅ Meta Webhook Verified Successfully!');
      return res.status(200).send(challenge);
    } else {
      console.error('❌ Webhook Verification Failed! Token mismatch.');
      return res.sendStatus(403);
    }
  } else {
    return res.status(400).send("Bad Request: Missing mode or token");
  }
};

// @desc    Handle incoming WhatsApp messages & Delivery Status (Meta API)
// @route   POST /api/webhooks/whatsapp 
exports.handleWhatsApp = async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (let entry of body.entry) {
        const changes = entry.changes[0];
        const value = changes.value;
        
        const phoneNumberId = value.metadata.phone_number_id;
        const user = await User.findOne({ "whatsappConfig.phoneNumberId": phoneNumberId });
        
        if (!user) continue;

        // 1. CHECK FOR STATUS UPDATES
        if (value.statuses && value.statuses.length > 0) {
          const statusStr = value.statuses[0].status; 
          if (statusStr === 'sent') user.messageStats.sent += 1;
          if (statusStr === 'delivered') user.messageStats.delivered += 1;
          if (statusStr === 'read') user.messageStats.read += 1;
          await user.save();
        }

        // 2. CHECK FOR INCOMING MESSAGES
        if (value.messages && value.messages.length > 0) {
          const msg = value.messages[0];
          const fromNumber = msg.from;
          
          if (msg.type === 'image') {
            const mediaId = msg.image.id;
            await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, "I received your image! Let me read the list using AI for you... ⏳");

            try {
              const { buffer, mimeType } = await whatsappService.downloadMedia(user.whatsappConfig.accessToken, mediaId);
              const extractedData = await ocrService.extractTextFromImage(buffer, mimeType || 'image/jpeg');

              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, `*Here is what I read from your list:*\n\n${extractedData}\n\nWould you like me to create an order or quotation for these items?`);
              await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: "[AI Vision Extracted Data]", direction: 'outgoing', status: 'sent', sentBy: 'ai' });
            } catch (err) {
              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, "Sorry, I couldn't read the image properly right now. Could you please type it out?");
            }
            continue; 
          }

          if (msg.type === 'interactive') {
            const interactiveType = msg.interactive.type;
            let selectedContext = interactiveType === 'list_reply' ? msg.interactive.list_reply.id : msg.interactive.button_reply.id;
            
            let responseMessage = "Got it! How can I help you today?";
            if (selectedContext === 'menu_real_estate') responseMessage = "Welcome to our Real Estate division! 🏢 Are you looking to buy, sell, or rent a property?";
            else if (selectedContext === 'menu_electronics') responseMessage = "Welcome to our Electronics Store! 💻 Are you looking for Mobiles, Laptops, or Accessories?";
            else if (selectedContext === 'menu_support') responseMessage = "You have reached Customer Support. 🎧 Please describe your issue, and our team will assist you shortly.";

            await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, responseMessage);
            await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: responseMessage, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply' });
            continue;
          }

          if (msg.type === 'text') {
            const incomingText = msg.text.body.trim();
            let responseMessage = null;
            let repliedBy = 'ai';

            const isOwnerOrStaff = (user.ownerPhone && user.ownerPhone.replace(/\D/g,'') === fromNumber) || (user.staff && user.staff.some(s => s.phone.replace(/\D/g,'') === fromNumber));
            if (isOwnerOrStaff) {
              const adminContext = `You are the backend AI assistant for the business owner. The owner is texting you. You can help them manage leads, send bulk templates, or give stats. Answer professionally as their personal AI manager.`;
              const aiAdminResponse = await aiService.generateAIResponse(incomingText, adminContext);
              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, `🤖 *DealClose Admin Bot:*\n\n${aiAdminResponse}`);
              continue; 
            }

            await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: incomingText, direction: 'incoming', status: 'received', sentBy: 'customer' });
            
            const incomingTextLower = incomingText.toLowerCase();
            if (['hi', 'hello', 'hey', 'menu', 'options', 'help'].includes(incomingTextLower)) {
              const interactiveObj = {
                type: "list",
                header: { type: "text", text: "Welcome to DealClose Group" },
                body: { text: "Please select the business division you want to interact with today:" },
                footer: { text: "Powered by DealClose AI" },
                action: {
                  button: "Select Business",
                  sections: [
                    {
                      title: "Our Divisions",
                      rows: [
                        { id: "menu_real_estate", title: "🏢 Real Estate", description: "Buy, sell, or rent properties" },
                        { id: "menu_electronics", title: "💻 Electronics Store", description: "Mobiles, Laptops, Gadgets" },
                        { id: "menu_support", title: "🎧 Customer Support", description: "Raise a complaint or query" }
                      ]
                    }
                  ]
                }
              };
              await whatsappService.sendInteractiveMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, interactiveObj);
              await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: "[Sent Interactive Main Menu]", direction: 'outgoing', status: 'sent', sentBy: 'auto-reply' });
              continue; 
            }

            const autoReplyRule = user.autoReplies.find(r => incomingText.toLowerCase() === r.triggerWord.toLowerCase());

            if (autoReplyRule) {
              responseMessage = autoReplyRule.replyMessage;
              repliedBy = 'auto-reply';
            } else {
              const freeTestNumbers = ['919876543210', '918888888888'];
              const isFreeTestUser = freeTestNumbers.includes(fromNumber);
              
              if (user.aiCredits <= 0 && !isFreeTestUser) {
                responseMessage = "Thank you for your message! Our human team will get back to you shortly.";
                repliedBy = 'dumb-bot-fallback';
              } else {
                if (!isFreeTestUser) {
                  user.aiCredits -= 1;
                  await user.save();
                  await billing.deductAICost(user._id, 'OPENAI_GPT_4', 1);
                }
              
                const aiContext = "You are a real estate AI assistant for newpropertyhub.in. Be polite. Help users list properties, talk to brokers, extract property details, and arrange calls if they request it.";
                const aiMessage = await aiService.generateAIResponseWithTools(incomingText, aiContext);
              
                if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                  for (const toolCall of aiMessage.tool_calls) {
                    if (toolCall.function.name === "extract_lead_requirements") {
                      const leadData = JSON.parse(toolCall.function.arguments);
                      await Lead.findOneAndUpdate({ phoneNumber: fromNumber }, { userId: user._id, name: "New AI Lead", source: leadData.category, status: "interested", notes: `Interested in: ${leadData.itemName} | Budget: ${leadData.budget}` }, { new: true, upsert: true });
                      responseMessage = `Got it! I have noted your requirement for ${leadData.itemName}. Let me check our catalog and get back to you with the best options!`;
                      repliedBy = 'ai-tool-lead';
                    } else if (toolCall.function.name === "trigger_outbound_call") {
                      const exotelNumber = process.env.EXOTEL_EXOPHONE; 
                      const webhookUrl = `${process.env.BASE_URL}/api/webhooks/voice`;
                      await callService.initiateCall(fromNumber, exotelNumber, webhookUrl);
                      responseMessage = "I am arranging a call for you right now. Please answer your phone in a few seconds.";
                      repliedBy = 'ai-tool-call';
                    } else if (toolCall.function.name === "escalate_to_owner") {
                      const callData = JSON.parse(toolCall.function.arguments);
                      await User.findByIdAndUpdate(user._id, { $push: { trainingData: { question: callData.customerQuestion, status: 'unanswered', customerPhone: fromNumber } } });
                      responseMessage = "That's a great question! I'm not entirely sure about that yet, but I've asked the team. They will get back to you shortly.";
                      repliedBy = 'ai-tool-escalate';
                    } else if (toolCall.function.name === "check_order_status") {
                      responseMessage = "Let me check the dispatch system for your number. Your order is currently being processed and will be shipped soon!";
                      repliedBy = 'ai-tool-order';
                    } else if (toolCall.function.name === "update_lead_status") {
                      const statusData = JSON.parse(toolCall.function.arguments);
                      await Lead.findOneAndUpdate({ phoneNumber: fromNumber }, { status: statusData.status, userId: user._id }, { new: true, upsert: true });
                    } else if (toolCall.function.name === "mark_lead_as_lost_and_share") {
                      const data = JSON.parse(toolCall.function.arguments);
                      await Lead.findOneAndUpdate({ phoneNumber: fromNumber }, { status: 'lost', notes: `Lost reason: ${data.reason}` });
                      const query = { _id: { $ne: user._id }, optInForSharedLeads: true, productCategories: { $regex: new RegExp(data.productCategory, 'i') } };
                      if (data.customerPinCode) query.servedPinCodes = data.customerPinCode;
                      const otherSellers = await User.find(query).limit(2);
                      if (otherSellers.length > 0) {
                        responseMessage = `I understand you don't want to proceed with us. However, we have other verified local sellers in your area for ${data.productCategory} who might have better rates. Would you like me to share their Vyapar links with you?`;
                        repliedBy = 'ai-tool-lead-share';
                      } else {
                        responseMessage = "No problem! Let me know if you change your mind in the future.";
                        repliedBy = 'ai-tool-lead-lost';
                      }
                    }
                  }
                } else {
                  responseMessage = aiMessage.content;
                }
              } 
            }

            if (responseMessage) {
              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, responseMessage);
              await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: responseMessage, direction: 'outgoing', status: 'sent', sentBy: repliedBy });
            }
          }
        }
      }
      return res.sendStatus(200);
    } else {
      return res.sendStatus(404);
    }
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    return res.sendStatus(500);
  }
};