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

    // 🚀 NEW: AUTO-SYNC OLD CHATS TO CRM
    try {
      // Direct query without ObjectId casting to prevent skipped records
      const distinctPhones = await Message.distinct('customerPhone', { userId: userId });
      console.log(`📱 [CRM Debug] Found ${distinctPhones.length} distinct phone numbers in Chat History.`);
      for (const phone of distinctPhones) {
        if (!phone) continue;
        try {
          const leadExists = await Lead.findOne({ phoneNumber: phone, userId });
          const contactExists = await Contact.findOne({ $or: [{ phone }, { phoneNumber: phone }], userId });
          
          if (!leadExists && !contactExists) {
            const leadCount = await Lead.countDocuments({ userId });
            const seqId = String(leadCount + 1).padStart(4, '0');
            await Lead.create({
              userId,
              createdBy: userId,
              phoneNumber: phone,
              name: `User #${seqId}`,
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

    const leads = await Lead.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
      
    // Fetch old manually created contacts as well to keep history visible
    const contacts = await Contact.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
      
    console.log(`📊 [CRM Debug] Found ${leads.length} Leads and ${contacts.length} Contacts in DB.`);

    // 🚀 SMART NORMALIZER: Retroactively fix Old Names and extract City dynamically
    const normalizeData = (nameStr, cityStr) => {
      let n = nameStr || '';
      let c = cityStr || '';
      let idMatch = n.match(/(?:#|ID:\s*)(\d+)/i);
      let seqId = idMatch ? `#${idMatch[1]}` : '';
      let cleanName = n.replace(/\s*\(?(?:#|ID:\s*)\d+\)?/i, '').trim();
      
      if (!c && !cleanName.toLowerCase().startsWith('user')) {
        if (cleanName.includes(',')) {
           const parts = cleanName.split(',');
           cleanName = parts[0].trim();
           c = parts.slice(1).join(' ').trim();
        } else {
           let parts = cleanName.split(/\s+/);
           if (parts.length >= 3) {
             c = parts.pop();
             cleanName = parts.join(' ');
           }
        }
      }
      let finalName = cleanName || 'Unknown';
      if (seqId && !finalName.includes(seqId)) finalName += ` ${seqId}`;
      return { name: finalName, city: c };
    };

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
      const norm = normalizeData(lead.name, lead.city);
      lead.name = norm.name;
      lead.city = norm.city;
      lead.phoneNumber = lead.phoneNumber || lead.phone || ''; // Retroactive fix for missing phone numbers
      let stage = (lead.status || lead.crmStage || 'new').toLowerCase(); // Map AI status to pipeline
      if (stage === 'won' || stage === 'completed') stage = 'converted';
      if (stage === 'pending') stage = 'new';
      lead.status = stage; // Ensure lowercase for Kanban board strict match
      lead.id = lead._id ? lead._id.toString() : String(lead.phoneNumber); // Ensure 'id' is strictly a string

      if (pipeline[stage]) {
        pipeline[stage].push(lead);
      } else {
        pipeline.new.push(lead); // Fallback
      }
    });
    
    // Group old contacts into the pipeline too
    contacts.forEach(contact => {
      let stage = (contact.crmStage || 'new').toLowerCase();
      if (stage === 'won' || stage === 'completed') stage = 'converted';
      if (stage === 'pending') stage = 'new';

      const norm = normalizeData(contact.name, contact.city);
      // Normalize contact structure to match frontend expectations for Lead
      const normalizedContact = {
        ...contact,
        id: contact._id ? contact._id.toString() : String(contact.phone || contact.phoneNumber), // Ensure 'id' is strictly a string
        name: norm.name,
        city: norm.city,
        phoneNumber: contact.phoneNumber || contact.phone || '', // Map correct field for Kanban display
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
    const { newStage, reason, dealValue, notes } = req.body;
    const targetStage = newStage || req.body.stage || req.body.status;

    // Check in Leads first, if not found, check in old Contacts
    let record = null;
    let isLead = true;

    try {
      record = await Lead.findOne({ _id: id, userId });
    } catch (e) {
      record = null; // Prevent Mongoose CastError if id is sent as phone number
    }

    if (!record) {
      try {
        record = await Contact.findOne({ _id: id, userId });
        isLead = false;
      } catch (e) {
        record = null;
      }
    }

    // Fallback: If drag-and-drop sent phone number instead of ObjectId (For Old leads)
    if (!record) {
      record = await Lead.findOne({ phoneNumber: id, userId });
      isLead = true;
    }
    if (!record) {
      record = await Contact.findOne({ $or: [{ phone: id }, { phoneNumber: id }], userId });
      isLead = false;
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const oldStage = isLead ? (record.status || record.crmStage || 'new') : (record.crmStage || 'new');

    let isStageChanged = false;
    if (targetStage && oldStage !== targetStage.toLowerCase()) {
      isStageChanged = true;
      // Update contact stage & history
      if (isLead) record.status = targetStage.toLowerCase(); 
      record.crmStage = targetStage.toLowerCase();
      if (!record.crmStageHistory) record.crmStageHistory = [];
      record.crmStageHistory.push({
        from: oldStage,
        to: targetStage.toLowerCase(),
        changedBy: req.user?.fullName || 'system',
        reason: reason || 'Manual update via CRM Panel'
      });
    }

    // 🚀 NEW: Save Deal Value and Notes
    if (dealValue !== undefined) record.dealValue = dealValue;
    if (notes !== undefined && notes.trim() !== '') {
      const humanLog = `[Human: ${req.user?.fullName || 'Staff'}] Added Note: ${notes}`;
      
      // Ensure notes is an array and push the new log
      if (Array.isArray(record.notes)) record.notes.push(humanLog);
      else record.notes = record.notes ? [record.notes, humanLog] : [humanLog];
    }

    await record.save();

    if (isStageChanged) {
      // Log activity in 360-degree timeline
      await CrmActivity.create({
        userId,
        contactId: record._id,
        type: 'stage_change',
        description: `Stage changed: ${oldStage} → ${newStage}`,
        performedBy: req.user?.fullName || 'system',
        metadata: { oldStage, newStage }
      });

      // Jab deal convert ya complete ho jaye, 15 din baad ROI/Repeat pitch ka auto-followup set karein
      if (newStage === 'converted' || newStage === 'completed') {
        await automationQueue.add('campaign_followup', { contactId: record._id, userId }, { delay: 60 * 1000 });
      }
    }

    res.status(200).json({ success: true, message: 'Record updated successfully', data: record });
  } catch (error) {
    console.error('Error updating CRM stage:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};