const { createClient } = require('@deepgram/sdk');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Call = require('../models/callModel');

module.exports = function (ws) {
  let callSid = 'MOBILE_' + Date.now(); 
  let rawTranscript = []; 
  let conversationHistory = [];
  
  // 1. Initialize APIs
  if (!process.env.DEEPGRAM_API_KEY) {
    console.error("❌ DEEPGRAM_API_KEY is missing in Env! Closing WebSocket.");
    if (ws.readyState === 1) ws.send(JSON.stringify({ event: 'error', data: 'DEEPGRAM_API_KEY missing on server' }));
    return ws.close();
  }

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy' });
  const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

  console.log(`📱 [Mobile Stream] New connection from Android App! Call ID: ${callSid}`);

  // 2. Setup Deepgram Live Transcription
  let deepgramLive;
  try {
    deepgramLive = deepgram.listen.live({
      model: 'nova-2',
      language: 'en-IN',
      smart_format: true,
      encoding: 'linear16',
      sample_rate: 16000,
    });
  } catch (err) {
    console.error("❌ Deepgram Initialization Error:", err.message);
    if (ws.readyState === 1) ws.send(JSON.stringify({ event: 'error', data: 'Failed to connect to AI Ears' }));
    return ws.close();
  }

  deepgramLive.on('Results', async (data) => {
    const transcript = data.channel.alternatives[0].transcript;
    if (transcript && data.is_final) {
      console.log(`👤 [Customer on Mobile]: ${transcript}`);
      rawTranscript.push({ speaker: 'Customer', text: transcript, time: new Date() });
      conversationHistory.push({ role: "user", content: transcript });

      await processAIResponse();
    }
  });

  async function processAIResponse() {
    try {
      console.log(`🧠 [AI Soch Raha Hai...]`);
      let aiText = "";

      const systemPrompt = { 
        role: "system", 
        content: "You are a DealClose AI calling assistant working through a mobile app. Keep answers short (1 sentence). Speak in Hinglish." 
      };

      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [systemPrompt, ...conversationHistory],
      });

      const responseMessage = chatCompletion.choices[0].message;
      conversationHistory.push(responseMessage);
      aiText = responseMessage.content;

      console.log(`🤖 [AI Agent]: ${aiText}`);
      rawTranscript.push({ speaker: 'AI', text: aiText, time: new Date() });

      // Convert AI Text to Audio (Deepgram Aura TTS)
      console.log(`🔊 [TTS] Converting text to speech...`);
      const ttsResponse = await deepgram.speak.request(
        { text: aiText },
        { model: 'aura-asteria-en', encoding: 'linear16', sample_rate: 16000, container: 'none' } 
      );

      const stream = await ttsResponse.getStream();
      const reader = stream.getReader();
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const audioBuffer = Buffer.concat(chunks);
      const base64Audio = audioBuffer.toString('base64');
      
      // Send audio back to Android App
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ event: 'audio', data: base64Audio }));
      }
    } catch (error) {
      console.error("❌ AI/TTS Error:", error.message);
    }
  }

  // 3. Receive Messages from Android App
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.event === 'start') {
        console.log(`📞 [Mobile Stream] Android App started recording.`);
        processAIResponse(); // Initiate first greeting

      } else if (msg.event === 'audio') {
        // Receive raw mic audio from Android
        const audioBuffer = Buffer.from(msg.data, 'base64');
        if (deepgramLive.getReadyState() === 1) {
          deepgramLive.send(audioBuffer);
        }
        
      } else if (msg.event === 'stop') {
        console.log(`🛑 [Mobile Stream] Android App stopped call.`);
        deepgramLive.finish();
      }
    } catch(e) {
       // If sending raw binary instead of JSON
       if (deepgramLive.getReadyState() === 1) {
          deepgramLive.send(message);
       }
    }
  });

  ws.on('close', async () => {
    console.log('🔌 [WebSocket] Mobile App Connection Closed');
    if (deepgramLive.getReadyState() === 1) deepgramLive.finish();
    
    // Save Call Transcript to DB
    if (rawTranscript.length > 0) {
      try {
        await Call.create({ 
            sid: callSid, 
            status: 'completed', 
            provider: 'android_app',
            transcript: rawTranscript,
            summary: 'Call handled via Mobile App' 
        });
        console.log("💾 [DB] Mobile Call Transcript saved successfully.");
      } catch (e) {
        console.log("❌ DB Save Error:", e.message);
      }
    }
  });
};