const Call = require('../models/callModel');
const callService = require('../services/callService');

// @desc    Get call history
// @route   GET /api/calls
exports.getCalls = async (req, res) => {
  try {
    const calls = await Call.find().sort({ createdAt: -1 });
    res.status(200).json(calls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Initiate a call
// @route   POST /api/calls/dial
exports.initiateCall = async (req, res) => {
  const { phoneNumber, leadId } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  try {
    // Use the new Exotel service
    const exotelNumber = process.env.EXOTEL_EXOPHONE;
    const webhookUrl = `${process.env.BASE_URL}/api/webhooks/voice`;
    const call = await callService.initiateCall(phoneNumber, exotelNumber, webhookUrl);

    // Save to DB
    const newCall = await Call.create({
      sid: call.Sid, // Exotel uses capital 'S'
      to: phoneNumber,
      status: call.Status, // Exotel uses capital 'S'
      leadId: leadId
    });

    res.status(200).json({ message: 'Call initiated', call: newCall });
  } catch (error) {
    console.error('Exotel Error:', error);
    res.status(500).json({ message: 'Failed to initiate call', error: error.message });
  }
};