const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Call = require('../models/callModel');
const WebSocket = require('ws'); // 🚀 NEW: Bulletproof Raw Connection
const Lead = require('../models/leadModel');

// 🚀 GLOBAL CACHE: Taki Fallback Audio ka kharcha baar baar na aaye
let cachedMobileFallbackAudio = null;

// 🌊 ULTRA COST-EFFECTIVE MODELS FOR VOICE ENGINE & SUMMARY
const MODELS = {
  GEMINI_3_1_LIGHT: 'gemini-3.1-flash-light', // Priority 1 (Latest & Fastest for Voice)
  GEMINI_2_5_LIGHT: 'gemini-2.5-flash-light', // Priority 2 (Backup Gemini)
  OPENAI_MINI: 'gpt-4o-mini',                  // Priority 3 (Final AI Fallback)
};

module.exports = function (ws) {
  let callSid = 'MOBILE_' + Date.now(); 
  let rawTranscript = []; 
  let conversationHistory = [];
  let audioChunkCount = 0;
  let activeLeadId = null;
  let activePhone = null;
  let activeUserId = null;
  let activeWorkspaceId = 'main';
  let activeCallGoal = null;
  
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

  const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy' ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

  console.log(`📱 [Mobile Stream] New connection from Android App! Call ID: ${callSid}`);

  // 2. 🚀 Setup Bulletproof Raw STT Connection (Bypasses SDK Bugs)
  let deepgramLive;
  try {
    deepgramLive = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&language=en-IN&smart_format=true&encoding=linear16&sample_rate=16000', {
      headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` }
    });
    
    deepgramLive.on('open', () => {
      console.log(`✅ [Deepgram STT] Live Ears opened successfully.`);
    });

    deepgramLive.on('message', async (data) => {
      const response = JSON.parse(data);
      if (response.channel && response.channel.alternatives[0]) {
        const transcript = response.channel.alternatives[0].transcript;
        if (transcript && response.is_final) {
          console.log(`👤 [Customer on Mobile]: ${transcript}`);
          rawTranscript.push({ speaker: 'Customer', text: transcript, time: new Date() });
          conversationHistory.push({ role: "user", content: transcript });
          await processAIResponse();
        }
      }
    });
    
    deepgramLive.on('error', (err) => {
      console.error(`❌ [Deepgram STT Error]:`, err.message);
    });

  } catch (err) {
    console.error("❌ Deepgram Initialization Error:", err.message);
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: 'error', data: 'Failed to connect to AI Ears' }));
    return ws.close();
  }

  async function processAIResponse() {
    try {
      console.log(`🧠 [AI Soch Raha Hai...]`);
      let aiText = "";

      const systemPromptText = "You are a friendly DealClose AI calling assistant. Keep answers short (1 sentence). Speak in conversational Hinglish. CRITICAL RULE: DO NOT use complex Hindi words. Use simple words so an American AI voice can pronounce them naturally. Do NOT use Devanagari script.";

      let aiSuccess = false;

      // 🚀 MULTI-MODEL FALLBACK ENGINE FOR LIVE STREAMING
      if (genAI) {
        // Level 1: Try Gemini 3.1 Flash Light
        try {
          console.log(`🧠 [AI] Trying model: ${MODELS.GEMINI_3_1_LIGHT}...`);
          const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_3_1_LIGHT });
          let promptStr = systemPromptText + "\n\nConversation History:\n";
          conversationHistory.forEach(msg => { promptStr += `${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.content}\n`; });
          promptStr += "AI:";
          
          const result = await model.generateContent(promptStr);
          aiText = result.response.text();
          aiSuccess = true;
        } catch (gemini3Err) {
          console.warn(`⚠️ [AI Voice] ${MODELS.GEMINI_3_1_LIGHT} failed or busy: ${gemini3Err.message}. Trying ${MODELS.GEMINI_2_5_LIGHT}...`);
        }

        // Level 2: Try Gemini 2.5 Flash Light
        if (!aiSuccess) {
          try {
            console.log(`🧠 [AI] Trying model: ${MODELS.GEMINI_2_5_LIGHT}...`);
            const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_2_5_LIGHT });
            let promptStr = systemPromptText + "\n\nConversation History:\n";
            conversationHistory.forEach(msg => { promptStr += `${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.content}\n`; });
            promptStr += "AI:";
            
            const result = await model.generateContent(promptStr);
            aiText = result.response.text();
            aiSuccess = true;
          } catch (gemini2Err) {
            console.warn(`⚠️ [AI Voice] ${MODELS.GEMINI_2_5_LIGHT} also failed: ${gemini2Err.message}. Falling back to OpenAI...`);
          }
        }
      }

      // Level 3: Final Fallback to OpenAI gpt-4o-mini
      if (!aiSuccess) {
        if (!openai) throw new Error("OpenAI API Key is missing and Gemini failed.");
        console.log(`🧠 [AI] Using OpenAI fallback model: ${MODELS.OPENAI_MINI}...`);
        const chatCompletion = await openai.chat.completions.create({ model: MODELS.OPENAI_MINI, messages: [{ role: "system", content: systemPromptText }, ...conversationHistory] });
        aiText = chatCompletion.choices[0].message.content;
      }

      aiText = aiText.replace(/\*/g, '').trim();
      conversationHistory.push({ role: "assistant", content: aiText });

      console.log(`🤖 [AI Agent]: ${aiText}`);
      rawTranscript.push({ speaker: 'AI', text: aiText, time: new Date() });

      // 🚀 RAW TTS API CALL (Bulletproof Fix)
      console.log(`🔊 [TTS] Converting text to speech via Raw API...`);
      const ttsResponse = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=16000', {
        method: 'POST',
        headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText })
      });
      
      if (!ttsResponse.ok) {
         console.error(`❌ [TTS Error] Code: ${ttsResponse.status}`);
         return;
      }

      console.log(`✅ [TTS] Audio stream received from Deepgram.`);

      const arrayBuffer = await ttsResponse.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const base64Audio = audioBuffer.toString('base64');
      
      // Send audio back to Android App
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'audio', data: base64Audio }));
      }
    } catch (error) {
      console.error("❌ AI/TTS Error:", error.message);
      // 🚀 FALLBACK AUDIO IF AI SERVER IS DOWN
      try {
        if (cachedMobileFallbackAudio) {
          console.log(`🔊 [Fallback TTS] Using CACHED busy message (Zero Cost)...`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'audio', data: cachedMobileFallbackAudio }));
            setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.close(); }, 5000);
          }
        } else {
          const fallbackText = "I am sorry, our systems are currently very busy. Please try calling again in a few minutes.";
          console.log(`🔊 [Fallback TTS] Generating busy message via Deepgram...`);
          const fallbackTts = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=16000', {
            method: 'POST',
            headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fallbackText })
          });
          if (fallbackTts.ok && ws.readyState === WebSocket.OPEN) {
            const arrayBuffer = await fallbackTts.arrayBuffer();
            cachedMobileFallbackAudio = Buffer.from(arrayBuffer).toString('base64');
            ws.send(JSON.stringify({ event: 'audio', data: cachedMobileFallbackAudio }));
            setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.close(); }, 5000);
          }
        }
      } catch (fallbackErr) {
        console.error("❌ Fallback TTS Error:", fallbackErr.message);
      }
    }
  }

  // 3. Receive Messages from Android App
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.event === 'start') {
        console.log(`📞 [Mobile Stream] Android App started recording.`);
        
        if (msg.leadId) activeLeadId = msg.leadId;
        if (msg.phone) activePhone = msg.phone;
        if (msg.userId) activeUserId = msg.userId;
        if (msg.workspaceId) activeWorkspaceId = msg.workspaceId;
        if (msg.callGoal) activeCallGoal = msg.callGoal;
        
        if (activeLeadId || activePhone) {
          try {
            const query = activeLeadId ? { _id: activeLeadId } : { phoneNumber: { $regex: new RegExp(activePhone.replace(/\D/g, '').slice(-10) + '$') } };
            Lead.findOneAndUpdate(query, {
              $push: { timeline: { eventType: 'Call Received', description: 'Voice Call session started via Mobile/Web App.', timestamp: new Date() } }
            }).exec().catch(() => {});
          } catch(e) {}
        }
        
        processAIResponse(); // Initiate first greeting

      } else if (msg.event === 'audio') {
        audioChunkCount++;
        if (audioChunkCount % 50 === 0) {
           console.log(`🎤 [Audio Debug] Receiving voice data from mic... (Chunks: ${audioChunkCount})`);
        }
        
        const audioBuffer = Buffer.from(msg.data, 'base64');
        if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
          deepgramLive.send(audioBuffer);
        }
        
      } else if (msg.event === 'stop') {
        console.log(`🛑 [Mobile Stream] Android App stopped call.`);
        if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) deepgramLive.close();
      }
    } catch(e) {
       if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
          deepgramLive.send(message);
       }
    }
  });

  ws.on('close', async () => {
    console.log('🔌 [WebSocket] Mobile App Connection Closed');
    if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) deepgramLive.close();
    
    // Save Call Transcript to DB
    if (rawTranscript.length > 0) {
      try {
        let callSummary = "No summary generated.";
        if (conversationHistory.length > 0) {
           console.log("🧠 [Post-Call Analysis] Generating AI Summary...");
           const summaryPrompt = "Analyze this call transcript and provide a short summary (2-3 lines). Identify the customer's intent, whether an order was placed, or if a follow-up is needed. Format: \nIntent: ... \nOutcome: ...";
           const transcriptText = JSON.stringify(rawTranscript.map(t => `${t.speaker}: ${t.text}`));
           
           let summarySuccess = false;

           if (genAI) {
              // Level 1 Summary: Gemini 3.1 Flash Light
              try {
                console.log(`🧠 [Summary Engine] Requesting report using: ${MODELS.GEMINI_3_1_LIGHT}`);
                const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_3_1_LIGHT });
                const result = await model.generateContent(summaryPrompt + "\n\n" + transcriptText);
                callSummary = result.response.text();
                summarySuccess = true;
              } catch (sErr3) {
                console.warn(`⚠️ [Summary Engine] ${MODELS.GEMINI_3_1_LIGHT} failed, trying ${MODELS.GEMINI_2_5_LIGHT}...`);
              }

              // Level 2 Summary: Gemini 2.5 Flash Light
              if (!summarySuccess) {
                try {
                  console.log(`🧠 [Summary Engine] Requesting report using: ${MODELS.GEMINI_2_5_LIGHT}`);
                  const model = genAI.getGenerativeModel({ model: MODELS.GEMINI_2_5_LIGHT });
                  const result = await model.generateContent(summaryPrompt + "\n\n" + transcriptText);
                  callSummary = result.response.text();
                  summarySuccess = true;
                } catch (sErr2) {
                  console.warn(`⚠️ [Summary Engine] ${MODELS.GEMINI_2_5_LIGHT} failed, falling back to OpenAI...`);
                }
              }
           }

           // Level 3 Summary: OpenAI gpt-4o-mini
           if (!summarySuccess && openai) {
              console.log(`🧠 [Summary Engine] Requesting report using fallback: ${MODELS.OPENAI_MINI}`);
              const summaryResponse = await openai.chat.completions.create({ model: MODELS.OPENAI_MINI, messages: [{ role: "system", content: summaryPrompt }, { role: "user", content: transcriptText }] });
              callSummary = summaryResponse.choices[0].message.content;
           }
        }

        const formattedTranscript = rawTranscript.map(t => ({ ...t, speaker: t.speaker === 'AI' ? 'Agent' : t.speaker }));
        await Call.create({ 
            userId: activeUserId,
            workspaceId: activeWorkspaceId,
            sid: callSid, 
            to: 'Mobile App',
            from: 'Customer',
            callType: 'web',
            status: 'completed', 
            provider: 'android_app',
            transcript: formattedTranscript,
            summary: callSummary,
            callGoal: activeCallGoal
        });
        console.log("💾 [DB] Mobile Call Transcript saved successfully.");
        
        if (activeLeadId || activePhone) {
           const query = activeLeadId ? { _id: activeLeadId } : { phoneNumber: { $regex: new RegExp(activePhone.replace(/\D/g, '').slice(-10) + '$') } };
           await Lead.findOneAndUpdate(query, {
              $set: { lastCallSummary: callSummary, lastCallDate: new Date() },
              $push: { timeline: { eventType: 'Follow-up Completed', description: 'Voice Call session ended. Transcript saved.', timestamp: new Date() } }
           }).exec().catch(() => {});
        }
      } catch (e) {
        console.log("❌ DB Save Error:", e.message);
      }
    }
  });
};