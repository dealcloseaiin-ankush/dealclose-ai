const Call = require('../models/callModel');
const callService = require('../services/callService');
const User = require('../models/userModel');
const twilio = require('twilio');

// @desc    Get call history
// @route   GET /api/calls
exports.getCalls = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { workspaceId } = req.query;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    
    const query = { userId };
    if (workspaceId && workspaceId !== 'main' && workspaceId !== 'all') {
      query.workspaceId = workspaceId;
    } else if (workspaceId === 'main') {
      query.$or = [{ workspaceId: 'main' }, { workspaceId: { $exists: false } }, { workspaceId: null }];
    }

    const calls = await Call.find(query).sort({ createdAt: -1 });
    res.status(200).json(calls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Initiate a call
// @route   POST /api/calls/dial
exports.initiateCall = async (req, res) => {
  const { phoneNumber, leadId } = req.body;
  const userId = req.user?._id || req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    const user = await User.findById(userId);
    let newCall;

    // 🚀 OPTION 1: USER'S OWN TWILIO NUMBER (If Configured in Settings)
    if (user && user.twilioConfig && user.twilioConfig.accountSid && user.twilioConfig.authToken && user.twilioConfig.phoneNumber) {
      console.log(`📞 [Calling] Using User's Custom Twilio Number...`);
      const client = twilio(user.twilioConfig.accountSid, user.twilioConfig.authToken);
      
      const call = await client.calls.create({
        url: `${process.env.BASE_URL}/api/webhooks/twilio/voice`, // Yahan WebSocket ka route aayega
        to: phoneNumber,
        from: user.twilioConfig.phoneNumber
      });

      newCall = await Call.create({
        userId,
        sid: call.sid, 
        to: phoneNumber,
        status: call.status, 
        leadId: leadId,
        provider: 'twilio_custom'
      });
    } 
    // 🚀 OPTION 2: PLATFORM'S MASTER EXOTEL NUMBER (Default System)
    else {
      console.log(`📞 [Calling] Using Master Exotel Number...`);
      const exotelNumber = process.env.EXOTEL_EXOPHONE;
      const webhookUrl = `${process.env.BASE_URL}/api/webhooks/voice`;
      const call = await callService.initiateCall(phoneNumber, exotelNumber, webhookUrl);

      newCall = await Call.create({
        userId,
        sid: call.Sid || call.sid || Date.now().toString(), 
        to: phoneNumber,
        status: call.Status || call.status || 'queued', 
        leadId: leadId,
        provider: 'exotel_master'
      });
    }

    res.status(200).json({ success: true, message: 'Call initiated', call: newCall });
  } catch (error) {
    console.error('Exotel Error:', error);
    res.status(500).json({ message: 'Failed to initiate call', error: error.message });
  }
};