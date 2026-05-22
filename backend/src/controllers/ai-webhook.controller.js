const aiService = require('../services/aiService');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Lead = require('../models/leadModel'); // Lead model import kiya gaya
const whatsappService = require('../services/whatsappService'); // For Owner Notifications

// @desc    Verify Instagram Webhook Setup (Required by Meta)
// @route   GET /api/webhooks/instagram
exports.verifyInstagramWebhook = async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === (process.env.META_WEBHOOK_VERIFY_TOKEN || 'ankush@7828289433')) {
    console.log('✅ Instagram Webhook Verified Successfully!');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// @desc    Handle Instagram Webhooks (Comments & DMs)
// @route   POST /api/webhooks/instagram
exports.handleInstagramWebhook = async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'instagram') {
      for (let entry of body.entry) {
        
        // ==========================================
        // 1. HANDLE DIRECT MESSAGES (DMs)
        // ==========================================
        if (entry.messaging && entry.messaging.length > 0) {
          for (let event of entry.messaging) {
            if (event.message && event.message.text) {
              const senderId = event.sender.id;
              const incomingText = event.message.text.trim();
              
              console.log(`💬 [Instagram DM] Received from ${senderId}: ${incomingText}`);

              // Find the Influencer/Business Owner (In production, find via IG Account ID)
              const user = await User.findOne({ role: 'owner' }); 
              if (!user) continue;

              // Save incoming message to Inbox
              await Message.create({
                userId: user._id,
                customerPhone: `IG_${senderId}`, 
                messageText: incomingText,
                direction: 'incoming',
                status: 'received',
                sentBy: 'customer'
              });

              // 🛑 STAGE 1: GATEKEEPER / SPAM FILTER BOT (0 Cost - Saves AI Limits)
              const incomingTextLower = incomingText.toLowerCase();
              
              if (['hi', 'hello', 'hey', 'menu', 'start'].includes(incomingTextLower)) {
                const menuMessage = `Hi! 👋 I am the automated manager for ${user.fullName || 'this creator'}.\n\nPlease tell me why you're reaching out (Type a number):\n1️⃣ Brand Promotion (Paid Ads) 💰\n2️⃣ Collaboration (Other Creators) 🤝\n3️⃣ Just a Fan saying Hi! ❤️\n4️⃣ Other Queries`;
                await Message.create({ userId: user._id, customerPhone: `IG_${senderId}`, messageText: menuMessage, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply' });
                console.log(`🤖 [IG Basic Bot]: Sent Menu to ${senderId}`);
                continue; // 🚫 Stops here, does NOT call OpenAI
              }

              if (incomingTextLower === '3' || incomingTextLower.includes('fan message')) {
                const fanMessage = `Thank you so much for the love and support! ❤️ Your message has been saved to the Fan Inbox. The creator reads these when free!`;
                await Message.create({ userId: user._id, customerPhone: `IG_${senderId}`, messageText: fanMessage, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply' });
                console.log(`🤖 [IG Basic Bot]: Sent Fan Response to ${senderId}`);
                continue; // 🚫 Stops here, does NOT call OpenAI
              }

              if (incomingTextLower === '4' || incomingTextLower.includes('other queries')) {
                const generalMessage = `Your query has been recorded. Our team will review it shortly.`;
                await Message.create({ userId: user._id, customerPhone: `IG_${senderId}`, messageText: generalMessage, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply' });
                console.log(`🤖 [IG Basic Bot]: Sent General Response to ${senderId}`);
                continue; // 🚫 Stops here, does NOT call OpenAI
              }

              if (incomingTextLower === '2' || incomingTextLower.includes('collaboration')) {
                // 0 COST COLLAB CAPTURE
                const collabMsg = `Thank you for your interest in collaborating! 🤝 Our team has received your request and will review your profile soon.`;
                await Message.create({ userId: user._id, customerPhone: `IG_${senderId}`, messageText: collabMsg, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply' });
                
                // Seedha CRM me Lead bana do (Bina AI ke)
                await Lead.findOneAndUpdate(
                  { phoneNumber: `IG_${senderId}` }, 
                  { 
                    userId: user._id, 
                    name: `IG User ${senderId}`, 
                    source: 'Instagram DM (Collab)', 
                    status: 'interested', 
                    notes: `IG Handle: @${senderId}\nDeal Type: Collab\nAwaiting Influencer's manual review.` 
                  }, 
                  { upsert: true }
                );
                
                console.log(`🤖 [IG Basic Bot]: Saved Collab Lead & Sent Wait Response to ${senderId}`);
                continue; // 🚫 Stops here, saves AI token!
              }

              // 🟢 STAGE 2: AI INFLUENCER MANAGER (Only triggers for Brands or Complex text)
              const isAiEnabled = user.aiAgentEnabled !== false;
              if (isAiEnabled) {
                try {
                  // 🧠 CHECK IF PAST CLIENT (MEMORY)
                  const existingLead = await Lead.findOne({ phoneNumber: `IG_${senderId}`, userId: user._id });
                  let relationshipContext = "";
                  
                  if (existingLead && (existingLead.status === 'converted' || existingLead.status === 'won' || existingLead.status === 'completed')) {
                    relationshipContext = `CRITICAL NOTE: This brand is a PAST CLIENT. They have worked with the influencer before. Gently ask them how the ROI/results were for the previous campaign, and pitch a repeat collaboration because repeat campaigns require less setup time and you can offer them a better long-term relationship.`;
                  }

                  // 🧠 INFLUENCER MANAGER AI CONTEXT
                  let businessInfo = user.businessDescription || "an Instagram Creator";
                  let ownerRules = user.aiRules || "Be professional and negotiate politely.";
                  
                  const aiContext = `You are a professional Talent Manager AI for an influencer. 
                  Influencer Details/Media Kit: ${businessInfo}.
                  Rules: ${ownerRules}.
                  ${relationshipContext}
                  
                  IMPORTANT: 
                  - If user message is "1", they are a Brand (Paid Ads). Ask for Brand Name, deliverables, and Budget.
                  - If user message is "2", they are another Creator (Collab). Ask for their Instagram Handle and Idea.
                  Your goal is to handle incoming promotion requests in a BALANCED tone. Be polite and approachable, but value the influencer's worth.
                  2. Negotiate smartly. If they offer 10k and the rate is 15k, try to settle at a middle ground like 13k if they can't go higher.
                  3. When a final agreement is reached, use the 'extract_brand_deal' tool. 
                  4. In the tool JSON, make sure to explicitly include 'igHandle', 'brandName', and 'dealType' (either 'Brand' or 'Collab').`;

                  const aiMessage = await aiService.generateAIResponseWithTools(incomingText, aiContext);
                  let responseMessage = null;

                  if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                    for (const toolCall of aiMessage.tool_calls) {
                      // Handle Deal Extraction Tool
                      if (toolCall.function.name === "extract_brand_deal" || toolCall.function.name === "extract_lead_requirements") {
                        const dealData = JSON.parse(toolCall.function.arguments);
                        
                        const sourceText = dealData.dealType === 'Collab' ? 'Instagram DM (Collab)' : 'Instagram DM (Promotion)';
                        
                        await Lead.findOneAndUpdate(
                          { phoneNumber: `IG_${senderId}` }, 
                          { 
                            userId: user._id, 
                            name: dealData.brandName || dealData.igHandle || "New Deal", 
                            source: sourceText, 
                            status: 'interested', 
                            notes: `IG Handle: @${dealData.igHandle || senderId}\nDeal Type: ${dealData.dealType || 'Brand'}\nBrand Name: ${dealData.brandName || 'N/A'}\nDeliverables: ${dealData.itemName || dealData.deliverables}\nBudget: ${dealData.budget || 'Barter'}\nNegotiation: ${dealData.notes || 'N/A'}` 
                          }, 
                          { upsert: true }
                        );
                        
                        // 🚨 INSTANT WHATSAPP NOTIFICATION TO INFLUENCER (OWNER)
                        if (user.ownerPhone && user.whatsappConfig?.accessToken) {
                          const alertMsg = `🎉 *New Brand Deal Finalized by AI!*\n\n*Brand:* ${dealData.brandName || "New Brand"}\n*Budget:* ${dealData.budget}\n*Deliverables:* ${dealData.itemName || dealData.deliverables}\n\n*Negotiation Summary:*\n${dealData.notes}\n\nPlease log in to your Influencer Dashboard to Accept or Reject this deal.`;
                          await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, user.ownerPhone, alertMsg);
                        }
                        
                        responseMessage = `Thank you! I have noted down the details (Budget: ${dealData.budget}). I will forward this to the influencer and we will get back to you shortly to finalize the collaboration!`;
                      }
                    }
                  } else {
                    responseMessage = aiMessage.content;
                  }

                  if (responseMessage) {
                    // Note: Here you will integrate Meta Graph API to send the DM back
                    // await metaAdsService.sendInstagramDM(user.igAccessToken, senderId, responseMessage);
                    
                    console.log(`🤖 [Instagram DM Reply]: ${responseMessage}`);
                    await Message.create({
                      userId: user._id,
                      customerPhone: `IG_${senderId}`,
                      messageText: responseMessage,
                      direction: 'outgoing',
                      status: 'sent',
                      sentBy: 'ai'
                    });
                  }

                } catch (aiErr) {
                  console.error("❌ [Instagram AI Error]:", aiErr.message);
                }
              }
            }
          }
        }

        // ==========================================
        // 2. HANDLE COMMENTS
        // ==========================================
        if (entry.changes && entry.changes[0].field === 'comments') {
          const commentData = entry.changes[0].value;
          const commentText = commentData.text;
          const igUserId = commentData.from.id;
          const username = commentData.from.username || `IG_User_${igUserId}`;

          console.log(`[Instagram Comment] Received from ${username}: ${commentText}`);

          // Find the SaaS Owner to get their manual Auto-Replies
          const user = await User.findOne({ role: 'owner' }); // MVP Fallback
          const autoReplies = user?.autoReplies || [];

          // 🌟 SMART LEAD EXTRACTION: Check if comment has a Phone Number
          const phoneRegex = /(?:\+?\d{1,3}[- ]?)?\d{10}/;
          const phoneMatch = commentText.match(phoneRegex);

          if (phoneMatch) {
             const extractedPhone = phoneMatch[0].replace(/\D/g, '');
             console.log(`📞 [Instagram] High Intent Lead! Phone number detected: ${extractedPhone}`);
             
             // Extract number and save to CRM as a Lead
             await Lead.findOneAndUpdate(
               { phoneNumber: extractedPhone },
               { 
                 userId: user._id, 
                 name: username, 
                 source: 'Instagram Comment', 
                 status: 'new', 
                 notes: `Left number in comment: "${commentText}"` 
               },
               { upsert: true, new: true }
             );
          }

          // 1. MANUAL KEYWORD MATCHING (e.g. checking if comment contains "link", "price", etc.)
          const matchedRule = autoReplies.find(rule => commentText.toLowerCase().includes(rule.triggerWord.toLowerCase()));

          if (matchedRule) {
             console.log(`✅ [Instagram] Manual Keyword Matched: '${matchedRule.triggerWord}'`);
             console.log(`💬 [Instagram] Sending DM to ${username}: ${matchedRule.replyMessage}`);
             
             // In production: You will use Meta Graph API here to send the actual DM
             
             // CRM me kachra nahi bharenge! Sirf Inbox (Chats) me save karenge
             await Message.create({
                userId: user._id,
                customerPhone: username, // For IG, we use username as the identifier
                messageText: `[💬 IG Comment]: ${commentText}`,
                direction: 'incoming',
                status: 'received',
                sentBy: 'customer',
                tags: ['ig_comment', 'auto_replied'],
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Auto-delete after 30 days
             });
          } else {
             console.log(`⚠️ [Instagram] No manual keyword matched for: "${commentText}"`);
             
             // Track as Unmatched Comment in Inbox so owner can read & reply manually
             await Message.create({
                userId: user._id,
                customerPhone: username,
                messageText: `[💬 IG Comment - Unhandled]: ${commentText}`,
                direction: 'incoming',
                status: 'received',
                sentBy: 'customer',
                tags: ['ig_comment', 'needs_reply'],
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Auto-delete after 30 days
            });
            
            // FUTURE PHASE: Yahan hum Premium Users ke liye AI Trigger karenge jo spelling mistake samajh sake
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