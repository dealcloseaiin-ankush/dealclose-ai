const User = require('../models/userModel');

// @desc    Save User & Integration Settings (WhatsApp, Twilio, Business Info)
// @route   POST /api/users/settings
exports.saveSettings = async (req, res) => {
  try {
    // Assuming req.user is populated by your authentication middleware
    // For MVP/testing, we fallback to a hardcoded user ID if auth is skipped
    const userId = req.user ? req.user.id : "60d0fe4f5311236168a109ca"; 
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