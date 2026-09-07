const AiUsageLog = require('../models/aiUsageLogModel');
const User = require('../models/userModel');

// @desc    Get AI usage logs and billing summary for the logged-in user
// @route   GET /api/billing/summary
exports.getBillingSummary = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('freeAiTokens totalAiTokensUsed totalAiCost walletBalance aiCredits fullName businessName').lean();

    // Fetch recent 100 logs for detailed view
    const recentLogs = await AiUsageLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Aggregate total cost and tokens
    const summary = await AiUsageLog.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$totalTokens' },
          totalUserCost: { $sum: '$userCost' },
          totalInternalCost: { $sum: '$internalCost' },
        },
      },
    ]);

    const aggregateSummary = summary[0] || { totalTokens: 0, totalUserCost: 0, totalInternalCost: 0 };

    res.status(200).json({
      success: true,
      summary: {
        totalTokens: user?.totalAiTokensUsed || aggregateSummary.totalTokens,
        totalUserCost: user?.totalAiCost || aggregateSummary.totalUserCost,
        freeAiTokensRemaining: user?.freeAiTokens !== undefined ? user.freeAiTokens : 50000,
        walletBalance: user?.walletBalance || 0,
        aiCredits: user?.aiCredits || 0,
      },
      logs: recentLogs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};