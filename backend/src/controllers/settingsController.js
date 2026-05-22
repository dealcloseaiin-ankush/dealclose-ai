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
    console.log(`\n➡️ [DEBUG Settings Update] Request received!`);
    console.log(`➡️ [DEBUG] Auth Header:`, req.headers.authorization ? 'Present' : 'Missing');
    console.log(`➡️ [DEBUG] req.user object:`, req.user);

    const userId = req.user?._id || req.user?.id; 
    if (!userId) {
      console.log('❌ [DEBUG Settings Update] Failed: Unauthorized Session. No user ID.');
      return res.status(401).json({ success: false, message: 'Unauthorized Session' });
    }

    const updates = req.body;
    console.log("➡️ [Settings Update] Payload Received:", JSON.stringify(updates));

    // Pehle existing user fetch kar lo taaki purana data (jaise access token) delete na ho
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updateData = {};

    if (updates.ownerPhone !== undefined) updateData.ownerPhone = updates.ownerPhone;
    if (updates.pinCode !== undefined) updateData.servedPinCodes = [updates.pinCode];
    if (updates.businessDesc !== undefined) updateData.businessDescription = updates.businessDesc;
    if (updates.businessDescription !== undefined) updateData.businessDescription = updates.businessDescription;
    if (updates.businessName !== undefined) updateData.businessName = updates.businessName.trim() === '' ? 'Main Business' : updates.businessName;
    if (updates.aiRules !== undefined) updateData.aiRules = updates.aiRules;
    if (updates.fallbackAction !== undefined) updateData.fallbackAction = updates.fallbackAction;
    if (updates.aiAgentEnabled !== undefined) updateData.aiAgentEnabled = updates.aiAgentEnabled;
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

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { $set: updateData }, 
      { returnDocument: 'after', upsert: true, strict: false }
    ).lean();
    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Save Settings Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Automated Meta Embedded Signup Callback (Tech Provider Setup)
// @route   POST /api/users/settings/meta-connect
exports.connectMetaAccount = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized Session' });

    // Frontend SDK will send these details after the Meta popup flow is completed
    const { accessToken, wabaId, phoneNumberId } = req.body;

    if (!accessToken || !phoneNumberId) {
      return res.status(400).json({ success: false, message: 'Missing Meta credentials from Embedded Signup.' });
    }

    // Save the credentials securely to the user's dashboard
    const updateData = {
      whatsappConfig: {
        accessToken: accessToken,
        phoneNumberId: phoneNumberId,
        wabaId: wabaId || ''
      }
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).lean();

    // Optional: Send a welcome message via WhatsApp using the new credentials
    // await whatsappService.sendTextMessage(accessToken, phoneNumberId, updatedUser.ownerPhone, "🎉 Your WhatsApp API is now connected to DealClose AI!");

    console.log(`✅ [Meta Onboarding] Account connected successfully for User: ${userId}`);
    res.status(200).json({ success: true, message: 'WhatsApp API connected successfully!', user: updatedUser });
  } catch (error) {
    console.error('Meta Connect Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};