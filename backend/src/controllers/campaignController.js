const Campaign = require('../models/campaignModel');

// @desc    Get all campaigns
// @route   GET /api/campaigns
exports.getCampaigns = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const campaigns = await Campaign.find({ userId }).sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Get Campaigns Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create and start a new campaign
// @route   POST /api/campaigns
exports.createCampaign = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { name, targetAudience, templateName } = req.body;

    const newCampaign = await Campaign.create({
      userId,
      name,
      templateName: templateName || 'Default Template',
      targetAudience: targetAudience ? [targetAudience] : ['All'],
      status: 'running' // Automatically setting to running for MVP
    });

    res.status(201).json({ success: true, data: newCampaign });
  } catch (error) {
    console.error('Create Campaign Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};