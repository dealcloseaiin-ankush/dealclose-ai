const AiUsageLog = require('../models/aiUsageLogModel');

// @desc    Get AI usage logs and billing summary for the logged-in user
// @route   GET /api/billing/summary
exports.getBillingSummary = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

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
        },
      },
    ]);

    res.status(200).json({
      success: true,
      summary: summary[0] || { totalTokens: 0, totalUserCost: 0 },
      logs: recentLogs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};