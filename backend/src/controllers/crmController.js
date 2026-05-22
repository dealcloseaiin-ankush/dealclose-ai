const Lead = require('../models/leadModel');
const Contact = require('../models/contactModel');
const Message = require('../models/messageModel');
const CrmActivity = require('../models/CrmActivitymodel');
const { automationQueue } = require('../workers/automationWorker');

// @desc    Get all contacts grouped by CRM Stage (For Kanban Board)
// @route   GET /api/crm/pipeline
exports.getPipeline = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id; // BUG FIX: Token me 'id' hota hai, '_id' nahi
    
    console.log(`\n🔍 [CRM Debug] Fetching pipeline for user: ${userId}`);

    const leads = await Lead.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
      
    // Fetch old manually created contacts as well to keep history visible
    const contacts = await Contact.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
      
    console.log(`📊 [CRM Debug] Found ${leads.length} Leads and ${contacts.length} Contacts in DB.`);

    // 🚀 NEW: AUTO-SYNC OLD CHATS TO CRM
    try {
      const distinctPhones = await Message.distinct('customerPhone', { userId });
      console.log(`📱 [CRM Debug] Found ${distinctPhones.length} distinct phone numbers in Chat History.`);
      for (const phone of distinctPhones) {
        if (!phone) continue;
        try {
          const leadExists = await Lead.findOne({ phoneNumber: phone, userId });
          const contactExists = await Contact.findOne({ $or: [{ phone }, { phoneNumber: phone }], userId });
          
          if (!leadExists && !contactExists) {
            await Lead.create({
              userId,
              phoneNumber: phone,
              name: `User ${phone.slice(-4)}`,
              source: 'WhatsApp (Old Chat)',
              status: 'new'
            });
            console.log(`✅ [CRM Debug] Auto-created new Lead for missing phone: ${phone}`);
          }
        } catch (innerErr) {
          console.error(`[CRM Sync] Skipping phone ${phone} due to error:`, innerErr.message);
        }
      }
    } catch (syncErr) {
      console.error("Old chat sync error:", syncErr);
    }

    // Default pipeline structure
    const pipeline = {
      new: [],
      contacted: [],
      interested: [],
      negotiating: [],
      converted: [],
      lost: []
    };

    // Group contacts by their current stage
    leads.forEach(lead => {
      const stage = lead.status || lead.crmStage || 'new'; // Map AI status to pipeline
      if (pipeline[stage]) {
        pipeline[stage].push(lead);
      } else {
        pipeline.new.push(lead); // Fallback
      }
    });
    
    // Group old contacts into the pipeline too
    contacts.forEach(contact => {
      const stage = contact.crmStage || 'new';
      // Normalize contact structure to match frontend expectations for Lead
      const normalizedContact = {
        ...contact,
        phoneNumber: contact.phone || contact.phoneNumber,
        status: stage,
        source: 'Manual Contact (Old Data)',
      };
      if (pipeline[stage]) {
        pipeline[stage].push(normalizedContact);
      } else {
        pipeline.new.push(normalizedContact);
      }
    });

    res.status(200).json({ success: true, data: pipeline });
  } catch (error) {
    console.error('Error fetching CRM pipeline:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// @desc    Move a contact to a different stage (Drag & Drop)
// @route   PUT /api/crm/contacts/:id/stage
exports.updateStage = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;
    const { newStage, reason } = req.body;

    // Check in Leads first, if not found, check in old Contacts
    let record = await Lead.findOne({ _id: id, userId });
    let isLead = true;

    if (!record) {
      record = await Contact.findOne({ _id: id, userId });
      isLead = false;
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const oldStage = isLead ? (record.status || record.crmStage || 'new') : (record.crmStage || 'new');

    if (oldStage === newStage) {
      return res.status(200).json({ success: true, data: record });
    }

    // Update contact stage & history
    if (isLead) record.status = newStage; // sync AI status with CRM stage
    record.crmStage = newStage;
    if (!record.crmStageHistory) record.crmStageHistory = [];
    record.crmStageHistory.push({
      from: oldStage,
      to: newStage,
      changedBy: req.user.fullName || 'system',
      reason: reason || 'Manual drag & drop'
    });
    await record.save();

    // Log activity in 360-degree timeline
    await CrmActivity.create({
      userId,
      contactId: record._id,
      type: 'stage_change',
      description: `Stage changed: ${oldStage} → ${newStage}`,
      performedBy: req.user.fullName || 'system',
      metadata: { oldStage, newStage }
    });

    // 🚀 INFLUENCER RETENTION AUTOMATION
    // Jab deal convert ya complete ho jaye, 15 din baad ROI/Repeat pitch ka auto-followup set karein
    if (newStage === 'converted' || newStage === 'completed') {
      console.log(`[CRM] Scheduling Post-Campaign ROI check for record ${record._id}`);
      // Schedule for 15 days later (15 * 24 * 60 * 60 * 1000) - Using 1 minute for testing purposes
      await automationQueue.add('campaign_followup', { contactId: record._id, userId }, { delay: 60 * 1000 });
    }

    res.status(200).json({ success: true, message: 'Stage updated successfully', data: record });
  } catch (error) {
    console.error('Error updating CRM stage:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};