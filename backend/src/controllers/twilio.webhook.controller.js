const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

// @desc    Handle incoming/outgoing Twilio Voice Call (Returns TwiML to start WebSocket stream)
// @route   POST /api/webhooks/twilio/voice
exports.handleTwilioVoice = (req, res) => {
  const twiml = new VoiceResponse();
  
  // WebSocket URL automatically banayega (http -> ws)
  const host = req.headers.host || (process.env.BASE_URL ? process.env.BASE_URL.replace(/^https?:\/\//, '') : '');
  const wsUrl = `wss://${host}/api/webhooks/twilio/stream`;

  console.log(`📞 [Twilio Webhook] Call Connected. Attaching Live Media Stream to: ${wsUrl}`);

  const connect = twiml.connect();
  connect.stream({ url: wsUrl });

  res.type('text/xml').send(twiml.toString());
};