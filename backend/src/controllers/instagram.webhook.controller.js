const aiService = require('../services/aiService');
const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Lead = require('../models/leadModel'); // Lead model import kiya gaya

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