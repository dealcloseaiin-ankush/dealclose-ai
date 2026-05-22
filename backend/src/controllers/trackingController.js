const TrackingActivity = require('../models/trackingModel');

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