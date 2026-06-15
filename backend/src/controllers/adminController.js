const User = require('../models/userModel');
const Lead = require('../models/leadModel');
const Message = require('../models/messageModel');

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

    res.status(200).json({ success: true, stats: { totalUsers, totalLeads, totalMessages }, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};