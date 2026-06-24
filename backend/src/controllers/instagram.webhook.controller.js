const aiService = require('../services/aiService');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Lead = require('../models/leadModel'); // Lead model import kiya gaya
const Flow = require('../models/flowModel'); // 🚀 Flow model imported
const metaAdsService = require('../services/metaAdsService');
const axios = require('axios'); // 🚀 Required for Public Comment Replies
const googleSheetsController = require('./googleSheetsController');

// 🚀 OVERRIDE FOR SAFETY: Bypassing any hidden bugs inside metaAdsService.js
metaAdsService.sendInstagramDM = async (token, recipientId, text) => {
  if (!token) {
    throw new Error("No Access Token found (Token is NULL)");
  }
  
  console.log(`\n▶️ [MEGA DEBUG: ID TRACKER FOR SENDING]`);
  console.log(`   👉 Attempting to send to Meta Recipient ID: ${recipientId}`);
  
  try {
    const response = await axios.post(`https://graph.facebook.com/v19.0/me/messages`, {
      recipient: { id: recipientId },
      message: { text: text },
      messaging_type: "RESPONSE"
    }, { params: { access_token: token } });
    
    console.log(`   ✅ [META API SUCCESS] Meta accepted the message for ID ${recipientId}. Message ID: ${response.data?.message_id}`);
    return response;
  } catch (error) {
    const metaErr = error.response?.data?.error;
    console.error(`   ❌ [META API REJECTED] Failed to send to ID ${recipientId}.`);
    console.error(`   ⚠️ Reason from Meta: Code: ${metaErr?.code}, Subcode: ${metaErr?.error_subcode}, Message: ${metaErr?.message || error.message}`);
    throw error;
  }
};
metaAdsService.sendInstagramCommentPrivateReply = async (token, commentId, text) => {
  if (!token) return;
  return axios.post(`https://graph.facebook.com/v19.0/${commentId}/private_replies`, {
    message: text
  }, { params: { access_token: token } });
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
              
              console.log(` [Meta DM (IG/FB)] ${isEcho ? 'Owner App Reply to' : 'Received from'} ${senderId}: ${incomingText}`);
 
              // 🚀 CRITICAL FIX: Find user by checking BOTH main config and workspaces array
              let user = await User.findOne({ 
                $or: [
                  { "instagramConfig.instagramAccountId": igAccountId },
                  { "workspaces.instagramConfig.instagramAccountId": igAccountId },
                  { "workspaces.instagramConfig.instagramAccountId": igAccountId }
                ]
              }).lean();
              
              if (!user) {
                 console.log(`❌ [IG Webhook - DMs] No matching Instagram account found in DB for Webhook IG ID: ${igAccountId}`);
                 continue;
              }

              // 🚀 DEBUG: Strict Match Success
              console.log(`\n✅ [IG Webhook - DMs] STRICT MATCH SUCCESS!`);
              console.log(`- Webhook IG Account ID:`, igAccountId);
              console.log(`- Matched Main Account ID:`, user?.instagramConfig?.instagramAccountId || 'N/A');
               console.log(`- Matched Workspace Account ID:`, user?.workspaces?.find(w => (w.instagramConfig || w.instagramConfig)?.instagramAccountId === igAccountId)?.instagramConfig?.instagramAccountId);
              console.log(`- Matched User Email:`, user?.email);
              console.log(`------------------------------------------------\n`);

              // �️ BULLETPROOF TOKEN EXTRACTION (Prevents TypeError on undefined)
              let igToken = null;
              let incomingWorkspaceId = 'main';
              let activeWorkspace = null;
              
              if (user && user.workspaces && user.workspaces.length > 0) {
                  activeWorkspace = user.workspaces.find(w => (w?.instagramConfig || w?.instagramConfig)?.instagramAccountId === igAccountId);
                  const workspaceInstagram = activeWorkspace?.instagramConfig || activeWorkspace?.instagramConfig;
                  if (workspaceInstagram?.accessToken) {
                     igToken = workspaceInstagram.accessToken;
                    incomingWorkspaceId = activeWorkspace._id ? activeWorkspace._id.toString() : 'main';
                 }
              }
              
              if (!igToken && user && user.instagramConfig && user.instagramConfig.accessToken) {
                 igToken = user.instagramConfig.accessToken;
                 incomingWorkspaceId = 'main';
              }

              if (!igToken && user && user.workspaces) {
                  const fallbackWs = user.workspaces.find(w => (w?.instagramConfig || w?.instagramConfig)?.accessToken);
                  if (fallbackWs) {
                     igToken = (fallbackWs.instagramConfig || fallbackWs.instagramConfig).accessToken;
                    incomingWorkspaceId = fallbackWs._id ? fallbackWs._id.toString() : 'main';
                 }
              }

              // 🌟 Fetch Real Instagram Profile (Name/Username)
              let realName = `IG User ${senderId.slice(-4)}`;
              if (igToken) {
                try {
                  const profile = await metaAdsService.getInstagramProfile(igToken, senderId);
                  if (profile && (profile.name || profile.username)) {
                    realName = profile.name || profile.username;
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

              // 🚀 TWO-STEP LINK TRACKING: Handle Quick Reply Button Clicks
              const quickReplyPayload = event.message.quick_reply ? event.message.quick_reply.payload : null;
              if (quickReplyPayload && quickReplyPayload.startsWith('GET_AUTO_LINK_')) {
                const postId = quickReplyPayload.replace('GET_AUTO_LINK_', '');
                const matchedRule = user.postAutomations?.find(r => r.postId === postId);
                
                if (matchedRule && matchedRule.fileUrl) {
                   const linkMsg = `Here is your requested link/file: ${matchedRule.fileUrl}\n\nLet me know if you need anything else!`;
                   if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, linkMsg).catch(e => console.error(e));
                   
                   // Update Clicked Count (Intrested Leads!)
                   await User.updateOne(
                     { _id: user._id, "postAutomations.postId": postId },
                     { $inc: { "postAutomations.$.stats.clickedCount": 1 } }
                   );
                   
                   await Message.create({ userId: user._id, customerPhone: `IG_${senderId}`, messageText: linkMsg, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', timestamp: new Date(), expiresAt: getExpiry('junk') });
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
                  }, getExpiry('junk') ? { expiresAt: getExpiry('junk') } : {}),
                  $push: { timeline: { eventType: 'Instagram DM Received', description: 'Customer sent an Instagram DM', timestamp: new Date() } }
                },
                { upsert: true, returnDocument: 'after' }
              );
              
              //  REMOVED: Auto-Sync for 'visitor' stopped! 
              // Ab Google Sheet mein data tabhi jayega jab AI successfully Name aur Number nikal lega.

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

              // 🚀 NEW: CHECK IF HUMAN HAS TAKEN OVER THIS CHAT (AI PAUSED)
              const currentLeadCheck = await Lead.findOne({ phoneNumber: `IG_${senderId}`, userId: user._id });
              // Ye check karega ki agar aapne manually reply kiya hai, toh AI shant rahega
              const isCurrentlyPaused = currentLeadCheck && currentLeadCheck.isAiPaused && currentLeadCheck.aiPausedUntil > new Date();
              
              if (isCurrentlyPaused) {
                console.log(`⏸️ [IG Webhook] Human has taken over chat for ${senderId}. AI is paused. Skipping.`);
                continue; // Stop further AI/Flow processing!
              } else if (currentLeadCheck && currentLeadCheck.isAiPaused) {
                await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { isAiPaused: false, aiPausedUntil: null } });
              }

              // 🛑 STAGE 1: GATEKEEPER / SPAM FILTER BOT (0 Cost - Saves AI Limits)
              const incomingTextLower = incomingText.toLowerCase();
              
              // ==========================================================
              // 🚀 NEW: INSTAGRAM FLOW EXECUTION ENGINE
              let flowReplyHandled = false;
              
              const formatFlowMsg = (text) => {
                if (!text) return "";
                let cName = realName.startsWith('IG User') ? '' : realName.split(' ')[0];
                return text.replace(/\{\{name\}\}/gi, cName ? cName : 'there');
              };

              const sendIGFlowMessage = async (text, nodeToPauseAt = null, flowIdToPauseAt = null) => {
                  let deliveryStatus = 'sent';
                  let displayMsg = text;
                  try {
                      if (!igToken) throw new Error("IG Token is missing or invalid");
                      await metaAdsService.sendInstagramDM(igToken, senderId, text);
                  } catch (e) {
                      console.error("❌ [IG Flow DM Error]:", e.response?.data?.error?.message || e.message);
                      deliveryStatus = 'failed';
                      displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${e.response?.data?.error?.message || e.message}]`;
                  }
                  await Message.create({ userId: user._id, customerPhone: `IG_${senderId}`, messageText: displayMsg, direction: 'outgoing', status: deliveryStatus, sentBy: 'auto-reply', timestamp: new Date(), expiresAt: getExpiry('junk') });
                  if (nodeToPauseAt && flowIdToPauseAt) {
                      await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { activeFlowState: { flowId: flowIdToPauseAt, nodeId: nodeToPauseAt } } }, { strict: false });
                  }
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
                             const updatePayload = { $push: { notes: `Flow Answer (${activeNode.data.question}): ${incomingText}` } };
                             if (currentLeadCheck.status === 'visitor' && (qLower.includes('brand') || qLower.includes('budget') || qLower.includes('city') || qLower.includes('business') || qLower.includes('name'))) {
                                 updatePayload.$set = { status: 'new', expiresAt: getExpiry('lead') };
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
                         const incLower = incomingText.toLowerCase();
                         if (activeNode.data.opt1 && incLower === activeNode.data.opt1.toLowerCase()) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_0');
                         else if (activeNode.data.opt2 && incLower === activeNode.data.opt2.toLowerCase()) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_1');
                         else if (activeNode.data.opt3 && incLower === activeNode.data.opt3.toLowerCase()) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_2');
                         else {
                             const num = parseInt(incomingText.trim());
                             if (num === 1) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_0');
                             else if (num === 2) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_1');
                             else if (num === 3) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_2');
                             else chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_0'); // fallback
                         }
                         const options = [activeNode.data.opt1, activeNode.data.opt2, activeNode.data.opt3];
                         const selectedOpt = options[parseInt(incomingText.trim()) - 1] || options[0];
                         if (selectedOpt && currentLeadCheck.status === 'visitor' && (selectedOpt.toLowerCase().includes('brand') || selectedOpt.toLowerCase().includes('collab') || selectedOpt.toLowerCase().includes('buy') || selectedOpt.toLowerCase().includes('order'))) {
                             await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { status: 'new', expiresAt: getExpiry('lead') } }, { strict: false });
                         }
                     }

                     await Lead.updateOne({ _id: currentLeadCheck._id }, { $unset: { activeFlowState: 1 } }, { strict: false });

                     let currNodeId = chosenEdge ? chosenEdge.target : null;
                     while (currNodeId) {
                       const nextNode = nodes.find(n => n.id === currNodeId);
                       if (!nextNode) break;
                       const currentFlowId = activeFlow._id.toString();
                       
                       if (nextNode.type === 'message') {
                         const msgText = formatFlowMsg(nextNode.data.message || nextNode.data.label);
                         await sendIGFlowMessage(msgText);
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'askQuestion') {
                         const msgText = formatFlowMsg(nextNode.data.question || nextNode.data.label);
                         await sendIGFlowMessage(msgText, nextNode.id, currentFlowId);
                         currNodeId = null; 
                       } else if (nextNode.type === 'menu') {
                         let msgText = formatFlowMsg(nextNode.data.message || "Please choose an option:");
                         const options = [nextNode.data.opt1, nextNode.data.opt2, nextNode.data.opt3].filter(opt => opt && opt.trim() !== '');
                         if (options.length > 0) {
                           msgText += "\n";
                           options.forEach((opt, idx) => { msgText += `\n${idx+1}️⃣ ${opt}`; });
                           msgText += "\n\n(Type a number)";
                           await sendIGFlowMessage(msgText, nextNode.id, currentFlowId);
                         }
                         currNodeId = null; 
                       } else if (nextNode.type === 'add_tag' || nextNode.type === 'tag_lead') {
                         if (nextNode.data.tag) await Lead.updateOne({ _id: currentLeadCheck._id }, { $addToSet: { tags: nextNode.data.tag } }, { strict: false });
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'crm_update') {
                         const updateFields = {};
                         if (nextNode.data.status) updateFields.status = nextNode.data.status;
                         if (nextNode.data.leadScore) updateFields.leadScore = parseInt(nextNode.data.leadScore);
                         if (nextNode.data.budget) updateFields.budget = nextNode.data.budget;
                         if (Object.keys(updateFields).length > 0) await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: updateFields }, { strict: false });
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'human_handover' || nextNode.type === 'assign_staff') {
                         await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { isAiPaused: true, aiPausedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) } }, { strict: false });
                         if (user.ownerPhone && user.whatsappConfig?.accessToken) await metaAdsService.sendInstagramDM(user.whatsappConfig.accessToken, user.ownerPhone, `🚨 *Human Handover Request*\nIG User ${senderId} requested staff assistance from the automated flow.`).catch(() => {});
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'google_sheet') {
                         const freshLead = await Lead.findById(currentLeadCheck._id);
                         googleSheetsController.appendLeadToSheet(user._id, freshLead).catch(e => console.log('Sheets flow sync error:', e.message));
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'ai_agent') {
                         await Lead.updateOne({ _id: currentLeadCheck._id }, { $unset: { activeFlowState: 1 } }, { strict: false });
                         if (nextNode.data.message) await sendIGFlowMessage(formatFlowMsg(nextNode.data.message));
                         currNodeId = null; // AI Takes over
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
                         await sendIGFlowMessage(msgText);
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'askQuestion') {
                         const msgText = formatFlowMsg(nextNode.data.question || nextNode.data.label);
                         await sendIGFlowMessage(msgText, nextNode.id, flow._id.toString());
                         currNodeId = null; 
                       } else if (nextNode.type === 'menu') {
                         let msgText = formatFlowMsg(nextNode.data.message || "Please choose an option:");
                         const options = [nextNode.data.opt1, nextNode.data.opt2, nextNode.data.opt3].filter(opt => opt && opt.trim() !== '');
                         if (options.length > 0) {
                           msgText += "\n";
                           options.forEach((opt, idx) => { msgText += `\n${idx+1}️⃣ ${opt}`; });
                           msgText += "\n\n(Type a number)";
                           await sendIGFlowMessage(msgText, nextNode.id, flow._id.toString());
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
                    aiContext = `You are a highly skilled Sales AI Assistant for ${activeWorkspace ? activeWorkspace.name : (user.businessName || 'this business')}. 
                    Business Details/Catalog: ${businessInfo}.
                    Rules: ${ownerRules}.
                    
                    IMPORTANT RULES:
                    1. Do NOT treat the user as a lead immediately. Greet them politely and ALWAYS ask for their Name, City, and WhatsApp Number.
                    2. Answer their basic questions based on the Business Details, but gently steer the conversation to collect their contact details.
                    3. ONLY use the 'extract_lead_requirements' tool AFTER the user has provided their Name and Mobile Number.
                    4. Our goal is to capture their phone number so we can move the conversation to WhatsApp.`;
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
                            name: dealData.name || dealData.brandName || realName || "New Lead", 
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
                    try {
                      if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, responseMessage);
                      console.log(`🤖 [Instagram DM Reply Sent Successfully]: ${responseMessage}`);
                      await Lead.findOneAndUpdate(
                        { phoneNumber: `IG_${senderId}`, userId: user._id },
                        { $push: { timeline: { eventType: 'Instagram DM Sent', description: 'Automated AI Response sent via DM', timestamp: new Date() } } }
                      );
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
                  
                  // 🚀 SYSTEM ALERT VISIBILITY: Drop an error alert directly into the Dashboard Chat!
                  await Message.create({
                    userId: user._id,
                    customerPhone: `IG_${senderId}`,
                    messageText: `[⚠️ AI System Alert: Failed to generate reply. Reason: ${aiErr.message || 'API Timeout'}]`,
                    direction: 'outgoing',
                    status: 'failed',
                    sentBy: 'system',
                    timestamp: new Date()
                  });

                  // Send a friendly fallback to the customer on Instagram so they aren't ignored
                  const fallbackMsg = "🙏 Maafi chahenge, abhi humara AI system thoda busy hai ya network issue hai. Hum jald hi aapse contact karenge!";
                  if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, fallbackMsg).catch(()=>{});
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

           // Find the exact user based on IG or FB Account ID (handle legacy igConfig too)
           let user = await User.findOne({
             $or: [
               { "instagramConfig.instagramAccountId": igAccountId },
               { "igConfig.instagramAccountId": igAccountId },
               { "workspaces.instagramConfig.instagramAccountId": igAccountId },
               { "workspaces.igConfig.instagramAccountId": igAccountId }
             ]
           });
          if (!user) {
             console.log(`❌ [IG Webhook - Comments] No matching Instagram account found in DB for Webhook IG ID: ${igAccountId}`);
             continue;
          }
          
          console.log(`\n✅ [IG Webhook - Comments] STRICT MATCH SUCCESS!`);
          console.log(`- Webhook IG ID:`, igAccountId);
          console.log(`- Matched Account:`, user?.instagramConfig?.instagramAccountId);
          console.log(`- Matched User Email:`, user?.email);
          console.log(`------------------------------------------------\n`);
          
           // Safely extract IG Token for Comments (prefer canonical field, fall back to legacy)
           let igToken = user.instagramConfig?.accessToken || user.igConfig?.accessToken;
           if (!igToken && user.workspaces) {
             const workspace = user.workspaces.find(w => (w.instagramConfig || w.igConfig)?.instagramAccountId === igAccountId);
             igToken = workspace?.instagramConfig?.accessToken || workspace?.igConfig?.accessToken;
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
                 $set: {
                   userId: user._id, 
                   name: username, 
                   source: 'Instagram Comment', 
                   status: 'new',
                   notes: `Left number in comment: "${commentText}"`
                 },
                 $setOnInsert: { expiresAt: getExpiry('lead') },
                 $push: { timeline: { eventType: 'Instagram Comment Received', description: `Comment: "${commentText.substring(0,30)}..."`, timestamp: new Date() } }
               },
               { upsert: true, new: true }
             );
             
             googleSheetsController.appendLeadToSheet(user._id, newCommentLead).catch(e => console.log('Sheets sync error:', e.message));
          }

          // 1. 🚀 SMART MATCHING: POST-SPECIFIC AUTOMATION FIRST, THEN GLOBAL
          let matchedRule = null;
          let isPostSpecific = false;
          
          if (user.postAutomations && user.postAutomations.length > 0) {
            // First, try to find a rule for this specific post ID
            if (mediaId) {
              matchedRule = user.postAutomations.find(rule => rule.postId === mediaId && commentText.toLowerCase().includes(rule.triggerWord.toLowerCase()));
              if (matchedRule) isPostSpecific = true;
            }
            
            // If no specific rule, find a global rule (where postId is empty)
            if (!matchedRule) {
              matchedRule = user.postAutomations.find(rule => !rule.postId && commentText.toLowerCase().includes(rule.triggerWord.toLowerCase()));
            }
          }

          // Fallback to old autoReplies if still no match (for backward compatibility)
          if (!matchedRule) {
             matchedRule = (user.autoReplies || []).find(rule => commentText.toLowerCase().includes(rule.triggerWord.toLowerCase()));
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
             let dmSentSuccessfully = false;
             try {
               if (igToken) await metaAdsService.sendInstagramCommentPrivateReply(igToken, commentData.id, finalReplyMsg);
               console.log(`✅ [Instagram] Private DM sent for comment!`);
               dmSentSuccessfully = true;
             } catch (replyErr) {
               console.error("❌ [Instagram Private Reply Error]:", replyErr.response?.data || replyErr.message);
             }

             if (dmSentSuccessfully) {
               // 🚀 NEW: PUBLIC COMMENT REPLY (If keyword matches, tell them to check DM publicly)
               try {
                 await axios.post(`https://graph.facebook.com/v19.0/${commentData.id}/replies`, {
                     message: matchedRule.publicReply || `Hey @${username}, we've sent you a DM with the details! 📩`,
                     access_token: igToken
                 });
                 console.log(`✅ [Instagram] Public Reply sent to comment telling them to check DM!`);
               } catch (publicErr) {
                 console.error("❌ [Instagram Public Reply Error]:", publicErr.response?.data?.error?.message || publicErr.message);
               }
             } else {
                 console.log(`⚠️ [Instagram] Skipping public reply because private DM failed.`);
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
