const TrackingActivity = require('../models/trackingModel');
const User = require('../models/userModel');
const Lead = require('../models/leadModel');

// @desc    Serve the tracking pixel JavaScript
// @route   GET /api/pixel.js
exports.servePixel = (req, res) => {
  const script = `
    (function() {
      const track = (event, data = {}) => {
        const userId = window.DealCloseTracker?.apiKey;
        if (!userId) return;
        
        // Determine API URL dynamically based on script source
        const apiUrl = new URL(document.currentScript.src).origin + '/api/tracking/event';
        
        fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, pageUrl: window.location.href, userId, data })
        }).catch(e => console.error('DealClose Tracker Error:', e));
      };
      window.DealCloseTracker = window.DealCloseTracker || {};
      window.DealCloseTracker.track = track;
    })();
  `;
  res.type('application/javascript').send(script);
};

// @desc    Record a tracking event
// @route   POST /api/tracking/event
exports.recordEvent = async (req, res) => {
  try {
    const { event, pageUrl, userId, data } = req.body;
    if (!userId || !event) return res.status(400).send('Missing data');
    
    await TrackingActivity.create({ userId, event, pageUrl, metadata: data });
    res.status(200).send('Event recorded');
  } catch (error) {
    console.error("Tracking Error:", error);
    res.status(500).send('Error');
  }
};

// @desc    Record a Bio Link / Digital Card Hub Page View
// @route   POST /api/tracking/view-card
exports.recordCardView = async (req, res) => {
  try {
    const { userId, workspaceId, referrer } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    // Track activity
    await TrackingActivity.create({
      userId,
      event: 'card_view',
      pageUrl: `/card/${userId}`,
      metadata: { workspaceId, referrer, timestamp: new Date() }
    });

    // Increment user totalViews
    const user = await User.findById(userId);
    if (user) {
      if (!user.digitalCardConfig) {
        user.digitalCardConfig = { totalViews: 0, totalClicks: 0, customLinks: [] };
      }
      user.digitalCardConfig.totalViews = (user.digitalCardConfig.totalViews || 0) + 1;

      // Also update workspace totalViews if present
      if (workspaceId && Array.isArray(user.workspaces)) {
        const ws = user.workspaces.find(w => String(w._id) === String(workspaceId) || String(w.id) === String(workspaceId) || String(w.name).toLowerCase() === String(workspaceId).toLowerCase());
        if (ws) {
          if (!ws.digitalCardConfig) ws.digitalCardConfig = { totalViews: 0, totalClicks: 0, customLinks: [] };
          ws.digitalCardConfig.totalViews = (ws.digitalCardConfig.totalViews || 0) + 1;
        }
      }

      user.markModified('digitalCardConfig');
      user.markModified('workspaces');
      await user.save();
    }

    res.status(200).json({ success: true, message: 'Card view tracked successfully' });
  } catch (error) {
    console.error("Card View Tracking Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Track Link Click on Bio Hub & Auto Capture Lead for Paid Tier
// @route   POST /api/tracking/click-link
exports.clickLink = async (req, res) => {
  try {
    const { userId, workspaceId, linkId, linkTitle, linkUrl, visitorName, visitorPhone, visitorCity } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 1. Record in TrackingActivity
    await TrackingActivity.create({
      userId,
      event: 'link_click',
      pageUrl: linkUrl || `/card/${userId}`,
      metadata: {
        linkId,
        linkTitle: linkTitle || 'Custom Link',
        linkUrl,
        workspaceId,
        visitorName,
        visitorPhone,
        timestamp: new Date()
      }
    });

    // 2. Increment click counters in user.digitalCardConfig or workspace
    if (!user.digitalCardConfig) {
      user.digitalCardConfig = { totalViews: 0, totalClicks: 0, customLinks: [] };
    }
    user.digitalCardConfig.totalClicks = (user.digitalCardConfig.totalClicks || 0) + 1;

    // Update specific link click count in global customLinks
    if (Array.isArray(user.digitalCardConfig.customLinks)) {
      const targetLink = user.digitalCardConfig.customLinks.find(l => String(l.id) === String(linkId) || l.title === linkTitle || l.url === linkUrl);
      if (targetLink) {
        targetLink.clicks = (targetLink.clicks || 0) + 1;
      }
    }

    // Update in workspace if provided
    if (workspaceId && Array.isArray(user.workspaces)) {
      const ws = user.workspaces.find(w => String(w._id) === String(workspaceId) || String(w.id) === String(workspaceId) || String(w.name).toLowerCase() === String(workspaceId).toLowerCase());
      if (ws) {
        if (!ws.digitalCardConfig) ws.digitalCardConfig = { totalViews: 0, totalClicks: 0, customLinks: [] };
        ws.digitalCardConfig.totalClicks = (ws.digitalCardConfig.totalClicks || 0) + 1;
        if (Array.isArray(ws.customLinks)) {
          const wsLink = ws.customLinks.find(l => String(l.id) === String(linkId) || l.title === linkTitle || l.url === linkUrl);
          if (wsLink) wsLink.clicks = (wsLink.clicks || 0) + 1;
        }
      }
    }

    user.markModified('digitalCardConfig');
    user.markModified('workspaces');
    await user.save();

    // 3. 🚀 PRO / PAID TIER VALUE-ADD: Auto Capture Clickers into CRM Leads
    // Paid users automatically get engaged link-click leads captured with details
    let capturedLead = null;
    const isPaid = user.isPremium === true || user.role === 'owner' || user.role === 'superadmin';
    
    if (isPaid && (linkTitle || linkUrl)) {
      try {
        const leadPhone = visitorPhone || `BioClick-${Date.now().toString().slice(-6)}`;
        const leadName = visitorName || (linkTitle ? `Visitor (Clicked: ${linkTitle})` : 'Bio Link Visitor');
        
        capturedLead = await Lead.create({
          userId: user._id,
          createdBy: user._id,
          name: leadName,
          phoneNumber: leadPhone,
          source: 'Bio Link Click',
          status: 'interested',
          notes: `[⭐ Bio Link Hub Click] Visitor clicked link "${linkTitle || 'Custom Link'}" (${linkUrl || 'Direct Link'}). Captured from Digital Card Hub at ${new Date().toLocaleString('en-IN')}.`,
          lastSelectedWorkspaceId: workspaceId || 'main',
          timeline: [{
            eventType: 'bio_link_clicked',
            description: `Clicked link: "${linkTitle || 'Action'}" (${linkUrl})`,
            timestamp: new Date()
          }]
        });
      } catch (leadErr) {
        console.warn('Auto lead capture warning:', leadErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Link click tracked successfully',
      leadCaptured: !!capturedLead,
      isPaid
    });
  } catch (error) {
    console.error("Link Click Tracking Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Detailed Tracking Logs
// @route   GET /api/tracking/logs
exports.getLogs = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Get last 100 live events
    const logs = await TrackingActivity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100);
      
    res.status(200).json(logs);
  } catch (error) {
    console.error("Fetch Logs Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Link Analytics & Performance Metrics (Free vs Pro Tier Breakdown)
// @route   GET /api/tracking/link-analytics
exports.getLinkAnalytics = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isPaid = user.isPremium === true || user.role === 'owner' || user.role === 'superadmin';
    const linkLimit = isPaid ? 999 : 3;

    const workspaceId = req.query.workspaceId || req.query.ws;
    let targetLinks = [];
    let totalViews = user.digitalCardConfig?.totalViews || 0;
    let totalClicks = user.digitalCardConfig?.totalClicks || 0;

    if (workspaceId && Array.isArray(user.workspaces)) {
      const ws = user.workspaces.find(w => String(w._id) === String(workspaceId) || String(w.id) === String(workspaceId) || String(w.name).toLowerCase() === String(workspaceId).toLowerCase());
      if (ws) {
        targetLinks = ws.customLinks || ws.digitalCardConfig?.customLinks || [];
        totalViews = ws.digitalCardConfig?.totalViews || totalViews;
        totalClicks = ws.digitalCardConfig?.totalClicks || totalClicks;
      }
    }

    if (!targetLinks || targetLinks.length === 0) {
      targetLinks = user.digitalCardConfig?.customLinks || [];
    }

    // Calculate CTR
    const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

    // Fetch Last 7 Days Daily Clicks from TrackingActivity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const clickActivities = await TrackingActivity.find({
      userId,
      event: 'link_click',
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: 1 });

    // Group clicks by date
    const dailyClicksMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      dailyClicksMap[dateKey] = 0;
    }

    clickActivities.forEach(act => {
      const dateKey = new Date(act.createdAt).toISOString().split('T')[0];
      if (dailyClicksMap[dateKey] !== undefined) {
        dailyClicksMap[dateKey]++;
      }
    });

    const dailyClicks = Object.keys(dailyClicksMap).map(date => ({
      date: date.slice(5), // MM-DD format
      clicks: dailyClicksMap[date]
    }));

    // Count captured leads from Bio Link clicks
    const capturedLeadsCount = await Lead.countDocuments({
      userId,
      source: 'Bio Link Click'
    });

    res.status(200).json({
      success: true,
      isPaid,
      linkLimit,
      totalViews,
      totalClicks,
      ctr,
      links: targetLinks,
      dailyClicks,
      capturedLeadsCount
    });
  } catch (error) {
    console.error("Link Analytics Error:", error);
    res.status(500).json({ message: error.message });
  }
};