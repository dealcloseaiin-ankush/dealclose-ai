const axios = require('axios'); // 🛠️ BUG FIX: axios was used in many places below (search_external_catalog, real-estate tools, publish_blog, etc.) but was never imported. This caused a silent ReferenceError crash on every one of those AI tool calls.
const aiService = require('../services/aiService');
const whatsappService = require('../services/whatsappService');
const ocrService = require('../services/ocrService');
const Lead = require('../models/leadModel');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const callService = require('../services/callService');
const billing = require('../utils/billing');
const metaAdsService = require('../services/metaAdsService');
const { getMessageExpiry } = require('../utils/retentionPolicy'); // 🚀 NEW: Centralized policy
const Flow = require('../models/flowModel');
const googleSheetsController = require('./googleSheetsController');
const GeneratedPost = require('../models/GeneratedPostModel'); // 🚀 NEW: Auto-Marketer DB
const instagramService = require('../services/instagramService'); // 🚀 NEW: IG Publisher
const { automationQueue } = require('../workers/automationWorker'); // 🚀 FIX: Import Queue to prevent ReferenceError crash

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
        
        // 🚀 SAFEGUARD: Meta sends Account Update events (like MM_LITE_TERMS_SIGNED) without metadata
        if (!value.metadata || !value.metadata.phone_number_id) {
          if (value.event) {
            console.log(`ℹ️ [WhatsApp Webhook] Received Meta Account Update Event: ${value.event}. Safely ignoring.`);
          }
          continue; // Skip processing as a message
        }

        const phoneNumberId = value.metadata.phone_number_id;
        // 🚀 FIX: Search for user in both the main config and inside workspaces
        const user = await User.findOne({
          $or: [
            { "whatsappConfig.phoneNumberId": phoneNumberId },
            { "workspaces.whatsappConfig.phoneNumberId": phoneNumberId }
          ]
        });
        
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
          
          // 🚀 NEW: Update Message Status for Ticks (Sent, Delivered, Read)
          if (['sent', 'delivered', 'read'].includes(statusStr)) {
            // 🛠️ BUG FIX: added userId scope — without it, this could match & silently
            // overwrite another business's message status for a customer with the same phone number.
            await Message.findOneAndUpdate(
              { userId: user._id, customerPhone: value.statuses[0].recipient_id, direction: 'outgoing' },
              { $set: { status: statusStr } },
              { sort: { _id: -1 } } // Sabse latest message ko update karega
            );
          }

          // Agar 24-hour rule ya kisi aur wajah se fail ho jaye
          if (statusStr === 'failed') {
             const failReason = value.statuses[0].errors?.[0]?.error_data?.details || 'Unknown';
             console.error(`❌ [Webhook] Message Failed to send. Reason: ${failReason}`);
             if (failReason.includes('24 hours')) console.error(`🔍 [DEBUG RULE]: Remember, the customer must message your number first to start the 24-hour clock.`);
             // Aap message ka status database me update kar sakte hain
             // 🛠️ BUG FIX: added userId scope for the same cross-tenant reason as above.
             await Message.findOneAndUpdate(
               { userId: user._id, customerPhone: value.statuses[0].recipient_id, status: 'sent' },
               { $set: { status: 'failed', messageText: `[⚠️ Failed: 24-Hour Window Closed]` } },
               { sort: { timestamp: -1 } } // Update the latest message
             );
          }
          await user.save();
        }

        // 2. CHECK FOR INCOMING MESSAGES
        if (value.messages && value.messages.length > 0) {
          const msg = value.messages[0];
          // 🚀 DEBUG LOG: Check what ID Meta is sending for Instagram
          if (changes.field === 'instagram') {
            console.log(`[DEBUG INSTAGRAM ID] Meta sent PSID: ${msg.from} for entry ID: ${entry.id}`);
          }
          const fromNumber = msg.from;
          console.log(`➡️ [Webhook] New message from: ${fromNumber}, Type: ${msg.type}`);
          console.log(`✅ [24-HOUR WINDOW OPENED] Customer ${fromNumber} just sent a message. You can now send free-form replies via dashboard for the next 24 hours!`);
          
          // 🚀 NEW: Meta Ad Click Tracking (Attribution)
          let adReferral = null;
          if (msg.referral) {
            adReferral = msg.referral; 
            console.log(`🎯 [Ad Tracking] Customer came from Meta Ad! Source ID: ${adReferral.source_id}`); 
          } 
          try { 
            let savedLead = await Lead.findOne({ phoneNumber: fromNumber, userId: user._id });
            if (!savedLead) {
              const leadCount = await Lead.countDocuments({ userId: user._id });
              const seqId = String(leadCount + 1).padStart(4, '0');
              
              // 🚀 SMART LEAD SOURCE: Attach Ad Name if they came from Meta Ads
              const leadSource = adReferral ? `Meta Ad (${adReferral.headline || 'Click-to-WA'})` : 'WhatsApp Inbound';
              
              savedLead = await Lead.create({
                userId: user._id, phoneNumber: fromNumber, name: `User #${seqId}`,
                source: leadSource, status: 'new', createdBy: user._id,
                customFields: adReferral ? {
                  adId: String(adReferral.source_id || ''),
                  adHeadline: String(adReferral.headline || ''),
                  sourceUrl: String(adReferral.source_url || '')
                } : {},
                timeline: [
                  { eventType: 'Lead Created', description: 'Lead auto-captured from WhatsApp Inbound', timestamp: new Date() },
                  { eventType: 'WhatsApp Conversation Started', description: 'Customer initiated a new WhatsApp chat', timestamp: new Date() },
                  ...(adReferral ? [{ eventType: 'Ad Click Tracking', description: `Customer clicked Meta Ad: ${adReferral.headline}`, timestamp: new Date() }] : []),
                ]
              });
            } else if (adReferral) {
               // 🚀 UPDATE EXISTING LEAD: If old customer clicks a new Ad!
               const newSource = `Meta Ad (${adReferral.headline || 'Click-to-WA'})`; 
               await Lead.updateOne({ _id: savedLead._id }, { $set: { source: newSource, "customFields.adId": String(adReferral.source_id || ''), "customFields.adHeadline": String(adReferral.headline || ''), "customFields.sourceUrl": String(adReferral.source_url || '') }, $push: { timeline: { eventType: 'Ad Click Tracking', description: `Customer re-engaged via Meta Ad: ${adReferral.headline}`, timestamp: new Date() } } });
            }
            
            // 🚀 NEW: Auto-Sync New WhatsApp Leads to Google Sheets
            googleSheetsController.appendLeadToSheet(user._id, savedLead).catch(e => console.log('Sheets sync error:', e.message));
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
            await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: `[Received Catalog Order] -> Replied asking for address.`, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', expiresAt: getMessageExpiry(user, 'whatsapp') });
            continue;
          }

          if (msg.type === 'image') {
            const mediaId = msg.image.id;
            await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, "I received your image! Let me read the list using AI for you... ⏳");

            try {
              const { buffer, mimeType } = await whatsappService.downloadMedia(user.whatsappConfig.accessToken, mediaId);
              const extractedData = await ocrService.extractTextFromImage(buffer, mimeType || 'image/jpeg', user._id);

              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, `*Here is what I read from your list:*\n\n${extractedData}\n\nWould you like me to create an order or quotation for these items?`);
              await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: "[AI Vision Extracted Data]", direction: 'outgoing', status: 'sent', sentBy: 'ai', expiresAt: getMessageExpiry(user, 'whatsapp') });
            } catch (err) {
              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, "Sorry, I couldn't read the image properly right now. Could you please type it out?");
            }
            continue; 
          }

          if (msg.type === 'interactive') {
            const interactiveType = msg.interactive.type;
            let selectedContext = interactiveType === 'list_reply' ? msg.interactive.list_reply.id : msg.interactive.button_reply.id;
            let buttonTitle = interactiveType === 'list_reply' ? msg.interactive.list_reply.title : msg.interactive.button_reply.title;
            
            // 🚀 SMART ROUTING: Agar Flow ya AI ka button click kiya hai, toh usko text banakar Flow Engine me bhej do!
            if (selectedContext.startsWith('flow_opt_') || selectedContext.startsWith('ai_btn_')) {
              msg.type = 'text';
              msg.text = { body: buttonTitle };
              console.log(`🔘 [Interactive Button] Converted button click '${buttonTitle}' to text for Flow/AI Engine.`);
              // Yahan 'continue' nahi lagayenge, taaki code niche 'msg.type === text' wale block me ja sake!
            } else {
            
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
            await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: responseMessage, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', expiresAt: getMessageExpiry(user, 'whatsapp') });
            continue;
            }
          }

          if (msg.type === 'text') {
            const incomingText = msg.text.body.trim();
            let responseMessage = null;
            let repliedBy = 'ai';

            const isOwnerOrStaff = (user.ownerPhone && user.ownerPhone.replace(/\D/g,'') === fromNumber) || (user.staff && user.staff.some(s => s.phone && s.phone.replace(/\D/g,'') === fromNumber));
            
            // ==========================================================
            // 🚀 NEW: AUTO-MARKETER APPROVAL LOGIC (For Business Owner)
            // ==========================================================
            const incomingTextUpper = incomingText.toUpperCase();
            if (isOwnerOrStaff) {
              // 🚀 FIX: Save owner's message first, then process special commands or AI reply, then STOP.
              await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: incomingText, direction: 'incoming', status: 'received', sentBy: 'staff', expiresAt: getMessageExpiry(user, 'whatsapp') });

              if (incomingTextUpper.startsWith('APPROVE ')) {
              const postIdShort = incomingTextUpper.split(' ')[1];
              
              if (postIdShort && postIdShort.length === 6) {
                const postToApprove = await GeneratedPost.findOne({ 
                  _id: { $regex: `${postIdShort}$`, $options: 'i' },
                  status: 'pending_approval'
                });

                if (postToApprove) {
                  try {
                    const igSettings = user.instagramConfig || user.igConfig || {};
                    const igAccountId = igSettings.instagramAccountId || igSettings.accountId;
                    
                    if (!igAccountId || !igSettings.accessToken) {
                      await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, `❌ Instagram account is not connected properly. Please reconnect from your Dashboard Settings.`);
                      continue;
                    }

                    await instagramService.publishInstagramPost(igAccountId, igSettings.accessToken, postToApprove.imageUrl, postToApprove.caption);

                    postToApprove.status = 'posted';
                    postToApprove.postedAt = new Date();
                    await postToApprove.save();

                    await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, `✅ Success! Your AI-generated post has been published to your Instagram feed.`);
                    continue; // 🚀 Stop execution here!
                  } catch (publishError) {
                    postToApprove.status = 'failed';
                    postToApprove.feedback = publishError.message;
                    await postToApprove.save();
                    await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, `❌ Oops! Error publishing to Instagram: ${publishError.message}`);
                    continue; // 🚀 Stop execution here!
                  }
                }
              }
            }
              const adminContext = `You are the backend AI assistant for the business owner. The owner is texting you. You can help them manage leads, send bulk templates, or give stats. Answer professionally as their personal AI manager.`;
              const aiAdminResponse = await aiService.generateAIResponse(incomingText, adminContext);
              console.log(`✅ [DEBUG] Owner/Staff message detected. Sending AI Admin reply.`);
              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, `🤖 *DealClose AI Admin:*\n\n${aiAdminResponse}`);
              continue; // 🚀 FIX: Stop processing here to prevent owner messages from triggering customer flows.
            }

            console.log(`💾 [DEBUG] Saving incoming message to database...`);
            // 🚀 FIX: This now only runs for customers, as owner/staff messages are handled above.
            const incomingMsg = await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: incomingText, direction: 'incoming', status: 'received', sentBy: 'customer', expiresAt: getMessageExpiry(user, 'whatsapp') });
            console.log(`✅ [DEBUG] Message saved with ID: ${incomingMsg._id}`);

            // 🚀 NEW: Broadcast the incoming message to all connected chat dashboards
            const wssChat = req.app.get('wssChat');
            if (wssChat) {
              wssChat.clients.forEach(client => {
                if (client.readyState === require('ws').OPEN) {
                  client.send(JSON.stringify({ type: 'NEW_MESSAGE', payload: incomingMsg }));
                  console.log(`📡 [DEBUG] Broadcasting new message via WebSocket to a connected client.`);
                }
              });
            }
            
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
              await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: "[Sent Interactive Main Menu]", direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', expiresAt: getMessageExpiry(user, 'whatsapp') });
                continue; 
            }

            // 🚀 ZERO-COST AI FEEDBACK CAPTURE (Catching 1-5 Ratings)
            if (currentLeadCheck && currentLeadCheck.awaitingFeedback) {
              const ratingMatch = incomingText.match(/^[1-5]$/);
              if (ratingMatch || incomingTextLower.includes('star')) {
                const ratingStr = ratingMatch ? ratingMatch[0] : (incomingText.match(/[1-5]/) ? incomingText.match(/[1-5]/)[0] : '5');
                const rating = parseInt(ratingStr);
                const logMsg = `[Customer Feedback] Rated AI Assistant: ${rating} Stars ⭐`;
                
                const existingNotes = currentLeadCheck.notes || "";
                await Lead.updateOne({ _id: currentLeadCheck._id }, { 
                  $set: { awaitingFeedback: false, aiFeedbackScore: rating, notes: existingNotes ? `${existingNotes}\n${logMsg}` : logMsg }
                }, { strict: false });
                
                let replyMsg = `Thank you for your feedback (${rating} ⭐)! We are constantly learning to serve you better. Have a great day!`;
                
                // 🚀 SMART UPSELL: If they gave 4 or 5 stars, ask for a Google Review!
                const googleReviewLink = user.digitalCardConfig?.googleReview;
                if (rating >= 4 && googleReviewLink) {
                   replyMsg = `Thank you for the amazing ${rating}⭐ rating! 🎉\n\nSince you had a great experience, it would mean the world to us if you could take 10 seconds to rate our business on Google:\n${googleReviewLink}\n\nHave a wonderful day! 🙏`;
                }

                await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, replyMsg);
                await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: replyMsg, direction: 'outgoing', status: 'sent', sentBy: 'system', expiresAt: getMessageExpiry(user, 'whatsapp') });
                continue; // 🚀 Skip AI completely to save tokens!
              } else {
                // Not a rating, just turn off the flag and process normally via AI
                await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { awaitingFeedback: false } }, { strict: false });
              }
            }

            // 🚀 ZERO-COST LEAD CAPTURE (Bypass AI to save Name/City & AI Cost)
            if (currentLeadCheck && currentLeadCheck.name && currentLeadCheck.name.startsWith('User ') && incomingText.length > 2 && incomingText.length < 60 && isNaN(incomingText)) {
              const extractedName = incomingText.trim();
              let finalName = extractedName;
              let finalCity = null;
              if (extractedName.includes(',')) {
                const parts = extractedName.split(',');
                finalName = parts[0].trim();
                finalCity = parts.slice(1).join(' ').trim();
              } else {
                const words = extractedName.split(/\s+/);
                if (words.length >= 3) {
                  finalCity = words.pop();
                  finalName = words.join(' ');
                } else {
                  finalName = extractedName;
                }
              }
              const idMatch = currentLeadCheck.name.match(/(?:#|ID:\s*)(\d+)/i);
              const seqId = idMatch ? `#${idMatch[1]}` : `#${fromNumber.slice(-4)}`;
              const newName = `${finalName} (${seqId})`;
              const updatePayload = { name: newName };
              if (finalCity) updatePayload.city = finalCity;
              
              await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: updatePayload });

              let responseMessage = `Thank you, ${finalName.split(' ')[0]}! ✅ Your details are saved.\n\nHow can I assist you further today?`;
              
              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, responseMessage);
              await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: responseMessage, direction: 'outgoing', status: 'sent', sentBy: 'system', expiresAt: getMessageExpiry(user, 'whatsapp') });
              continue; // 🚀 Skip AI completely to save tokens!
            }

            // ==========================================================
            // 🚀 NEW: FLOW EXECUTION ENGINE (Stateful Automation System)
            // ==========================================================
            let flowReplyHandled = false;
            
            // 🚀 NEW: Dynamic Variable Replacer (e.g. {{name}})
            const formatFlowMsg = (text) => {
              if (!text) return "";
              let cName = (currentLeadCheck && currentLeadCheck.name && !currentLeadCheck.name.startsWith('User ')) ? currentLeadCheck.name.split(' ')[0] : '';
              return text.replace(/\{\{name\}\}/gi, cName ? cName : 'there');
            };
            
            // Workspace routing for Flows
            const workspaceIdToUse = (currentLeadCheck && currentLeadCheck.lastSelectedWorkspaceId) ? currentLeadCheck.lastSelectedWorkspaceId : 'main';
            
            let flowQuery = { userId: user._id };
            if (workspaceIdToUse !== 'main') {
               flowQuery.workspaceId = workspaceIdToUse;
            }
            const userFlows = await Flow.find(flowQuery);

            // STEP 1: Check if customer is currently inside an active "Ask Question" Flow block
            if (currentLeadCheck && currentLeadCheck.activeFlowState && currentLeadCheck.activeFlowState.flowId) {
              const activeFlow = userFlows.find(f => f._id.toString() === currentLeadCheck.activeFlowState.flowId);
              if (activeFlow && activeFlow.flowData) {
                const nodes = activeFlow.flowData.nodes || [];
                const edges = activeFlow.flowData.edges || [];
                const questionNode = nodes.find(n => n.id === currentLeadCheck.activeFlowState.nodeId);

                if (questionNode) {
                   let chosenEdge = null;
                   
                   if (questionNode.type === 'askQuestion') {
                       if (questionNode.data.replyType === 'open') {
                         // 🚀 SYSTEM ZERO-COST PARSER: Extract Name/City without AI!
                         const existingNotes = currentLeadCheck.notes || "";
                         const newNote = `Flow Answer (${questionNode.data.question}): ${incomingText}`;
                         let setPayload = { notes: existingNotes ? `${existingNotes}\n${newNote}` : newNote };
                         const qText = (questionNode.data.question || '').toLowerCase();
                         
                         if (qText.includes('name') && qText.includes('city')) {
                             const parts = incomingText.split(/[\s,]+/);
                             const idMatch = currentLeadCheck.name ? currentLeadCheck.name.match(/(?:#|ID: )\d+/) : null;
                             const seqId = idMatch ? idMatch[0].replace('ID: ', '#') : `#${fromNumber.slice(-4)}`;
                             if (parts.length >= 2) {
                                 setPayload.name = `${parts[0]} (${seqId})`;
                                 setPayload.city = parts.slice(1).join(' ');
                             } else {
                                 setPayload.name = `${incomingText.trim()} (${seqId})`;
                             }
                         } else if (qText.includes('name') && incomingText.length < 50) {
                             const idMatch = currentLeadCheck.name ? currentLeadCheck.name.match(/(?:#|ID: )\d+/) : null;
                             const seqId = idMatch ? idMatch[0].replace('ID: ', '#') : `#${fromNumber.slice(-4)}`;
                             setPayload.name = `${incomingText.trim()} (${seqId})`;
                         } else if ((qText.includes('city') || qText.includes('location')) && incomingText.length < 50) {
                             setPayload.city = incomingText.trim();
                         }
                         if (qText.includes('email') && incomingText.includes('@')) {
                             setPayload.email = incomingText.trim();
                         }
                         
                         await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: setPayload }, { strict: false });
                         chosenEdge = edges.find(e => e.source === questionNode.id && e.sourceHandle === 'replied');
                       } else {
                         // Yes / No Choice Evaluator
                         if (['yes', 'y', 'ha', 'haan', 'han'].includes(incomingTextLower)) {
                           chosenEdge = edges.find(e => e.source === questionNode.id && e.sourceHandle === 'yes');
                         } else if (['no', 'n', 'na', 'nahi', 'nahin'].includes(incomingTextLower)) {
                           chosenEdge = edges.find(e => e.source === questionNode.id && e.sourceHandle === 'no');
                         } else {
                           chosenEdge = edges.find(e => e.source === questionNode.id && e.sourceHandle === 'other');
                         }
                       }
                   } else if (questionNode.type === 'menu') {
                       const incLower = incomingText.toLowerCase();
                       if (questionNode.data.opt1 && incLower === questionNode.data.opt1.toLowerCase()) chosenEdge = edges.find(e => e.source === questionNode.id && e.sourceHandle === 'opt_0');
                       else if (questionNode.data.opt2 && incLower === questionNode.data.opt2.toLowerCase()) chosenEdge = edges.find(e => e.source === questionNode.id && e.sourceHandle === 'opt_1');
                       else if (questionNode.data.opt3 && incLower === questionNode.data.opt3.toLowerCase()) chosenEdge = edges.find(e => e.source === questionNode.id && e.sourceHandle === 'opt_2');
                       else {
                           const num = parseInt(incomingText.trim());
                           if (num === 1) chosenEdge = edges.find(e => e.source === questionNode.id && e.sourceHandle === 'opt_0');
                           else if (num === 2) chosenEdge = edges.find(e => e.source === questionNode.id && e.sourceHandle === 'opt_1');
                           else if (num === 3) chosenEdge = edges.find(e => e.source === questionNode.id && e.sourceHandle === 'opt_2');
                       }
                   }

                   // Clear the waiting state since user has replied
                   await Lead.updateOne({ _id: currentLeadCheck._id }, { $unset: { activeFlowState: 1 } }, { strict: false });

                   // Move to the next connected node
                   let currNodeId = chosenEdge ? chosenEdge.target : null;
                   while (currNodeId) {
                     const nextNode = nodes.find(n => n.id === currNodeId);
                     if (!nextNode) break;
                     
                     const currentFlowId = activeFlow._id.toString();

                     if (nextNode.type === 'message') {
                       const msgText = formatFlowMsg(nextNode.data.message || nextNode.data.label);
                       await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, msgText); 
                      await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: msgText, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', expiresAt: getMessageExpiry(user, 'whatsapp') });
                       
                       let nextE = edges.find(e => e.source === nextNode.id);
                       currNodeId = nextE ? nextE.target : null;
                     } else if (nextNode.type === 'askQuestion') {
                       const msgText = formatFlowMsg(nextNode.data.question || nextNode.data.label);
                       await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, msgText); 
                      await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: msgText, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', expiresAt: getMessageExpiry(user, 'whatsapp') });
                       
                       await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { activeFlowState: { flowId: currentFlowId, nodeId: nextNode.id } } }, { strict: false });
                       currNodeId = null; 
                     } else if (nextNode.type === 'menu') {
                       const msgText = formatFlowMsg(nextNode.data.message || "Please choose an option:");
                       const options = [nextNode.data.opt1, nextNode.data.opt2, nextNode.data.opt3].filter(opt => opt && opt.trim() !== '');
                       
                       if (options.length > 0) {
                         const buttons = options.map((opt, idx) => ({
                           type: "reply",
                           reply: { id: `flow_opt_${idx}`, title: opt.substring(0, 20) }
                         }));
                         
                         await whatsappService.sendInteractiveMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, { type: "button", body: { text: msgText }, action: { buttons } });
                        await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: `[Sent Menu]: ${msgText}`, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', expiresAt: getMessageExpiry(user, 'whatsapp') });
                         await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { activeFlowState: { flowId: currentFlowId, nodeId: nextNode.id } } }, { strict: false });
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
                       if (user.ownerPhone) await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, user.ownerPhone, `🚨 *Human Handover Request*\nCustomer ${fromNumber} requested staff assistance from the automated flow.`);
                       let nextE = edges.find(e => e.source === nextNode.id);
                       currNodeId = nextE ? nextE.target : null;
                     } else if (nextNode.type === 'google_sheet') {
                       const freshLead = await Lead.findById(currentLeadCheck._id);
                       googleSheetsController.appendLeadToSheet(user._id, freshLead).catch(e => console.log('Sheets flow sync error:', e.message));
                       let nextE = edges.find(e => e.source === nextNode.id);
                       currNodeId = nextE ? nextE.target : null;
                     } else if (nextNode.type === 'ai_agent') {
                       await Lead.updateOne({ _id: currentLeadCheck._id }, { $unset: { activeFlowState: 1 } }, { strict: false });
                       if (nextNode.data.message) {
                           const msgText = formatFlowMsg(nextNode.data.message);
                           await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, msgText);
                       }
                       currNodeId = null; // End flow, pass to AI
                     } else {
                       break;
                     }
                   }
                   flowReplyHandled = true;
                }
              }
            }

            // STEP 2: Check for Keyword Triggers (If not already inside an active flow)
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
                  // 🚀 SMART KEYWORD MATCHING
                  if (keywords.some(k => incomingTextLower === k || words.includes(k))) {
                    matchedTrigger = trigger;
                    break;
                  }
                }

                if (matchedTrigger) {
                  console.log(`[Flow Engine] 🚀 Trigger matched in Flow: ${flow.name}`);
                  let nextEdge = edges.find(e => e.source === matchedTrigger.id);
                  let currNodeId = nextEdge ? nextEdge.target : null;
                  
                  while (currNodeId) {
                     const nextNode = nodes.find(n => n.id === currNodeId);
                     if (!nextNode) break;
                     
                     const currentFlowId = flow._id.toString();

                     if (nextNode.type === 'message') {
                       const msgText = formatFlowMsg(nextNode.data.message || nextNode.data.label);
                       await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, msgText); 
                      await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: msgText, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', expiresAt: getMessageExpiry(user, 'whatsapp') });
                       
                       let nextE = edges.find(e => e.source === nextNode.id);
                       currNodeId = nextE ? nextE.target : null;
                     } else if (nextNode.type === 'askQuestion') {
                       const msgText = formatFlowMsg(nextNode.data.question || nextNode.data.label);
                       await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, msgText); 
                      await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: msgText, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', expiresAt: getMessageExpiry(user, 'whatsapp') });
                       
                       await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { activeFlowState: { flowId: currentFlowId, nodeId: nextNode.id } } }, { strict: false });
                       currNodeId = null; 
                     } else if (nextNode.type === 'menu') {
                       const msgText = formatFlowMsg(nextNode.data.message || "Please choose an option:");
                       const options = [nextNode.data.opt1, nextNode.data.opt2, nextNode.data.opt3].filter(opt => opt && opt.trim() !== '');
                       
                       if (options.length > 0) {
                         const buttons = options.map((opt, idx) => ({
                           type: "reply",
                           reply: { id: `flow_opt_${idx}`, title: opt.substring(0, 20) }
                         }));
                         
                         await whatsappService.sendInteractiveMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, { type: "button", body: { text: msgText }, action: { buttons } });
                        await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: `[Sent Menu]: ${msgText}`, direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', expiresAt: getMessageExpiry(user, 'whatsapp') });
                         await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { activeFlowState: { flowId: currentFlowId, nodeId: nextNode.id } } }, { strict: false });
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
                       if (user.ownerPhone) await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, user.ownerPhone, `🚨 *Human Handover Request*\nCustomer ${fromNumber} requested staff assistance from the automated flow.`);
                       let nextE = edges.find(e => e.source === nextNode.id);
                       currNodeId = nextE ? nextE.target : null;
                     } else if (nextNode.type === 'google_sheet') {
                       const freshLead = await Lead.findById(currentLeadCheck._id);
                       googleSheetsController.appendLeadToSheet(user._id, freshLead).catch(e => console.log('Sheets flow sync error:', e.message));
                       let nextE = edges.find(e => e.source === nextNode.id);
                       currNodeId = nextE ? nextE.target : null;
                     } else if (nextNode.type === 'ai_agent') {
                       await Lead.updateOne({ _id: currentLeadCheck._id }, { $unset: { activeFlowState: 1 } }, { strict: false });
                       if (nextNode.data.message) {
                           const msgText = formatFlowMsg(nextNode.data.message);
                           await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, msgText);
                       }
                       currNodeId = null; // AI Takes over
                     } else {
                       break;
                     }
                  }
                  flowReplyHandled = true;
                  break; // Stop checking other flows
                }
              }
            }

            if (flowReplyHandled) {
              continue; // 🚀 Flow Engine handled this, Skip the Heavy AI!
            }
            // ==========================================================

            // ==========================================================
            // 🚀 FALLBACK: DYNAMIC MAIN MENU & ZERO-COST LEAD CAPTURE
            // (This runs ONLY if no custom Flow matched the user's input)
            // ==========================================================
            if (['hi', 'hello', 'hey', 'menu', 'options', 'help'].includes(incomingTextLower)) {
              let menuRows = [
                { 
                  id: `workspace_default`, 
                  title: (user.businessName || "Main Business").substring(0, 24), 
                  // ⚠️ FIX: Text cutoff problem handled gracefully with "..."
                  description: (user.businessDescription || "Explore our products and services").length > 69 
                                ? (user.businessDescription || "Explore our products and services").substring(0, 69) + '...'
                                : (user.businessDescription || "Explore our products and services")
                }
              ];
              
              if (user.workspaces && user.workspaces.length > 0) {
                const validWs = user.workspaces.filter(w => w && w.name && w.name.trim() !== '');
                if (validWs.length > 0) {
                  const wsRows = validWs.map(w => ({
                    id: `workspace_${w._id}`, 
                    title: w.name.substring(0, 24), 
                    description: (w.description || "View our services").length > 69
                                  ? (w.description || "View our services").substring(0, 69) + '...'
                                  : (w.description || "View our services")
                  }));
                  menuRows = [...menuRows, ...wsRows];
                }
              } 
              
              menuRows = menuRows.slice(0, 10);

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
                action: { button: "Select Business", sections: [{ title: "Our Divisions", rows: menuRows }] }
              };
              await whatsappService.sendInteractiveMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, interactiveObj);
              await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: "[Sent Interactive Main Menu]", direction: 'outgoing', status: 'sent', sentBy: 'auto-reply', expiresAt: getMessageExpiry(user, 'whatsapp') });
              continue; 
            }

            if (currentLeadCheck && currentLeadCheck.name && currentLeadCheck.name.startsWith('User ') && incomingText.length > 2 && incomingText.length < 60 && isNaN(incomingText)) {
              const extractedName = incomingText.trim();
              const newName = `${extractedName} (ID: ${fromNumber.slice(-4)})`;
              await Lead.updateOne({ _id: currentLeadCheck._id }, { $set: { name: newName } });
              let responseMessage = `Thank you, ${extractedName.split(' ')[0]}! ✅ Your details are saved.\n\nHow can I assist you further today?`;
              if (user.businessName && user.businessName.toLowerCase().includes('dealclose')) {
                 responseMessage = `Thanks ${extractedName.split(' ')[0]}! ✅\n\nI am DealClose AI. I can automate your WhatsApp, Instagram, and Voice Calls to save your time & money.\n\nWould you like to:\n1️⃣ Start a 14-Day Free Trial\n2️⃣ Know more about features\n3️⃣ See Pricing (Reply with number)`;
              }
              
              // 🚀 SMART LINKS INJECTION (For Zero-Cost Welcome)
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

              await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, responseMessage);
              await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: responseMessage, direction: 'outgoing', status: 'sent', sentBy: 'system', expiresAt: getMessageExpiry(user, 'whatsapp') });
              continue; 
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
              
              try {
                // Har SaaS User ka apna personal AI context! 
                let businessInfo = user.businessDescription || "a modern business";
                let ownerRules = user.aiRules || "Be polite, helpful, and professional.";
                
                let activeApiUrl = user.externalApiUrl;
                let activeApiToken = user.externalApiToken;
                let activeSearchUrl = user.externalApiSearchUrl;
                let activePostUrl = user.externalApiPostUrl;
                let activeBlogUrl = user.externalApiBlogUrl;
                let activeVisitUrl = user.externalApiVisitUrl;

                // Check if customer ne koi specific business select kiya tha
                const lead = await Lead.findOne({ phoneNumber: fromNumber, userId: user._id });
                if (lead && lead.lastSelectedWorkspaceId) {
                  const selectedWs = user.workspaces.find(ws => ws._id.toString() === lead.lastSelectedWorkspaceId);
                  if (selectedWs) {
                    console.log(`🧠 [AI Context] Using Workspace Brain: ${selectedWs.name}`);
                    businessInfo = selectedWs.businessDescription || businessInfo;
                    ownerRules = selectedWs.aiRules || ownerRules;
                    if (selectedWs.externalApiUrl) activeApiUrl = selectedWs.externalApiUrl;
                    if (selectedWs.externalApiToken) activeApiToken = selectedWs.externalApiToken;
                    if (selectedWs.externalApiSearchUrl) activeSearchUrl = selectedWs.externalApiSearchUrl;
                    if (selectedWs.externalApiPostUrl) activePostUrl = selectedWs.externalApiPostUrl;
                    if (selectedWs.externalApiBlogUrl) activeBlogUrl = selectedWs.externalApiBlogUrl;
                    if (selectedWs.externalApiVisitUrl) activeVisitUrl = selectedWs.externalApiVisitUrl;
                  }
                }

                // CHECK IF WE ALREADY KNOW THE CUSTOMER'S NAME
                const isNameKnown = lead && lead.name && !lead.name.startsWith('User ');
                const customerNameContext = isNameKnown ? lead.name : "Unknown";
                const customerNotesContext = lead && lead.notes ? lead.notes : "No previous history.";

                let aiContext = `You are a highly efficient AI assistant for ${user.fullName}'s business. \nBusiness details: ${businessInfo}.\n\nSTRICT OWNER RULES:\n${ownerRules}\n\nCUSTOMER INFO:\nName: ${customerNameContext}\nCustomer History/Notes: ${customerNotesContext}\n\nCRITICAL BEHAVIOR RULES:\n1. Review the Customer History/Notes. If they answered bot questions (like City, Buyer or Seller), use that context to personalize your reply.\n2. Be EXTREMELY concise, fast, and to the point. Do not write long paragraphs.\n3. Do NOT engage in irrelevant, personal, or non-business small talk.\n4. ALWAYS use the 'send_whatsapp_menu' tool for multiple-choice questions.\n5. LEAD CAPTURE: If the user provides new details, use the 'update_customer_profile' tool.\nIf you don't know the answer, use the 'escalate_to_staff' tool.`;
                
                // Fair Usage Policy: If 80% of the 1000 credit pack is consumed (<= 200 left), force shorter replies
                if (user.aiCredits > 0 && user.aiCredits <= 200) {
                  aiContext += "\n\n⚠️ BUDGET LIMIT ACTIVE: Provide short answers (1-2 sentences max), but ALWAYS ensure the sentence finishes completely.";
                }
                
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
                    
                    DEALCLOSE AI FEATURES TO PITCH:
                    1. WhatsApp & Instagram Automation (Auto-reply, Flow Builder, Lead Capture).
                    2. Multi-Staff Shared Inbox: Mention that multiple staff members can use just ONE WhatsApp number to manage high message volumes easily!
                    
                    PRICING TO PITCH:
                    - WhatsApp Solo (1 Business, 1 User): ₹199/mo
                    - WhatsApp Team (1 Business, Multi-Staff): ₹499/mo
                    - WhatsApp Multi-Brand (Multi-Business, Multi-Staff): ₹999/mo
                    - 🎁 SPECIAL OFFER: Tell them if they use the referral code 'AI499' during checkout/onboarding, they will get 3 MONTHS of subscription for just ₹499!
                    
                    CRITICAL RULES:
                    1. Always reply in the EXACT same language the user is speaking (Hindi, Hinglish, English).
                    2. NEVER cut off your message in the middle. Always provide a full, complete sentence.`;
                }
                
                const aiMessage = await aiService.generateAIResponseWithTools(incomingText, aiContext, "whatsapp", user.customWebhooks, user._id);
              
                if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                  for (const toolCall of aiMessage.tool_calls) {
                    if (toolCall.function.name === "extract_lead_requirements") {
                      const leadData = JSON.parse(toolCall.function.arguments);
                      
                      const updateFields = { 
                        userId: user._id, 
                        createdBy: user._id,
                        source: leadData.category || 'WhatsApp AI', 
                        status: leadData.status ? leadData.status.toLowerCase() : "warm", 
                        notes: `Interested in: ${leadData.itemName} | Budget: ${leadData.budget}` 
                      };
                      
                      if (leadData.leadScore !== undefined) updateFields.leadScore = leadData.leadScore;
                      if (leadData.nextFollowUpDate) updateFields.nextFollowUpDate = new Date(leadData.nextFollowUpDate);
                      if (leadData.budget) updateFields.budget = leadData.budget;
                      if (leadData.customerType) updateFields.customerType = leadData.customerType;
                      
                      const updatedLead = await Lead.findOneAndUpdate({ phoneNumber: fromNumber, userId: user._id }, { $set: updateFields }, { returnDocument: 'after', upsert: true });
                      
                      googleSheetsController.appendLeadToSheet(user._id, updatedLead).catch(e => console.log('Sheets sync error:', e.message));
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
                        await Lead.findOneAndUpdate(
                          { phoneNumber: fromNumber, userId: user._id },
                          { $push: { timeline: { eventType: 'Quotation Sent', description: `Shared catalog options for "${searchData.searchQuery}"`, timestamp: new Date() } } }
                        );
                      } else {
                        responseMessage = `I checked our catalog, but I couldn't find an exact match for "${searchData.searchQuery}". Please let me know if you are looking for something else.`;
                      }
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "search_external_catalog") {
                      const searchData = JSON.parse(toolCall.function.arguments);
                      const searchEndpoint = activeSearchUrl || activeApiUrl;
                      if (searchEndpoint) {
                        try {
                          const headers = {};
                          if (activeApiToken) {
                            headers['Authorization'] = `Bearer ${activeApiToken}`;
                            headers['x-api-key'] = activeApiToken;
                          }
                          const response = await axios.get(`${searchEndpoint}?query=${encodeURIComponent(searchData.searchQuery)}`, { headers });
                          const products = response.data.products || response.data.items || response.data.data || [];
                          
                          if (products.length > 0) {
                            const productList = products.slice(0, 3).map((p, i) => `*${i+1}. ${p.name || p.title}*\n💰 ₹${p.price}\n🔗 ${p.url || p.link || 'Link not available'}`).join('\n\n');
                            responseMessage = `Here are the top options from our website:\n\n${productList}\n\nWould you like to know more or add them to your cart?`;
                            await Lead.findOneAndUpdate(
                              { phoneNumber: fromNumber, userId: user._id },
                              { $push: { timeline: { eventType: 'Quotation Sent', description: `Shared external catalog for "${searchData.searchQuery}"`, timestamp: new Date() } } }
                            );
                          } else {
                            responseMessage = `I checked our store, but couldn't find an exact match for "${searchData.searchQuery}".`;
                          }
                        } catch (apiErr) {
                          console.error('External API Error:', apiErr.message);
                          responseMessage = `Oops! API connection me kuch dikkat aayi. Kripya check karein ki aapka URL (${searchEndpoint}) sahi hai ya nahi.\nError: ${apiErr.message}`;
                        }
                      } else {
                        responseMessage = `Maaf kijiye, Website Search API URL configured nahi hai. Kripya Dashboard Settings mein isey set karein.`;
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
                      const currentLeadForId = await Lead.findOne({ phoneNumber: fromNumber, userId: user._id });
                      const idMatch = currentLeadForId && currentLeadForId.name ? currentLeadForId.name.match(/(?:#|ID:\s*)(\d+)/i) : null;
                      const seqId = idMatch ? `#${idMatch[1]}` : `#${fromNumber.slice(-4)}`;
                      const newName = `${profileData.fullName || 'Customer'} ${seqId}`;
                      
                      const updateFields = { name: newName };
                      if (profileData.email) updateFields.email = profileData.email;
                      if (profileData.city) updateFields.city = profileData.city;
                      if (profileData.businessType) updateFields.businessType = profileData.businessType;
                      
                      // CRM Extra Fields Extracted by AI
                      if (profileData.status) updateFields.status = profileData.status.toLowerCase();
                      if (profileData.leadScore !== undefined) updateFields.leadScore = profileData.leadScore;
                      if (profileData.nextFollowUpDate) updateFields.nextFollowUpDate = new Date(profileData.nextFollowUpDate);
                      if (profileData.budget) updateFields.budget = profileData.budget;
                      if (profileData.customerType) updateFields.customerType = profileData.customerType;
                      
                      const aiLog = `[AI Assistant] Updated Profile - Name: ${profileData.fullName || 'N/A'}${profileData.city ? ', City: ' + profileData.city : ''}${profileData.email ? ', Email: ' + profileData.email : ''}`;

                      await Lead.findOneAndUpdate(
                        { phoneNumber: fromNumber, userId: user._id }, 
                        { $set: updateFields }
                      );
                      
                      responseMessage = `Thanks, ${profileData.fullName}! I've updated your profile. How can I help you today?`;
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "update_lead_status") {
                      const statusData = JSON.parse(toolCall.function.arguments);
                      // 🛠️ BUG FIX (critical, multi-tenant leak): the filter did not include userId,
                      // only the $set did. Mongo would find ANY lead across ALL businesses with this
                      // phoneNumber and re-assign its userId to the current business, hijacking it.
                      await Lead.findOneAndUpdate({ phoneNumber: fromNumber, userId: user._id }, { status: statusData.status, userId: user._id }, { returnDocument: 'after', upsert: true });
                      
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
                    } else if (toolCall.function.name === "post_lead_to_connected_platform") {
                      const platformData = JSON.parse(toolCall.function.arguments);
                      try {
                        if (platformData.platformName.toLowerCase().includes('newpropertyhub') || activeApiUrl) {
                          const leadPayload = JSON.parse(platformData.leadDetails);
                          const leadEndpoint = activeApiUrl ? `${activeApiUrl.replace(/\/$/, '')}/api/properties/whatsapp-bot-lead` : 'https://newpropertyhub.in/api/properties/whatsapp-bot-lead';
                          
                          // Send lead directly to External CRM API
                          await axios.post(leadEndpoint, {
                            name: leadPayload.name || 'WhatsApp User',
                            phone: fromNumber,
                            city: leadPayload.city || 'Unknown',
                            source: 'DealClose AI WhatsApp'
                          }, { headers: { 
                            'x-api-key': activeApiToken || process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024',
                            'Authorization': `Bearer ${activeApiToken || process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024'}`
                          } });
                          
                          responseMessage = `✅ Aapki details humari property team ke paas NewPropertyHub par secure tarike se save ho gayi hain.\n\nKaisi property dekhna pasand karenge aap?`;
                        }
                      } catch (err) {
                        console.error('NPH Lead Sync Error:', err.message);
                        responseMessage = `Aapki details note kar li gayi hain! Ab batayein, aapko kis type ki property ki talash hai?`;
                      }
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "mark_lead_as_lost_and_share") {
                      const data = JSON.parse(toolCall.function.arguments);
                      // 🛠️ BUG FIX: added userId scope — previously this matched by phoneNumber alone
                      // and could mark another business's lead as 'lost'.
                      await Lead.findOneAndUpdate({ phoneNumber: fromNumber, userId: user._id }, { status: 'lost', notes: `Lost reason: ${data.reason}` });
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
                      
                      const menuText = menuData.messageText.includes('🤖') ? menuData.messageText : `🤖 ` + menuData.messageText;

                      await whatsappService.sendInteractiveMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, {
                        type: "button",
                        body: { text: menuText },
                        action: { buttons }
                      });
                      
                      responseMessage = null; // Prevent sending duplicate text
                      repliedBy = 'ai';
                      await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: `[Interactive AI Question]: ${menuText}`, direction: 'outgoing', status: 'sent', sentBy: 'ai', expiresAt: getMessageExpiry(user, 'whatsapp') });
                    } else if (toolCall.function.name === "search_real_estate_properties") {
                      const searchData = JSON.parse(toolCall.function.arguments);
                      const propertiesEndpoint = activeSearchUrl || (activeApiUrl ? `${activeApiUrl.replace(/\/$/, '')}/api/properties` : 'https://newpropertyhub.in/api/properties');
                      try {
                        let apiUrl = searchData.lat && searchData.lng 
                          ? `${propertiesEndpoint}/nearby?lat=${searchData.lat}&lng=${searchData.lng}&radius=10`
                          : `${propertiesEndpoint}?keyword=${searchData.location || ''}&maxPrice=${searchData.maxPrice || ''}&propertyType=${searchData.propertyType || ''}`;
                        
                        const response = await axios.get(apiUrl, { headers: { 
                          'x-api-key': activeApiToken || process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024',
                          'Authorization': `Bearer ${activeApiToken || process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024'}`
                        } });
                        const properties = response.data.properties || response.data.data || []; 
                        
                        if (properties.length > 0) {
                          const propList = properties.slice(0, 3).map((p, i) => `*${i+1}. ${p.title}*\n💰 ₹${p.price}\n📍 ${p.city}\n🔗 https://newpropertyhub.in/property/${p._id}`).join('\n\n');
                          responseMessage = `Mujhe aapke liye kuch behtareen properties mili hain:\n\n${propList}\n\nKya aap inme se kisi property ki Site Visit book karna chahenge? Mujhe bas property number batayein!`;
                        } else {
                          responseMessage = `Maafi chahunga, filhal is criteria mein koi properties available nahi hain. Kya aap thoda budget ya location change karke dekhna chahenge?`;
                        }
                      } catch (apiErr) {
                        console.error('NPH API Error:', apiErr.message);
                        responseMessage = `Data fetch karne me error aayi. Aapka URL (${propertiesEndpoint}) connect nahi ho paa raha hai. \nError: ${apiErr.message}`;
                      }
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "list_real_estate_property") {
                      const propData = JSON.parse(toolCall.function.arguments);
                      const postEndpoint = activePostUrl || (activeApiUrl ? `${activeApiUrl.replace(/\/$/, '')}/api/properties/quick-post` : 'https://newpropertyhub.in/api/properties/quick-post');
                      try {
                        await axios.post(postEndpoint, {
                          ...propData,
                          clientPhone: fromNumber, 
                          source: 'DealClose AI WhatsApp'
                        }, { headers: { 
                          'x-api-key': activeApiToken || process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024',
                          'Authorization': `Bearer ${activeApiToken || process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024'}`
                        } });
                        responseMessage = `✅ Badhai ho! Aapki property *"${propData.title}"* NewPropertyHub par safaltapurvak list ho gayi hai!\n\nHumaare buyers ab ise dekh sakte hain. Koi inquiry aane par hum aapko turant WhatsApp par notify karenge.`;
                      } catch (apiErr) {
                         console.error('NPH Post Error:', apiErr.message);
                         responseMessage = `Property list karte waqt error aayi. Kripya check karein ki aapka Quick Post URL (${postEndpoint}) sahi se kaam kar raha hai.\nError: ${apiErr.message}`;
                      }
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "schedule_property_visit") {
                      const visitData = JSON.parse(toolCall.function.arguments);
                      const visitEndpointBase = activeVisitUrl || (activeApiUrl ? `${activeApiUrl.replace(/\/$/, '')}/api/properties` : 'https://newpropertyhub.in/api/properties');
                      const visitEndpoint = activeVisitUrl ? activeVisitUrl : `${visitEndpointBase}/${visitData.propertyId}/schedule-visit`;
                      try {
                        await axios.post(visitEndpoint, {
                          clientPhone: fromNumber,
                          visitDate: visitData.visitDate
                        }, { headers: { 
                          'x-api-key': activeApiToken || process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024',
                          'Authorization': `Bearer ${activeApiToken || process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024'}`
                        } });
                        responseMessage = `📅 Perfect! Aapki site visit *${visitData.visitDate}* ke liye book ho gayi hai. Property owner ko notify kar diya gaya hai. Vo jald hi aapse coordinate karenge!`;
                      } catch (apiErr) {
                         console.error('NPH Visit Error:', apiErr.message);
                         responseMessage = `Visit schedule karne me connection error aayi. URL: ${visitEndpoint}\nError: ${apiErr.message}`;
                      }
                      repliedBy = 'ai';
                    } else if (toolCall.function.name === "publish_blog") {
                      const blogData = JSON.parse(toolCall.function.arguments);
                      const blogEndpoint = activeBlogUrl || (activeApiUrl ? `${activeApiUrl.replace(/\/$/, '')}/api/posts/external-blog` : 'https://newpropertyhub.in/api/posts/external-blog');
                      try {
                        await axios.post(blogEndpoint, {
                          title: blogData.title,
                          content: blogData.content,
                          city: blogData.city || '',
                          source: 'DealClose AI WhatsApp',
                          authorPhone: fromNumber
                        }, { headers: { 
                          'x-api-key': activeApiToken || process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024',
                          'Authorization': `Bearer ${activeApiToken || process.env.NPH_API_KEY || 'DealClose-Secret-Key-2024'}`
                        } });
                        responseMessage = `✅ Aapka blog post "${blogData.title}" website par live kar diya gaya hai! Maine AI-generated image aur us sheher ki properties bhi attach kar di hain.`;
                      } catch (apiErr) {
                         console.error('NPH Blog Post Error:', apiErr.message);
                         responseMessage = `Blog publish karte waqt error aayi. Kripya check karein ki Publish Blog URL (${blogEndpoint}) sahi hai.\nError: ${apiErr.message}`;
                      }
                      repliedBy = 'ai';
                    }
                  }
                } else {
                  responseMessage = aiMessage.content;
                }
              } catch (aiError) {
                console.error("❌ [AI API Error]:", aiError.message || aiError);
                responseMessage = "🙏 Maafi chahenge, abhi humara AI system thoda busy hai ya network issue hai. Hum jald hi aapse contact karenge!";
                repliedBy = 'system';
              }
              } 
            }

            if (responseMessage) {
              try {
                // 🤖 Automatically add Robot Emoji if the message is from AI and doesn't already have it
                if (repliedBy === 'ai' && !responseMessage.includes('🤖')) {
                  responseMessage = `🤖 ` + responseMessage;
                }

                await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, fromNumber, responseMessage);
                await Message.create({ userId: user._id, customerPhone: fromNumber, channel: 'whatsapp', messageText: responseMessage, direction: 'outgoing', status: 'sent', sentBy: repliedBy, expiresAt: getMessageExpiry(user, 'whatsapp') });
                
                // 🚀 SMART DELAYED FEEDBACK: Only trigger if AI actually replied!
                if (repliedBy === 'ai') {
                  try {
                    if (automationQueue) await automationQueue.add('ask_feedback', { phone: fromNumber, userId: user._id }, { delay: 22 * 60 * 60 * 1000, jobId: `feedback_${user._id}_${fromNumber}` });
                  } catch(e) { console.error("Queue feedback error", e.message); }
                }
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

// @desc    Handle Meta App Deauthorization
// @route   POST /api/webhooks/meta-deauthorize
exports.handleMetaDeauthorize = async (req, res) => {
  try {
    console.log("➡️ [Meta Webhook] User deauthorized the app.");
    // Meta sends a signed_request in req.body. For MVP, we just acknowledge it.
    res.status(200).send("Deauthorization recorded");
  } catch (error) {
    console.error("Deauth Error:", error);
    res.status(500).send("Server Error");
  }
};

// @desc    Handle Meta Data Deletion Request
// @route   POST /api/webhooks/meta-data-deletion
exports.handleMetaDataDeletion = async (req, res) => {
  try {
    console.log("➡️ [Meta Webhook] Data deletion request received.");
    
    // Meta requires us to return a JSON response with a status URL and a confirmation code
    res.status(200).json({
      url: "https://dealclose-ai.onrender.com/data-deletion", 
      confirmation_code: "DEL-" + Date.now()
    });
  } catch (error) {
    console.error("Data Deletion Error:", error);
    res.status(500).send("Server Error");
  }
};