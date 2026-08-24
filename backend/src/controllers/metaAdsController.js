const metaAdsService = require('../services/metaAdsService');
const User = require('../models/userModel');

// @desc    Create a Meta Custom Audience from CRM leads
// @route   POST /api/meta-ads/create-audience
exports.createAudience = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { audienceName, description, leadStatus } = req.body;

    if (!audienceName || !leadStatus) {
      return res.status(400).json({ success: false, message: 'Audience Name and Lead Status are required.' });
    }

    const user = await User.findById(userId).lean();
    const adAccountId = user?.metaAdsConfig?.adAccountId;
    const accessToken = user?.metaAdsConfig?.accessToken;

    if (!adAccountId || !accessToken) {
      return res.status(400).json({ success: false, message: 'Meta Ads account is not connected.' });
    }

    const result = await metaAdsService.createCustomAudience(adAccountId, accessToken, audienceName, description, leadStatus);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all connected Meta Ad Accounts
// @route   GET /api/meta-ads/accounts
exports.getAdAccounts = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const user = await User.findById(userId).lean();
    const accessToken = user?.metaAdsConfig?.accessToken || user?.facebookAccessToken || user?.instagramAccessToken;

    if (!accessToken) {
      return res.status(200).json({ success: true, accounts: [] });
    }

    const accounts = await metaAdsService.getAdAccounts(accessToken);
    res.status(200).json({ success: true, accounts: accounts || [] });
  } catch (error) {
    console.error('Meta Ad Accounts Controller Error:', error.message);
    res.status(200).json({ success: true, accounts: [] });
  }
};