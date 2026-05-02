const aiService = require('../services/aiService');
const whatsappService = require('../services/whatsappService');
const ocrService = require('../services/ocrService');
const Lead = require('../models/leadModel');
const Call = require('../models/callModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Property = require('../models/propertyModel');
const callService = require('../services/callService');
const billing = require('../utils/billing');

// @desc    Handle incoming voice call (Start of conversation)
// @route   POST /api/webhooks/voice
// This is the first webhook Exotel calls when a customer calls your Exophone.
exports.handleIncomingVoice = (req, res) => {
  // Exotel expects a JSON response, not XML.
  const exotelResponse = [
    {
      "say": {
        "text": "Hello, you've reached DealClose AI. How can I help you today?",
        "voice": "female"
      }
    },
    {
      "gather": {
        "action": `${process.env.BASE_URL}/api/webhooks/voice/respond`, // URL to send user's speech to
        "method": "POST",
        "finish_on_key": "#",
        "timeout": 5,
        "input_type": "speech"
      }
    }
  ];

  res.json(exotelResponse);
};

// @desc    Handle voice response (Conversation loop)
// @route   POST /api/webhooks/voice/respond
// This webhook is called by Exotel after it converts the user's speech to text.
exports.handleVoiceRespond = async (req, res) => {
  const speechResult = req.body.Speech; // Exotel sends speech in 'Speech' field
  const callSid = req.body.CallSid; // Exotel provides CallSid
  let exotelResponse = [];

  if (speechResult) {
    try {
      // Generate AI response
      const aiResponseText = await aiService.generateAIResponse(speechResult, "You are a helpful sales agent on a phone call. Keep responses short and conversational.");

      // Prepare the next part of the conversation for Exotel
      exotelResponse.push({ "say": { "text": aiResponseText, "voice": "female" } });
      exotelResponse.push({ "gather": { "action": `${process.env.BASE_URL}/api/webhooks/voice/respond`, "method": "POST", "timeout": 5, "input_type": "speech" } });
      
      // Save transcript snippet (simplified for MVP)
      console.log(`Call ${callSid}: User said "${speechResult}", AI said "${aiResponseText}"`);
      await Call.findOneAndUpdate({ sid: callSid }, { $push: { transcript: { speaker: 'user', text: speechResult } } });
      await Call.findOneAndUpdate({ sid: callSid }, { $push: { transcript: { speaker: 'ai', text: aiResponseText } } });

    } catch (error) {
      console.error('AI Error:', error);
      exotelResponse.push({ "say": { "text": "I am having some trouble right now. Please try again later.", "voice": "female" } });
      exotelResponse.push({ "hangup": {} });
    }
  } else {
    // If no speech is detected, ask again.
    exotelResponse.push({ "say": { "text": "Sorry, I didn't hear anything. Could you please repeat?", "voice": "female" } });
    exotelResponse.push({ "gather": { "action": `${process.env.BASE_URL}/api/webhooks/voice/respond`, "method": "POST", "timeout": 5, "input_type": "speech" } });
  }

  res.json(exotelResponse);
};

// @desc    Verify Meta Webhook Setup (Required by Meta)
// @route   GET /api/webhooks/whatsapp
exports.verifyWhatsAppWebhook = async (req, res) => {
  console.log("➡️ [Webhook Hit] Meta is trying to verify:", req.query);

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Direct fallback token jisse .env ka error bypass ho jayega
  const mySecretToken = "ankush@7828289433";

  if (mode && token) {
    if (mode === 'subscribe' && (token === process.env.META_WEBHOOK_VERIFY_TOKEN || token === mySecretToken)) {
      console.log('✅ Meta Webhook Verified Successfully!');
      return res.status(200).send(challenge);
    } else {
      console.error('❌ Webhook Verification Failed! Token mismatch.');
      console.error(`Expected: "${mySecretToken}", Received: "${token}"`);
      return res.sendStatus(403);
    }
  } else {
    console.error('❌ Bad Request: Missing mode or token in query');
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
        
        // The Phone Number ID receiving the message (To map it to our User)
        const phoneNumberId = value.metadata.phone_number_id;
        const user = await User.findOne({ "whatsappConfig.phoneNumberId": phoneNumberId });
        
        if (!user) {
          console.error("User not found for this Phone Number ID");
          continue;
        }

        // 1. CHECK FOR STATUS UPDATES (Sent, Delivered, Read Analytics)
        if (value.statuses && value.statuses.length > 0) {
          const statusObj = value.statuses[0];
          const statusStr = statusObj.status; // 'sent', 'delivered', 'read'

          if (statusStr === 'sent') user.messageStats.sent += 1;
          if (statusStr === 'delivered') user.messageStats.delivered += 1;
          if (statusStr === 'read') user.messageStats.read += 1;
          
          // Optional: Aage chalkar specific message ka Read status update karne ki logic bhi yaha dalegi
          
          await user.save();
        }

        // 2. CHECK FOR INCOMING MESSAGES
        if (value.messages && value.messages.length > 0) {
          const msg = value.messages[0];
          const fromNumber = msg.from; // Customer Number
          
          if (msg.type === 'image') {
            const mediaId = msg.image.id;
            
            // 1. Send loading message to customer
            await whatsappService.sendTextMessage(
              user.whatsappConfig.accessToken, 
              user.whatsappConfig.phoneNumberId, 
              fromNumber, 
              "I received your image! Let me read the list using AI for you... ⏳"
            );

            try {
              // 2. Download Image from Meta
              const { buffer, mimeType } = await whatsappService.downloadMedia(user.whatsappConfig.accessToken, mediaId);
              
              // 3. Process Image with Gemini Vision
              const extractedData = await ocrService.extractTextFromImage(buffer, mimeType || 'image/jpeg');

              // 4. Send Extracted Data back to Customer
              await whatsappService.sendTextMessage(
                user.whatsappConfig.accessToken, 
                user.whatsappConfig.phoneNumberId, 
                fromNumber, 
                `*Here is what I read from your list:*\n\n${extractedData}\n\nWould you like me to create an order or quotation for these items?`
              );

              // Save message to DB
              await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: "[AI Vision Extracted Data]", direction: 'outgoing', status: 'sent', sentBy: 'ai' });

            } catch (err) {
              console.error("Image processing failed:", err);
              await whatsappService.sendTextMessage(
                user.whatsappConfig.accessToken, 
                user.whatsappConfig.phoneNumberId, 
                fromNumber, 
                "Sorry, I couldn't read the image properly right now. Could you please type it out?"
              );
            }

            continue; // Skip text processing
          }

          // --- HANDLE INTERACTIVE REPLIES (When customer clicks a menu option) ---
          if (msg.type === 'interactive') {
            const interactiveType = msg.interactive.type;
            let selectedContext = "";
            
            if (interactiveType === 'list_reply') {
              selectedContext = msg.interactive.list_reply.id;
            } else if (interactiveType === 'button_reply') {
              selectedContext = msg.interactive.button_reply.id;
            }

            let responseMessage = "Got it! How can I help you today?";
            
            // Set reply based on what they selected
            if (selectedContext === 'menu_real_estate') {
              responseMessage = "Welcome to our Real Estate division! 🏢 Are you looking to buy, sell, or rent a property?";
            } else if (selectedContext === 'menu_electronics') {
              responseMessage = "Welcome to our Electronics Store! 💻 Are you looking for Mobiles, Laptops, or Accessories?";
            } else if (selectedContext === 'menu_support') {
              responseMessage = "You have reached Customer Support. 🎧 Please describe your issue, and our team will assist you shortly.";
            }

            await whatsappService.sendTextMessage(
              user.whatsappConfig.accessToken, 
              user.whatsappConfig.phoneNumberId, 
              fromNumber, 
              responseMessage
            );

            await Message.create({
              userId: user._id,
              customerPhone: fromNumber,
              messageText: responseMessage,
              direction: 'outgoing',
              status: 'sent',
              sentBy: 'auto-reply'
            });
            continue;
          }

          if (msg.type === 'text') {
            const incomingText = msg.text.body.trim();
            let responseMessage = null;
            let repliedBy = 'ai';

            // --- ADMIN / OWNER COMMAND CENTER INTERCEPTOR ---
            // Check if the sender is the Owner or registered Staff
            const isOwnerOrStaff = (user.ownerPhone && user.ownerPhone.replace(/\D/g,'') === fromNumber) || 
                                   (user.staff && user.staff.some(s => s.phone.replace(/\D/g,'') === fromNumber));
            
            if (isOwnerOrStaff) {
              console.log("[Admin Command] Received command from Owner/Staff:", incomingText);
              
              const adminContext = `You are the backend AI assistant for the business owner. The owner is texting you. You can help them manage leads, send bulk templates, or give stats. Answer professionally as their personal AI manager.`;
              
              const aiAdminResponse = await aiService.generateAIResponse(incomingText, adminContext);
              
              
              await whatsappService.sendTextMessage(
                user.whatsappConfig.accessToken, 
                user.whatsappConfig.phoneNumberId, 
                fromNumber, 
                `🤖 *DealClose Admin Bot:*\n\n${aiAdminResponse}`
              );
              continue; // Stop processing it as a normal customer message
            }

            // Save Incoming Message for Staff to see
            await Message.create({
              userId: user._id,
              customerPhone: fromNumber,
              messageText: incomingText,
              direction: 'incoming',
              status: 'received',
              sentBy: 'customer'
            });
            
            // --- GREETING CHECK: SEND MAIN MENU ---
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
              
              await Message.create({
                userId: user._id,
                customerPhone: fromNumber,
                messageText: "[Sent Interactive Main Menu]",
                direction: 'outgoing',
                status: 'sent',
                sentBy: 'auto-reply'
              });
              
              continue; // Skip AI processing since we sent the menu
            }

            // --- Non-AI Automations / Auto-Replies ---
            // Check if user set a trigger rule in their dashboard
            const autoReplyRule = user.autoReplies.find(
              r => incomingText.toLowerCase() === r.triggerWord.toLowerCase()
            );

            if (autoReplyRule) {
              responseMessage = autoReplyRule.replyMessage;
              repliedBy = 'auto-reply';
            } else {
              // --- Fallback to AI ---
              
              // ADD YOUR PERMANENT FREE TESTING NUMBERS HERE (With country code, e.g., '919876543210')
              const freeTestNumbers = ['919876543210', '918888888888'];
              const isFreeTestUser = freeTestNumbers.includes(fromNumber);
              
              // Check AI Credits before replying to customer (Bypass for test users)
              if (user.aiCredits <= 0 && !isFreeTestUser) {
                // Fallback to Dumb Bot logic
                responseMessage = "Thank you for your message! Our human team will get back to you shortly.";
                repliedBy = 'dumb-bot-fallback';
              } else {
                // Deduct Credit and track cost ONLY if it's not a free test user
                if (!isFreeTestUser) {
                  user.aiCredits -= 1;
                  await user.save();
                  await billing.deductAICost(user._id, 'OPENAI_GPT_4', 1); // Tracking via billing util
                }
              
                // Change prompt context for NewPropertyHub
                const aiContext = "You are a real estate AI assistant for newpropertyhub.in. Be polite. Help users list properties, talk to brokers, extract property details, and arrange calls if they request it.";
                const aiMessage = await aiService.generateAIResponseWithTools(incomingText, aiContext);
              
                if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                  for (const toolCall of aiMessage.tool_calls) {
                  if (toolCall.function.name === "extract_lead_requirements") {
                    const leadData = JSON.parse(toolCall.function.arguments);
                    console.log("[AI Action] Extracted Lead Data:", leadData);
                    
                    // Automatically save the extracted catalog/lead to MongoDB
                    await Lead.findOneAndUpdate(
                      { phoneNumber: fromNumber },
                      { 
                        userId: user._id,
                        name: "New AI Lead",
                        source: leadData.category,
                        status: "interested",
                        notes: `Interested in: ${leadData.itemName} | Budget: ${leadData.budget}`
                      },
                      { new: true, upsert: true }
                    );
                    
                    responseMessage = `Got it! I have noted your requirement for ${leadData.itemName}. Let me check our catalog and get back to you with the best options!`;
                    repliedBy = 'ai-tool-lead';
                  } 
                  else if (toolCall.function.name === "trigger_outbound_call") {
                    const callData = JSON.parse(toolCall.function.arguments);
                    console.log("[AI Action] Triggering Call for reason:", callData.reason);
                    
                    // Call Lagane ka Logic via Exotel
                    const exotelNumber = process.env.EXOTEL_EXOPHONE; 
                    const webhookUrl = `${process.env.BASE_URL}/api/webhooks/voice`;
                    await callService.initiateCall(fromNumber, exotelNumber, webhookUrl);
                    
                    responseMessage = "I am arranging a call for you right now. Please answer your phone in a few seconds.";
                    repliedBy = 'ai-tool-call';
                  }
                  else if (toolCall.function.name === "escalate_to_owner") {
                    const callData = JSON.parse(toolCall.function.arguments);
                    console.log("[AI Action] Escalating to owner:", callData.customerQuestion);
                    
                    // Save to User's AI Training Log (Assuming we add this field to user model later)
                    // For now, we push it to an array or log it.
                    await User.findByIdAndUpdate(user._id, {
                      $push: { 
                        trainingData: { question: callData.customerQuestion, status: 'unanswered', customerPhone: fromNumber } 
                      }
                    });
                    
                    responseMessage = "That's a great question! I'm not entirely sure about that yet, but I've asked the team. They will get back to you shortly.";
                    repliedBy = 'ai-tool-escalate';
                  }
                  else if (toolCall.function.name === "check_order_status") {
                    // In future, this will check the Excel/Dispatch Database.
                    responseMessage = "Let me check the dispatch system for your number. Your order is currently being processed and will be shipped soon!";
                    repliedBy = 'ai-tool-order';
                  }
                  else if (toolCall.function.name === "update_lead_status") {
                    const statusData = JSON.parse(toolCall.function.arguments);
                    console.log("[AI Action] Auto-Categorizing Lead Status as:", statusData.status);
                    
                    // Update the lead status automatically in MongoDB
                    await Lead.findOneAndUpdate(
                      { phoneNumber: fromNumber },
                      { status: statusData.status, userId: user._id },
                      { new: true, upsert: true } // Agar pehle se DB me nahi hai toh naya lead bana dega
                    );
                    
                    // We continue conversation silently, no specific reply needed just for updating DB
                  }
                  else if (toolCall.function.name === "mark_lead_as_lost_and_share") {
                    const data = JSON.parse(toolCall.function.arguments);
                    console.log("[AI Action] Lead Lost. Checking local network for cross-sell:", data);
                    
                    // Update original lead status
                    await Lead.findOneAndUpdate(
                      { phoneNumber: fromNumber },
                      { status: 'lost', notes: `Lost reason: ${data.reason}` }
                    );

                    // Find other sellers in the same area selling similar products
                    const query = { 
                      _id: { $ne: user._id }, 
                      optInForSharedLeads: true, 
                      productCategories: { $regex: new RegExp(data.productCategory, 'i') } 
                    };
                    
                    if (data.customerPinCode) {
                      query.servedPinCodes = data.customerPinCode;
                    }
                    
                    const otherSellers = await User.find(query).limit(2);
                    
                    if (otherSellers.length > 0) {
                      // Found local competitors! Pitch them to the customer
                      responseMessage = `I understand you don't want to proceed with us. However, we have other verified local sellers in your area for ${data.productCategory} who might have better rates. Would you like me to share their Vyapar links with you?`;
                      repliedBy = 'ai-tool-lead-share';
                    } else {
                      responseMessage = "No problem! Let me know if you change your mind in the future.";
                      repliedBy = 'ai-tool-lead-lost';
                    }
                  }
                } // Ends loop over tool_calls
              } else { // Matches if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0)
                // Normal AI Chat Reply (No tools used)
                responseMessage = aiMessage.content;
              }
            } // Ends else block of if (user.aiCredits <= 0)
            } // Ends else block of if (autoReplyRule)

            // Send reply using Meta API and user's Access Token
            if (responseMessage) {
              await whatsappService.sendTextMessage(
                user.whatsappConfig.accessToken, 
                user.whatsappConfig.phoneNumberId, 
                fromNumber, 
                responseMessage
              );

              // Save Outgoing Message for Staff to see
              await Message.create({
                userId: user._id,
                customerPhone: fromNumber,
                messageText: responseMessage,
                direction: 'outgoing',
                status: 'sent',
                sentBy: repliedBy
              });
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

// @desc    Universal Data Webhook (For Vyapar, Shopify, Custom POS, etc.)
// @route   POST /api/webhooks/universal
exports.handleUniversalData = async (req, res) => {
  try {
    // Yeh endpoint JSON accept karta hai kisi bhi software se
    const { apiKey, platformName, eventType, customerPhone, data } = req.body;
    
    // User ko uske unique API key se dhundho (Aage chal kar userModel me apiKey add karenge)
    const user = await User.findOne({ apiKey: apiKey });
    // Agar abhi apiKey schema me nahi hai, toh temporarily maan lijiye authentication pass ho gaya
    if (!user && !apiKey) return res.status(401).json({ message: "Invalid or missing API Key" });

    console.log(`[Universal Webhook] Received ${eventType} from ${platformName}`);

    // Action on specific events (like new lead or order confirmed)
    if (eventType === 'order_created' || eventType === 'appointment_booked') {
      
      // AI ko data bhej kar ek context-aware message likhwana
      const systemContext = `You are a helpful AI assistant for a business using ${platformName}. An event '${eventType}' just occurred. Data: ${JSON.stringify(data)}. Write a short, friendly WhatsApp confirmation message to the customer.`;
      
      const aiMessage = await aiService.generateAIResponse("Generate a confirmation notification for the customer.", systemContext);

      // 1. Customer ko message bhejna
      if (customerPhone && user?.whatsappConfig?.accessToken) {
        await whatsappService.sendTextMessage(
          user.whatsappConfig.accessToken, 
          user.whatsappConfig.phoneNumberId, 
          customerPhone, 
          aiMessage
        );
      }
      
      // 2. SaaS User (Shop Owner/Admin) ko WhatsApp par "Final Order Alert" bhejna
      if (user?.whatsappConfig?.accessToken) {
        // Assuming admin's personal number is stored in user.phone
        const adminPhone = user.phone || 'ADMIN_PHONE_NUMBER_HERE'; 
        await whatsappService.sendTextMessage(
          user.whatsappConfig.accessToken, 
          user.whatsappConfig.phoneNumberId, 
          adminPhone, 
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

// @desc    Handle Instagram Webhooks (Comments & DMs)
// @route   POST /api/webhooks/instagram
exports.handleInstagramWebhook = async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'instagram') {
      for (let entry of body.entry) {
        // Check if it's a comment or a direct message
        if (entry.changes && entry.changes[0].field === 'comments') {
          const commentData = entry.changes[0].value;
          const commentText = commentData.text;
          const igUserId = commentData.from.id;
          const mediaId = commentData.media.id; // To know which post they commented on

          console.log(`[Instagram Comment] Received: ${commentText}`);

          // 1. Send to AI to extract intent & phone number
          const analysis = await aiService.analyzeSocialMediaComment(commentText);
          console.log("[AI Analysis Result]", analysis);

          if (analysis.intent === 'high' || analysis.intent === 'medium') {
            if (analysis.hasPhoneNumber && analysis.phoneNumber) {
              // THE MAGIC: Customer left a number in comment!
              // 1. Save Lead silently
              await Lead.create({
                name: `IG User ${igUserId}`,
                phoneNumber: analysis.phoneNumber,
                source: 'Instagram Comment',
                status: 'interested',
                notes: `Commented on post: "${commentText}". Interested in: ${analysis.productMentioned}`
              });

              // 2. Send Outbound WhatsApp Message (Assuming we have user config)
              // Note: Since this is an outbound initiation, Meta requires an approved Template message.
              console.log(`🚀 Triggering WhatsApp Template to ${analysis.phoneNumber}`);
              // await whatsappService.sendTemplateMessage(..., "ig_lead_capture", ...);

              // 3. Send a polite reply to the comment so others see we are active
              // await instagramService.replyToComment(commentData.id, `Thanks! We just sent the details to your WhatsApp ending in ${analysis.phoneNumber.slice(-4)} ✅`);
            } else {
              // NO NUMBER FOUND: But intent is high. 
              // 1. Reply to comment
              // await instagramService.replyToComment(commentData.id, analysis.suggestedReply);
              
              // 2. Slide into their DM with a WhatsApp redirect link
              const waLink = `https://wa.me/919876543210?text=Hi,%20I%20saw%20your%20Instagram%20post%20about%20${encodeURIComponent(analysis.productMentioned || 'your products')}`;
              const dmMessage = `Hi there! 👋 You asked about our post. To give you the best price and catalog, connect with our AI assistant on WhatsApp here: ${waLink}`;
              
              console.log(`💬 Sending IG DM to ${igUserId}: ${dmMessage}`);
              // await instagramService.sendDirectMessage(igUserId, dmMessage);
            }
          } else {
            // THE MAGIC 2: Save unhandled/confusing comments for Smart Grouping in Dashboard
            await Lead.create({
              name: `IG User ${igUserId}`,
              phoneNumber: 'N/A',
              source: 'Instagram Unhandled',
              status: 'ignored', // Will be fetched in dashboard for manual/bulk review
              notes: commentText // Storing the exact comment
            });
          }
        }
      }
      return res.sendStatus(200);
    } else {
      return res.sendStatus(404);
    }
  } catch (error) {
    console.error('Instagram Webhook Error:', error);
    return res.sendStatus(500);
  }
};