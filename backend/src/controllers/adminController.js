const User = require('../models/userModel');
const Lead = require('../models/leadModel');
const Message = require('../models/messageModel');
const AiUsageLog = require('../models/aiUsageLogModel'); // 🚀 NEW: Import AI Usage Log

// @desc    Get complete system stats for Super Admin
// @route   GET /api/admin/stats
exports.getSystemStats = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const user = await User.findById(userId);
    
    // Security Check: Only allow owner/superadmin
    if (!user || (user.email !== 'ankush.bani@gmail.com' && user.role !== 'superadmin')) {
       return res.status(403).json({ success: false, message: 'Forbidden. Super Admin access required.' });
    }

    const totalUsers = await User.countDocuments();
    const users = await User.find().select('fullName email businessName aiCredits createdAt role').sort({ createdAt: -1 }).lean();
    const totalLeads = await Lead.countDocuments();
    const totalMessages = await Message.countDocuments();

    // 🚀 NEW: Aggregate financial data from AI Usage Logs
    const financialStats = await AiUsageLog.aggregate([
      {
        $group: {
          _id: null,
          totalPlatformCost: { $sum: '$internalCost' }, // Hamara kharch
          totalRevenue: { $sum: '$userCost' },         // User se kamai
          totalTokens: { $sum: '$totalTokens' }
        }
      }
    ]);

    // 🚀 NEW: Aggregate daily financial data for the chart
    const dailyFinancials = await AiUsageLog.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: '$userCost' },
          cost: { $sum: '$internalCost' }
        }
      },
      { $sort: { _id: 1 } }, // Sort by date
      { $project: { date: '$_id', revenue: 1, cost: 1, _id: 0 } }
    ]);

    const financials = financialStats[0] || { totalPlatformCost: 0, totalRevenue: 0, totalTokens: 0 };
    financials.totalProfit = financials.totalRevenue - financials.totalPlatformCost;
    
    res.status(200).json({ success: true, stats: { totalUsers, totalLeads, totalMessages, ...financials }, users, dailyFinancials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};