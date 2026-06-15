const Campaign = require('../models/campaignModel');
const aiService = require('../services/aiService');
const IvrCampaign = require('../models/ivrCampaignModel');
const User = require('../models/userModel');
const Lead = require('../models/leadModel');

// @desc    Generate AI Ad Strategy & Save Campaign
// @route   POST /api/campaigns/generate
exports.generateCampaign = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { prompt, mode, targeting } = req.body;

    // TRUE AI TARGETING & AD GENERATION
    const aiContext = `You are a world-class Meta Ads (Facebook/Instagram) Strategist. 
    The user wants to run an ad for: "${prompt}".
    
    Generate a highly converting ad copy and logically deduce the BEST targeting parameters for this specific product/service.
    Respond ONLY with a valid JSON object (no markdown formatting, no backticks) in this exact format:
    {
      "headline": "Catchy short headline with emoji",
      "primaryText": "Engaging main ad text with a call to action",
      "targetAudience": "Age: [suggested age] | Gender: [suggested gender] | Interests: [5-6 highly relevant detailed interests]",
      "budget": "₹500/day estimated for best results",
      "imageIdea": "Detailed description of what the ad image/video should show for maximum CTR",
      "aiExplanation": "Briefly explain WHY you chose this specific audience and strategy.",
      "refinementQuestions": ["A short, clickable suggestion to improve the ad (e.g., Target only luxury buyers?)", "Another suggestion (e.g., Mention an EMI offer?)"]
    }`;

    const aiResultStr = await aiService.generateAIResponse("Generate Meta Ad Strategy", aiContext);
    
    let generatedAdData;
    try {
      // Clean markdown if AI returns it
      const cleaned = aiResultStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      generatedAdData = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('AI JSON Parse Error:', parseError, 'Raw string:', aiResultStr);
      throw new Error('AI failed to generate a valid strategy structure. Please try again.');
    }

    const generatedAd = {
      headline: generatedAdData.headline,
      primaryText: generatedAdData.primaryText,
      // AI decides the audience completely if automatic, otherwise combines manual inputs with AI thoughts
      audience: mode === 'automatic' 
        ? `🧠 AI Discovered Audience -> ${generatedAdData.targetAudience}`
        : `Loc: ${targeting?.city || ''} ${targeting?.state || ''} ${targeting?.country || ''} | Age: ${targeting?.ageMin}-${targeting?.ageMax} | Gender: ${targeting?.gender || 'All'} | Interests: ${targeting?.interests || generatedAdData.targetAudience} | Retargeting: ${targeting?.retargetType !== 'none' ? targeting?.retargetType : 'Cold'}`,
      budget: generatedAdData.budget,
      imageIdea: generatedAdData.imageIdea,
      aiExplanation: generatedAdData.aiExplanation || "AI auto-optimized the best settings based on your prompt.",
      refinementQuestions: generatedAdData.refinementQuestions || []
    };

    const newCampaign = await Campaign.create({ userId, prompt, mode, targeting, generatedAd });
    res.status(201).json({ success: true, campaign: newCampaign });
  } catch (error) {
    console.error('Campaign Generation Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get All IVR Voice Campaigns
// @route   GET /api/campaigns/ivr
exports.getIvrCampaigns = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const campaigns = await IvrCampaign.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Trigger Test Call for IVR Campaign
// @route   POST /api/campaigns/ivr/:id/test
exports.testIvrCampaign = async (req, res) => {
  try {
    const { testNumber } = req.body;
    const campaignId = req.params.id;
    const userId = req.user?._id || req.user?.id;
    
    const user = await User.findById(userId);
    const campaign = await IvrCampaign.findOne({ _id: campaignId, userId });
    
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    if (!testNumber) return res.status(400).json({ success: false, message: 'Test phone number is required' });
    
    // Initiate Twilio Call
    if (user && user.twilioConfig && user.twilioConfig.accountSid && user.twilioConfig.authToken && user.twilioConfig.phoneNumber) {
      const twilio = require('twilio')(user.twilioConfig.accountSid, user.twilioConfig.authToken);
      
      const host = req.headers.host || (process.env.BASE_URL ? process.env.BASE_URL.replace(/^https?:\/\//, '') : '');
      const webhookUrl = `https://${host}/api/webhooks/twilio/ivr?campaignId=${campaign._id}`;
      
      await twilio.calls.create({ url: webhookUrl, to: testNumber, from: user.twilioConfig.phoneNumber });
      
      return res.status(200).json({ success: true, message: 'Test call initiated successfully! Your phone is ringing.' });
    } else {
      return res.status(400).json({ success: false, message: 'Twilio config missing. Please set up Twilio in settings first.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk Auto-Dialer for IVR Campaign with Loop Prevention
// @route   POST /api/campaigns/ivr/:id/bulk-dial
exports.bulkDialIvr = async (req, res) => {
  try {
    const campaignId = req.params.id;
    const userId = req.user?._id || req.user?.id;
    
    const user = await User.findById(userId);
    const campaign = await IvrCampaign.findOne({ _id: campaignId, userId });
    
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    if (!user || !user.twilioConfig || !user.twilioConfig.accountSid) return res.status(400).json({ success: false, message: 'Twilio config missing.' });

    // 🚀 LOOP PREVENTION: Fetch only leads not converted, and called less than 3 times
    const leads = await Lead.find({ userId, status: { $nin: ['converted', 'won', 'ignored'] }, $or: [{ callCount: { $lt: 3 } }, { callCount: { $exists: false } }] }).limit(50);
    
    if (leads.length === 0) return res.status(400).json({ success: false, message: 'No eligible leads found for calling (Max 3 retries reached or already converted).' });

    const twilio = require('twilio')(user.twilioConfig.accountSid, user.twilioConfig.authToken);
    const host = req.headers.host || (process.env.BASE_URL ? process.env.BASE_URL.replace(/^https?:\/\//, '') : '');
    const webhookUrl = `https://${host}/api/webhooks/twilio/ivr?campaignId=${campaign._id}`;

    let dialed = 0;
    for (const lead of leads) {
      if (lead.phoneNumber) {
         let formatted = lead.phoneNumber.startsWith('+') ? lead.phoneNumber : '+' + (lead.phoneNumber.length === 10 ? '91' + lead.phoneNumber : lead.phoneNumber);
         await twilio.calls.create({ url: webhookUrl, to: formatted, from: user.twilioConfig.phoneNumber }).catch(() => {});
         await Lead.findByIdAndUpdate(lead._id, { $inc: { callCount: 1 }, lastCalledAt: new Date() }, { strict: false });
         dialed++;
      }
    }
    res.status(200).json({ success: true, message: `Successfully queued ${dialed} calls. Loop prevention active (Max 3 calls per lead).` });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// @desc    Get All User Campaigns
// @route   GET /api/campaigns
exports.getCampaigns = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const campaigns = await Campaign.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};