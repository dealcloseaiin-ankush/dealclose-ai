const Lead = require('../models/leadModel');
const User = require('../models/userModel');
const whatsappService = require('../services/whatsappService');

// @desc    Handle Inbound Leads from Zapier/Pabbly/Indiamart (🚀 UPGRADED: WORKSPACE AWARE MULTI-TENANT FUNNEL)
// @route   POST /api/webhooks/inbound/:userId
exports.handleZapierPabbly = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, email, source, customMessage, workspaceId } = req.body; // 🚀 FIX: Reading workspaceId context from inbound body payload

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Invalid API Key / User ID' });
    }

    const currentWorkspaceId = workspaceId || 'main';

    // 1. Create Lead in DealClose CRM with Dynamic Workspace Mapping
    const leadData = { 
      name, 
      email, 
      source: source || 'API / Zapier Integration', 
      status: 'new' 
    };

    // Agar sub-workspace ki lead hai, toh tracking workspace structure update lock karenge
    if (currentWorkspaceId !== 'main') {
      leadData.workspaceId = currentWorkspaceId;
    }

    const lead = await Lead.findOneAndUpdate(
      { phoneNumber: phone, userId },
      { $set: leadData },
      { upsert: true, new: true }
    );

    // 2. 🚀 SMART ROUTING: WhatsApp Config Picker Logic (Main vs Sub-Branch Dedicated Numbers)
    let targetWhatsappConfig = user.whatsappConfig;

    if (currentWorkspaceId !== 'main' && user.workspaces) {
      const activeBranch = user.workspaces.find(w => String(w._id) === String(currentWorkspaceId));
      // Agar branch ke paas khud ka dedicated WhatsApp token hai, toh use pick karo, nahi toh main number par routing fallback karo
      if (activeBranch && activeBranch.whatsappConfig?.accessToken) {
        targetWhatsappConfig = activeBranch.whatsappConfig;
        console.log(`➡️ [Webhook Inbound] Routing automation via dedicated branch number: ${activeBranch.name}`);
      }
    }

    // 3. Auto WhatsApp Message Trigger Execution
    if (targetWhatsappConfig && targetWhatsappConfig.accessToken) {
      const msg = customMessage || `Hi ${name}, thank you for your interest! How can we help you today?`;
      
      let formattedPhone = phone.replace(/\D/g, '');
      if (formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone; // Standard Indian dialing code injection
      }
      
      await whatsappService.sendTextMessage(
        targetWhatsappConfig.accessToken, 
        targetWhatsappConfig.phoneNumberId, 
        formattedPhone, 
        msg
      ).catch(e => console.log('❌ [Webhook Automation] WA Send Error:', e.message));
    } else {
      console.log(`⚠️ [Webhook Automation] Skipped messaging trigger: WhatsApp not connected for specified context.`);
    }

    res.status(200).json({ success: true, message: 'Lead captured and WhatsApp triggered successfully!', lead });
  } catch (error) { 
    console.error("❌ [Webhook Fatal Error]:", error.message);
    res.status(500).json({ success: false, message: error.message }); 
  }
};