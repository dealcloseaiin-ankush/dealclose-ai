const aiService = require('../services/aiService');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Lead = require('../models/leadModel'); 
const Flow = require('../models/flowModel'); 
const metaAdsService = require('../services/metaAdsService');
const axios = require('axios'); 
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

              if (isEcho && appId && myAppId && appId.toString() === myAppId.toString()) {
                 console.log(`🔇 [IG Webhook] Ignoring API echo message (Bot's own API reply).`);
                 continue;
              }

              const senderId = isEcho ? event.recipient.id : event.sender.id;
              const incomingText = event.message.text.trim();
              
              console.log(` [Meta DM (IG/FB)] ${isEcho ? 'Owner App Reply to' : 'Received from'} ${senderId}: ${incomingText}`);
 
              let user = await User.findOne({ 
                $or: [
                  { "instagramConfig.instagramAccountId": igAccountId },
                  { "workspaces.instagramConfig.instagramAccountId": igAccountId }
                ]
              }).lean();
              
              if (!user) {
                 console.log(`❌ [IG Webhook - DMs] No matching Instagram account found in DB for Webhook IG ID: ${igAccountId}`);
                 continue;
              }

              console.log(`\n✅ [IG Webhook - DMs] STRICT MATCH SUCCESS!`);
              console.log(`- Webhook IG Account ID:`, igAccountId);
              console.log(`- Matched User Email:`, user?.email);

              let igToken = null;
              let incomingWorkspaceId = 'main';
              let activeWorkspace = null;
              
              if (user && user.workspaces && user.workspaces.length > 0) {
                  activeWorkspace = user.workspaces.find(w => w?.instagramConfig?.instagramAccountId === igAccountId);
                  const workspaceInstagram = activeWorkspace?.instagramConfig;
                  if (workspaceInstagram?.accessToken) {
                     igToken = workspaceInstagram.accessToken;
                     incomingWorkspaceId = activeWorkspace._id ? activeWorkspace._id.toString() : 'main';
                 }
              }
              
              if (!igToken && user && user.instagramConfig && user.instagramConfig.accessToken) {
                  igToken = user.instagramConfig.accessToken;
                  incomingWorkspaceId = 'main';
              }

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

              const isPremium = user.isPremium === true || user.role === 'superadmin' || user.email === 'ankush.bani@gmail.com';
              const getExpiry = (type) => {
                if (type === 'lead') {
                  return isPremium ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
                }
                return isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
              };

              const quickReplyPayload = event.message?.quick_reply?.payload || event.postback?.payload || null;
              if (quickReplyPayload && quickReplyPayload.startsWith('GET_AUTO_LINK_')) {
                const postId = quickReplyPayload.replace('GET_AUTO_LINK_', '');
                
                const automationsSource = incomingWorkspaceId !== 'main' ? activeWorkspace?.postAutomations : user.postAutomations;
                const matchedRule = automationsSource?.find(r => r.postId === postId);
                
                if (matchedRule && matchedRule.fileUrl) {
                   const linkMsg = `Here is your requested link/file: ${matchedRule.fileUrl}\n\nLet me know if you need anything else!`;
                   if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, linkMsg).catch(e => console.error(e));
                   
                   if (incomingWorkspaceId !== 'main') {
                     await User.updateOne(
                       { _id: user._id, "workspaces._id": incomingWorkspaceId },
                       { $inc: { "workspaces.$.postAutomations.$[elem].stats.clickedCount": 1 } },
                       { arrayFilters: [{ "elem.postId": postId }] }
                     ).catch(e => console.log('Workspace click count increment error:', e.message));
                   } else {
                     await User.updateOne(
                       { _id: user._id, "postAutomations.postId": postId },
                       { $inc: { "postAutomations.$.stats.clickedCount": 1 } }
                     ).catch(e => console.log('Main click count increment error:', e.message));
                   }
                   
                   await Message.create({ userId: user._id, workspaceId: incomingWorkspaceId, customerPhone: `IG_${senderId}`, messageText: linkMsg, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', timestamp: new Date(), expiresAt: getExpiry('junk') });
                   continue; 
                }
              }

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

              const savedIgLead = await Lead.findOneAndUpdate(
                { phoneNumber: `IG_${senderId}`, userId: user._id },
                { 
                  $set: { name: realName },
                  $setOnInsert: Object.assign({ 
                    source: 'Instagram DM', 
                    status: 'visitor', 
                    createdBy: user._id
                  }, getExpiry('junk') ? { expiresAt: getExpiry('junk') } : {}),
                  $push: { timeline: { eventType: 'Instagram DM Received', description: 'Customer sent an Instagram DM', timestamp: new Date() } }
                },
                { upsert: true, returnDocument: 'after' }
              );
              
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

                 await Lead.findOneAndUpdate(
                   { phoneNumber: `IG_${senderId}`, userId: user._id },
                   { $set: { isAiPaused: true, aiPausedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) } }
                 );
                 console.log(`⏸️ [IG Webhook] Owner replied from IG App. AI Paused.`);
                 continue; 
              }

              const currentLeadCheck = await Lead.findOne({ phoneNumber: `IG_${senderId}`, userId: user._id });
              const isCurrentlyPaused = currentLeadCheck && currentLeadCheck.isAiPaused && currentLeadCheck.aiPausedUntil > new Date();
              
              if (isCurrentlyPaused) {
                console.log(`⏸️ [IG Webhook] Human context taken over chat for ${senderId}. Skipping AI.`);
                continue; 
              } else if (currentLeadCheck && currentLeadCheck.isAiPaused) {
                await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { isAiPaused: false, aiPausedUntil: null } });
              }

              const incomingTextLower = incomingText.toLowerCase();
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
                      console.error("❌ [IG Flow DM Error]:", e.message);
                      deliveryStatus = 'failed';
                      displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${e.message}]`;
                  }
                  await Message.create({ userId: user._id, customerPhone: `IG_${senderId}`, messageText: displayMsg, direction: 'outgoing', status: deliveryStatus, sentBy: 'auto-reply', timestamp: new Date(), expiresAt: getExpiry('junk') });
                  if (nodeToPauseAt && flowIdToPauseAt) {
                      await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { activeFlowState: { flowId: flowIdToPauseAt, nodeId: nodeToPauseAt } } }, { strict: false });
                  }
              };

              let flowQuery = { userId: user._id };
              if (incomingWorkspaceId !== 'main') {
                  flowQuery = { userId: user._id, workspaceId: { $in: [incomingWorkspaceId, 'main'] } };
              }
              const userFlows = await Flow.find(flowQuery);

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
                             if (currentLeadCheck.status === 'visitor' && (qLower.includes('brand') || qLower.includes('budget') || qLower.includes('city') || qLower.includes('name'))) {
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
                             const num = parseInt(incomingText.trim(), 10);
                             if (num === 1) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_0');
                             else if (num === 2) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_1');
                             else if (num === 3) chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_2');
                             else chosenEdge = edges.find(e => e.source === activeNode.id && e.sourceHandle === 'opt_0'); 
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
                         if (nextNode.data.leadScore) updateFields.leadScore = parseInt(nextNode.data.leadScore, 10);
                         if (nextNode.data.budget) updateFields.budget = nextNode.data.budget;
                         if (Object.keys(updateFields).length > 0) await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: updateFields }, { strict: false });
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'human_handover' || nextNode.type === 'assign_staff') {
                         await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { isAiPaused: true, aiPausedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) } }, { strict: false });
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'google_sheet') {
                         const freshLead = await Lead.findById(currentLeadCheck._id);
                         googleSheetsController.appendLeadToSheet(user._id, freshLead).catch(e => console.log('Sheets sync error:', e.message));
                         let nextE = edges.find(e => e.source === nextNode.id);
                         currNodeId = nextE ? nextE.target : null;
                       } else if (nextNode.type === 'ai_agent') {
                         await Lead.updateOne({ _id: currentLeadCheck._id }, { $unset: { activeFlowState: 1 } }, { strict: false });
                         if (nextNode.data.message) await sendIGFlowMessage(formatFlowMsg(nextNode.data.message));
                         currNodeId = null; 
                       } else { break; }
                     }
                     flowReplyHandled = true;
                  }
                }
              }

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
                    if (keywords.some(k => incomingTextLower === k || words.includes(k))) {
                      matchedTrigger = trigger;
                      break;
                    }
                  }

                  if (matchedTrigger) {
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
                    break;
                  }
                }
              }

              if (flowReplyHandled) {
                continue; 
              }

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
                      const directLinkMsg = `${matchedAuto.replyMessage}\n\n📄 Link: ${matchedAuto.fileUrl}`;
                      if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, directLinkMsg);
                      await User.updateOne({ _id: user._id, "postAutomations.postId": matchedAuto.postId }, { $inc: { "postAutomations.$.stats.clickedCount": 1 } });
                    }
                    
                    await User.updateOne({ _id: user._id, "postAutomations.postId": matchedAuto.postId }, { $inc: { "postAutomations.$.stats.sentCount": 1 } });
                    await Message.create({ userId: user._id, customerPhone: `IG_${senderId}`, messageText: `[Button Sent] ${matchedAuto.replyMessage}`, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', timestamp: new Date(), expiresAt: getExpiry('junk') });
                  } catch(e) {
                    console.error("Quick Reply DM Error:", e.response?.data || e.message);
                  }
                  continue; 
                }
              }

              const isCreator = user.acceptCollabs === true;
              const isAiEnabled = user.aiAgentEnabled !== false;

              if (!isAiEnabled && ['hi', 'hello', 'hey', 'menu', 'collab'].includes(incomingTextLower)) {
                const menuMessage = isCreator 
                  ? `Hi! 👋 I am the automated manager for ${user.fullName || 'this creator'}.\n\nPlease tell me why you're reaching out (Type a number):\n1️⃣ Brand Promotion / Collaboration\n2️⃣ Just a Fan saying Hi! ❤️\n3️⃣ General Query`
                  : `Hi! 👋 Welcome to ${user.businessName || user.fullName}.\n\nHow can I help you today? (Type a number):\n1️⃣ Order / Buy a Product 🛒\n2️⃣ Customer Support 🎧\n3️⃣ Talk to our Team 👤`;
                  
                let deliveryStatus = 'sent';
                let displayMsg = menuMessage;
                try {
                  if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, menuMessage);
                } catch (apiErr) {
                  deliveryStatus = 'failed';
                  displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${apiErr.message}]`;
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
                continue; 
              }

              if (isCreator && (incomingTextLower === '1' || incomingTextLower.includes('collab') || incomingTextLower.includes('brand') || incomingTextLower.includes('promotion'))) {
                const collabMsg = `Thank you for your interest in collaborating! 🤝 Our team has received your request and will review it soon.`;
                
                let deliveryStatus = 'sent';
                let displayMsg = collabMsg;
                try {
                  if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, collabMsg);
                } catch (apiErr) {
                  deliveryStatus = 'failed';
                  displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${apiErr.message}]`;
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
                
                await Lead.findOneAndUpdate(
                  { phoneNumber: `IG_${senderId}` }, 
                  { 
                    $set: {
                      userId: user._id, 
                      name: `IG User ${senderId}`, 
                      source: 'Instagram DM (Collab)', 
                      status: 'new', 
                      notes: `IG Handle: @${senderId}\nDeal Type: Collab`,
                      expiresAt: getExpiry('lead')
                    }
                  }, 
                  { upsert: true }
                );
                continue; 
              }

              if (isCreator && (incomingTextLower === '2' || incomingTextLower.includes('fan'))) {
                const fanMsg = `Aww! Thank you so much for the love and support! Means the world to me. ❤️✨`;
                
                let deliveryStatus = 'sent';
                let displayMsg = fanMsg;
                try {
                  if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, fanMsg);
                } catch (apiErr) {
                  deliveryStatus = 'failed';
                  displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${apiErr.message}]`;
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
                continue; 
              }

              if (incomingTextLower === '3' || incomingTextLower.includes('general') || incomingTextLower.includes('human') || incomingTextLower.includes('team')) {
                const generalMessage = isCreator ? `Your query has been recorded. Our team will review it shortly.` : `Thanks! I've notified our team. A human representative will get back to you shortly. ⏳`;
                
                let deliveryStatus = 'sent';
                let displayMsg = generalMessage;
                try {
                  if (igToken) await metaAdsService.sendInstagramDM(igToken, senderId, generalMessage);
                } catch (apiErr) {
                  deliveryStatus = 'failed';
                  displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${apiErr.message}]`;
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
                continue; 
              }

              if (isAiEnabled) {
                try {
                  let businessInfo = activeWorkspace ? activeWorkspace.description : (user.businessDescription || "an Instagram Creator");
                  let ownerRules = activeWorkspace ? activeWorkspace.aiRules : (user.aiRules || "Be professional and negotiate politely.");
                  
                  let aiContext = "";
                  
                  if (isCreator) {
                    aiContext = `You are a professional Talent Manager AI for an influencer. 
                    Influencer Details/Media Kit: ${businessInfo}.
                    Rules: ${ownerRules}.
                    IMPORTANT: If the user's message is just "1", start by asking for brand name, deliverables, and budget.`;
                  } else {
                    aiContext = `You are a highly skilled Sales AI Assistant for ${activeWorkspace ? activeWorkspace.name : (user.businessName || 'this business')}. 
                    Business Details/Catalog: ${businessInfo}.
                    Rules: ${ownerRules}.
                    IMPORTANT RULES: ALWAYS ask for Name, City, and WhatsApp Number before requirements tool execution.`;
                  }

                  const aiMessage = await aiService.generateAIResponseWithTools(incomingText, aiContext);
                  let responseMessage = null;

                  if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                    for (const toolCall of aiMessage.tool_calls) {
                      if (toolCall.function.name === "extract_brand_deal" || toolCall.function.name === "extract_lead_requirements") {
                        const dealData = JSON.parse(toolCall.function.arguments);
                        
                        const updatedIgLead = await Lead.findOneAndUpdate(
                          { phoneNumber: `IG_${senderId}` }, 
                          { 
                            $set: {
                              userId: user._id, 
                              name: dealData.name || dealData.brandName || realName || "New Lead", 
                              source: 'Instagram DM (Promotion)', 
                              status: 'interested', 
                              notes: `Deliverables: ${dealData.itemName || dealData.deliverables} | Offered Budget: ${dealData.budget}`,
                              expiresAt: getExpiry('lead')
                            }
                          }, 
                          { upsert: true, returnDocument: 'after' }
                        );
                        
                        googleSheetsController.appendLeadToSheet(user._id, updatedIgLead).catch(e => console.log('Sheets sync error:', e.message));
                        responseMessage = `Thank you! I have noted down the details (Budget: ${dealData.budget}). Forwarded!`;
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
                    } catch (sendErr) {
                      deliveryStatus = 'failed';
                      displayMsg += `\n\n[⚠️ Failed to Send IG DM: ${sendErr.message}]`;
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
                  await Message.create({
                    userId: user._id,
                    customerPhone: `IG_${senderId}`,
                    messageText: `[⚠️ AI System Alert: Failed to generate reply.]`,
                    direction: 'outgoing',
                    status: 'failed',
                    sentBy: 'system',
                    timestamp: new Date()
                  });
                }
              }
            }
          }
        }

        // ==========================================
        // 2. HANDLE COMMENTS (🚀 FIXED STACK LOGIC FOR WORKSPACES)
        // ==========================================
        if (entry.changes && entry.changes[0].field === 'comments') {
          const commentData = entry.changes[0].value;
          const commentText = commentData.text;
          const igUserId = commentData.from.id;
          const username = commentData.from.username || `IG_User_${igUserId}`;
          const mediaId = commentData.media ? commentData.media.id : null;

          console.log(`[Meta Comment (IG/FB)] Received from ${username}: ${commentText}`);

          let user = await User.findOne({
            $or: [
              { "instagramConfig.instagramAccountId": igAccountId },
              { "igConfig.instagramAccountId": igAccountId },
              { "workspaces.instagramConfig.instagramAccountId": igAccountId }
            ]
          });
          
          if (!user) {
             console.log(`❌ [IG Webhook - Comments] No matching Instagram account found in DB for Webhook IG ID: ${igAccountId}`);
             continue;
          }
          
          // Bulletproof runtime workspace identification context
          let incomingWorkspaceId = 'main';
          let activeWorkspaceNode = null;
          let igToken = user.instagramConfig?.accessToken || user.igConfig?.accessToken;

          if (user.workspaces && user.workspaces.length > 0) {
             activeWorkspaceNode = user.workspaces.find(w => w?.instagramConfig?.instagramAccountId === igAccountId);
             if (activeWorkspaceNode?.instagramConfig?.accessToken) {
                igToken = activeWorkspaceNode.instagramConfig.accessToken;
                incomingWorkspaceId = activeWorkspaceNode._id ? activeWorkspaceNode._id.toString() : 'main';
             }
          }

          const isPremium = user.isPremium === true || user.role === 'superadmin' || user.email === 'ankush.bani@gmail.com';
          const getExpiry = (type) => {
            if (type === 'lead') return isPremium ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            return isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
          };

          const phoneRegex = /(?:\+?\d{1,3}[- ]?)?\d{10}/;
          const phoneMatch = commentText.match(phoneRegex);

          if (phoneMatch) {
             const extractedPhone = phoneMatch[0].replace(/\D/g, '');
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

          let matchedRule = null;
          let isPostSpecific = false;
          
          // 🚀 REAL BUG FIXED: Used local isolated workspace nodes context mappings safely!
          const searchRuleSource = incomingWorkspaceId !== 'main' ? activeWorkspaceNode?.postAutomations : user.postAutomations;

          if (searchRuleSource && searchRuleSource.length > 0) {
            if (mediaId) {
              matchedRule = searchRuleSource.find(rule => rule.postId === mediaId && commentText.toLowerCase().includes(rule.triggerWord.toLowerCase()));
              if (matchedRule) isPostSpecific = true;
            }
            if (!matchedRule) {
              matchedRule = searchRuleSource.find(rule => !rule.postId && commentText.toLowerCase().includes(rule.triggerWord.toLowerCase()));
            }
          }

          if (!matchedRule) {
              matchedRule = (user.autoReplies || []).find(rule => commentText.toLowerCase().includes(rule.triggerWord.toLowerCase()));
          }

          if (matchedRule) {
             console.log(`✅ [Instagram Webhook] Token Context Trigger Lock: '${matchedRule.triggerWord}'`);
             let finalReplyMsg = matchedRule.replyMessage;
             if (matchedRule.fileUrl && matchedRule.deliveryMode !== 'button') {
                 finalReplyMsg += `\n\n📄 Here is your link/file: ${matchedRule.fileUrl}`;
             }
             
             if (isPostSpecific) {
               if (incomingWorkspaceId !== 'main') {
                 await User.updateOne(
                   { _id: user._id, "workspaces._id": incomingWorkspaceId },
                   { $inc: { "workspaces.$.postAutomations.$[elem].stats.sentCount": 1 } },
                   { arrayFilters: [{ "elem.postId": mediaId }] }
                 ).catch(e => console.log('Workspace sent count increment error:', e.message));
               } else {
                 await User.updateOne(
                   { _id: user._id, "postAutomations.postId": matchedRule.postId },
                   { $inc: { "postAutomations.$.stats.sentCount": 1 } }
                 ).catch(e => console.log('Main sent count increment error:', e.message));
               }
             }

             let dmSentSuccessfully = false;
             try {
               if (igToken) {
                 if (matchedRule.deliveryMode === 'button') {
                    await axios.post(`https://graph.facebook.com/v19.0/me/messages`, {
                      recipient: { comment_id: commentData.id },
                      message: {
                        text: `${matchedRule.replyMessage}\n\nTap the button below to get your file:`,
                        quick_replies: [{ content_type: "text", title: "Get Link 🔗", payload: `GET_AUTO_LINK_${mediaId}` }]
                      }
                    }, { params: { access_token: igToken }});
                    dmSentSuccessfully = true;
                 } else {
                    await metaAdsService.sendInstagramCommentPrivateReply(igToken, commentData.id, finalReplyMsg);
                    dmSentSuccessfully = true;
                 }
               }
             } catch (replyErr) {
               console.error("❌ [Meta Graph Private Reply Error]:", replyErr.response?.data || replyErr.message);
             }

             if (dmSentSuccessfully) {
               try {
                 await axios.post(`https://graph.facebook.com/v19.0/${commentData.id}/replies`, {
                     message: matchedRule.publicReply || `Hey @${username}, we've sent you a DM with the details! 📩`,
                     access_token: igToken
                 });
               } catch (publicErr) {
                 console.error("❌ [Meta Public Reply Comment Error]:", publicErr.message);
               }
             }
             
             await Message.create({ userId: user._id, workspaceId: incomingWorkspaceId, customerPhone: `IG_${igUserId}`, messageText: `[💬 IG Comment]: ${commentText}`, direction: 'incoming', status: 'received', sentBy: 'customer', tags: ['ig_comment', 'auto_replied'], timestamp: new Date(), expiresAt: getExpiry('junk') });
             await Message.create({ userId: user._id, workspaceId: incomingWorkspaceId, customerPhone: `IG_${igUserId}`, messageText: finalReplyMsg, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', tags: ['ig_private_reply'], timestamp: new Date(), expiresAt: getExpiry('junk') });
          } else {
             if (user.aiAgentEnabled !== false) {
                 try {
                     const aiContext = `You are the friendly social media manager for ${user.businessName || 'this page'}. Reply to this Instagram comment: "${commentText}". Keep it under 15 words.`;
                     const aiReply = await aiService.generateAIResponse(commentText, aiContext);
                     
                     await axios.post(`https://graph.facebook.com/v19.0/${commentData.id}/replies`, {
                         message: aiReply,
                         access_token: igToken
                     });
                     
                     await Message.create({
                       userId: user._id, customerPhone: `IG_${igUserId}`,
                       messageText: `[Public AI Reply]: ${aiReply}`,
                       direction: 'outgoing', status: 'sent', sentBy: 'ai',
                       tags: ['ig_comment_reply'], timestamp: new Date(), expiresAt: getExpiry('junk')
                     });
                 } catch (aiCommentErr) {
                     console.error("❌ [Instagram AI Comment Reply Error]:", aiCommentErr.message);
                 }
             }
             
             await Message.create({
               userId: user._id,
               customerPhone: `IG_${igUserId}`,
               messageText: `[💬 IG Comment - Unhandled]: ${commentText}`,
               direction: 'incoming',
               status: 'received',
               sentBy: 'customer',
               tags: ['ig_comment', 'needs_reply'],
               timestamp: new Date(),
               expiresAt: getExpiry('junk') 
             });
          } 
        } 
      } 
    } 
  } catch (error) {
    console.error('Instagram Webhook Fatal Error:', error);
  }
};