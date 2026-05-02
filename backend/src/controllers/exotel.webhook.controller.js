const aiService = require('../services/aiService');
const Call = require('../models/callModel');

// @desc    Handle incoming voice call (Start of conversation)
// @route   POST /api/webhooks/voice
exports.handleIncomingVoice = (req, res) => {
  const exotelResponse = [
    {
      "say": {
        "text": "Hello, you've reached DealClose AI. How can I help you today?",
        "voice": "female"
      }
    },
    {
      "gather": {
        "action": `${process.env.BASE_URL}/api/webhooks/voice/respond`,
        "method": "POST",
        "finish_on_key": "#",
        "timeout": 5,
        "input_type": "speech"
      }
    }
  ];
  res.json(exotelResponse);
};

// @desc    Handle voice response (Conversation loop)
// @route   POST /api/webhooks/voice/respond
exports.handleVoiceRespond = async (req, res) => {
  const speechResult = req.body.Speech;
  const callSid = req.body.CallSid;
  let exotelResponse = [];

  if (speechResult) {
    try {
      const aiResponseText = await aiService.generateAIResponse(speechResult, "You are a helpful sales agent on a phone call. Keep responses short and conversational.");
      exotelResponse.push({ "say": { "text": aiResponseText, "voice": "female" } });
      exotelResponse.push({ "gather": { "action": `${process.env.BASE_URL}/api/webhooks/voice/respond`, "method": "POST", "timeout": 5, "input_type": "speech" } });
      
      await Call.findOneAndUpdate({ sid: callSid }, { $push: { transcript: { speaker: 'user', text: speechResult } } });
      await Call.findOneAndUpdate({ sid: callSid }, { $push: { transcript: { speaker: 'ai', text: aiResponseText } } });
    } catch (error) {
      exotelResponse.push({ "say": { "text": "I am having some trouble right now. Please try again later.", "voice": "female" } });
      exotelResponse.push({ "hangup": {} });
    }
  } else {
    exotelResponse.push({ "say": { "text": "Sorry, I didn't hear anything. Could you please repeat?", "voice": "female" } });
    exotelResponse.push({ "gather": { "action": `${process.env.BASE_URL}/api/webhooks/voice/respond`, "method": "POST", "timeout": 5, "input_type": "speech" } });
  }
  res.json(exotelResponse);
};