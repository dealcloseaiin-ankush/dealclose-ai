const Lead = require('../models/leadModel');
const aiService = require('../services/aiService');

// @desc    Get all leads
// @route   GET /api/leads
exports.getLeads = async (req, res) => {
  try {
    // Future: Filter by req.user.id
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new lead
// @route   POST /api/leads
exports.createLead = async (req, res) => {
  try {
    const { name, phoneNumber, email, status, source, createdBy } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({ message: 'Name and Phone Number are required' });
    }

    const lead = await Lead.create({
      name,
      phoneNumber,
      email,
      status,
      source,
      createdBy // Frontend se bhejna padega abhi ke liye
    });

    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export leads to CSV
// @route   GET /api/leads/export
exports.exportLeads = async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    
    // Simple CSV Generation
    const headers = ['Name', 'Phone', 'Email', 'Status', 'Source', 'Created At'];
    const csvRows = [headers.join(',')];
    
    leads.forEach(lead => {
      const dateStr = new Date(lead.createdAt).toLocaleDateString();
      csvRows.push(`${lead.name},${lead.phoneNumber},${lead.email || 'N/A'},${lead.status},${lead.source},${dateStr}`);
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads_export.csv"');
    res.status(200).send(csvRows.join('\n'));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Lead Analytics for Dashboard Graphs
// @route   GET /api/leads/analytics
exports.getLeadAnalytics = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : null;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const totalLeads = await Lead.countDocuments({ userId });
    const converted = await Lead.countDocuments({ userId, status: 'converted' });
    const interested = await Lead.countDocuments({ userId, status: 'interested' });
    const ignored = await Lead.countDocuments({ userId, status: 'ignored' });
    
    // Calculations
    const conversionRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(2) : 0;
    
    // For now, setting a fixed investment mock value (e.g. ₹500 AI cost). 
    // Future me isko User ki exact wallet usage se fetch karenge.
    const totalInvestment = 500; 
    const costPerLead = totalLeads > 0 ? (totalInvestment / totalLeads).toFixed(2) : 0;

    const graphData = [
      { name: 'Converted', value: converted },
      { name: 'Interested', value: interested },
      { name: 'Ignored', value: ignored }
    ];

    res.status(200).json({
      stats: { totalLeads, converted, conversionRate, totalInvestment, costPerLead },
      graphData
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