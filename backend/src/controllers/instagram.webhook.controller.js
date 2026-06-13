const aiService = require('../services/aiService');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Lead = require('../models/leadModel'); // Lead model import kiya gaya
const Flow = require('../models/flowModel'); // 🚀 Flow model imported
const metaAdsService = require('../services/metaAdsService');
const axios = require('axios'); // 🚀 Required for Public Comment Replies
const googleSheetsController = require('./googleSheetsController');// 🚀 OVERRIDE FOR SAFETY: Bypassing any hidden bugs inside metaAdsService.js
metaAdsService.sendInstagramDM = async (token, recipientId, text) => {
  if (!token) return;
  return axios.post(`https://graph.facebook.com/v19.0/me/messages`, {
    recipient: { id: recipientId },
    message: { text: text },
    messaging_type: "RESPONSE"
  }, { params: { access_token: token } });
};
metaAdsService.sendInstagramCommentPrivateReply = async (token, commentId, text) => {
  if (!token) return;
  return axios.post(`https://graph.facebook.com/v19.0/${commentId}/private_replies`, {
    message: text
  }, { params: { access_token: token } });
};

// 🚀 OVERRIDE FOR SAFETY: Fetch Real Instagram Profile (Name/Username)
metaAdsService.getInstagramProfile = async (token, igsid) => {
  if (!token) return null;
  try {
    // 🚀 FIX: Removed profile_pic to prevent Meta from blocking the request due to privacy settings
    const res = await axios.get(`https://graph.facebook.com/v19.0/${igsid}?fields=name,username&access_token=${token}`);
    return res.data;
  } catch (e) {
    console.error(`❌ IG Profile Fetch Error for ${igsid}:`, e.response?.data?.error?.message || e.message);
    return null;
  }
};

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
              
              console.log(`\n📥 [MEGA DEBUG: INCOMING MESSAGE TRACER]`);
              console.log(`   👉 Message arrived ON Business Page ID (igAccountId): ${igAccountId}`);
              console.log(`   👉 Message sent FROM Customer ID (senderId): ${senderId}`);
              console.log(`   👉 Is this an Owner Reply? (isEcho): ${isEcho}`);
              console.log(`   👉 Message Text: "${incomingText}"`);

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
                 user = await User.findOne({ 
                   $or: [
                     { "igConfig.accessToken": { $exists: true, $ne: "" } },
                     { "workspaces.igConfig.accessToken": { $exists: true, $ne: "" } }
                   ]
                 }).sort({ updatedAt: -1 });
                 
                 if (!user) {
                   user = await User.findOne({ role: 'owner' }).sort({ createdAt: -1 });
                 }
              }
              if (!user) continue;

              // 🛡️ BULLETPROOF TOKEN EXTRACTION (Prevents TypeError on undefined)
              let igToken = null;
              let incomingWorkspaceId = 'main';
              let activeWorkspace = null;
              
              if (user && user.workspaces && user.workspaces.length > 0) {
                 activeWorkspace = user.workspaces.find(w => w && w.igConfig && (w.igConfig.accountId === igAccountId || w.igConfig.pageId === igAccountId));
                 if (activeWorkspace && activeWorkspace.igConfig && activeWorkspace.igConfig.accessToken) {
                    igToken = activeWorkspace.igConfig.accessToken;
                    incomingWorkspaceId = activeWorkspace._id ? activeWorkspace._id.toString() : 'main';
                 }
              }
              
              if (!igToken && user && user.igConfig && user.igConfig.accessToken) {
                 igToken = user.igConfig.accessToken;
                 incomingWorkspaceId = 'main';
              }

              if (!igToken && user && user.workspaces) {
                 const fallbackWs = user.workspaces.find(w => w && w.igConfig && w.igConfig.accessToken);
                 if (fallbackWs) {
                    igToken = fallbackWs.igConfig.accessToken;
                    incomingWorkspaceId = fallbackWs._id ? fallbackWs._id.toString() : 'main';
                 }
              }

              // 🌟 Fetch Real Instagram Profile (Name/Username)
              let realName = `IG User ${senderId.slice(-4)}`;
              if (igToken) {
                try {
                  const profile = await metaAdsService.getInstagramProfile(igToken, senderId);
                  if (profile) {
                    realName = profile.username ? `@${profile.username}` : (profile.name || `IG User ${senderId.slice(-4)}`);
                  }
                } catch (e) {
                  console.log("⚠️ Could not fetch IG profile details for", senderId);
                }
              }

              // 🚀 SMART TTL: Calculate Data Expiry based on User Plan
              const isPremium = user.isPremium === true || user.role === 'superadmin' || user.email === 'ankush.bani@gmail.com';
              const getExpiry = (type) => {
                if (type === 'lead') {
                  // Premium users keep CRM leads forever. Free users keep for 14 days.
                  return isPremium ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
                }
                // DMs/Comments: Premium keeps for 30 days. Free keeps for 1 day.
                return isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
              };
              
              // 🚀 SMART HELPER: Sends message and correctly records FAILED status if Meta blocks it
              const sendFlowMessage = async (msgText, nextNodeId = null, flowId = null) => {
                 let dStatus = 'sent';
                 let dMsg = msgText;
                 
                 console.log(`\n▶️ [MEGA DEBUG: TRACING ID BEFORE FLOW SEND]`);
                 console.log(`   👉 Original Incoming Sender ID was: ${senderId}`);
                 console.log(`   👉 Now passing to Meta as Recipient ID: ${senderId}`);
                 if (senderId !== event.sender.id && !isEcho) console.error(`   🚨 ALARM! CUSTOMER ID CHANGED DURING EXECUTION!`);
                 
                 try {
                   await metaAdsService.sendInstagramDM(igToken, senderId, msgText);
                   console.log(`✅ [Flow Engine] Message delivered successfully to Meta.`);
                 } catch(e) {
                   dStatus = 'failed';
                   const metaErrorMsg = e.response?.data?.error?.message || e.message;
                   dMsg += `\n\n[⚠️ Meta Blocked: ${metaErrorMsg}]`;
                   console.error(`❌ [Flow Engine] Failed to send message. Saving as FAILED in dashboard. Error: ${metaErrorMsg}`);
                 }
                 await Message.create({ userId: user._id, customerPhone: `IG_${senderId}`, messageText: dMsg, direction: 'outgoing', status: dStatus, sentBy: 'auto-reply', timestamp: new Date(), expiresAt: getExpiry('junk') });
                 
                 if (nextNodeId && flowId) {
                   await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { activeFlowState: { flowId: flowId, nodeId: nextNodeId } } }, { strict: false });
                 }
              };

              // 🚀 TWO-STEP LINK TRACKING: Handle Quick Reply Button Clicks
              const quickReplyPayload = event.message.quick_reply ? event.message.quick_reply.payload : null;
              if (quickReplyPayload && quickReplyPayload.startsWith('GET_AUTO_LINK_')) {
                const postId = quickReplyPayload.replace('GET_AUTO_LINK_', '');
                const matchedRule = user.postAutomations?.find(r => r.postId === postId);
                
                if (matchedRule && matchedRule.fileUrl) {
                   const linkMsg = `Here is your requested link/file: ${matchedRule.fileUrl}\n\nLet me know if you need anything else!`;
                   
                   // Update Clicked Count (Intrested Leads!)
                   await User.updateOne(
                     { _id: user._id, "postAutomations.postId": postId },
                     { $inc: { "postAutomations.$.stats.clickedCount": 1 } }
                   );
                   
                   await sendFlowMessage(linkMsg);
                   continue; // Stop further processing, job done!
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
                  timestamp: new Date(),
                  expiresAt: getExpiry('junk')
                });
              }

              // 🚀 NEW: AUTO-ADD IG SENDER TO CRM (So it shows in Chats sidebar instantly)
              const savedIgLead = await Lead.findOneAndUpdate(
                { phoneNumber: `IG_${senderId}`, userId: user._id },
                { 
                  $set: { name: realName },
                  $setOnInsert: Object.assign({ 
                    source: 'Instagram DM', 
                    status: 'visitor', // CHANGED FROM 'new' to avoid CRM clutter for normal fans
                    createdBy: user._id
                  }, getExpiry('junk') ? { expiresAt: getExpiry('junk') } : {})
                },
                { upsert: true, returnDocument: 'after' }
              );
              
              // 🚀 NEW: Auto-Sync New IG Leads to Google Sheets
              if (savedIgLead && savedIgLead.status === 'visitor' && savedIgLead.createdAt && (Date.now() - new Date(savedIgLead.createdAt).getTime() < 10000)) {
                 googleSheetsController.appendLeadToSheet(user._id, savedIgLead).catch(e => console.log('Sheets sync error:', e.message));
              }

              // 🚀 NEW: HANDLE OWNER REPLIES FROM INSTAGRAM APP
              if (isEcho) {
                 await Message.create({
                    userId: user._id,
                    customerPhone: `IG_${senderId}`,
                    messageText: incomingText,
                    direction: 'outgoing',
                    status: 'sent',
                    sentBy: 'owner_app',
                    timestamp: new Date(),
                    expiresAt: getExpiry('junk')
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
              
              // ==========================================================
              // 🚀 NEW: INSTAGRAM FLOW EXECUTION ENGINE
              // ==========================================================
              let flowReplyHandled = false;
              const currentLeadCheck = await Lead.findOne({ phoneNumber: `IG_${senderId}`, userId: user._id });
              
              const formatFlowMsg = (text) => {
                if (!text) return "";
                let cName = realName.startsWith('IG User') ? '' : realName.split(' ')[0];
                return text.replace(/\{\{name\}\}/gi, cName ? cName : 'there');
              };

              let flowQuery = { userId: user._id };
              // 🚀 FIX: Allow "Main" flows to work across all sub-workspaces as a fallback!
              if (incomingWorkspaceId !== 'main') {
                 flowQuery = { userId: user._id, workspaceId: { $in: [incomingWorkspaceId, 'main'] } };
              }
              const userFlows = await Flow.find(flowQuery);

              // STEP 1: Check if customer is currently inside an active "Ask Question" or "Menu" Flow block
              if (currentLeadCheck && currentLeadCheck.activeFlowState && currentLeadCheck.activeFlowState.flowId) {
                const activeFlow = userFlows.find(f => f._id.toString() === currentLeadCheck.activeFlowState.flowId);
                if (activeFlow && activeFlow.flowData) {
                  const nodes = activeFlow.flowData.nodes || [];
                  const edges = activeFlow.flowData.edges || [];
                  const activeNode = nodes.find(n => n.id === currentLeadCheck.activeFlowState.nodeId);

                  if (activeNode) {
                     let chosenEdge = null;
                     if (activeNode.type === 'askQuestion') {
                       if (activeNode.data.replyType === 'open') {
                         const qLower = (activeNode.data.question || '').toLowerCase();
                         const existingNotes = currentLeadCheck.notes || "";
                         const newNote = `Flow Answer (${activeNode.data.question}): ${incomingText}`;
                         const updatePayload = { $set: { notes: existingNotes ? `${existingNotes}\n${newNote}` : newNote } };
                         
                         // 🔥 Convert to proper lead if they answer a business/collab related flow question
                         if (currentLeadCheck.status === 'visitor' && (qLower.includes('brand') || qLower.includes('budget') || qLower.includes('city') || qLower.includes('business') || qLower.includes('name'))) {
                            updatePayload.$set.status = 'new';
                            updatePayload.$set.expiresAt = getExpiry('lead');
                         }
                         await Lead.updateOne({ _id: currentLeadCheck._id }, updatePayload, { strict: false });
                         chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'replied');
                       } else {
                         if (['yes', 'y', 'ha', 'haan', 'han'].includes(incomingTextLower)) {
                           chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'yes');
                         } else if (['no', 'n', 'na', 'nahi', 'nahin'].includes(incomingTextLower)) {
                           chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'no');
                         } else {
                           chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'other');
                         }
                       }
                     } else if (activeNode.type === 'menu') {
                       const num = parseInt(incomingText.trim());
                       if (num === 1) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_0');
                       else if (num === 2) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_1');
                       else if (num === 3) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_2');
                       else chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_0'); // fallback

                       const options = [activeNode.data.opt1, activeNode.data.opt2, activeNode.data.opt3];
                       const selectedOpt = options[num - 1] || options[0];
                       if (selectedOpt && currentLeadCheck.status === 'visitor' && (selectedOpt.toLowerCase().includes('brand') || selectedOpt.toLowerCase().includes('collab') || selectedOpt.toLowerCase().includes('buy') || selectedOpt.toLowerCase().includes('order'))) {
                          await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { status: 'new', expiresAt: getExpiry('lead') } }, { strict: false });
                       }
                     }

                     await Lead.updateOne({ _id: currentLeadCheck._id }, { $unset: { activeFlowState: 1 } }, { strict: false });

                     let currNodeId = chosenEdge ? chosenEdge.target : null;
                     while (currNodeId) {
                       const nextNode = nodes.find(n => n.id === currNodeId);
                       if (!nextNode) break;
                       if (nextNode.type === 'message') {
                         const msgText = formatFlowMsg(nextNode.data.message || nextNode.data.label);
                         await sendFlowMessage(msgText);
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'askQuestion') {
                         const msgText = formatFlowMsg(nextNode.data.question || nextNode.data.label);
                         await sendFlowMessage(msgText, nextNode.id, activeFlow._id.toString());
                         currNodeId = null; 
                       } else if (nextNode.type === 'menu') {
                         let msgText = formatFlowMsg(nextNode.data.message || "Please choose an option:");
                         const options = [nextNode.data.opt1, nextNode.data.opt2, nextNode.data.opt3].filter(opt => opt && opt.trim() !== '');
                         if (options.length > 0) {
                           msgText += "\n";
                           options.forEach((opt, idx) => { msgText += `\n${idx+1}️⃣ ${opt}`; });
                           msgText += "\n\n(Type a number)";
                           await sendFlowMessage(msgText, nextNode.id, activeFlow._id.toString());
                         }
                         currNodeId = null; 
                       } else { break; }
                     }
                     flowReplyHandled = true;
                  }
                }
              }

              // STEP 2: Check for Keyword Triggers
              if (!flowReplyHandled) {
                for (const flow of userFlows) {
                  if (!flow.flowData) continue;
                  const nodes = flow.flowData.nodes || [];
                  const edges = flow.flowData.edges || [];
                  const triggerNodes = nodes.filter(n => n.type === 'trigger' && n.data.triggerType === 'keyword');
                  
                  let matchedTrigger = null;
                  for (const trigger of triggerNodes) {
                    const keywords = (trigger.data.keyword || "").split(',').map(k => k.trim().toLowerCase());
                    const words = incomingTextLower.split(/[\s,]+/);
                    // 🚀 SMART KEYWORD MATCHING: Matches exact word or if sentence contains the keyword
                    if (keywords.some(k => incomingTextLower === k || words.includes(k))) {
                      matchedTrigger = trigger;
                      break;
                    }
                  }

                  if (matchedTrigger) {
                    console.log(`[IG Flow Engine] 🚀 Trigger matched in Flow: ${flow.name}`);
                    let nextEdge = edges.find(e => e.source === matchedTrigger.id);
                    let currNodeId = nextEdge ? nextEdge.target : null;
                    
                    while (currNodeId) {
                       const nextNode = nodes.find(n => n.id === currNodeId);
                       if (!nextNode) break;
                       if (nextNode.type === 'message') {
                         const msgText = formatFlowMsg(nextNode.data.message || nextNode.data.label);
                         await sendFlowMessage(msgText);
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'askQuestion') {
                         const msgText = formatFlowMsg(nextNode.data.question || nextNode.data.label);
                         await sendFlowMessage(msgText, nextNode.id, flow._id.toString());
                         currNodeId = null; 
                       } else if (nextNode.type === 'menu') {
                         let msgText = formatFlowMsg(nextNode.data.message || "Please choose an option:");
                         const options = [nextNode.data.opt1, nextNode.data.opt2, nextNode.data.opt3].filter(opt => opt && opt.trim() !== '');
                         if (options.length > 0) {
                           msgText += "\n";
                           options.forEach((opt, idx) => { msgText += `\n${idx+1}️⃣ ${opt}`; });
                           msgText += "\n\n(Type a number)";
                           await sendFlowMessage(msgText, nextNode.id, flow._id.toString());
                         }
                         currNodeId = null; 
                       } else { break; }
                    }
                    flowReplyHandled = true;
                    console.log(`[IG Flow Engine] ✅ Successfully executed flow nodes for IG DM.`);
                    break;
                  }
                }
              }

              if (flowReplyHandled) {
                continue; // 🚀 Flow Engine handled this, Skip the Heavy AI & Gatekeeper!
              }
              // ==========================================================

              // 🚀 TWO-STEP LINK DELIVERY: Send Button if user DM'd a keyword
              if (!flowReplyHandled && user.postAutomations) {
                const matchedAuto = user.postAutomations.find(rule => incomingTextLower.includes(rule.triggerWord.toLowerCase()));
                if (matchedAuto && matchedAuto.fileUrl) {
                  try {
                    if (matchedAuto.deliveryMode === 'button') {
                      await axios.post(`https://graph.facebook.com/v19.0/me/messages`, {
                        recipient: { id: senderId },
                        message: {
                          text: `${matchedAuto.replyMessage}\n\nTap the button below to receive the file/link:`,
                          quick_replies: [{ content_type: "text", title: "Get Link 🔗", payload: `GET_AUTO_LINK_${matchedAuto.postId}` }]
                        }
                      }, { params: { access_token: igToken }});
                    } else {
                      // Direct Mode (Send Link instantly)
                      const directLinkMsg = `${matchedAuto.replyMessage}\n\n📄 Link: ${matchedAuto.fileUrl}`;
                      if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, directLinkMsg);
                      // Auto-increment click count as well since it was sent directly
                      await User.updateOne({ _id: user._id, "postAutomations.postId": matchedAuto.postId }, { $inc: { "postAutomations.$.stats.clickedCount": 1 } });
                    }
                    
                    // Update Sent Count
                    await User.updateOne({ _id: user._id, "postAutomations.postId": matchedAuto.postId }, { $inc: { "postAutomations.$.stats.sentCount": 1 } });
                    await Message.create({ userId: user._id, customerPhone: `IG_${senderId}`, messageText: `[Button Sent] ${matchedAuto.replyMessage}`, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', timestamp: new Date(), expiresAt: getExpiry('junk') });
                  } catch(e) {
                    console.error("Quick Reply DM Error:", e.response?.data || e.message);
                  }
                  continue; // Handled
                }
              }

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
                  if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, menuMessage);
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
                  timestamp: new Date(),
                  expiresAt: getExpiry('junk')
                });
                continue; // 🚫 Stops here, does NOT call OpenAI
              }

              // Creator specific fast-path - Brand Promotion / Collab
              if (isCreator && (incomingTextLower === '1' || incomingTextLower.includes('collab') || incomingTextLower.includes('brand') || incomingTextLower.includes('promotion'))) {
                // 0 COST COLLAB CAPTURE (Convert to Lead)
                const collabMsg = `Thank you for your interest in collaborating! 🤝 Our team has received your request and will review it soon.`;
                
                let deliveryStatus = 'sent';
                let displayMsg = collabMsg;
                try {
                  if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, collabMsg);
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
                  timestamp: new Date(),
                  expiresAt: getExpiry('junk')
                });
                
                // Seedha CRM me Lead bana do (Bina AI ke)
                await Lead.findOneAndUpdate(
                  { phoneNumber: `IG_${senderId}` }, 
                  { 
                    $set: {
                      userId: user._id, 
                      name: `IG User ${senderId}`, 
                      source: 'Instagram DM (Collab)', 
                      status: 'new', 
                      notes: `IG Handle: @${senderId}\nDeal Type: Collab\nAwaiting Influencer's manual review.`,
                      expiresAt: getExpiry('lead')
                    }
                  }, 
                  { upsert: true }
                );
                
                console.log(`🤖 [IG Basic Bot]: Saved Collab Lead & Sent Wait Response to ${senderId}`);
                continue; // 🚫 Stops here, saves AI token!
              }

              // Creator specific fast-path - Just a Fan
              if (isCreator && (incomingTextLower === '2' || incomingTextLower.includes('fan'))) {
                const fanMsg = `Aww! Thank you so much for the love and support! Means the world to me. ❤️✨`;
                
                let deliveryStatus = 'sent';
                let displayMsg = fanMsg;
                try {
                  if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, fanMsg);
                  console.log(`🤖 [IG Basic Bot]: Sent Fan Response to ${senderId}`);
                } catch (apiErr) {
                  console.error(`❌ [IG Send Error]: Failed to send Fan Msg to ${senderId}`);
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
                  timestamp: new Date(),
                  expiresAt: getExpiry('junk')
                });
                
                continue; // 🚫 Stops here, status remains 'visitor', no lead created in CRM pipeline.
              }

              // General Query / Human Fallback
              if (incomingTextLower === '3' || incomingTextLower.includes('general') || incomingTextLower.includes('human') || incomingTextLower.includes('team')) {
                const generalMessage = isCreator ? `Your query has been recorded. Our team will review it shortly.` : `Thanks! I've notified our team. A human representative will get back to you shortly. ⏳`;
                
                let deliveryStatus = 'sent';
                let displayMsg = generalMessage;
                try {
                  if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, generalMessage);
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
                  timestamp: new Date(),
                  expiresAt: getExpiry('junk')
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
                        
                        const updatedIgLead = await Lead.findOneAndUpdate(
                          { phoneNumber: `IG_${senderId}` }, 
                          { 
                            userId: user._id, 
                            name: dealData.brandName || "New Brand Deal", 
                            source: 'Instagram DM (Promotion)', 
                            status: 'interested', 
                        notes: `Deliverables: ${dealData.itemName || dealData.deliverables} | Offered Budget: ${dealData.budget} | Notes: ${dealData.notes || 'N/A'}`,
                        expiresAt: getExpiry('lead')
                          }, 
                          { upsert: true, returnDocument: 'after' }
                        );
                        
                        googleSheetsController.appendLeadToSheet(user._id, updatedIgLead).catch(e => console.log('Sheets sync error:', e.message));
                        
                        responseMessage = `Thank you! I have noted down the details (Budget: ${dealData.budget}). I will forward this to the influencer and we will get back to you shortly to finalize the collaboration!`;
                      }
                    }
                  } else {
                    responseMessage = aiMessage.content;
                  }

                  if (responseMessage) {
                    let deliveryStatus = 'sent';
                    let displayMsg = responseMessage;
                    
                    console.log(`\n▶️ [MEGA DEBUG: TRACING ID BEFORE AI SEND]`);
                    console.log(`   👉 Original Incoming Sender ID was: ${senderId}`);
                    console.log(`   👉 Now passing to Meta as Recipient ID: ${senderId}`);
                    
                    try {
                      if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, responseMessage);
                      console.log(`🤖 [Instagram DM Reply Sent Successfully]: ${responseMessage}`);
                    } catch (sendErr) {
                      console.error("❌ [Instagram Send DM Error]:", sendErr.response?.data || sendErr.message);
                      deliveryStatus = 'failed';
                      displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${sendErr.response?.data?.error?.message || sendErr.message}]`;

                      // 🚀 REACTIVE ALERT: If Token is expired or revoked (Meta Error Code 190 or 10)
                      const errorCode = sendErr.response?.data?.error?.code;
                      if (errorCode === 190 || errorCode === 10) {
                         if (user.whatsappConfig?.accessToken && user.whatsappConfig?.phoneNumberId && user.ownerPhone) {
                            const alertMsg = `🚨 *DealClose AI System Alert*\n\nYour Instagram Connection has EXPIRED or been disconnected (Due to password change or 60-day limit).\n\n*AI has stopped replying to your Instagram customers.*\n\n*Action Required:* Please login to your DealClose AI Dashboard -> Settings, and click 'Connect Instagram' again to restore the connection.`;
                            let formattedPhone = user.ownerPhone.replace(/\D/g, ''); 
                            if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
                            await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, formattedPhone, alertMsg).catch(e => console.log("Failed to send WA alert:", e.message));
                         }
                      }
                    }
                    
                    await Message.create({
                      userId: user._id,
                      customerPhone: `IG_${senderId}`,
                      messageText: displayMsg,
                      direction: 'outgoing',
                      status: deliveryStatus,
                      sentBy: 'ai',
                      timestamp: new Date(),
                      expiresAt: getExpiry('junk')
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
          const mediaId = commentData.media ? commentData.media.id : null;

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
          
          // Safely extract IG Token for Comments
          let igToken = user.igConfig?.accessToken;
          if (!igToken && user.workspaces) {
             igToken = user.workspaces.find(w => w.igConfig?.accessToken)?.igConfig?.accessToken;
          }

          // 🚀 SMART TTL: Calculate Expiry for Comments
          const isPremium = user.isPremium === true || user.role === 'superadmin' || user.email === 'ankush.bani@gmail.com';
          const getExpiry = (type) => {
            if (type === 'lead') {
              // Premium users keep CRM leads forever. Free users keep for 14 days.
              return isPremium ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            }
            // DMs/Comments: Premium keeps for 30 days. Free keeps for 1 day.
            return isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
          };

          const autoReplies = user?.autoReplies || [];

          // 🌟 SMART LEAD EXTRACTION: Check if comment has a Phone Number
          const phoneRegex = /(?:\+?\d{1,3}[- ]?)?\d{10}/;
          const phoneMatch = commentText.match(phoneRegex);

          if (phoneMatch) {
             const extractedPhone = phoneMatch[0].replace(/\D/g, '');
             console.log(`📞 [Instagram] High Intent Lead! Phone number detected: ${extractedPhone}`);
             
             // Extract number and save to CRM as a Lead
             const newCommentLead = await Lead.findOneAndUpdate(
               { phoneNumber: extractedPhone },
               { 
                 userId: user._id, 
                 name: username, 
                 source: 'Instagram Comment', 
                 status: 'new',
                 notes: `Left number in comment: "${commentText}"`,
                 expiresAt: getExpiry('lead')
               },
               { upsert: true, new: true }
             );
             
             googleSheetsController.appendLeadToSheet(user._id, newCommentLead).catch(e => console.log('Sheets sync error:', e.message));
          }

          // 1. 🚀 SMART MATCHING: POST-SPECIFIC AUTOMATION FIRST, THEN GLOBAL
          let matchedRule = null;
          let isPostSpecific = false;
          
          // Pehle check karo ki kya is specific reel/post ke liye koi rule bana hai?
          if (mediaId && user.postAutomations) {
             matchedRule = user.postAutomations.find(rule => rule.postId === mediaId && commentText.toLowerCase().includes(rule.triggerWord.toLowerCase()));
             if (matchedRule) isPostSpecific = true;
          }

          // Agar post-specific rule nahi mila, toh Global rule (autoReplies) check karo
          if (!matchedRule) {
             matchedRule = autoReplies.find(rule => commentText.toLowerCase().includes(rule.triggerWord.toLowerCase()));
          }

          if (matchedRule) {
             console.log(`✅ [Instagram] Keyword Matched: '${matchedRule.triggerWord}' (Post Specific: ${isPostSpecific})`);
             
             // 🚀 Handle PDF/Link injection for Post Specific automations
             let finalReplyMsg = matchedRule.replyMessage;
             if (matchedRule.fileUrl) {
                 finalReplyMsg += `\n\n📄 Here is your link/file: ${matchedRule.fileUrl}`;
             }
             
             // Track Sent Count for Post Automation
             if (isPostSpecific) {
               await User.updateOne({ _id: user._id, "postAutomations.postId": matchedRule.postId }, { $inc: { "postAutomations.$.stats.sentCount": 1 } }).catch(e => console.log(e));
             }

             console.log(`💬 [Instagram] Sending DM to ${username}: ${finalReplyMsg}`);
             try {
               if (igToken) await metaAdsService.sendInstagramCommentPrivateReply(igToken, commentData.id, finalReplyMsg);
               console.log(`✅ [Instagram] Private DM sent for comment!`);
             } catch (replyErr) {
               console.error("❌ [Instagram Private Reply Error]:", replyErr.response?.data || replyErr.message);
             }

             // 🚀 NEW: PUBLIC COMMENT REPLY (If keyword matches, tell them to check DM publicly)
             try {
               await axios.post(`https://graph.facebook.com/v19.0/${commentData.id}/replies`, {
                   message: `Hey @${username}, we've sent you a DM with the details! 📩`,
                   access_token: igToken
               });
               console.log(`✅ [Instagram] Public Reply sent to comment telling them to check DM!`);
             } catch (publicErr) {
               console.error("❌ [Instagram Public Reply Error]:", publicErr.response?.data?.error?.message || publicErr.message);
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
                expiresAt: getExpiry('junk') // 🚀 Uses smart expiry now
             });
             
             // Dashboard me reply bhi toh dikhna chahiye
             await Message.create({
                userId: user._id,
                customerPhone: `IG_${igUserId}`,
                messageText: finalReplyMsg,
                direction: 'outgoing',
                status: 'sent',
                sentBy: 'auto-reply',
                tags: ['ig_private_reply'],
                timestamp: new Date(),
                expiresAt: getExpiry('junk')
             });
          } else {
             console.log(`⚠️ [Instagram] No manual keyword matched for: "${commentText}"`);
             
             // 🚀 NEW: AI PUBLIC COMMENT REPLY (If no keyword matches)
             if (user.aiAgentEnabled !== false) {
                 try {
                     const aiContext = `You are the friendly social media manager for ${user.businessName || 'this page'}. Reply to this Instagram comment: "${commentText}". Be very short, engaging, and use 1-2 emojis. Do not ask questions. Keep it under 15 words.`;
                     const aiReply = await aiService.generateAIResponse(commentText, aiContext);
                     
                     await axios.post(`https://graph.facebook.com/v19.0/${commentData.id}/replies`, {
                         message: aiReply,
                         access_token: igToken
                     });
                     console.log(`✅ [Instagram] Public AI Reply sent to comment: ${aiReply}`);
                     
                     await Message.create({
                        userId: user._id, customerPhone: `IG_${igUserId}`,
                        messageText: `[Public AI Reply]: ${aiReply}`,
                        direction: 'outgoing', status: 'sent', sentBy: 'ai',
                        tags: ['ig_comment_reply'], timestamp: new Date(), expiresAt: getExpiry('junk')
                     });
                 } catch (aiCommentErr) {
                     console.error("❌ [Instagram AI Comment Reply Error]:", aiCommentErr.response?.data?.error?.message || aiCommentErr.message);
                 }
             }

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
                expiresAt: getExpiry('junk') // 🚀 Uses smart expiry now
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