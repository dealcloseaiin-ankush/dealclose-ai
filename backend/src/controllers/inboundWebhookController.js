const Lead = require('../models/leadModel');
const User = require('../models/userModel');
const whatsappService = require('../services/whatsappService');

// @desc    Handle Inbound Leads from Zapier/Pabbly/Indiamart
// @route   POST /api/webhooks/inbound/:userId
exports.handleZapierPabbly = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, email, source, customMessage } = req.body;

    if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Invalid API Key / User ID' });

    // 1. Create Lead in DealClose CRM
    const lead = await Lead.findOneAndUpdate(
      { phoneNumber: phone, userId },
      { $set: { name, email, source: source || 'API / Zapier Integration', status: 'new' } },
      { upsert: true, new: true }
    );

    // 2. Auto WhatsApp Message Trigger
    if (user.whatsappConfig && user.whatsappConfig.accessToken) {
      const msg = customMessage || `Hi ${name}, thank you for your interest! How can we help you today?`;
      let formattedPhone = phone.replace(/\D/g, '');
      if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
      await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, formattedPhone, msg).catch(e => console.log('WA Send Error:', e.message));
    }
    res.status(200).json({ success: true, message: 'Lead captured and WhatsApp triggered!', lead });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};