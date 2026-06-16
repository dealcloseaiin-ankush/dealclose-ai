const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const Call = require('../models/callModel');
const User = require('../models/userModel');
const IvrCampaign = require('../models/ivrCampaignModel');

// @desc    Handle incoming/outgoing Twilio Voice Call (Direct AI Calling)
// @route   POST /api/webhooks/twilio/voice 
exports.handleTwilioVoice = (req, res) => {
  const twiml = new VoiceResponse();
  
  const fromPhone = req.body.From;
  if (fromPhone) {
    const Lead = require('../models/leadModel');
    // Find lead async and push event
    Lead.findOneAndUpdate({ phoneNumber: { $regex: new RegExp(fromPhone.replace(/\D/g, '').slice(-10) + '$') } }, { $push: { timeline: { eventType: 'Call Received', description: `Inbound call from ${fromPhone}`, timestamp: new Date() } } }).exec().catch(()=>{});
  }

  // WebSocket URL automatically banayega (http -> ws)
  const host = req.headers.host || (process.env.BASE_URL ? process.env.BASE_URL.replace(/^https?:\/\//, '') : '');
  const wsUrl = `wss://${host}/api/webhooks/twilio/stream`;

  console.log(`📞 [Twilio Webhook] Call Connected. Attaching Live Media Stream to: ${wsUrl}`);

  const connect = twiml.connect();
  connect.stream({ url: wsUrl });

  res.type('text/xml').send(twiml.toString());
};

// @desc    Handle Recorded IVR Call (1 dabao to connect to AI)
// @route   POST /api/webhooks/twilio/ivr
exports.handleTwilioIVR = async (req, res) => {
  const twiml = new VoiceResponse();
  
  try {
    const toPhone = req.body.To; // Kis virtual number par call aayi hai
    const campaignId = req.query.campaignId; // Agar dashboard se test call aayi hai
    
    // Dynamic Lookup from Database
    const campaign = campaignId 
      ? await IvrCampaign.findById(campaignId) 
      : await IvrCampaign.findOne({ twilioPhoneNumber: toPhone, isActive: true });
    
    // Fallback URL directly passed via API
    const audioUrl = req.query.audioUrl || req.body.audioUrl || (campaign ? campaign.audioUrl : null);

    if (campaign && campaign.isDirectAI) {
      // Seedha AI se baat karao bina button dabaye
      console.log(`📞 [Dynamic IVR] Campaign is set to Direct AI. Handoff...`);
      const host = req.headers.host || (process.env.BASE_URL ? process.env.BASE_URL.replace(/^https?:\/\//, '') : '');
      twiml.connect().stream({ url: `wss://${host}/api/webhooks/twilio/stream` });
    } else {
      // 🚀 Play Cloudinary MP3 and wait for Keypad Input (1, 2, 3...)
      const gather = twiml.gather({
        numDigits: 1,
        action: `/api/webhooks/twilio/ivr-gather?campaignId=${campaign ? campaign._id : ''}`,
        method: 'POST',
        timeout: 5
      });
      
      if (audioUrl) {
        gather.play(audioUrl);
      } else {
        gather.say({ voice: 'alice' }, "Press 1 to speak with our AI assistant. Press 2 to talk to sales.");
      }
      
      twiml.say({ voice: 'alice' }, 'No input received. Have a great day. Goodbye!');
      twiml.hangup();
    }
    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error("IVR Error:", error);
    twiml.say('System Error');
    res.type('text/xml').send(twiml.toString());
  }
};

// @desc    Handle User Input from IVR (1 pressed -> AI Handoff)
// @route   POST /api/webhooks/twilio/ivr-gather
exports.handleTwilioIVRGather = async (req, res) => {
  const twiml = new VoiceResponse();
  const digits = req.body.Digits;
  const campaignId = req.query.campaignId;

  try {
    const host = req.headers.host || (process.env.BASE_URL ? process.env.BASE_URL.replace(/^https?:\/\//, '') : '');
    
    // Agar specific campaign chal rahi hai
    if (campaignId) {
      const campaign = await IvrCampaign.findById(campaignId);
      if (campaign && campaign.menuOptions && campaign.menuOptions.has(digits)) {
        const option = campaign.menuOptions.get(digits);
        
        if (option.action === 'connect_to_ai') {
          twiml.connect().stream({ url: `wss://${host}/api/webhooks/twilio/stream` });
        } else if (option.action === 'forward_to_human' && option.targetPhone) {
          twiml.say({ voice: 'alice' }, "Forwarding your call to our human representative.");
          twiml.dial(option.targetPhone);
        } else if (option.action === 'play_message' && option.replyAudioUrl) {
          twiml.play(option.replyAudioUrl);
          twiml.hangup();
        }
        return res.type('text/xml').send(twiml.toString());
      }
    }

    // Fallback Default Behavior (Agar Campaign DB me na ho)
    if (digits === '1') {
      console.log(`📞 [IVR Handoff] Default fallback. Connecting to AI...`);
      twiml.connect().stream({ url: `wss://${host}/api/webhooks/twilio/stream` });
    } else {
      twiml.say({ voice: 'alice' }, "Invalid option. Goodbye.");
      twiml.hangup();
    }
    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
};