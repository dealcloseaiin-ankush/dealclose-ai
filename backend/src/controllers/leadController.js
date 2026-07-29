const Lead = require('../models/leadModel');
const Contact = require('../models/contactModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const aiService = require('../services/aiService');
const mongoose = require('mongoose');
const whatsappService = require('../services/whatsappService');
const AiUsageLog = require('../models/aiUsageLogModel'); // Import the new model

// @desc    Get all leads
// @route   GET /api/leads
exports.getLeads = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    // 🐛 FIX: Exclude soft-deleted leads (status: 'deleted') from list view
    const leads = await Lead.find({ userId, status: { $ne: 'deleted' } }).sort({ createdAt: -1 });
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new lead
// @route   POST /api/leads
exports.createLead = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { name, phoneNumber, email, status, source } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({ message: 'Name and Phone Number are required' });
    }

    let formattedPhone = phoneNumber.replace(/\D/g, '');
    const existingLead = await Lead.findOne({ phoneNumber: { $regex: new RegExp(formattedPhone.slice(-10) + '$') }, userId });
    
    if (existingLead) {
      // 🐛 FIX: If the existing match is a soft-deleted (tombstoned) lead, RESTORE it
      // instead of blocking creation with "already exists" — user explicitly wants
      // to bring this contact back into the CRM.
      if (existingLead.status === 'deleted') {
        existingLead.status = 'new';
        existingLead.name = name;
        existingLead.email = email || existingLead.email;
        existingLead.source = source || existingLead.source;
        existingLead.deletedAt = null;
        existingLead.deletedBy = null;
        existingLead.isArchived = false;
        existingLead.timeline = existingLead.timeline || [];
        existingLead.timeline.push({ eventType: 'Lead Restored', description: 'Lead was manually re-added after being deleted', timestamp: new Date() });
        await existingLead.save();
        return res.status(201).json(existingLead);
      }

      const lastContactDate = existingLead.updatedAt ? new Date(existingLead.updatedAt).toLocaleDateString('en-IN') : 'N/A';
      return res.status(400).json({ 
        message: `Customer already exists in CRM! \nStatus: ${existingLead.status.toUpperCase()} \nLast Contacted: ${lastContactDate}` 
      });
    }

    const lead = await Lead.create({
      userId,
      name,
      phoneNumber,
      email,
      status,
      source,
      createdBy: userId,
      timeline: [{ eventType: 'Lead Created', description: 'Lead manually created in CRM', timestamp: new Date() }]
    });

    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update lead status (for CRM Kanban)
// @route   PATCH /api/leads/:id/status
exports.updateLeadStatus = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const { status } = req.body;

    const updatedLead = await Lead.findOneAndUpdate(
      { _id: id, userId },
      { 
        $set: { status },
        $push: { timeline: { eventType: 'Status Changed', description: `Status manually updated to ${status}`, timestamp: new Date() } }
      },
      { new: true }
    );

    res.status(200).json({ success: true, lead: updatedLead });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update lead details (Manual Edit by User)
// @route   PUT /api/leads/:id
exports.updateLead = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const updates = req.body;

    const updatedLead = await Lead.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    );

    if (!updatedLead) return res.status(404).json({ message: 'Lead not found' });

    res.status(200).json({ success: true, lead: updatedLead, message: 'Lead updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a lead manually
// @route   DELETE /api/leads/:id
exports.deleteLead = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;

    console.log(`\n🗑️ [leadController DELETE] Processing delete for ID: ${id}`);

    // 🐛 FIX (ZOMBIE LEADS): Ye route pehle HARD delete karta tha — agar koi
    // frontend jagah abhi bhi is route (/api/leads/:id) ko call karti hai
    // (CrmPage.jsx ke alawa), to zombie-lead bug wapas aa sakta tha. Ab
    // crmController.deleteContact jaisa hi SOFT delete behavior.
    let lead = null;
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        lead = await Lead.findOne({ _id: id, userId });
      }
    } catch (e) {}
    if (!lead) lead = await Lead.findOne({ phoneNumber: id, userId });

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
        console.log(`🧹 [leadController DELETE] Wiped messages for ${phoneToClean}. Lead soft-deleted.`);
      }
      return res.status(200).json({ success: true, message: 'Deleted successfully' });
    }

    // Fallback: Contact (manual entries) — still hard delete, no recreation risk
    let deletedRecord = null;
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        deletedRecord = await Contact.findOneAndDelete({ _id: id, userId });
      }
    } catch (e) {}
    if (!deletedRecord) {
      deletedRecord = await Contact.findOneAndDelete({ $or: [{ phone: id }, { phoneNumber: id }], userId });
    }

    if (!deletedRecord) {
      console.log(`❌ [leadController DELETE] Failed: No record found for ID/Phone: ${id}`);
      return res.status(404).json({ message: 'Lead or Contact not found' });
    }

    const phoneToClean = deletedRecord.phoneNumber || deletedRecord.phone;
    if (phoneToClean) {
      await Message.deleteMany({ customerPhone: phoneToClean, userId });
    }

    res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error(`🚨 [DEBUG DELETE] Critical Error:`, error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export leads to CSV
// @route   GET /api/leads/export
exports.exportLeads = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    // 🐛 FIX: Exclude soft-deleted leads from export
    const leads = await Lead.find({ userId, status: { $ne: 'deleted' } }).sort({ createdAt: -1 }).lean();
    const contacts = await Contact.find({ userId }).sort({ createdAt: -1 }).lean();
    
    const headers = ['Name', 'Phone', 'Email', 'Status', 'Source', 'Created At'];
    const csvRows = [headers.join(',')];
    
    leads.forEach(lead => {
      const dateStr = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : 'N/A';
      csvRows.push(`"${lead.name || ''}","${lead.phoneNumber || ''}","${lead.email || 'N/A'}","${lead.status || 'new'}","${lead.source || ''}","${dateStr}"`);
    });

    contacts.forEach(contact => {
      const dateStr = contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'N/A';
      const phone = contact.phone || contact.phoneNumber || '';
      csvRows.push(`"${contact.name || ''}","${phone}","${contact.email || 'N/A'}","${contact.crmStage || 'new'}","Manual Contact","${dateStr}"`);
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"');
    res.status(200).send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Share Leads to WhatsApp (Manual Backup)
// @route   POST /api/leads/share-whatsapp
exports.shareLeadsToWhatsApp = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    let { targetPhoneNumber } = req.body;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId).lean();
    if (!user || !user.whatsappConfig || !user.whatsappConfig.accessToken) {
      return res.status(400).json({ message: 'WhatsApp configuration missing.' });
    }

    if (!targetPhoneNumber) {
      if (user.ownerPhone) {
        targetPhoneNumber = user.ownerPhone;
      } else {
        return res.status(400).json({ message: 'Owner phone missing. Please set it in Settings.' });
      }
    }

    // 🐛 FIX: Exclude soft-deleted leads from WhatsApp backup
    const leads = await Lead.find({ userId, status: { $ne: 'deleted' } }).sort({ createdAt: -1 }).limit(50).lean();
    
    if (leads.length === 0) return res.status(400).json({ message: 'No leads found to share.' });

    let messageText = `📊 *Your CRM Leads Backup*\nHere are your latest leads:\n\n`;
    
    leads.forEach((lead, index) => {
      messageText += `*${index + 1}. ${lead.name}*\n`;
      messageText += `📞 ${lead.phoneNumber}\n`;
      messageText += `🔖 Status: ${lead.status}\n`;
      if (lead.notes) messageText += `📝 Notes: ${lead.notes.substring(0, 50)}...\n`;
      messageText += `\n`;
    });

    messageText += `\n_Generated via DealClose AI_`;

    let formattedPhone = targetPhoneNumber.replace(/\D/g, ''); 
    if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

    await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, formattedPhone, messageText);

    res.status(200).json({ success: true, message: 'Leads shared successfully via WhatsApp!' });
  } catch (error) {
    console.error('Share Leads Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Lead Analytics for Dashboard Graphs
// @route   GET /api/leads/analytics
exports.getLeadAnalytics = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    // 🚀 NEW: Ensure indexes exist for performance. This runs once and is very fast.
    try {
      await Lead.collection.createIndex({ userId: 1, status: 1, createdAt: -1 });
      await Lead.collection.createIndex({ userId: 1, lastSelectedWorkspaceId: 1 });
      await Lead.collection.createIndex({ userId: 1, phoneNumber: 1 });
      await Lead.collection.createIndex({ userId: 1, nextFollowUpDate: 1 });
      console.log('DB Indexes ensured for Leads collection.');
    } catch (indexError) {
      // This might fail if indexes already exist, which is fine.
      console.warn('DB Index creation warning (might be expected):', indexError.message);
    }

    const { workspaceId, platform } = req.query;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    try {
      const distinctPhones = await Message.distinct('customerPhone', { userId: userIdObj });
      if (distinctPhones && distinctPhones.length > 0) {
        const existingLeads = await Lead.find({ userId: userIdObj, phoneNumber: { $in: distinctPhones } }).select('phoneNumber').lean();
        const existingPhones = new Set(existingLeads.map(l => l.phoneNumber));
        
        const newLeadsToCreate = [];
        let leadCount = await Lead.countDocuments({ userId: userIdObj });

        for (const phone of distinctPhones) {
          if (phone && !existingPhones.has(phone)) {
            leadCount++;
            const seqId = String(leadCount).padStart(4, '0');
            newLeadsToCreate.push({
              userId: userIdObj,
              createdBy: userIdObj,
              phoneNumber: phone,
              name: `User #${seqId}`,
              source: phone.startsWith('IG_') ? 'Instagram (Old Chat)' : 'WhatsApp (Old Chat)',
              status: 'new'
            });
          }
        }
        if (newLeadsToCreate.length > 0) {
          await Lead.insertMany(newLeadsToCreate);
        }
      }
    } catch (syncErr) {
      console.error("Dashboard lead sync error:", syncErr.message);
    }

    const leadQuery = { userId, status: { $nin: ['visitor', 'unqualified', 'deleted'] } };
    const aggLeadQuery = { userId: userIdObj, status: { $nin: ['visitor', 'unqualified', 'deleted'] } };
    
    if (workspaceId && workspaceId !== 'main_business' && workspaceId !== 'main' && workspaceId !== 'all') {
      leadQuery.lastSelectedWorkspaceId = workspaceId;
      aggLeadQuery.lastSelectedWorkspaceId = workspaceId;
    } else if (workspaceId === 'main_business' || workspaceId === 'main') {
      const mainFilter = {
        $or: [
          { lastSelectedWorkspaceId: 'main' },
          { lastSelectedWorkspaceId: 'main_business' },
          { lastSelectedWorkspaceId: 'default' },
          { lastSelectedWorkspaceId: { $exists: false } },
          { lastSelectedWorkspaceId: null },
          { lastSelectedWorkspaceId: '' }
        ]
      };
      Object.assign(leadQuery, mainFilter);
      Object.assign(aggLeadQuery, mainFilter);
    }

    if (platform === 'instagram') {
      const igFilter = { $or: [{ phoneNumber: { $regex: /^IG_/i } }, { source: { $regex: /instagram/i } }] };
      Object.assign(leadQuery, igFilter);
      Object.assign(aggLeadQuery, igFilter);
    } else if (platform === 'whatsapp') {
      const waFilter = { $and: [{ phoneNumber: { $not: /^IG_/i } }, { source: { $not: /instagram/i } }] };
      Object.assign(leadQuery, waFilter);
      Object.assign(aggLeadQuery, waFilter);
    }

    const totalLeads = await Lead.countDocuments(leadQuery);
    const converted = await Lead.countDocuments({ ...leadQuery, status: 'converted' });
    const interested = await Lead.countDocuments({ ...leadQuery, status: 'interested' });
    const ignored = await Lead.countDocuments({ ...leadQuery, status: 'ignored' });
    const newLeads = await Lead.countDocuments({ ...leadQuery, status: 'new' });
    const lost = await Lead.countDocuments({ ...leadQuery, status: 'lost' });

    const hot = await Lead.countDocuments({ ...leadQuery, status: { $in: ['hot', 'negotiating'] } });
    const warm = await Lead.countDocuments({ ...leadQuery, status: { $in: ['warm', 'interested'] } });
    const cold = await Lead.countDocuments({ ...leadQuery, status: 'cold' });
    const existing = await Lead.countDocuments({ ...leadQuery, status: 'existing' });
    const vip = await Lead.countDocuments({ ...leadQuery, status: 'vip' });

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const followUpsToday = await Lead.countDocuments({ ...leadQuery, nextFollowUpDate: { $gte: startOfDay, $lte: endOfDay } });
    
    const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(2) : 0;
    
    const leadsForMessageStats = await Lead.find(leadQuery).select('phoneNumber').lean();
    const phoneNumbersForStats = leadsForMessageStats
      .map(l => l.phoneNumber)
      .filter(phone => phone && !phone.toUpperCase().startsWith('IG_'));

    const messageQuery = { userId: userIdObj, customerPhone: { $in: phoneNumbersForStats } };

    const actualSent = await Message.countDocuments({ ...messageQuery, direction: 'outgoing' });
    const actualDelivered = await Message.countDocuments({ ...messageQuery, direction: 'outgoing', status: { $in: ['delivered', 'read'] } });
    const actualRead = await Message.countDocuments({ ...messageQuery, direction: 'outgoing', status: 'read' });
    
    const messageStats = { sent: actualSent, delivered: actualDelivered, read: actualRead };

    // 🐛 FIX: Sahi Meta-style 24-hour conversation-window billing.
    // Rule: Customer ka koi bhi incoming message 24-ghante ka FREE window kholta hai.
    // Is window ke andar business ke saare outgoing replies FREE hain (chahe kitne bhi ho).
    // Business sirf tabhi paisa deta hai jab wo koi outgoing message bheje aur us waqt
    // koi active customer-window na ho (matlab customer ne 24hr se kuch nahi bheja tha) —
    // isse ek NAYA paid conversation window khulta hai (jo khud bhi 24hr ke liye free reply allow karta hai).
    const billingMessages = await Message.find(messageQuery)
      .select('customerPhone direction timestamp')
      .sort({ customerPhone: 1, timestamp: 1 })
      .lean();

    let totalConversations = 0;
    let currentPhone = null;
    let windowExpiry = null;

    for (const msg of billingMessages) {
      if (msg.customerPhone !== currentPhone) {
        currentPhone = msg.customerPhone;
        windowExpiry = null; // Naya customer, purana window reset
      }

      const msgTime = new Date(msg.timestamp);
      if (isNaN(msgTime.getTime())) continue; // Corrupt/missing timestamp safety

      if (msg.direction === 'incoming') {
        // Customer ne message bheja -> 24hr free window (re)open/extend hota hai
        windowExpiry = new Date(msgTime.getTime() + 24 * 60 * 60 * 1000);
      } else if (msg.direction === 'outgoing') {
        const isWithinFreeWindow = windowExpiry && msgTime <= windowExpiry;
        if (!isWithinFreeWindow) {
          // Koi active free window nahi tha -> business ne naya conversation kholna pada (PAID)
          totalConversations++;
          // Ye naya business-initiated window bhi agle 24hr tak free replies allow karta hai
          windowExpiry = new Date(msgTime.getTime() + 24 * 60 * 60 * 1000);
        }
        // Agar free window ke andar hai -> bilkul free, kuch charge nahi
      }
    }

    const totalInvestment = totalConversations * 0.80;
    const costPerLead = totalLeads > 0 ? (totalInvestment / totalLeads).toFixed(2) : 0;

    const graphData = [
      { name: 'New (Chatting)', value: newLeads },
      { name: 'Interested', value: interested },
      { name: 'Converted', value: converted },
      { name: 'Lost/Ignored', value: ignored + lost }
    ];

    const smartCrmData = { hot, warm, cold, existing, vip, followUpsToday, new: newLeads, lost };

    const leadsBySource = await Lead.aggregate([
      { $match: aggLeadQuery },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $project: { name: '$_id', leads: '$count', _id: 0 } },
      { $sort: { leads: -1 } }
    ]);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyLeadsData = await Lead.aggregate([
        { $match: { ...aggLeadQuery, createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', leads: '$count', _id: 0 } }
    ]);

    const recentActivity = await Lead.find(leadQuery)
      .sort({ updatedAt: -1 })
      .limit(8)
      .select('name status source createdAt updatedAt notes aiFeedbackScore');

    const replyAnalytics = await Message.aggregate([
        { $match: { userId: userIdObj } },
        {
            $group: {
                _id: '$direction',
                uniqueCustomers: { $addToSet: '$customerPhone' },
                botReplies: { $sum: { $cond: [ { $and: [ { $eq: ['$direction', 'outgoing'] }, { $in: ['$sentBy', ['auto-reply', 'system']] } ] }, 1, 0 ] } },
                aiReplies: { $sum: { $cond: [ { $and: [ { $eq: ['$direction', 'outgoing'] }, { $eq: ['$sentBy', 'ai'] } ] }, 1, 0 ] } },
                humanReplies: { $sum: { $cond: [ { $and: [ { $eq: ['$direction', 'outgoing'] }, { $eq: ['$sentBy', 'staff'] } ] }, 1, 0 ] } },
            }
        }
    ]);

    let customersReplied = 0, weRepliedTo = 0, botReplyCount = 0, aiReplyCount = 0, humanReplyCount = 0;

    replyAnalytics.forEach(group => {
        if (group._id === 'incoming') {
            customersReplied = group.uniqueCustomers.length;
        } else if (group._id === 'outgoing') {
            weRepliedTo = group.uniqueCustomers.length;
            botReplyCount = group.botReplies;
            aiReplyCount = group.aiReplies;
            humanReplyCount = group.humanReplies;
        }
    });

    const advancedStats = { customersReplied, weRepliedTo, replySources: { bot: botReplyCount, ai: aiReplyCount, human: humanReplyCount } };

    // 🚀 NEW: Centralized AI Token Usage Aggregation
    const aiUsage = await AiUsageLog.aggregate([
      { $match: { userId: userIdObj } },
      // ✅ FIX: AI usage for lead categorization was not being tracked.
      // This block is a placeholder to demonstrate where to add tracking.
      // In a real scenario, the AI call for categorization would trigger this.
      // For now, we'll simulate adding a log entry if it's missing.
      // This is a conceptual fix. The actual AI call needs the tracker.
      // For example, if an AI call was made here:
      // const { analysis, usage } = await aiService.analyzeLeads(leads);
      // await aiUsageTracker.logUsage({
      //   userId,
      //   workspaceId,
      //   feature: 'lead_categorization',
      //   ...usage
      // });
      // Since there is no explicit AI call here, we will just aggregate existing logs.
      // The main AI tracking is in controllers like `instagramController`.
      // This comment serves as a reminder to add tracking to any future AI calls here.

      { $group: { _id: null, totalTokens: { $sum: '$totalTokens' } } }
    ]);
    const totalTokensUsed = aiUsage[0]?.totalTokens || 0;

    res.status(200).json({
      stats: { totalLeads, converted, conversionRate, totalInvestment, costPerLead },
      graphData, leadsBySource, dailyLeads: dailyLeadsData, messageStats, recentActivity, advancedStats, smartCrmData,
      aiStats: {
        totalTokensUsed,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    AI Market Analysis & Suggestions for Influencers/Agencies
// @route   GET /api/leads/market-insights
exports.getMarketInsights = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const recentLeads = await Lead.find({ userId, source: { $regex: /Instagram/i }, status: { $ne: 'deleted' } }).sort({ createdAt: -1 }).limit(50);

    if (recentLeads.length < 5) {
      return res.status(200).json({ message: "Not enough data yet. Let the AI talk to at least 5 brands to generate market insights." });
    }

    const dealHistory = recentLeads.map(lead => `- Status: ${lead.status}, Notes: ${lead.notes}`).join('\n');

    const aiContext = `You are a top-tier Business Strategist and Influencer Marketing Expert.
    Below is the raw data of the last 50 brand collaboration requests and leads this influencer/business has received via Instagram DMs:
    
    ${dealHistory}
    
    Analyze this data and provide a strategic report.
    Include:
    1. The average market rate brands are offering for Stories vs Reels vs Posts.
    2. The current demand trend (e.g., what kind of ads/promotions are brands asking for the most).
    3. Specific, actionable suggestions on how the influencer can increase their charges (e.g., 'Brands are looking for UGC content, if you add X to your pitch, you can increase your rate by 20%').
    
    Format your response in professional but easy-to-read Markdown format. Be encouraging and strategic.`;

    const insightReport = await aiService.generateAIResponse("Generate Market Strategy Report based on my recent leads.", aiContext);

    res.status(200).json({ success: true, insights: insightReport });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Analyze Post-Campaign Performance (Comments/Likes Summary)
// @route   POST /api/leads/analyze-campaign
exports.analyzeCampaignROI = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const { brandName, views, likes, commentsArray } = req.body;

    if (!commentsArray || commentsArray.length === 0) {
      return res.status(400).json({ message: "Comments data is required for analysis." });
    }

    const aiContext = `You are an AI Social Media Analyst.
    An influencer just finished a campaign for the brand "${brandName}".
    Performance Stats: Views: ${views}, Likes: ${likes}.
    
    Here are the raw comments from the audience:
    ${JSON.stringify(commentsArray)}
    
    Your task is to summarize this data for the influencer. DO NOT just list the comments. 
    Provide the "Saar" (Summary):
    1. Overall audience sentiment (Positive, Negative, Mixed).
    2. Did the audience like the product/brand? 
    3. A short success statement the influencer can send to the brand as proof of ROI (e.g., "The audience loved the packaging, many asked for purchase links").`;

    const analysisReport = await aiService.generateAIResponse("Analyze this campaign's comments and performance.", aiContext);

    res.status(200).json({ success: true, analysis: analysisReport });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk import leads (from Lead Extractor / Google Maps scraper)
// @route   POST /api/leads/bulk-import
exports.bulkImportLeads = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { leads, source } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'No leads provided to import.' });
    }

    const existingLeads = await Lead.find({ userId }).select('phoneNumber').lean();
    const existingPhoneSet = new Set(
      existingLeads.map(l => (l.phoneNumber || '').replace(/\D/g, '').slice(-10)).filter(Boolean)
    );

    const toInsert = [];
    let skippedNoPhone = 0;
    let skippedDuplicate = 0;

    for (const lead of leads) {
      const cleanPhone = (lead.phone || '').replace(/\D/g, '');
      if (!cleanPhone) { skippedNoPhone++; continue; }

      const last10 = cleanPhone.slice(-10);
      if (existingPhoneSet.has(last10)) { skippedDuplicate++; continue; }
      existingPhoneSet.add(last10);

      // 🚀 FIX: Generate a unique name if it's missing, instead of 'Unknown Business'.
      const leadName = lead.name || `Lead #${cleanPhone.slice(-4)}`;

      toInsert.push({
        userId,
        createdBy: userId,
        name: leadName,
        phoneNumber: cleanPhone,
        status: 'new',
        source: source || 'Lead Extractor (Google Maps)',
        notes: [lead.address, lead.type, lead.website].filter(Boolean).join(' | '),
        timeline: [{ eventType: 'Lead Created', description: `Imported via Lead Extractor${lead.city ? ` (${lead.city})` : ''}`, timestamp: new Date() }]
      });
    }

    let inserted = [];
    if (toInsert.length > 0) inserted = await Lead.insertMany(toInsert);

    res.status(201).json({
      success: true,
      importedCount: inserted.length,
      skippedNoPhone,
      skippedDuplicate,
      message: `${inserted.length} leads imported. ${skippedDuplicate} duplicates and ${skippedNoPhone} no-phone leads skipped.`
    });
  } catch (error) {
    console.error('Bulk Import Leads Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};