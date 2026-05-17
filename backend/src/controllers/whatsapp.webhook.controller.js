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
  console.log("\n================ [META WEBHOOK INCOMING] ================");
  console.log("➡️ Raw Payload:", JSON.stringify(req.body, null, 2));
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (let entry of body.entry) {
        const changes = entry.changes[0];
        const value = changes.value;
        
        const phoneNumberId = value.metadata.phone_number_id;
        const user = await User.findOne({ "whatsappConfig.phoneNumberId": phoneNumberId });
        
        if (!user) {
          console.error(`❌ [Webhook Error] No user found with phoneNumberId: ${phoneNumberId}`);
          continue;
        } else {
          console.log(`✅ [Webhook] User found: ${user.email} for Phone ID: ${phoneNumberId}`);
        }

        // 1. CHECK FOR STATUS UPDATES
        if (value.statuses && value.statuses.length > 0) {
          console.log(`➡️ [Webhook] Status update received: ${value.statuses[0].status} for message ID: ${value.statuses[0].id}`);
          const statusStr = value.statuses[0].status; 
          if (!user.messageStats) user.messageStats = { sent: 0, delivered: 0, read: 0 };
          if (statusStr === 'sent') user.messageStats.sent = (user.messageStats.sent || 0) + 1;
          if (statusStr === 'delivered') user.messageStats.delivered = (user.messageStats.delivered || 0) + 1;
          if (statusStr === 'read') user.messageStats.read = (user.messageStats.read || 0) + 1;
          
          // Agar 24-hour rule ya kisi aur wajah se fail ho jaye
          if (statusStr === 'failed') {
             const failReason = value.statuses[0].errors?.[0]?.error_data?.details || 'Unknown';
             console.error(`❌ [Webhook] Message Failed to send. Reason: ${failReason}`);
             if (failReason.includes('24 hours')) console.error(`🔍 [DEBUG RULE]: Remember, the customer must message your number first to start the 24-hour clock.`);
             // Aap message ka status database me update kar sakte hain
             await Message.findOneAndUpdate(
               { customerPhone: value.statuses[0].recipient_id, status: 'sent' },
               { $set: { status: 'failed', messageText: `[⚠️ Failed: 24-Hour Window Closed]` } },
               { sort: { timestamp: -1 } } // Update the latest message
             );
          }
          await user.save();
        }

        // 2. CHECK FOR INCOMING MESSAGES
        if (value.messages && value.messages.length > 0) {
          const msg = value.messages[0];
          const fromNumber = msg.from;
          console.log(`➡️ [Webhook] New message from: ${fromNumber}, Type: ${msg.type}`);
          console.log(`✅ [24-HOUR WINDOW OPENED] Customer ${fromNumber} just sent a message. You can now send free-form replies via dashboard for the next 24 hours!`);
          
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
            
            // 🚀 DYNAMIC WORKSPACE ROUTING
            // Yahan hum hardcoded names ('menu_real_estate') ki jagah unique IDs match kar rahe hain
            if (selectedContext.startsWith('workspace_')) {
              const workspaceId = selectedContext.replace('workspace_', ''); // e.g., '12345'
              
              // TODO: Future me hum DB se us workspaceId ki detail nikalenge
              // aur us particular business ka welcome message bhejenge.
              // Sath hi is chat/lead me tag laga denge ki ye is workspace ki hai.
              
              responseMessage = "You have selected this business profile. How can I assist you further today?";
            }

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
              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, `🤖 *DealClose AI Admin:*\n\n${aiAdminResponse}`);
              continue; 
            }

            await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: incomingText, direction: 'incoming', status: 'received', sentBy: 'customer' });
            
            const incomingTextLower = incomingText.toLowerCase();
            if (['hi', 'hello', 'hey', 'menu', 'options', 'help'].includes(incomingTextLower)) {
              
              // 🚀 DYNAMIC MENU GENERATOR
              // Agar user ne multiple businesses (workspaces) add kiye hain, toh unki list banayenge
              let menuRows = [];
              
              if (user.workspaces && user.workspaces.length > 0) {
                menuRows = user.workspaces.map(w => ({
                  id: `workspace_${w._id}`, // Hidden ID bheji jayegi
                  title: w.name.substring(0, 24), // Meta restricts title to 24 chars max
                  description: (w.description || "View our services").substring(0, 72)
                }));
              } else {
                // Fallback: Agar usne koi secondary business nahi banaya hai, toh uska main naam dikhayenge
                menuRows = [
                  { id: `workspace_default`, title: (user.businessName || "Main Business").substring(0, 24), description: "Explore our products and services" }
                ];
              }

              const interactiveObj = {
                type: "list",
                header: { type: "text", text: `Welcome to ${user.fullName || 'Our Business'}` },
                body: { text: "Please select the business division you want to interact with today:" },
                footer: { text: "Powered by DealClose AI" },
                action: {
                  button: "Select Business",
                  sections: [
                    {
                      title: "Our Divisions",
                      rows: menuRows
                    }
                  ]
                }
              };
              await whatsappService.sendInteractiveMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, interactiveObj);
              await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: "[Sent Interactive Main Menu]", direction: 'outgoing', status: 'sent', sentBy: 'auto-reply' });
              continue; 
            }

            const autoReplyRule = (user.autoReplies || []).find(r => incomingText.toLowerCase() === r.triggerWord.toLowerCase());

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
                  try {
                    await billing.deductAICost(user._id, 'OPENAI_GPT_4', 1);
                  } catch (billingErr) {
                    console.error("Billing deduction error:", billingErr.message);
                  }
                }
              
              try {
                // Har SaaS User ka apna personal AI context! 
                const businessInfo = user.businessDescription || "a modern business";
                const aiContext = `You are a helpful AI assistant for ${user.fullName}'s business. Business details: ${businessInfo}. Be polite, help users, extract details, and arrange calls if they request it.`;
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
                    } else if (toolCall.function.name === "create_saas_account") {
                      const accData = JSON.parse(toolCall.function.arguments);
                      const tempPassword = Math.random().toString(36).slice(-8); // Generate 8-char random password
                      
                      let existingUser = await User.findOne({ email: accData.email });
                      if (existingUser) {
                        responseMessage = `An account with the email ${accData.email} already exists! You can log in directly at dealcloseai.in.`;
                      } else {
                        const newUser = await User.create({
                          fullName: accData.fullName,
                          email: accData.email,
                          password: tempPassword,
                          businessDescription: accData.businessDescription,
                          aiCredits: 100 // Free trial credits
                        });
                        responseMessage = `🎉 *Congratulations ${accData.fullName}!* I have successfully created your DealClose AI account for '${accData.businessName}'.\n\n*Login URL:* https://dealclose-ai.onrender.com/login\n*Email:* ${accData.email}\n*Temporary Password:* ${tempPassword}\n\n⚠️ *Important:* Please log in and check your dashboard. (The "Change Password" feature is being added to Settings shortly!)`;
                      }
                      repliedBy = 'ai-admin-onboard';
                    }
                  }
                } else {
                  responseMessage = aiMessage.content;
                }
              } catch (aiError) {
                console.error("❌ [AI API Error]:", aiError.message || aiError);
                responseMessage = "Oops! DealClose AI is currently unable to connect to the network. 🧠🔌\n\nOur engineers are working on it. Please try again in a few minutes.";
                repliedBy = 'system';
              }
              } 
            }

            if (responseMessage) {
              try {
                await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, responseMessage);
                await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: responseMessage, direction: 'outgoing', status: 'sent', sentBy: repliedBy });
              } catch (sendError) {
                console.error("❌ [Send/Save Error]:", sendError.message);
              }
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
    // Return 200 instead of 500 to prevent Meta from infinitely retrying the webhook and spamming customers
    return res.sendStatus(200);
  }
};