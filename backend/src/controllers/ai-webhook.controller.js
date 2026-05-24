const aiService = require('../services/aiService');
const whatsappService = require('../services/whatsappService');
const ocrService = require('../services/ocrService');
const Lead = require('../models/leadModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const callService = require('../services/callService');
const billing = require('../utils/billing');
const metaAdsService = require('../services/metaAdsService');
const Flow = require('../models/flowModel');

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
  // 1. IMMEDIATE RESPONSE TO META: Prevents Meta from retrying and sending double messages!
  res.status(200).send('EVENT_RECEIVED');

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
          
          if (statusStr === 'failed') {
             const failReason = value.statuses[0].errors?.[0]?.error_data?.details || 'Unknown';
             console.error(`❌ [Webhook] Message Failed to send. Reason: ${failReason}`);
             if (failReason.includes('24 hours')) console.error(`🔍 [DEBUG RULE]: Remember, the customer must message your number first to start the 24-hour clock.`);
             await Message.findOneAndUpdate(
               { customerPhone: value.statuses[0].recipient_id, status: 'sent' },
               { $set: { status: 'failed', messageText: `[⚠️ Failed: 24-Hour Window Closed]` } },
               { sort: { timestamp: -1 } }
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
          
          // 🚀 NEW: AUTO-SYNC WHATSAPP CATALOG ORDERS
          if (msg.type === 'order') {
            const orderDetails = msg.order;
            const Order = require('../models/orderModel');
            
            const newOrderId = 'WA-' + Date.now().toString().slice(-6);
            
            await Order.create({ userId: user._id, orderId: newOrderId, customerPhone: fromNumber, status: 'Pending', lastUpdated: new Date() });
            
            const responseMessage = `🛍️ *Order Received!*\nThank you for placing an order from our catalog! Your Order ID is *#${newOrderId}*.\n\nCould you please reply with your complete *Delivery Address* and Pincode so we can dispatch it?`;
            
            await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, responseMessage);
            await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: `[Received Catalog Order] -> Replied asking for address.`, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply' });
            continue;
          }

          // 🚀 NEW: CATCH LOCATION PINS FOR ADDRESSES
          if (msg.type === 'location') {
            const { latitude, longitude, address, name } = msg.location;
            const locationString = `${name ? name + ', ' : ''}${address ? address : `Lat: ${latitude}, Long: ${longitude}`}`;
            
            console.log(`📍 [Webhook] Location received from ${fromNumber}: ${locationString}`);
            
            const Order = require('../models/orderModel');
            const pendingOrder = await Order.findOneAndUpdate(
              { customerPhone: fromNumber, userId: user._id, status: 'Pending' },
              { $set: { shippingAddress: locationString, status: 'Confirmed' } },
              { sort: { createdAt: -1 }, new: true }
            );

            const replyMessage = pendingOrder 
              ? `✅ Thank you! We have updated your delivery address for Order *#${pendingOrder.orderId}*. We will process your dispatch shortly!`
              : `📍 Thank you for sharing your location. I have updated it in your profile!`;

            await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, replyMessage);
            await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: `[Shared Location]: ${locationString}`, direction: 'incoming', status: 'received', sentBy: 'customer' });
            continue;
          }

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
            
            if (selectedContext.startsWith('workspace_')) {
              const workspaceId = selectedContext.replace('workspace_', ''); 
              
              // Save the selected business division in DB
              await Lead.findOneAndUpdate(
                { phoneNumber: fromNumber, userId: user._id },
                { $set: { lastSelectedWorkspaceId: workspaceId } }
              );
              
              let selectedWsName = user.businessName || "Main Business";
              if (workspaceId !== 'default' && user.workspaces) {
                const selectedWs = user.workspaces.find(w => w._id.toString() === workspaceId);
                if (selectedWs) selectedWsName = selectedWs.name;
              }
              
              responseMessage = `Welcome to *${selectedWsName}*! 🏢\nHow can I assist you further today?`;
              
              // 🚀 SMART LINKS INJECTION
              const links = user.digitalCardConfig || {};
              const websiteUrl = (user.businessUrls && user.businessUrls.length > 0) ? user.businessUrls[0] : "";
              
              let socialLinks = [];
              if (websiteUrl) socialLinks.push(`🌐 Website: ${websiteUrl}`);
              if (links.instagram) socialLinks.push(`📸 Instagram: ${links.instagram}`);
              if (links.facebook) socialLinks.push(`📘 Facebook: ${links.facebook}`);
              if (links.youtube) socialLinks.push(`▶️ YouTube: ${links.youtube}`);
              if (links.googleReview) socialLinks.push(`⭐ Rate Us: ${links.googleReview}`);
              
              if (socialLinks.length > 0) {
                responseMessage += "\n\n*Connect with us:* \n" + socialLinks.join("\n");
              }
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
            
            const currentLeadCheck = await Lead.findOne({ phoneNumber: fromNumber, userId: user._id });
            const isCurrentlyPaused = currentLeadCheck && currentLeadCheck.isAiPaused && currentLeadCheck.aiPausedUntil > new Date();
            
            if (isCurrentlyPaused) {
              console.log(`⏸️ [Webhook] Human has taken over the chat for ${fromNumber}. AI is currently paused. Skipping AI reply.`);
              continue; 
            } else if (currentLeadCheck && currentLeadCheck.isAiPaused) {
              console.log(`▶️ [Webhook] AI pause has expired for ${fromNumber}. Resuming AI and resetting the flag.`);
              await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { isAiPaused: false, aiPausedUntil: null } });
            }

            const incomingTextLower = incomingText.toLowerCase();
            if (['hi', 'hello', 'hey', 'menu', 'options', 'help'].includes(incomingTextLower)) {
              
              let menuRows = [
                { 
                  id: `workspace_default`, 
                  title: (user.businessName || "Main Business").substring(0, 24), 
                  description: (user.businessDescription || "Explore our products and services").substring(0, 72) 
                }
              ];
              
              if (user.workspaces && user.workspaces.length > 0) {
                const validWs = user.workspaces.filter(w => w && w.name && w.name.trim() !== '');
                if (validWs.length > 0) {
                  const wsRows = validWs.map(w => ({
                    id: `workspace_${w._id}`, 
                    title: w.name.substring(0, 24), 
                    description: (w.description || "View our services").substring(0, 72)
                  }));
                  menuRows = [...menuRows, ...wsRows];
                }
              } 
              
              // WhatsApp API limits a section to maximum 10 rows
              menuRows = menuRows.slice(0, 10);

              // 🚀 SMART LINKS INJECTION
              let bodyText = `Welcome to the official central support channel for *${user.fullName || user.businessName || 'Our Business'}*.\n\nPlease select the specific business division you want to interact with today:`;
              const links = user.digitalCardConfig || {};
              const websiteUrl = (user.businessUrls && user.businessUrls.length > 0) ? user.businessUrls[0] : "";
              
              let socialLinks = [];
              if (websiteUrl) socialLinks.push(`🌐 Website: ${websiteUrl}`);
              if (links.instagram) socialLinks.push(`📸 Instagram: ${links.instagram}`);
              if (links.facebook) socialLinks.push(`📘 Facebook: ${links.facebook}`);
              if (links.youtube) socialLinks.push(`▶️ YouTube: ${links.youtube}`);
              if (links.googleReview) socialLinks.push(`⭐ Rate Us: ${links.googleReview}`);
              
              if (socialLinks.length > 0) {
                bodyText += "\n\n*Connect with us:* \n" + socialLinks.join("\n");
              }

              const interactiveObj = {
                type: "list",
                header: { type: "text", text: `Welcome to ${user.fullName || 'Our Business'}` },
                body: { text: bodyText },
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

            // 🚀 ZERO-COST LEAD CAPTURE (Bypass AI to save Name/City & AI Cost)
            if (currentLeadCheck && currentLeadCheck.name && currentLeadCheck.name.startsWith('User ') && incomingText.length > 2 && incomingText.length < 60 && isNaN(incomingText)) {
              const extractedName = incomingText.trim();
              const newName = `${extractedName} (ID: ${fromNumber.slice(-4)})`;
              
              await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { name: newName } });

              let responseMessage = `Thank you, ${extractedName.split(' ')[0]}! ✅ Your details are saved.\n\nHow can I assist you further today?`;
              
              // 🚀 SAAS ADMIN OVERRIDE (For DealClose AI)
              if (user.businessName && user.businessName.toLowerCase().includes('dealclose')) {
                 responseMessage = `Thanks ${extractedName.split(' ')[0]}! ✅\n\nI am DealClose AI. I can automate your WhatsApp, Instagram, and Voice Calls to save your time & money.\n\nWould you like to:\n1️⃣ Start a 14-Day Free Trial\n2️⃣ Know more about features\n3️⃣ See Pricing (Reply with number)`;
              }

              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, responseMessage);
              await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: responseMessage, direction: 'outgoing', status: 'sent', sentBy: 'system' });
              continue; // 🚀 Skip AI completely to save tokens!
            }

            const autoReplyRule = (user.autoReplies || []).find(r => incomingText.toLowerCase() === r.triggerWord.toLowerCase());

            if (autoReplyRule) {
              responseMessage = autoReplyRule.replyMessage;
              repliedBy = 'auto-reply';
            } else {
              const freeTestNumbers = ['919876543210', '918888888888'];
              const isFreeTestUser = freeTestNumbers.includes(fromNumber);
              
              const isAiEnabled = user.aiAgentEnabled !== false; 
              const hasTrainingData = user.businessDescription && user.businessDescription.trim().length > 10;
              
              const links = user.digitalCardConfig || {};
              let autoLinks = "";
              if (links.googleReview || links.instagram) {
                autoLinks = "\n\n---\n*While you wait, connect with us:*";
                if (links.googleReview) autoLinks += `\n⭐ Google Review: ${links.googleReview}`;
                if (links.instagram) autoLinks += `\n📸 Instagram: ${links.instagram}`;
              }

              if (!isAiEnabled || (user.aiCredits <= 0 && !isFreeTestUser)) {
                responseMessage = "Thank you for your message! Our human team will get back to you shortly. 🙏" + autoLinks;
                repliedBy = 'system';
                
                if (user.aiCredits === 0 && user.ownerPhone) {
                  await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, user.ownerPhone, "🚨 *AI Limit Exhausted*\n\nAapka DealClose AI ka free trial (50 messages) khatam ho gaya hai. AI ne aapke customers ko automatically reply karna band kar diya hai.\n\nPlease apne dashboard se recharge karein taaki AI aage kaam kar sake.");
                  user.aiCredits = -1; 
                  await user.save();
                }
              } else if (!hasTrainingData) {
                responseMessage = "Thank you for reaching out! Our support team is currently reviewing your request and will assist you shortly. ⏳" + autoLinks;
                repliedBy = 'system';
              } else {
                if (!isFreeTestUser) {
                  user.aiCredits -= 1;
                  if (user.aiCredits === 0 && user.ownerPhone) {
                    await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, user.ownerPhone, "🚨 *AI Limit Exhausted*\n\nAapka DealClose AI ka free trial (50 messages) khatam ho gaya hai. AI ne aapke customers ko automatically reply karna band kar diya hai.\n\nPlease apne dashboard se recharge karein taaki AI aage kaam kar sake.");
                    user.aiCredits = -1;
                  }
                  await user.save();
                  try {
                    await billing.deductAICost(user._id, 'OPENAI_GPT_4', 1);
                  } catch (billingErr) {
                    console.error("Billing deduction error:", billingErr.message);
                  }
                }
              
              try {
                let businessInfo = user.businessDescription || "a modern business";
                let ownerRules = user.aiRules || "Be polite, helpful, and professional.";
                
                const lead = await Lead.findOne({ phoneNumber: fromNumber, userId: user._id });
                if (lead && lead.lastSelectedWorkspaceId) {
                  const selectedWs = user.workspaces.find(ws => ws._id.toString() === lead.lastSelectedWorkspaceId);
                  if (selectedWs) {
                    businessInfo = selectedWs.businessDescription || businessInfo;
                    ownerRules = selectedWs.aiRules || ownerRules;
                  }
                }

                let aiContext = `You are a helpful AI assistant for ${user.fullName}'s business. \nBusiness details: ${businessInfo}.\n\nSTRICT OWNER RULES TO FOLLOW:\n${ownerRules}\n\nCRITICAL: Never cut off your responses mid-sentence. Always finish your thoughts.\nYou have a tool 'send_whatsapp_menu' to send WhatsApp buttons.\n4. LEAD CAPTURE: If the user provides their name, city, or business details, ALWAYS use the 'update_customer_profile' tool and extract as much info as possible.`;
                
                // 🚀 SAAS ADMIN OVERRIDE (For DealClose AI's own WhatsApp Number)
                if (user.businessName && user.businessName.toLowerCase().includes('dealclose')) {
                    const customerNameContext = lead && !lead.name.startsWith('User ') ? lead.name : 'Unknown User';
                    const customerDetailsContext = lead && lead.notes ? lead.notes : 'Unknown';

                    aiContext = `You are "DealClose AI", a world-class AI Sales & Marketing Automation expert.
                    The user messaging you is a potential client for our SaaS platform.
                    
                    CUSTOMER DETAILS EXTRACTED SO FAR:
                    Name: ${customerNameContext}
                    City/Business Info: ${customerDetailsContext}
                    
                    YOUR GOAL: 
                    1. Greet the user WARMLY using their name (if known). If their business or city is known, mention specifically how DealClose AI can automate THEIR type of business (e.g., "Since you are in Real Estate in Delhi, we can set up Lead Capture flows...").
                    2. If you don't know their business, politely ask what business they run so you can suggest the right automation.
                    3. Explain the simple onboarding: Once they create an account, they just need to connect their Meta WhatsApp API keys (Access Token, Phone ID, and WABA ID).
                    4. Highlight the 14-Day Free Trial! Tell them they get full app access for 14 days. They can log in to explore the dashboard, or just provide their Meta keys to start WhatsApp automation instantly.
                    5. MAGIC ONBOARDING: Tell them that when they create an account, DealClose AI automatically builds and deploys a fully working Automation Flow (Influencer Collab or Lead Gen) based on their business type so they don't have to do any manual work. They can customize it in the Dashboard's Template Library!
                    
                    DEALCLOSE AI FEATURES TO PITCH (Based on their business type):
                    1. WhatsApp & Instagram Automation (Auto-reply, Flow Builder, Lead Capture).
                    2. Multi-Staff Shared Inbox: Mention that multiple staff members can use just ONE WhatsApp number to manage high message volumes easily!
                    3. AI Voice Calling (Inbound/Outbound sales calls).
                    4. ScanIQ (Meta/Google Ad Competitor Analysis).
                    
                    - Basic Automation: ₹199/mo (WhatsApp OR Instagram).
                    - AI Starter Offer: ₹99/mo for the 1st month (renews at ₹299/mo).
                    - Omnichannel Pro: ₹498/mo (WhatsApp + Insta + AI Voice).
                    
                    CRITICAL RULES:
                    1. Always reply in the EXACT same language the user is speaking (Hindi, Hinglish, English).
                    2. Be conversational. Don't dump all info at once. Ask about their business first!
                    3. Use 'send_whatsapp_menu' tool for quick options. Use 'create_saas_account' if they want to sign up.
                    4. NEVER cut off your message in the middle. Always provide a full, complete sentence.`;
                }
                
                // 🚀 NEW: Smart AI Address Extraction for Manual Chat Flow
                const Order = require('../models/orderModel');
                const pendingOrder = await Order.findOne({ customerPhone: fromNumber, userId: user._id, status: 'Pending' }).sort({ createdAt: -1 });
                
                if (pendingOrder) {
                  aiContext += `\n\n🚨 PENDING ORDER DETECTED: The customer just placed an order (#${pendingOrder.orderId}) and we are waiting for their delivery address. If the user types any address, city, house number, or pincode, YOU MUST reply with EXACTLY this format at the beginning of your message: [ADDRESS_SAVED] <their full address here>. Then add a friendly confirmation message after it.`;
                }

                const aiMessage = await aiService.generateAIResponseWithTools(incomingText, aiContext);
              
                if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                  for (const toolCall of aiMessage.tool_calls) {
                    if (toolCall.function.name === "extract_lead_requirements") {
                      const leadData = JSON.parse(toolCall.function.arguments);
                      await Lead.findOneAndUpdate({ phoneNumber: fromNumber }, { userId: user._id, name: "New AI Lead", source: leadData.category, status: "interested", notes: `Interested in: ${leadData.itemName} | Budget: ${leadData.budget}` }, { returnDocument: 'after', upsert: true });
                      responseMessage = `Got it! I have noted your requirement for ${leadData.itemName}. Let me check our catalog and get back to you with the best options!`;
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "search_catalog") {
                      const searchData = JSON.parse(toolCall.function.arguments);
                      const Catalog = require('../models/catalogModel');
                      
                      const items = await Catalog.find({
                        userId: user._id,
                        $or: [
                          { name: { $regex: new RegExp(searchData.searchQuery, 'i') } },
                          { description: { $regex: new RegExp(searchData.searchQuery, 'i') } }
                        ]
                      }).limit(5);

                      if (items.length > 0) {
                        const catalogList = items.map(item => `*${item.name}* - ₹${item.price}\n${item.description || ''}`).join('\n\n');
                        responseMessage = `Here are the options I found for you:\n\n${catalogList}\n\nWould you like to know more about any of these or place an order?`;
                      } else {
                        responseMessage = `I checked our catalog, but I couldn't find an exact match for "${searchData.searchQuery}". Please let me know if you are looking for something else.`;
                      }
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "trigger_outbound_call") {
                      const exotelNumber = process.env.EXOTEL_EXOPHONE; 
                      const webhookUrl = `${process.env.BASE_URL}/api/webhooks/voice`;
                      await callService.initiateCall(fromNumber, exotelNumber, webhookUrl);
                      responseMessage = "I am arranging a call for you right now. Please answer your phone in a few seconds.";
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "escalate_to_staff") {
                      const callData = JSON.parse(toolCall.function.arguments);
                      
                      await User.findByIdAndUpdate(user._id, { $push: { trainingData: { question: callData.customerQuestion, status: 'unanswered', customerPhone: fromNumber } } });
                      
                      if (user.fallbackAction === 'notify_owner' && user.ownerPhone) {
                        await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, user.ownerPhone, `🚨 *AI Alert: Help Needed*\nCustomer (${fromNumber}) asked: "${callData.customerQuestion}".\nI didn't know the answer so I paused the chat. Please reply to them from the Dashboard!`);
                        responseMessage = "That's a great question! I'm not entirely sure about that yet, but I've notified the business owner directly. They will get back to you shortly.";
                      } else {
                        responseMessage = "That's a great question! I've asked the team to look into it. They will get back to you shortly.";
                      }
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "check_order_status") {
                      responseMessage = "Let me check the dispatch system for your number. Your order is currently being processed and will be shipped soon!";
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "update_customer_profile") {
                      const profileData = JSON.parse(toolCall.function.arguments);
                      const uniqueSuffix = fromNumber.slice(-4);
                      const newName = `${profileData.fullName || 'Customer'} (ID: ${uniqueSuffix})`;
                      
                      const updateFields = { name: newName };
                      if (profileData.email) updateFields.email = profileData.email;
                      
                      let newNotes = [];
                      if (profileData.city) newNotes.push(`City: ${profileData.city}`);
                      if (profileData.businessType) newNotes.push(`Business: ${profileData.businessType}`);
                      if (newNotes.length > 0) updateFields.notes = newNotes.join(' | ');

                      await Lead.findOneAndUpdate(
                        { phoneNumber: fromNumber, userId: user._id }, 
                        { $set: updateFields }
                      );
                      responseMessage = `Thanks! I've updated your profile as ${profileData.fullName}. How can I help you today?`;
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "update_lead_status") {
                      const statusData = JSON.parse(toolCall.function.arguments);
                      await Lead.findOneAndUpdate({ phoneNumber: fromNumber }, { status: statusData.status, userId: user._id }, { returnDocument: 'after', upsert: true });
                      
                      if ((statusData.status.toLowerCase() === 'converted' || statusData.status.toLowerCase() === 'won') && user.metaAdsConfig?.pixelId && user.metaAdsConfig?.accessToken) {
                         await metaAdsService.sendConversionEvent(user.metaAdsConfig.pixelId, user.metaAdsConfig.accessToken, fromNumber, 'Purchase');
                      }
                    } else if (toolCall.function.name === "request_star_review") {
                      const links = user.digitalCardConfig || {};
                      const discount = user.discountConfig || {};
                      let msg = `Thank you for your time! We'd love your support. 🙏\n\n⭐ *Please leave us a 5-Star Review:*\n${links.googleReview || 'Link not configured'}\n\n📸 *Follow us on Instagram:*\n${links.instagram || 'Link not configured'}\n▶️ *Subscribe on YouTube:*\n${links.youtube || 'Link not configured'}\n`;
                      
                      if (discount.code && discount.percentage) {
                        msg += `\n🎁 *Special Offer for You!*\nShow the referral code *${discount.code}* on your next visit within ${discount.validityDays || 30} days to get *${discount.percentage}% OFF* your purchase!`;
                      }
                      
                      responseMessage = msg;
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "mark_lead_as_lost_and_share") {
                      const data = JSON.parse(toolCall.function.arguments);
                      await Lead.findOneAndUpdate({ phoneNumber: fromNumber }, { status: 'lost', notes: `Lost reason: ${data.reason}` });
                      const query = {
                        _id: { $ne: user._id },
                        optInForSharedLeads: true,
                        productCategories: { $regex: data.productCategory, $options: 'i' }
                      };
                      if (data.customerPinCode) query.servedPinCodes = data.customerPinCode;
                      const otherSellers = await User.find(query).limit(2);
                      if (otherSellers.length > 0) {
                        responseMessage = `I understand you don't want to proceed with us. However, we have other verified local sellers in your area for ${data.productCategory} who might have better rates. Would you like me to share their Vyapar links with you?`;
                        repliedBy = 'ai';
                      } else {
                        responseMessage = "No problem! Let me know if you change your mind in the future.";
                        repliedBy = 'ai';
                      }
                    } else if (toolCall.function.name === "create_saas_account") {
                      const accData = JSON.parse(toolCall.function.arguments);
                      const tempPassword = Math.random().toString(36).slice(-8); 
                      
                      let existingUser = await User.findOne({ email: accData.email });
                      if (existingUser) {
                        responseMessage = `An account with the email ${accData.email} already exists! You can log in directly at dealcloseai.in.`;
                      } else {
                        const newUser = await User.create({
                          fullName: accData.fullName,
                          email: accData.email,
                          password: tempPassword,
                          businessDescription: accData.businessDescription,
                          aiCredits: 50 
                        });
                        
                        // 🚀 MAGIC ONBOARDING: Auto-Deploy Pre-built Flow based on Business Type
                        const isInfluencer = /influencer|creator|collab|youtube|instagram|vlog/i.test(accData.businessDescription || '');
                        let flowName = isInfluencer ? "Instagram Collab Flow" : "Lead Generation Auto";
                        let flowData = {};

                        if (isInfluencer) {
                          flowData = {
                            nodes: [
                              { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'collab, sponsor, brand, pr, ad, promotion, fan, hi' }, position: { x: 400, y: 50 } },
                              { id: '2', type: 'menu', data: { message: 'Hi! 👋 Thanks for reaching out. What are you looking for?', opt1: 'Collab / PR', opt2: 'Brand Promotion', opt3: 'Just a Fan ❤️' }, position: { x: 400, y: 160 } },
                              { id: '3', type: 'askQuestion', data: { question: 'Awesome! Please share your Brand Name, Budget, and Campaign Details.', replyType: 'open' }, position: { x: 100, y: 350 } },
                              { id: '4', type: 'askQuestion', data: { question: 'Great! What kind of promotion? (Reel/Story) Will you provide the script? And what is the budget?', replyType: 'open' }, position: { x: 400, y: 350 } },
                              { id: '5', type: 'message', data: { message: 'Aww! Thank you so much for the love and support! Means the world to me. ❤️✨' }, position: { x: 700, y: 350 } },
                              { id: '6', type: 'message', data: { message: 'Thank you! ✅ I have saved your details. My team will review and share the Media Kit shortly!' }, position: { x: 250, y: 550 } }
                            ],
                            edges: [ { id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3', sourceHandle: 'opt_0' }, { id: 'e2-4', source: '2', target: '4', sourceHandle: 'opt_1' }, { id: 'e2-5', source: '2', target: '5', sourceHandle: 'opt_2' }, { id: 'e3-6', source: '3', target: '6', sourceHandle: 'replied' }, { id: 'e4-6', source: '4', target: '6', sourceHandle: 'replied' } ]
                          };
                        } else {
                          flowData = {
                            nodes: [
r ek refr                              { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'hi, hello, price, wholesale, b2b, catalog' }, position: { x: 400, y: 50 } },
                              { id: '2', type: 'askQuestion', data: { question: `Welcome to ${accData.businessName}! 🏢 To serve you better, please reply with your Full Name and City.`, replyType: 'open' }, position: { x: 400, y: 160 } },
                              { id: '3', type: 'askQuestion', data: { question: 'Thanks {{name}}! What type of business do you run? (e.g., Retail Shop, Distributor, Online Store)', replyType: 'open' }, position: { x: 100, y: 310 } },
                              { id: '4', type: 'menu', data: { message: 'Noted! What products are you looking for today? (⚠️ Note: We only deal in Wholesale/Bulk. Minimum Order Quantity applies.)', opt1: 'View Catalog 📦', opt2: 'Talk to Sales 📞' }, position: { x: 400, y: 310 } },
                              { id: '5', type: 'message', data: { message: 'Great! Here is our latest wholesale catalog: [Your Catalog Link Here]. Let us know your bulk requirements!' }, position: { x: 100, y: 500 } },
                              { id: '6', type: 'message', data: { message: 'Our B2B sales expert has been notified and will contact you shortly to discuss bulk pricing!' }, position: { x: 700, y: 500 } }
                            ],
                            edges: [ { id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3', sourceHandle: 'replied' }, { id: 'e3-4', source: '3', target: '4', sourceHandle: 'replied' }, { id: 'e4-5', source: '4', target: '5', sourceHandle: 'opt_0' }, { id: 'e4-6', source: '4', target: '6', sourceHandle: 'opt_1' } ]
                          };
                        }

                        await Flow.create({
                          userId: newUser._id,
                          workspaceId: 'main',
                          name: flowName,
                          flowData: flowData
                        });

                        responseMessage = `🎉 *Congratulations ${accData.fullName}!* I have successfully created your DealClose AI account for '${accData.businessName}'.\n\n✨ *MAGIC ONBOARDING:* I didn't want you to do manual work, so I have ALREADY deployed a fully working *${flowName}* into your account! It will automatically reply to your customers.\n\n*Login URL:* https://dealclose-ai.onrender.com/login\n*Email:* ${accData.email}\n*Temporary Password:* ${tempPassword}\n\n⚠️ Log in to connect your Meta API keys, customize your automation using AI, or explore our Template Library!`;
                      }
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "send_whatsapp_menu") {
                      const menuData = JSON.parse(toolCall.function.arguments);
                      const buttons = menuData.options.slice(0, 3).map((opt, idx) => ({
                        type: "reply",
                        reply: { id: `ai_btn_${idx}`, title: opt.substring(0, 20) }
                      }));
                      
                      await whatsappService.sendInteractiveMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, {
                        type: "button",
                        body: { text: menuData.messageText },
                        action: { buttons }
                      });
                      
                      responseMessage = null; 
                      repliedBy = 'ai';
                      await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: `[Interactive AI Question]: ${menuData.messageText}`, direction: 'outgoing', status: 'sent', sentBy: 'ai' });
                    }
                  }
                } else {
                  responseMessage = aiMessage.content;
                }
              
              // 🚀 Catching AI's Address Parsing Magic
              if (responseMessage && responseMessage.includes('[ADDRESS_SAVED]')) {
                const addressMatch = responseMessage.match(/\[ADDRESS_SAVED\]\s*([^\n]+)/i);
                if (addressMatch && addressMatch[1]) {
                   const extractedAddress = addressMatch[1].trim();
                   const Order = require('../models/orderModel');
                   await Order.findOneAndUpdate(
                     { customerPhone: fromNumber, userId: user._id, status: 'Pending' },
                     { $set: { shippingAddress: extractedAddress, status: 'Confirmed' } },
                     { sort: { createdAt: -1 }, new: true }
                   );
                   responseMessage = responseMessage.replace(/\[ADDRESS_SAVED\]\s*([^\n]+)/i, '').trim();
                   if (!responseMessage) responseMessage = "✅ Perfect! Your delivery address has been saved successfully. We will dispatch your order soon and share the tracking details!";
                }
              }
              } catch (aiError) {
                console.error("❌ [AI API Error]:", aiError.message || aiError);
                responseMessage = "Thank you for reaching out! We are currently experiencing high message volumes. Our team will get back to you shortly! 🙏";
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
        }
    return;
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    return;
  }
};
