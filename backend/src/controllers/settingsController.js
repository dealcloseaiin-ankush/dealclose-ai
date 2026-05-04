const User = require('../models/userModel');

// @desc    Get User Settings
// @route   GET /api/users/settings
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save User & Integration Settings (WhatsApp, Twilio, Business Info)
// @route   POST /api/users/settings
exports.saveSettings = async (req, res) => {
  try {
    const userId = req.user._id; 
    const updates = req.body;

    const updateData = {
      ownerPhone: updates.ownerPhone,
      servedPinCodes: updates.pinCode ? [updates.pinCode] : [],
      businessDescription: updates.businessDesc,
      businessUrls: updates.businessUrls || [],
    };

    // Meta / WhatsApp Config
    if (updates.whatsappToken || updates.phoneNumberId || updates.wabaId) {
      updateData.whatsappConfig = {
        accessToken: updates.whatsappToken,
        phoneNumberId: updates.phoneNumberId,
        wabaId: updates.wabaId
      };
    }

    // Twilio Config
    if (updates.twilioSid) {
      updateData.twilioConfig = { accountSid: updates.twilioSid, authToken: updates.twilioAuthToken, phoneNumber: updates.twilioPhone };
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true, upsert: true });
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Save Settings Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};