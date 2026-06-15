const Lead = require('../models/leadModel');
const Contact = require('../models/contactModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const aiService = require('../services/aiService');
const mongoose = require('mongoose');
const whatsappService = require('../services/whatsappService');

// @desc    Get all leads
// @route   GET /api/leads
exports.getLeads = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const leads = await Lead.find({ userId }).sort({ createdAt: -1 });
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

    const lead = await Lead.create({
      userId,
      name,
      phoneNumber,
      email,
      status,
      source,
      createdBy: userId 
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
      { $set: { status } },
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
    let deletedRecord = null;

    console.log(`\n🗑️ [DEBUG DELETE] Attempting to PERMANENTLY Delete Lead with ID: ${id} for User: ${userId}`);

    // 🚀 FIX: HARD DELETE
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        deletedRecord = await Lead.findOneAndDelete({ _id: id, userId });
      }
    } catch (e) {
      console.log(`⚠️ [DEBUG DELETE] Error querying Lead by ObjectId:`, e.message);
    }

    if (!deletedRecord) {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          deletedRecord = await Contact.findOneAndDelete({ _id: id, userId });
        }
      } catch (e) {
        console.log(`⚠️ [DEBUG DELETE] Error querying Contact by ObjectId:`, e.message);
      }
    }

    if (!deletedRecord) {
      deletedRecord = await Lead.findOneAndDelete({ phoneNumber: id, userId });
    }
    if (!deletedRecord) {
      deletedRecord = await Contact.findOneAndDelete({ $or: [{ phone: id }, { phoneNumber: id }], userId });
    }
    
    if (!deletedRecord) {
      console.log(`❌ [DEBUG DELETE] Failed: No record found for ID/Phone: ${id}`);
      return res.status(404).json({ message: 'Lead or Contact not found' });
    }
    
    const phoneToClean = deletedRecord.phoneNumber || deletedRecord.phone;
    if (phoneToClean) {
      await Message.deleteMany({ customerPhone: phoneToClean, userId });
      console.log(`🧹 [DEBUG DELETE] Wiped all messages for ${phoneToClean} to keep Database CLEAN.`);
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
    const leads = await Lead.find({ userId }).sort({ createdAt: -1 }).lean();
    const contacts = await Contact.find({ userId }).sort({ createdAt: -1 }).lean();
    
    // Simple CSV Generation
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
    const { targetPhoneNumber } = req.body;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!targetPhoneNumber) return res.status(400).json({ message: 'Target phone number is required.' });

    const user = await User.findById(userId).lean();
    if (!user || !user.whatsappConfig || !user.whatsappConfig.accessToken) {
      return res.status(400).json({ message: 'WhatsApp configuration missing.' });
    }

    // Get the latest 50 CRM leads
    const leads = await Lead.find({ userId }).sort({ createdAt: -1 }).limit(50).lean();
    
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

    const { workspaceId } = req.query;
    console.log(`🔍 [Lead Analytics Debug] Fetching graph data for userId: ${userId}, workspace: ${workspaceId}`);
    const userIdObj = new mongoose.Types.ObjectId(userId);

    //  DYNAMIC WORKSPACE FILTER LOGIC
    // 🚀 FIX: Ignore visitor, unqualified, AND 'deleted' statuses
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
          // Handle older chats mapped to 'default'
          { lastSelectedWorkspaceId: 'default' },
          { lastSelectedWorkspaceId: { $exists: false } },
          { lastSelectedWorkspaceId: null },
          { lastSelectedWorkspaceId: '' }
        ]
      };
      Object.assign(leadQuery, mainFilter);
      Object.assign(aggLeadQuery, mainFilter);
    }

    const totalLeads = await Lead.countDocuments(leadQuery);
    const converted = await Lead.countDocuments({ ...leadQuery, status: 'converted' });
    const interested = await Lead.countDocuments({ ...leadQuery, status: 'interested' });
    const ignored = await Lead.countDocuments({ ...leadQuery, status: 'ignored' });
    const newLeads = await Lead.countDocuments({ ...leadQuery, status: 'new' });
    const lost = await Lead.countDocuments({ ...leadQuery, status: 'lost' });
    
    console.log(`📊 [Lead Analytics Debug] Found -> New: ${newLeads}, Interested: ${interested}, Converted: ${converted}, Lost/Ignored: ${lost + ignored}`);
    
    // Calculations
    const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(2) : 0;
    
    // 🚀 NEW: Fetch User Message Stats first to calculate LIVE costs
    const user = await User.findById(userIdObj).lean();
    const messageStats = user?.messageStats || { sent: 0, delivered: 0, read: 0 };

    // 🚀 LIVE: Total Investment calculated based on WhatsApp messages sent (₹0.80 per msg approx)
    const totalInvestment = messageStats.sent * 0.80; 
    const costPerLead = totalLeads > 0 ? (totalInvestment / totalLeads).toFixed(2) : 0;

    const graphData = [
      { name: 'New (Chatting)', value: newLeads },
      { name: 'Interested', value: interested },
      { name: 'Converted', value: converted },
      { name: 'Lost/Ignored', value: ignored + lost }
    ];

    // 🚀 NEW: Lead Source Breakdown (Bar Chart)
    const leadsBySource = await Lead.aggregate([
      { $match: aggLeadQuery },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $project: { name: '$_id', leads: '$count', _id: 0 } },
      { $sort: { leads: -1 } }
    ]);

    // 🚀 NEW: Daily Lead Trend (Line Chart for last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dailyLeadsData = await Lead.aggregate([
        { $match: { ...aggLeadQuery, createdAt: { $gte: sevenDaysAgo } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', leads: '$count', _id: 0 } }
    ]);

    // 🚀 NEW: Fetch Recent Activity for Live AI Activity Section
    const recentActivity = await Lead.find(leadQuery)
      .sort({ updatedAt: -1 })
      .limit(8)
      .select('name status source createdAt updatedAt notes aiFeedbackScore');

    // 🚀 NEW: Advanced Reply Analytics
    const replyAnalytics = await Message.aggregate([
        { $match: { userId: userIdObj } },
        {
            $group: {
                _id: '$direction',
                uniqueCustomers: { $addToSet: '$customerPhone' },
                // For outgoing messages, group by sentBy
                botReplies: { $sum: { $cond: [ { $and: [ { $eq: ['$direction', 'outgoing'] }, { $in: ['$sentBy', ['auto-reply', 'system']] } ] }, 1, 0 ] } },
                aiReplies: { $sum: { $cond: [ { $and: [ { $eq: ['$direction', 'outgoing'] }, { $eq: ['$sentBy', 'ai'] } ] }, 1, 0 ] } },
                humanReplies: { $sum: { $cond: [ { $and: [ { $eq: ['$direction', 'outgoing'] }, { $eq: ['$sentBy', 'staff'] } ] }, 1, 0 ] } },
            }
        }
    ]);

    let customersReplied = 0;
    let weRepliedTo = 0;
    let botReplyCount = 0;
    let aiReplyCount = 0;
    let humanReplyCount = 0;

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

    res.status(200).json({
      stats: { totalLeads, converted, conversionRate, totalInvestment, costPerLead },
      graphData,
      leadsBySource,
      dailyLeads: dailyLeadsData,
      messageStats,
      recentActivity,
      advancedStats,
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

    // Get the last 50 interested/won deals (brands approaching the influencer)
    const recentLeads = await Lead.find({ 
      userId, 
      source: { $regex: /Instagram/i } 
    }).sort({ createdAt: -1 }).limit(50);

    if (recentLeads.length < 5) {
      return res.status(200).json({ 
        message: "Not enough data yet. Let the AI talk to at least 5 brands to generate market insights." 
      });
    }

    // Create a summarized string of recent deals
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