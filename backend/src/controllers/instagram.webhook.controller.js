const aiService = require('../services/aiService');
const Lead = require('../models/leadModel');

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

          console.log(`[Instagram Comment] Received: ${commentText}`);

          const analysis = await aiService.analyzeSocialMediaComment(commentText);

          if (analysis.intent === 'high' || analysis.intent === 'medium') {
            if (analysis.hasPhoneNumber && analysis.phoneNumber) {
              await Lead.create({
                name: `IG User ${igUserId}`,
                phoneNumber: analysis.phoneNumber,
                source: 'Instagram Comment',
                status: 'interested',
                notes: `Commented on post: "${commentText}". Interested in: ${analysis.productMentioned}`
              });
            } else {
              const waLink = `https://wa.me/919876543210?text=Hi,%20I%20saw%20your%20Instagram%20post%20about%20${encodeURIComponent(analysis.productMentioned || 'your products')}`;
              const dmMessage = `Hi there! 👋 You asked about our post. To give you the best price and catalog, connect with our AI assistant on WhatsApp here: ${waLink}`;
              console.log(`💬 Sending IG DM to ${igUserId}: ${dmMessage}`);
            }
          } else {
            await Lead.create({
              name: `IG User ${igUserId}`,
              phoneNumber: 'N/A',
              source: 'Instagram Unhandled',
              status: 'ignored',
              notes: commentText
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