const aiService = require('../services/aiService');
const whatsappService = require('../services/whatsappService');
const ocrService = require('../services/ocrService');
const Lead = require('../models/leadModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const callService = require('../services/callService');
const billing = require('../utils/billing');
const metaAdsService = require('../services/metaAdsService');

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
          
          // 🚀 NEW: AUTO-ADD EVERY SENDER TO CRM (So it shows on your board immediately)
          try {
            console.log(`[Webhook Debug] Attempting to save Lead ${fromNumber} for user ${user._id}`);
            const savedLead = await Lead.findOneAndUpdate(
              { phoneNumber: fromNumber, userId: user._id },
              { $setOnInsert: { name: `User ${fromNumber.slice(-4)}`, source: 'WhatsApp Inbound', status: 'new', createdBy: user._id } },
              { upsert: true, new: true }
            );
            console.log(`✅ [Webhook Debug] Lead saved/verified in CRM (ID: ${savedLead._id})`);
          } catch (leadErr) {
            console.error("❌ [Webhook] Error auto-saving Lead to CRM:", leadErr.message);
          }

          // 🚀 NEW: AUTO-SYNC WHATSAPP CATALOG ORDERS
          if (msg.type === 'order') {
            const orderDetails = msg.order;
            const Order = require('../models/orderModel');
            
            // Create unique order ID based on timestamp
            const newOrderId = 'WA-' + Date.now().toString().slice(-6);
            
            await Order.create({ userId: user._id, orderId: newOrderId, customerPhone: fromNumber, status: 'Pending', lastUpdated: new Date() });
            
            const responseMessage = `🛍️ *Order Received!*\nThank you for placing an order from our catalog! Your Order ID is *#${newOrderId}*.\n\nCould you please reply with your complete *Delivery Address* and Pincode so we can dispatch it?`;
            
            await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, responseMessage);
            await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: `[Received Catalog Order] -> Replied asking for address.`, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply' });
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
            
            // 🚀 DYNAMIC WORKSPACE ROUTING
            // Yahan hum hardcoded names ('menu_real_estate') ki jagah unique IDs match kar rahe hain
            if (selectedContext.startsWith('workspace_')) {
              const workspaceId = selectedContext.replace('workspace_', ''); 
              
              // Save the selected business division in DB
              await Lead.findOneAndUpdate(
                { phoneNumber: fromNumber, userId: user._id },
                { $set: { lastSelectedWorkspaceId: workspaceId } }
              );
              
              const currentLead = await Lead.findOne({ phoneNumber: fromNumber, userId: user._id });
              
              let selectedWsName = user.businessName || "Main Business";
              if (workspaceId !== 'default' && user.workspaces) {
                const selectedWs = user.workspaces.find(w => w._id.toString() === workspaceId);
                if (selectedWs) selectedWsName = selectedWs.name;
              }
              
              // 🔥 SMART AUTOMATION: Ask for name automatically WITHOUT using AI (0 Cost)
              if (currentLead && currentLead.name && currentLead.name.startsWith('User ')) {
                responseMessage = `Welcome to *${selectedWsName}*! 🏢\n\nBefore we proceed, could you please reply with your *Full Name* and *City*? (e.g., Rahul Sharma, Delhi)`;
              } else {
                responseMessage = `Welcome back to *${selectedWsName}*, ${currentLead.name.split(' ')[0]}! How can I assist you further today?`;
              }
              
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
            
            // 🚀 NEW: CHECK IF HUMAN HAS TAKEN OVER THIS CHAT (AI PAUSED)
            const currentLeadCheck = await Lead.findOne({ phoneNumber: fromNumber, userId: user._id });
            const isCurrentlyPaused = currentLeadCheck && currentLeadCheck.isAiPaused && currentLeadCheck.aiPausedUntil > new Date();
            
            if (isCurrentlyPaused) {
              console.log(`⏸️ [Webhook] Human has taken over the chat for ${fromNumber}. AI is currently paused. Skipping AI reply.`);
              continue; // Yahan se nikal jayega aur koi auto-reply nahi karega
            } else if (currentLeadCheck && currentLeadCheck.isAiPaused) {
              // 🔥 NEW: The pause has expired. Let's reset the flag so the AI can resume normally.
              // This makes the system state clean and prevents any future confusion.
              console.log(`▶️ [Webhook] AI pause has expired for ${fromNumber}. Resuming AI and resetting the flag.`);
              await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { isAiPaused: false, aiPausedUntil: null } });
            }

            const incomingTextLower = incomingText.toLowerCase();
            if (['hi', 'hello', 'hey', 'menu', 'options', 'help'].includes(incomingTextLower)) {
              
              // 🚀 DYNAMIC MENU GENERATOR
              let menuRows = [
                { 
                  id: `workspace_default`, 
                  title: (user.businessName || "Main Business").substring(0, 24), 
                  description: (user.businessDescription || "Explore our products and services").substring(0, 72) 
                }
              ];

              if (user.workspaces && user.workspaces.length > 0) {
                // Safe Filter: Only map valid workspaces that have a name
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
              
              const isAiEnabled = user.aiAgentEnabled !== false; // defaults to true
              const hasTrainingData = user.businessDescription && user.businessDescription.trim().length > 10;
              
              // Auto-Review Links (Bina AI ke fallback message me links jodna)
              const links = user.digitalCardConfig || {};
              let autoLinks = "";
              if (links.googleReview || links.instagram) {
                autoLinks = "\n\n---\n*While you wait, connect with us:*";
                if (links.googleReview) autoLinks += `\n⭐ Google Review: ${links.googleReview}`;
                if (links.instagram) autoLinks += `\n📸 Instagram: ${links.instagram}`;
              }

              if (!isAiEnabled || (user.aiCredits <= 0 && !isFreeTestUser)) {
                // AI completely disabled / No credits (Hardcoded standard message)
                responseMessage = "Thank you for your message! Our human team will get back to you shortly. 🙏" + autoLinks;
                repliedBy = 'system';
                
                // Send an Alert to the Business Owner if the limit just expired (and prevent spamming by setting to -1)
                if (user.aiCredits === 0 && user.ownerPhone) {
                  await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, user.ownerPhone, "🚨 *AI Limit Exhausted*\n\nAapka DealClose AI ka free trial (50 messages) khatam ho gaya hai. AI ne aapke customers ko automatically reply karna band kar diya hai.\n\nPlease apne dashboard se recharge karein taaki AI aage kaam kar sake.");
                  user.aiCredits = -1; 
                  await user.save();
                }
              } else if (!hasTrainingData) {
                // AI is enabled but user hasn't trained it yet (No AI hallucination allowed)
                responseMessage = "Thank you for reaching out! Our support team is currently reviewing your request and will assist you shortly. ⏳" + autoLinks;
                repliedBy = 'system';
              } else {
                if (!isFreeTestUser) {
                  user.aiCredits -= 1;
                  if (user.aiCredits === 0 && user.ownerPhone) {
                    await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, user.ownerPhone, "🚨 *AI Limit Exhausted*\n\nAapka DealClose AI ka free trial (50 messages) khatam ho gaya hai. AI ne aapke customers ko automatically reply karna band kar diya hai.\n\nPlease apne dashboard se recharge karein taaki AI aage kaam kar sake.");
                    user.aiCredits = -1; // Change to -1 so the alert doesn't fire on the next message
                  }
                  await user.save();
                  try {
                    await billing.deductAICost(user._id, 'OPENAI_GPT_4', 1);
                  } catch (billingErr) {
                    console.error("Billing deduction error:", billingErr.message);
                  }
                }
              
              try {
                // Har SaaS User ka apna personal AI context! 
                let businessInfo = user.businessDescription || "a modern business";
                let ownerRules = user.aiRules || "Be polite, helpful, and professional.";
                
                // Check if customer ne koi specific business select kiya tha
                const lead = await Lead.findOne({ phoneNumber: fromNumber, userId: user._id });
                if (lead && lead.lastSelectedWorkspaceId) {
                  const selectedWs = user.workspaces.find(ws => ws._id.toString() === lead.lastSelectedWorkspaceId);
                  if (selectedWs) {
                    console.log(`🧠 [AI Context] Using Workspace Brain: ${selectedWs.name}`);
                    businessInfo = selectedWs.businessDescription || businessInfo;
                    ownerRules = selectedWs.aiRules || ownerRules;
                  }
                }

                // CHECK IF WE ALREADY KNOW THE CUSTOMER'S NAME
                const isNameKnown = lead && lead.name && !lead.name.startsWith('User ');
                const customerNameContext = isNameKnown ? lead.name : "Unknown";

                let aiContext = `You are a highly efficient AI assistant for ${user.fullName}'s business. \nBusiness details: ${businessInfo}.\n\nSTRICT OWNER RULES:\n${ownerRules}\n\nCUSTOMER INFO:\nName: ${customerNameContext}\n\nCRITICAL BEHAVIOR RULES:\n1. Be EXTREMELY concise, fast, and to the point. Do not write long paragraphs.\n2. Do NOT engage in irrelevant, personal, or non-business small talk.\n3. ALWAYS use the 'send_whatsapp_menu' tool for multiple-choice questions.\n4. LEAD CAPTURE: If the user provides their name, city, or business details, ALWAYS use the 'update_customer_profile' tool and extract as much info as possible.\n5. VERY IMPORTANT: NEVER cut off your sentences midway. Always provide a complete and polite sentence.\nIf you don't know the answer, use the 'escalate_to_staff' tool.`;
                
                // Fair Usage Policy: If 80% of the 1000 credit pack is consumed (<= 200 left), force shorter replies
                if (user.aiCredits > 0 && user.aiCredits <= 200) {
                  aiContext += "\n\n⚠️ BUDGET LIMIT ACTIVE: Provide short answers (1-2 sentences max), but ALWAYS ensure the sentence finishes completely.";
                }
                
                const aiMessage = await aiService.generateAIResponseWithTools(incomingText, aiContext);
              
                if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                  for (const toolCall of aiMessage.tool_calls) {
                    if (toolCall.function.name === "extract_lead_requirements") {
                      const leadData = JSON.parse(toolCall.function.arguments);
                      
                      const updateFields = { 
                        userId: user._id, 
                        createdBy: user._id,
                        source: leadData.category || 'WhatsApp AI', 
                        status: "interested", 
                        notes: `Interested in: ${leadData.itemName} | Budget: ${leadData.budget}` 
                      };
                      
                      await Lead.findOneAndUpdate({ phoneNumber: fromNumber, userId: user._id }, { $set: updateFields }, { returnDocument: 'after', upsert: true });
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
                      
                      // Add to knowledge gap training data
                      await User.findByIdAndUpdate(user._id, { $push: { trainingData: { question: callData.customerQuestion, status: 'unanswered', customerPhone: fromNumber } } });                      
                      
                      // Check what the owner wanted us to do (Fallback Rule)
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
                      // Keeping the unique ID with the name as requested by you to prevent duplicate name issues
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
                      
                      responseMessage = `Thanks, ${profileData.fullName}! I've updated your profile. How can I help you today?`;
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "update_lead_status") {
                      const statusData = JSON.parse(toolCall.function.arguments);
                      await Lead.findOneAndUpdate({ phoneNumber: fromNumber }, { status: statusData.status, userId: user._id }, { returnDocument: 'after', upsert: true });
                      
                      // 🎯 META CONVERSIONS API SYNC
                      if ((statusData.status.toLowerCase() === 'converted' || statusData.status.toLowerCase() === 'won') && user.metaAdsConfig?.pixelId && user.metaAdsConfig?.accessToken) {
                         // Sync this converted lead back to Meta!
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
                      const query = { _id: { $ne: user._id }, optInForSharedLeads: true, productCategories: { $regex: new RegExp(data.productCategory, 'i') } };
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
                          aiCredits: 50 // 50 Free trial credits for customer chats
                        });
                        responseMessage = `🎉 *Congratulations ${accData.fullName}!* I have successfully created your DealClose AI account for '${accData.businessName}'.\n\n*Login URL:* https://dealclose-ai.onrender.com/login\n*Email:* ${accData.email}\n*Temporary Password:* ${tempPassword}\n\n⚠️ *Important:* Please log in and check your dashboard. (The "Change Password" feature is being added to Settings shortly!)`;
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
                      
                      responseMessage = null; // Prevent sending duplicate text
                      repliedBy = 'ai';
                      await Message.create({ userId: user._id, customerPhone: fromNumber, messageText: `[Interactive AI Question]: ${menuData.messageText}`, direction: 'outgoing', status: 'sent', sentBy: 'ai' });
                    }
                  }
                } else {
                  responseMessage = aiMessage.content;
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
    return; // Request already acknowledged at the top
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    return; // Request already acknowledged at the top
  }
};