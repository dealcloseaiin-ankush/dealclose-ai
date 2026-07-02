const Lead = require('../models/leadModel');
const Contact = require('../models/contactModel');
const Message = require('../models/messageModel');
const CrmActivity = require('../models/CrmActivitymodel');
const User = require('../models/userModel');
const { automationQueue } = require('../workers/automationWorker');
const metaAdsService = require('../services/metaAdsService');

// Casual greetings that should NOT by themselves qualify a chat as a "real" lead
const CASUAL_GREETINGS = ['hi', 'hello', 'hey', 'hii', 'hlo', 'menu', 'help', 'options', 'ok', 'okay', 'yes', 'no', 'thanks', 'thank you', 'thankyou'];

// @desc    Get all contacts grouped by CRM Stage (For Kanban Board)
// @route   GET /api/crm/pipeline
exports.getPipeline = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    console.log(`\n🔍 [CRM Debug] Fetching pipeline for user: ${userId}`);

    // 🐛 FIX: Purana code Message.distinct() ko 'tags' field pe filter karta tha,
    // lekin Message documents pe 'tags' kabhi set hi nahi hota (sirf Lead pe hota
    // hai) — isliye ye query hamesha KHAALI aati thi aur koi bhi purana chat
    // kabhi CRM mein sync hi nahi hota tha.
    //
    // NAYA LOGIC: Har phone number ke liye check karo ki kya unke incoming
    // messages mein koi ek bhi message casual greeting se zyada hai (real intent
    // ka signal). Sirf "hi/hello/ok" bhejne wale abhi bhi lead nahi banenge.
    try {
      const incomingMessages = await Message.find({ userId, direction: 'incoming' })
        .select('customerPhone messageText')
        .lean();

      // Group by phone, check if at least one message is "real" (not just a greeting)
      const phoneQualifies = new Map();
      for (const msg of incomingMessages) {
        const phone = msg.customerPhone;
        if (!phone) continue;
        if (phoneQualifies.get(phone)) continue; // already qualified

        const text = (msg.messageText || '').trim().toLowerCase();
        const isJustGreeting = CASUAL_GREETINGS.includes(text) || text.length === 0;
        if (!isJustGreeting) {
          phoneQualifies.set(phone, true);
        } else if (!phoneQualifies.has(phone)) {
          phoneQualifies.set(phone, false);
        }
      }

      const qualifiedPhones = [...phoneQualifies.entries()]
        .filter(([, qualifies]) => qualifies)
        .map(([phone]) => phone);

      console.log(`📱 [CRM Debug] ${qualifiedPhones.length} phone numbers have real (non-greeting) message history.`);
      let leadCount = await Lead.countDocuments({ userId });

      for (const phone of qualifiedPhones) {
        // 🐛 FIX: Pehle 'IG_User' specific string check tha, jo 'IG_12345' jaisi
        // generic Instagram phone-IDs ko catch nahi karta tha. Ab generic 'IG_' prefix check.
        if (!phone || phone.startsWith('IG_')) continue;

        try {
          // 🐛 FIX (ZOMBIE LEADS): findOne YAHAN bhi soft-deleted records ko dhoondega
          // (kyunki hum ab hard-delete nahi karte), isliye agar user ne pehle
          // is lead ko delete kiya tha, ye dobara nahi banega.
          const leadExists = await Lead.findOne({ phoneNumber: phone, userId });
          const contactExists = await Contact.findOne({ $or: [{ phone }, { phoneNumber: phone }], userId });
          
          if (!leadExists && !contactExists) {
            leadCount++;
            const seqId = String(leadCount + 1).padStart(4, '0');
            await Lead.create({
              userId,
              createdBy: userId,
              phoneNumber: phone,
              name: `User #${seqId}`,
              source: 'WhatsApp (Old Chat)',
              status: 'new'
            });
            console.log(`✅ [CRM Debug] Auto-created Lead for qualified phone: ${phone}`);
          }
        } catch (innerErr) {
          console.error(`[CRM Sync] Skipping phone ${phone} due to error:`, innerErr.message);
        }
      }
    } catch (syncErr) {
      console.error("Old chat sync error:", syncErr);
    }

    // 🐛 FIX: 'deleted' status wale leads ko yahin se exclude karo (soft-deleted tombstones)
    const leads = await Lead.find({ userId, status: { $ne: 'deleted' } }).sort({ updatedAt: -1 }).lean();
    const contacts = await Contact.find({ userId }).sort({ updatedAt: -1 }).lean();
      
    console.log(`📊 [CRM Debug] Found ${leads.length} Leads and ${contacts.length} Contacts in DB.`);

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

    const determinePlatform = (phone, source) => {
      let strPhone = String(phone || '');
      if (strPhone.startsWith('IG_') || /[a-zA-Z]/.test(strPhone) || (source && String(source).toLowerCase().includes('instagram'))) {
        return 'instagram';
      }
      return 'whatsapp';
    };

    const pipeline = {
      new: [], hot: [], warm: [], cold: [], existing: [], vip: [], converted: [], lost: []
    };

    leads.forEach(lead => {
      if (!lead) return;
      if (lead.status === 'visitor' || lead.status === 'unqualified' || lead.status === 'deleted') return;

      const norm = normalizeData(lead.name, lead.city);
      lead.name = norm.name;
      lead.city = norm.city;
      lead.phoneNumber = lead.phoneNumber || lead.phone || ''; 
      lead.phone = lead.phoneNumber; 
      lead.platform = determinePlatform(lead.phoneNumber, lead.source);
      
      let stage = (lead.status || lead.crmStage || 'new').toLowerCase(); 
      if (stage === 'won' || stage === 'completed') stage = 'converted';
      if (stage === 'pending') stage = 'new';
      if (stage === 'interested') stage = 'warm'; 
      if (stage === 'negotiating') stage = 'hot'; 
      if (stage === 'contacted') stage = 'warm';
      
      if (!pipeline[stage]) stage = 'new'; 
      lead.status = stage; 
      lead.id = lead._id ? lead._id.toString() : String(lead.phoneNumber); 

      if (pipeline[stage]) {
        pipeline[stage].push(lead);
      } else {
        pipeline.new.push(lead); 
      }
    });
    
    contacts.forEach(contact => {
      if (!contact) return;

      let stage = (contact.crmStage || 'new').toLowerCase();
      if (stage === 'won' || stage === 'completed') stage = 'converted';
      if (stage === 'pending') stage = 'new';
      if (stage === 'interested') stage = 'warm';
      if (stage === 'negotiating') stage = 'hot';
      if (stage === 'contacted') stage = 'warm';
      if (stage === 'deleted') return;

      const norm = normalizeData(contact.name, contact.city);
      const platform = determinePlatform(contact.phone || contact.phoneNumber, contact.source);
      
      const normalizedContact = {
        ...contact,
        id: contact._id ? contact._id.toString() : String(contact.phone || contact.phoneNumber), 
        name: norm.name,
        city: norm.city,
        phoneNumber: contact.phoneNumber || contact.phone || '', 
        phone: contact.phoneNumber || contact.phone || '', 
        status: stage,
        source: 'Manual Contact (Old Data)',
        platform: platform,
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

    let record = null;
    let isLead = true;

    try {
      record = await Lead.findOne({ _id: id, userId });
    } catch (e) {
      record = null; 
    }

    if (!record) {
      try {
        record = await Contact.findOne({ _id: id, userId });
        isLead = false;
      } catch (e) {
        record = null;
      }
    }

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
      if (isLead) record.status = targetStage.toLowerCase(); 
      record.crmStage = targetStage.toLowerCase();
      if (!record.crmStageHistory) record.crmStageHistory = [];
      record.crmStageHistory.push({
        from: oldStage,
        to: targetStage.toLowerCase(),
        changedBy: req.user?.fullName || 'system',
        reason: reason || 'Manual update via CRM Panel'
      });

      if (!record.timeline) record.timeline = [];
      record.timeline.push({ eventType: 'Status Changed', description: `Stage moved from ${oldStage} to ${targetStage.toLowerCase()}`, timestamp: new Date() });
      if (['won', 'converted', 'completed'].includes(targetStage.toLowerCase())) {
        record.timeline.push({ eventType: 'Lead Won', description: 'Deal successfully closed', timestamp: new Date() });
      } else if (targetStage.toLowerCase() === 'lost') {
        record.timeline.push({ eventType: 'Lead Lost', description: 'Deal lost', timestamp: new Date() });
      }
    }

    if (dealValue !== undefined) record.dealValue = dealValue;
    if (notes !== undefined && notes.trim() !== '') {
      const humanLog = `[Human: ${req.user?.fullName || 'Staff'}] Added Note: ${notes}`;
      
      if (Array.isArray(record.notes)) record.notes.push(humanLog);
      else record.notes = record.notes ? [record.notes, humanLog] : [humanLog];

      if (!record.timeline) record.timeline = [];
      record.timeline.push({ eventType: 'Follow-up Completed', description: `Note added: ${notes}`, timestamp: new Date() });
    }

    await record.save();

    if (isStageChanged) {
      await CrmActivity.create({
        userId,
        contactId: record._id,
        type: 'stage_change',
        description: `Stage changed: ${oldStage} → ${targetStage.toLowerCase()}`,
        performedBy: req.user?.fullName || 'system',
        metadata: { oldStage, newStage: targetStage.toLowerCase() }
      });

      if (targetStage.toLowerCase() === 'converted' || targetStage.toLowerCase() === 'completed') {
        await automationQueue.add('campaign_followup', { contactId: record._id, userId }, { delay: 60 * 1000 });

        try {
          const user = await User.findById(userId).lean();
          const pixelId = user?.metaConfig?.pixelId;
          const metaAccessToken = user?.metaConfig?.accessToken;
          const customerPhone = record.phoneNumber || record.phone;

          if (pixelId && metaAccessToken && customerPhone) {
            await metaAdsService.sendConversionEvent(pixelId, metaAccessToken, customerPhone, 'Purchase');
            console.log(`✅ [CRM] Meta Conversion Event sent for converted lead: ${customerPhone}`);
          }
        } catch (metaErr) {
          console.error('⚠️ [CRM] Meta Conversion sync failed (non-blocking):', metaErr.message);
        }
      }
    }

    res.status(200).json({ success: true, message: 'Record updated successfully', data: record });
  } catch (error) {
    console.error('Error updating CRM stage:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

// @desc    Delete a contact/lead permanently (Leads: SOFT delete to prevent zombie recreation)
// @route   DELETE /api/crm/contacts/:id
exports.deleteContact = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    console.log(`\n🗑️ [CRM DELETE] Processing delete for ID: ${id}`);

    // 🐛 FIX (ZOMBIE LEADS): Leads ab SOFT-delete hote hain (status: 'deleted'),
    // record database mein rehta hai taaki webhook.controller.js ka
    // `Lead.findOne(...)` ise dobara "naya customer" samajh ke recreate na kare.
    // Contact (manual entries) abhi bhi hard-delete hote hain kyunki unke liye
    // koi auto-recreation webhook nahi hai.
    let lead = await Lead.findOne({ _id: id, userId }) || await Lead.findOne({ phoneNumber: id, userId });

    if (lead) {
      lead.status = 'deleted';
      lead.isArchived = true;
      lead.archivedAt = new Date();
      lead.deletedAt = new Date();
      lead.deletedBy = req.user?.fullName || 'system';
      await lead.save();

      const phoneToClean = lead.phoneNumber || lead.phone;
      if (phoneToClean) {
        await Message.deleteMany({ customerPhone: phoneToClean, userId });
        console.log(`🧹 [CRM DELETE] Wiped chat history for ${phoneToClean}. Lead soft-deleted (tombstoned).`);
      }

      return res.status(200).json({ success: true, message: 'Deleted successfully' });
    }

    // Fallback to Contact (still hard delete, no recreation risk)
    let contact = await Contact.findOneAndDelete({ _id: id, userId })
      || await Contact.findOneAndDelete({ $or: [{ phone: id }, { phoneNumber: id }], userId });

    if (!contact) {
      return res.status(404).json({ success: false, message: 'Record not found or already deleted' });
    }

    const phoneToClean = contact.phoneNumber || contact.phone;
    if (phoneToClean) {
      await Message.deleteMany({ customerPhone: phoneToClean, userId });
    }

    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('🚨 Critical deletion crash:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};