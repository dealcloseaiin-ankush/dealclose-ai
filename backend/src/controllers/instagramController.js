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