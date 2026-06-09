const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Lead = require('../models/leadModel');

// @desc    Get Instagram Dashboard Analytics
// @route   GET /api/instagram/dashboard
exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(userId).lean();
    
    // Fetch real metrics from DB
    const totalComments = await Message.countDocuments({ userId, tags: { $in: ['ig_comment'] } });
    const dmsSent = await Message.countDocuments({ userId, direction: 'outgoing', customerPhone: { $regex: /^IG_/ } });
    const leadsExtracted = await Lead.countDocuments({ userId, source: { $regex: /Instagram/i } });

    res.status(200).json({
      success: true,
      stats: {
        totalCommentsAnalyzed: totalComments,
        leadsExtracted: leadsExtracted,
        dmsSent: dmsSent,
        whatsappConversationsStarted: 0, // Tracked later if IG to WA redirection happens
        conversionRate: leadsExtracted > 0 && dmsSent > 0 ? ((leadsExtracted / dmsSent) * 100).toFixed(1) + '%' : '0%'
      },
      config: {
        aiSmartReply: user?.aiAgentEnabled !== false,
        autoDmOnComment: true,
        extractPhoneNumbers: true,
        forceWhatsappRedirect: true
      },
      igLeads: await Lead.find({ userId, source: { $regex: /Instagram/i } }).sort({ createdAt: -1 }).limit(5),
      recentPosts: [], // Requires Content Publishing API (Future scope)
      commentGroups: [] // Requires advanced grouping logic (Future scope)
    });
  } catch (error) {
    console.error("IG Dashboard Error:", error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};