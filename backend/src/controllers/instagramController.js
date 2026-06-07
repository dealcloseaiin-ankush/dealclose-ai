const User = require('../models/userModel');

// @desc    Get Instagram Dashboard Analytics
// @route   GET /api/instagram/dashboard
exports.getDashboardData = async (req, res) => {
  try {
    // Dummy data to prevent 404 errors on the frontend until full logic is implemented
    res.status(200).json({
      success: true,
      stats: {
        totalCommentsAnalyzed: 0,
        leadsExtracted: 0,
        dmsSent: 0,
        whatsappConversationsStarted: 0,
        conversionRate: '0%'
      },
      config: {
        aiSmartReply: true,
        autoDmOnComment: false,
        extractPhoneNumbers: true,
        forceWhatsappRedirect: true
      },
      igLeads: [],
      recentPosts: [],
      commentGroups: []
    });
  } catch (error) {
    console.error("IG Dashboard Error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Verify Meta Webhook
// @route   GET /api/instagram/webhook
exports.verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = 'ankush@7828289433';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ [IG Webhook] Verified successfully!');
      return res.status(200).send(challenge);
    }
  }
  return res.status(403).send('Forbidden');
};

// @desc    Receive Instagram Messages/Comments from Meta
// @route   POST /api/instagram/webhook
exports.handleWebhook = async (req, res) => {
  const body = req.body;

  if (body.object === 'instagram' || body.object === 'page') {
    // Return 200 OK immediately to Meta to prevent retries
    res.status(200).send('EVENT_RECEIVED');

    // Temporary basic logging. Next step will be passing this to AI!
    console.log('\n📥 [IG Webhook] Received Event from Meta:', JSON.stringify(body, null, 2));
  } else {
    res.sendStatus(404);
  }
};