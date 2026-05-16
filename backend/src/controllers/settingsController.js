const User = require('../models/userModel');

// @desc    Get User Settings
// @route   GET /api/users/settings
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized Session' });

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
    const userId = req.user?._id || req.user?.id; 
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized Session' });

    const updates = req.body;
    console.log("➡️ [Settings Update] Payload Received:", JSON.stringify(updates));

    // Pehle existing user fetch kar lo taaki purana data (jaise access token) delete na ho
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updateData = {};

    if (updates.ownerPhone !== undefined) updateData.ownerPhone = updates.ownerPhone;
    if (updates.pinCode !== undefined) updateData.servedPinCodes = [updates.pinCode];
    if (updates.businessDesc !== undefined) updateData.businessDescription = updates.businessDesc;
    if (updates.businessUrls !== undefined) updateData.businessUrls = updates.businessUrls;
    
    // Save multiple Workspaces/Businesses
    if (updates.workspaces !== undefined) {
      // Filter out any empty rows just to be safe
      updateData.workspaces = updates.workspaces.filter(w => w.name && w.name.trim() !== '');
      
      // Note: Mongoose automatically generates a unique _id for each item 
      // inside an array of subdocuments when we save it!
    }

    // Merge existing whatsappConfig with new updates (Overwrites old data securely)
    const currentWaConfig = user.whatsappConfig || {};
    let newWaConfig = null;

    // Meta / WhatsApp Config - FIXED FRONTEND PAYLOAD MAPPING
    if (updates.whatsappConfig) {
      newWaConfig = {
        accessToken: updates.whatsappConfig.accessToken || currentWaConfig.accessToken,
        phoneNumberId: updates.whatsappConfig.phoneNumberId || currentWaConfig.phoneNumberId,
        wabaId: updates.whatsappConfig.wabaId || currentWaConfig.wabaId
      };
    } else if (updates.whatsappToken || updates.phoneNumberId || updates.wabaId) {
      newWaConfig = {
        accessToken: updates.whatsappToken || currentWaConfig.accessToken,
        phoneNumberId: updates.phoneNumberId || currentWaConfig.phoneNumberId,
        wabaId: updates.wabaId || currentWaConfig.wabaId
      };
    }

    if (newWaConfig) {
      updateData.whatsappConfig = newWaConfig;
    }

    // Twilio Config - FIXED FRONTEND PAYLOAD MAPPING
    const currentTwilioConfig = user.twilioConfig || {};
    let newTwilioConfig = null;

    if (updates.twilioConfig) {
      newTwilioConfig = { 
        accountSid: updates.twilioConfig.sid || currentTwilioConfig.accountSid, 
        authToken: updates.twilioConfig.authToken || currentTwilioConfig.authToken, 
        phoneNumber: updates.twilioConfig.phone || currentTwilioConfig.phoneNumber 
      };
    } else if (updates.twilioSid || updates.twilioAuthToken || updates.twilioPhone) {
      newTwilioConfig = { 
        accountSid: updates.twilioSid || currentTwilioConfig.accountSid, 
        authToken: updates.twilioAuthToken || currentTwilioConfig.authToken, 
        phoneNumber: updates.twilioPhone || currentTwilioConfig.phoneNumber 
      };
    }

    if (newTwilioConfig) {
      updateData.twilioConfig = newTwilioConfig;
    }

    // Digital Card Config
    if (updates.digitalCardConfig) {
      updateData.digitalCardConfig = updates.digitalCardConfig;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, upsert: true });
    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Save Settings Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};