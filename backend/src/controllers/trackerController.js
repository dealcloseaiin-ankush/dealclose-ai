const TrackingEvent = require('../models/trackingEventModel');

// @desc    Track website events from external pixel (No Auth required for pixel)
// @route   POST /api/track
exports.trackEvent = async (req, res) => {
  try {
    const { workspaceId, event, url, visitorId, metadata } = req.body;
    
    // Save the event to the database
    await TrackingEvent.create({
      workspaceId,
      event,
      url,
      visitorId,
      metadata
    });

    res.status(200).json({ success: true, message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Tracking Error:', error);
    res.status(500).json({ success: false, message: 'Tracking failed' });
  }
};