const aiService = require('../services/aiService');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Lead = require('../models/leadModel'); // Lead model import kiya gaya
const Flow = require('../models/flowModel'); // 🚀 Flow model imported
const metaAdsService = require('../services/metaAdsService');

// @desc    Verify Instagram Webhook Setup (Required by Meta)
// @route   GET /api/webhooks/instagram
exports.verifyInstagramWebhook = async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`\n🔍 [IG Webhook Verify Request] Mode: ${mode}, Token: ${token}`);

  // Browser test fallback (So you don't see 403 Forbidden in Chrome)
  if (!mode && !token) {
    return res.status(200).send("🚀 DealClose AI Instagram Webhook is LIVE and securely running! Waiting for Meta's POST requests.");
  }

  if (mode === 'subscribe' && (token === process.env.META_WEBHOOK_VERIFY_TOKEN || token === 'ankush@7828289433')) {
    console.log('✅ Instagram Webhook Verified Successfully!');
    return res.status(200).send(challenge);
  } else {
    console.error('❌ Instagram Webhook Verification Failed! Token Mismatch.');
  }
  return res.sendStatus(403);
};

// @desc    Handle Instagram Webhooks (Comments & DMs)
// @route   POST /api/webhooks/instagram
exports.handleInstagramWebhook = async (req, res) => {
  // 1. IMMEDIATE RESPONSE TO META: Prevents Meta from retrying
  res.status(200).send('EVENT_RECEIVED');
  
  console.log("\n================ [INSTAGRAM WEBHOOK INCOMING] ================");
  console.log("➡️ Headers:", JSON.stringify(req.headers));
  console.log("➡️ Raw Payload:", JSON.stringify(req.body, null, 2));
  try {
    const body = req.body;

    if (body.object === 'instagram' || body.object === 'page') {
      for (let entry of body.entry) {
        // Jis Instagram Account par message aaya hai uska ID
        const igAccountId = entry.id;
        
        // ==========================================
        // 1. HANDLE DIRECT MESSAGES (DMs)
        // ==========================================
        if (entry.messaging && entry.messaging.length > 0) {
          for (let event of entry.messaging) {
            if (event.message && event.message.text) {
              
              // --- CLEAN CODE START (Replace your duplicate lines with this) ---
              const isEcho = event.message.is_echo;
              const appId = event.message.app_id;
              const myAppId = process.env.META_APP_ID;

              // 🚫 ANTI-LOOP: Ignore API echoes (Bot's own replies sent via Meta Graph API)
              if (isEcho && appId && myAppId && appId.toString() === myAppId.toString()) {
                 console.log(`🔇 [IG Webhook] Ignoring API echo message (Bot's own API reply).`);
                 continue;
              }

              // If it's an echo from the IG Mobile App, the recipient is the customer
              const senderId = isEcho ? event.recipient.id : event.sender.id;
              const incomingText = event.message.text.trim();
              
              console.log(`💬 [Meta DM (IG/FB)] ${isEcho ? 'Owner App Reply to' : 'Received from'} ${senderId}: ${incomingText}`);

              // Find the exact User who owns this Instagram/Facebook Account
              let user = await User.findOne({ 
                $or: [
                  { "igConfig.accountId": igAccountId },
                  { "workspaces.igConfig.accountId": igAccountId },
                  { "igConfig.pageId": igAccountId },
                  { "workspaces.igConfig.pageId": igAccountId }
                ]
              }); 
              
              if (!user) {
                 console.log(`⚠️ [IG Webhook] Exact IG Account match not found for ${igAccountId}. Using fallback owner...`);
                 // 🚀 SMART FALLBACK: Find the most recently active user who actually connected an IG Token!
                 // This prevents saving messages to old dead/dummy accounts in the database.
                 user = await User.findOne({ "igConfig.accessToken": { $exists: true, $ne: "" } }).sort({ updatedAt: -1 });
                 if (!user) {
                   user = await User.findOne({ role: 'owner' }).sort({ createdAt: -1 });
                 }
              }
              if (!user) continue;

              // 🚀 SMART ROUTING: Branch vs Main Page (Check both IG and FB Page IDs)
              let incomingWorkspaceId = 'main';
              let activeWorkspace = null;
              if (user.igConfig?.accountId !== igAccountId && user.igConfig?.pageId !== igAccountId && user.workspaces) {
                 activeWorkspace = user.workspaces.find(w => w.igConfig && (w.igConfig.accountId === igAccountId || w.igConfig.pageId === igAccountId));
                 if (activeWorkspace) incomingWorkspaceId = activeWorkspace._id.toString();
              }

              // 🌟 Fetch Real Instagram Profile (Name/Username)
              let realName = `IG User ${senderId.slice(-4)}`;
              if (user.igConfig && user.igConfig.accessToken) {
                try {
                  const profile = await metaAdsService.getInstagramProfile(user.igConfig.accessToken, senderId);
                  if (profile && (profile.name || profile.username)) {
                    realName = profile.name || profile.username;
                  }
                } catch (e) {
                  console.log("⚠️ Could not fetch IG profile details for", senderId);
                }
              }

              if (!isEcho) {
                // Save incoming message to Inbox
                await Message.create({
                  userId: user._id,
                  customerPhone: `IG_${senderId}`, 
                  messageText: incomingText,
                  direction: 'incoming',
                  status: 'received',
                  sentBy: 'customer',
                  timestamp: new Date()
                });
              }
              // --- CLEAN CODE END ---

              // 🚀 NEW: AUTO-ADD IG SENDER TO CRM (So it shows in Chats sidebar instantly)
              await Lead.findOneAndUpdate(
                { phoneNumber: `IG_${senderId}`, userId: user._id },
                { 
                  $set: { name: realName },
                  $setOnInsert: { 
                    source: 'Instagram DM', 
                    status: 'new',
                    createdBy: user._id 
                  } 
                },
                { upsert: true }
              );

              // 🚀 NEW: HANDLE OWNER REPLIES FROM INSTAGRAM APP
              if (isEcho) {
                 await Message.create({
                    userId: user._id,
                    customerPhone: `IG_${senderId}`,
                    messageText: incomingText,
                    direction: 'outgoing',
                    status: 'sent',
                    sentBy: 'owner_app',
                    timestamp: new Date()
                 });

                 // Pause AI for 24 hours so it doesn't interrupt the human
                 await Lead.findOneAndUpdate(
                    { phoneNumber: `IG_${senderId}`, userId: user._id },
                    { $set: { isAiPaused: true, aiPausedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) } }
                 );
                 console.log(`⏸️ [IG Webhook] Owner replied from IG App. Message saved & AI Paused.`);
                 continue; // Stop further processing, go to next message
              }

              // 🛑 STAGE 1: GATEKEEPER / SPAM FILTER BOT (0 Cost - Saves AI Limits)
              const incomingTextLower = incomingText.toLowerCase();
              
              // Check if user is an Influencer or a Regular Business
              // (Assuming acceptCollabs=true means it's a Creator profile)
              const isCreator = user.acceptCollabs === true;
              
              const isAiEnabled = user.aiAgentEnabled !== false;

              // Agar AI enabled hai, toh hardcoded menu mat dikhao, seedha AI se baat karwao!
              if (!isAiEnabled && ['hi', 'hello', 'hey', 'menu', 'collab'].includes(incomingTextLower)) {
                const menuMessage = isCreator 
                  ? `Hi! 👋 I am the automated manager for ${user.fullName || 'this creator'}.\n\nPlease tell me why you're reaching out (Type a number):\n1️⃣ Brand Promotion / Collaboration\n2️⃣ Just a Fan saying Hi! ❤️\n3️⃣ General Query`
                  : `Hi! 👋 Welcome to ${user.businessName || user.fullName}.\n\nHow can I help you today? (Type a number):\n1️⃣ Order / Buy a Product 🛒\n2️⃣ Customer Support 🎧\n3️⃣ Talk to our Team 👤`;
                  
                let deliveryStatus = 'sent';
                let displayMsg = menuMessage;
                try {
                  await metaAdsService.sendInstagramDM(user.igConfig.accessToken, senderId, menuMessage);
                  console.log(`🤖 [IG Basic Bot]: Sent Menu to ${senderId}`);
                } catch (apiErr) {
                  console.error(`❌ [IG Send Error]: Failed to send Menu to ${senderId}`, apiErr.response?.data || apiErr.message);
                  deliveryStatus = 'failed';
                  displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${apiErr.response?.data?.error?.message || apiErr.message}]`;
                }

                await Message.create({ 
                  userId: user._id, 
                  customerPhone: `IG_${senderId}`, 
                  messageText: displayMsg, 
                  direction: 'outgoing', 
                  status: deliveryStatus, 
                  sentBy: 'auto-reply',
                  timestamp: new Date()
                });
                continue; // 🚫 Stops here, does NOT call OpenAI
              }

              // Creator specific fast-path
              if (isCreator && (incomingTextLower === '2' || incomingTextLower.includes('collaboration'))) {
                // 0 COST COLLAB CAPTURE
                const collabMsg = `Thank you for your interest in collaborating! 🤝 Our team has received your request and will review your profile soon.`;
                
                let deliveryStatus = 'sent';
                let displayMsg = collabMsg;
                try {
                  await metaAdsService.sendInstagramDM(user.igConfig.accessToken, senderId, collabMsg);
                  console.log(`🤖 [IG Basic Bot]: Sent Collab Response to ${senderId}`);
                } catch (apiErr) {
                  console.error(`❌ [IG Send Error]: Failed to send Collab Msg to ${senderId}`);
                  deliveryStatus = 'failed';
                  displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${apiErr.response?.data?.error?.message || apiErr.message}]`;
                }

                await Message.create({ 
                  userId: user._id, 
                  customerPhone: `IG_${senderId}`, 
                  messageText: displayMsg, 
                  direction: 'outgoing', 
                  status: deliveryStatus, 
                  sentBy: 'auto-reply',
                  timestamp: new Date()
                });
                
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

              // General Query / Human Fallback
              if (incomingTextLower === '3' || incomingTextLower.includes('general') || incomingTextLower.includes('human') || incomingTextLower.includes('team')) {
                const generalMessage = isCreator ? `Your query has been recorded. Our team will review it shortly.` : `Thanks! I've notified our team. A human representative will get back to you shortly. ⏳`;
                
                let deliveryStatus = 'sent';
                let displayMsg = generalMessage;
                try {
                  await metaAdsService.sendInstagramDM(user.igConfig.accessToken, senderId, generalMessage);
                  console.log(`🤖 [IG Basic Bot]: Sent General Response to ${senderId}`);
                } catch (apiErr) {
                  console.error(`❌ [IG Send Error]: Failed to send General Msg to ${senderId}`);
                  deliveryStatus = 'failed';
                  displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${apiErr.response?.data?.error?.message || apiErr.message}]`;
                }

                await Message.create({ 
                  userId: user._id, 
                  customerPhone: `IG_${senderId}`, 
                  messageText: displayMsg, 
                  direction: 'outgoing', 
                  status: deliveryStatus, 
                  sentBy: 'auto-reply',
                  timestamp: new Date()
                });
                continue; // 🚫 Stops here, does NOT call OpenAI
              }

              // 🟢 STAGE 2: AI INFLUENCER MANAGER (Only triggers for Brands or Complex text)
              if (isAiEnabled) {
                try {
                  let businessInfo = activeWorkspace ? activeWorkspace.description : (user.businessDescription || "an Instagram Creator");
                  let ownerRules = activeWorkspace ? activeWorkspace.aiRules : (user.aiRules || "Be professional and negotiate politely.");
                  
                  let aiContext = "";
                  
                  if (isCreator) {
                    // AI Persona 1: Talent Manager (For Creators)
                    aiContext = `You are a professional Talent Manager AI for an influencer. 
                    Influencer Details/Media Kit: ${businessInfo}.
                    Rules: ${ownerRules}.
                    
                    IMPORTANT: If the user's message is just "1", it means they selected "Brand Promotion". Start the conversation by asking for their brand name, deliverables, and budget.
                    Your goal is to handle incoming promotion requests politely. If they agree to pricing, use the 'extract_brand_deal' tool.`;
                  } else {
                    // AI Persona 2: Sales & Support Agent (For Regular Businesses)
                    aiContext = `You are a highly skilled Sales and Support AI Assistant for ${activeWorkspace ? activeWorkspace.name : (user.businessName || 'this business')}. 
                    Business Details/Catalog: ${businessInfo}.
                    Rules: ${ownerRules}.
                    
                    IMPORTANT:
                    1. Your main goal is to assist customers, answer product/service questions, and close sales politely.
                    2. If a user wants to buy something (or types "1"), ask for their specific requirements.
                    3. Use the 'extract_lead_requirements' tool to save their details and budget into the CRM once they show clear purchase intent.
                    4. If they have a support issue (or type "2"), try to resolve it based on the Business Details provided.
                    Be warm, helpful, and concise in your responses.`;
                  }

                  const aiMessage = await aiService.generateAIResponseWithTools(incomingText, aiContext);
                  let responseMessage = null;

                  if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                    for (const toolCall of aiMessage.tool_calls) {
                      // Handle Deal Extraction Tool
                      if (toolCall.function.name === "extract_brand_deal" || toolCall.function.name === "extract_lead_requirements") {
                        const dealData = JSON.parse(toolCall.function.arguments);
                        
                        await Lead.findOneAndUpdate(
                          { phoneNumber: `IG_${senderId}` }, 
                          { 
                            userId: user._id, 
                            name: dealData.brandName || "New Brand Deal", 
                            source: 'Instagram DM (Promotion)', 
                            status: 'interested', 
                            notes: `Deliverables: ${dealData.itemName || dealData.deliverables} | Offered Budget: ${dealData.budget} | Notes: ${dealData.notes || 'N/A'}` 
                          }, 
                          { upsert: true }
                        );
                        
                        responseMessage = `Thank you! I have noted down the details (Budget: ${dealData.budget}). I will forward this to the influencer and we will get back to you shortly to finalize the collaboration!`;
                      }
                    }
                  } else {
                    responseMessage = aiMessage.content;
                  }

                  if (responseMessage) {
                    let deliveryStatus = 'sent';
                    let displayMsg = responseMessage;
                    try {
                      await metaAdsService.sendInstagramDM(user.igConfig.accessToken, senderId, responseMessage);
                      console.log(`🤖 [Instagram DM Reply Sent Successfully]: ${responseMessage}`);
                    } catch (sendErr) {
                      console.error("❌ [Instagram Send DM Error]:", sendErr.response?.data || sendErr.message);
                      deliveryStatus = 'failed';
                      displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${sendErr.response?.data?.error?.message || sendErr.message}]`;
                    }
                    
                    await Message.create({
                      userId: user._id,
                      customerPhone: `IG_${senderId}`,
                      messageText: displayMsg,
                      direction: 'outgoing',
                      status: deliveryStatus,
                      sentBy: 'ai',
                      timestamp: new Date()
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

          console.log(`[Meta Comment (IG/FB)] Received from ${username}: ${commentText}`);

          // Find the exact user based on IG or FB Account ID
          let user = await User.findOne({ 
             $or: [
               { "igConfig.accountId": igAccountId },
               { "igConfig.pageId": igAccountId }
             ]
          });
          if (!user) {
             // 🚀 SMART FALLBACK for Comments too
             user = await User.findOne({ "igConfig.accessToken": { $exists: true, $ne: "" } }).sort({ updatedAt: -1 });
             if (!user) {
               user = await User.findOne({ role: 'owner' }).sort({ createdAt: -1 });
             }
          }
          if (!user) continue;
          
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
             
             try {
               await metaAdsService.sendInstagramCommentPrivateReply(user.igConfig.accessToken, commentData.id, matchedRule.replyMessage);
               console.log(`✅ [Instagram] Private DM sent for comment!`);
             } catch (replyErr) {
               console.error("❌ [Instagram Private Reply Error]:", replyErr.response?.data || replyErr.message);
             }
             
             // CRM me kachra nahi bharenge! Sirf Inbox (Chats) me save karenge
             await Message.create({
                userId: user._id,
                customerPhone: `IG_${igUserId}`, // Keep ID consistent for Dashboard Manual Replies
                messageText: `[💬 IG Comment]: ${commentText}`,
                direction: 'incoming',
                status: 'received',
                sentBy: 'customer',
                tags: ['ig_comment', 'auto_replied'],
                timestamp: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Auto-delete after 30 days
             });
             
             // Dashboard me reply bhi toh dikhna chahiye
             await Message.create({
                userId: user._id,
                customerPhone: `IG_${igUserId}`,
                messageText: matchedRule.replyMessage,
                direction: 'outgoing',
                status: 'sent',
                sentBy: 'auto-reply',
                tags: ['ig_private_reply'],
                timestamp: new Date()
             });
          } else {
             console.log(`⚠️ [Instagram] No manual keyword matched for: "${commentText}"`);
             
             // Track as Unmatched Comment in Inbox so owner can read & reply manually
             await Message.create({
                userId: user._id,
                customerPhone: `IG_${igUserId}`,
                messageText: `[💬 IG Comment - Unhandled]: ${commentText}`,
                direction: 'incoming',
                status: 'received',
                sentBy: 'customer',
                tags: ['ig_comment', 'needs_reply'],
                timestamp: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Auto-delete after 30 days
            });
            
            // FUTURE PHASE: Yahan hum Premium Users ke liye AI Trigger karenge jo spelling mistake samajh sake
          }
        }
      }
    } else {
      console.log(`⚠️ [IG Webhook] Received unknown object type: ${body.object}`);
    }
  } catch (error) {
    console.error('Instagram Webhook Error:', error);
  }
};