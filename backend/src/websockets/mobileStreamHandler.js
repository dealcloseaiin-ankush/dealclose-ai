const deepgramSdk = require('@deepgram/sdk');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Call = require('../models/callModel');

module.exports = function (ws) {
  let callSid = 'MOBILE_' + Date.now(); 
  let rawTranscript = []; 
  let conversationHistory = [];
  
  // 1. Initialize APIs
  console.log(`\n================== [AI CALLING DEBUG] ==================`);
  console.log(`🔑 DEEPGRAM_API_KEY Check:`, process.env.DEEPGRAM_API_KEY ? `LOADED (Length: ${process.env.DEEPGRAM_API_KEY.length})` : `MISSING!`);
  console.log(`🔑 OPENAI_API_KEY Check:`, process.env.OPENAI_API_KEY ? `LOADED` : `MISSING!`);
  console.log(`========================================================\n`);

  if (!process.env.DEEPGRAM_API_KEY) {
    console.error("❌ DEEPGRAM_API_KEY is missing in Env! Closing WebSocket.");
    if (ws.readyState === 1) ws.send(JSON.stringify({ event: 'error', data: 'DEEPGRAM_API_KEY missing on server' }));
    return ws.close();
  }

  let deepgram;
  if (typeof deepgramSdk.createClient === 'function') {
    deepgram = deepgramSdk.createClient(process.env.DEEPGRAM_API_KEY);
  } else if (typeof deepgramSdk.Deepgram === 'function') {
    deepgram = new deepgramSdk.Deepgram(process.env.DEEPGRAM_API_KEY);
  } else if (typeof deepgramSdk.DeepgramClient === 'function') {
    deepgram = new deepgramSdk.DeepgramClient(process.env.DEEPGRAM_API_KEY);
  } else {
    deepgram = new deepgramSdk.DefaultDeepgramClient(process.env.DEEPGRAM_API_KEY);
  }
  const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy' ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
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
    console.log(`✅ [Deepgram STT] Live connection initiated successfully.`);
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
  
  deepgramLive.on('Error', (err) => {
    console.error(`❌ [Deepgram STT Error]:`, err);
  });

  async function processAIResponse() {
    try {
      console.log(`🧠 [AI Soch Raha Hai...]`);
      let aiText = "";

      const systemPromptText = "You are a friendly DealClose AI calling assistant working through a mobile app. Keep answers short (1 sentence). Speak in Hinglish.";

      let useGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy');

      // 1. Try Gemini First
      if (useGemini && genAI) {
         console.log(`🧠 [AI] Using Gemini 2.5 Flash...`);
         try {
             const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
             let promptStr = systemPromptText + "\n\nConversation History:\n";
             conversationHistory.forEach(msg => { promptStr += `${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.content}\n`; });
             promptStr += "AI:";
             
             const result = await model.generateContent(promptStr);
             aiText = result.response.text();
         } catch (geminiErr) {
             console.error(`⚠️ [AI] Gemini Error: ${geminiErr.message}. Falling back to OpenAI...`);
             useGemini = false; 
         }
      }

      // 2. Fallback to OpenAI
      if (!useGemini) {
          if (!openai) throw new Error("OpenAI API Key is missing and Gemini failed.");
          console.log(`🧠 [AI] Using OpenAI GPT-4o-mini...`);
          const chatCompletion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: systemPromptText }, ...conversationHistory] });
          aiText = chatCompletion.choices[0].message.content;
      }

      aiText = aiText.replace(/\*/g, '').trim();
      conversationHistory.push({ role: "assistant", content: aiText });

      console.log(`🤖 [AI Agent]: ${aiText}`);
      rawTranscript.push({ speaker: 'AI', text: aiText, time: new Date() });

      // Convert AI Text to Audio (Deepgram Aura TTS)
      console.log(`🔊 [TTS] Converting text to speech...`);
      const ttsResponse = await deepgram.speak.request(
        { text: aiText },
        { model: 'aura-asteria-en', encoding: 'linear16', sample_rate: 16000, container: 'none' } 
      );
      
      console.log(`✅ [TTS] Audio stream received from Deepgram.`);

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