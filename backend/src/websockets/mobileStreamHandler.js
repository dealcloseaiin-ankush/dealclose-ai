const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Call = require('../models/callModel');
const WebSocket = require('ws'); // 🚀 RAW STT Connection
const Lead = require('../models/leadModel');

// 🚀 GLOBAL CACHE: Cache fallback audio to save resources
let cachedMobileFallbackAudio = null;

// 🌊 DEALCLOSE AI ULTRA COST-EFFECTIVE CALLING MODELS CONFIGURATION
const MODELS = {
  GEMINI_3_5_LITE: 'gemini-3.5-flash-lite',  // Priority 1: Primary Mobile Calling Model
  GEMINI_3_1_LITE: 'gemini-3.1-flash-lite',  // Priority 2: Secondary Calling Model
  GEMINI_2_5_LITE: 'gemini-2.5-flash-lite',  // Priority 3: Backup Calling Model
  OPENAI_MINI: 'gpt-4o-mini',                // Priority 4: OpenAI Fallback Layer
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
  
  // 1. Initialize APIs Safely
  console.log(`\n================== [AI CALLING DEBUG] ==================`);
  console.log(`🔑 DEEPGRAM_API_KEY Check:`, process.env.DEEPGRAM_API_KEY ? `LOADED` : `MISSING!`);
  console.log(`🔑 GEMINI_API_KEY Check:`, process.env.GEMINI_API_KEY ? `LOADED` : `MISSING!`);
  console.log(`🔑 OPENAI_API_KEY Check:`, process.env.OPENAI_API_KEY ? `LOADED` : `MISSING!`);
  console.log(`========================================================\n`);

  if (!process.env.DEEPGRAM_API_KEY) {
    console.error("❌ DEEPGRAM_API_KEY is missing in Env! Closing WebSocket.");
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ event: 'error', data: 'DEEPGRAM_API_KEY missing on server' }));
    }
    return ws.close();
  }

  const openai = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy') ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

  console.log(`📱 [Mobile Stream] New connection from Android App! Call ID: ${callSid}`);

  // 2. Setup Raw STT Connection
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
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'transcript', text: transcript }));
          }
          await processAIResponse();
        }
      }
    });
    
    deepgramLive.on('error', (err) => {
      console.error(`❌ [Deepgram STT Error]:`, err.message);
    });

  } catch (err) {
    console.error("❌ Deepgram Initialization Error:", err.message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: 'error', data: 'Failed to connect to AI Ears' }));
    }
    return ws.close();
  }

  async function processAIResponse() {
    try {
      console.log(`🧠 [AI Soch Raha Hai...]`);
      let aiText = "";
      let aiSuccess = false;

      const systemPromptText = "You are a friendly DealClose AI calling assistant. Keep answers short (1 sentence). Speak in conversational Hinglish. CRITICAL RULE: DO NOT use complex Hindi words. Use simple words so an American AI voice can pronounce them naturally. Do NOT use Devanagari script.";

      // 🚀 MULTI-MODEL DYNAMIC CHAIN (Gemini 3.5 / 3.1 Pipeline)
      if (genAI) {
        const geminiOrder = [
          MODELS.GEMINI_3_5_LITE,
          MODELS.GEMINI_3_1_LITE,
          MODELS.GEMINI_2_5_LITE,
        ];

        for (const modelName of geminiOrder) {
          if (aiSuccess) break;
          try {
            console.log(`🧠 [AI] Requesting model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            let promptStr = systemPromptText + "\n\nConversation History:\n";
            conversationHistory.forEach(msg => { promptStr += `${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.content}\n`; });
            promptStr += "AI:";
            
            const result = await model.generateContent(promptStr);
            aiText = result.response.text();
            aiSuccess = true;
          } catch (geminiErr) {
            console.warn(`⚠️ [AI Voice] ${modelName} hit error: ${geminiErr.message}. Trying next fallback...`);
          }
        }
      }

      // 🚀 Level 3: Final Fallback or Manual Bypass to OpenAI gpt-4o-mini
      if (!aiSuccess && openai) {
        console.log(`🧠 [AI] Processing via OpenAI engine: ${MODELS.OPENAI_MINI}...`);
        const chatCompletion = await openai.chat.completions.create({
          model: MODELS.OPENAI_MINI,
          messages: [{ role: "system", content: systemPromptText }, ...conversationHistory]
        });
        aiText = chatCompletion.choices[0].message.content;
        aiSuccess = true;
      }

      if (!aiSuccess) {
        throw new Error("All AI Engines are currently offline or unauthorized.");
      }

      aiText = aiText.replace(/\*/g, '').trim();
      conversationHistory.push({ role: "assistant", content: aiText });

      console.log(`🤖 [AI Agent]: ${aiText}`);
      rawTranscript.push({ speaker: 'AI', text: aiText, time: new Date() });

      // TTS Pipeline Call
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

      const arrayBuffer = await ttsResponse.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString('base64');
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'ai_response', text: aiText }));
        ws.send(JSON.stringify({ event: 'audio', data: base64Audio }));
      }
    } catch (error) {
      console.error("❌ AI/TTS Core Error:", error.message);
      // Safe Zero-Cost Fallback Audio Stream Triggers
      try {
        if (cachedMobileFallbackAudio) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'audio', data: cachedMobileFallbackAudio }));
          }
        } else {
          const fallbackText = "I am sorry, our systems are currently very busy. Please try calling again in a few minutes.";
          const fallbackTts = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=16000', {
            method: 'POST',
            headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fallbackText })
          });
          if (fallbackTts.ok && ws.readyState === WebSocket.OPEN) {
            const buf = await fallbackTts.arrayBuffer();
            cachedMobileFallbackAudio = Buffer.from(buf).toString('base64');
            ws.send(JSON.stringify({ event: 'audio', data: cachedMobileFallbackAudio }));
          }
        }
      } catch (fErr) { 
        console.error(fErr.message); 
      }
    }
  }

  // Receive Messages from Android App
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
          const query = activeLeadId ? { _id: activeLeadId } : { phoneNumber: { $regex: new RegExp(activePhone.replace(/\D/g, '').slice(-10) + '$') } };
          Lead.findOneAndUpdate(query, {
            $push: { timeline: { eventType: 'Call Received', description: 'Voice Call session started via Mobile App.', timestamp: new Date() } }
          }).exec().catch(() => {});
        }
        processAIResponse(); // First greeting trigger

      } else if (msg.event === 'audio') {
        audioChunkCount++;
        if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
          deepgramLive.send(Buffer.from(msg.data, 'base64'));
        }
      } else if (msg.event === 'stop') {
        if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
          deepgramLive.close();
        }
      }
    } catch(e) {
      if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
        deepgramLive.send(message);
      }
    }
  });

  ws.on('close', async () => {
    console.log('🔌 [WebSocket] Mobile App Connection Closed');
    if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
      deepgramLive.close();
    }
    
    if (rawTranscript.length > 0) {
      try {
        let callSummary = "No summary generated.";
        if (conversationHistory.length > 0) {
          const summaryPrompt = "Analyze this call transcript and provide a short summary (2-3 lines). Format: \nIntent: ... \nOutcome: ...";
          const transcriptText = JSON.stringify(rawTranscript.map(t => `${t.speaker}: ${t.text}`));
          
          let summarySuccess = false;

          // Summary Tier 1: Try OpenAI directly if active
          if (openai) {
            try {
              console.log(`🧠 [Summary Engine] Requesting report via OpenAI: ${MODELS.OPENAI_MINI}`);
              const summaryResponse = await openai.chat.completions.create({ model: MODELS.OPENAI_MINI, messages: [{ role: "system", content: summaryPrompt }, { role: "user", content: transcriptText }] });
              callSummary = summaryResponse.choices[0].message.content;
              summarySuccess = true;
            } catch (oSummaryErr) {
              console.warn("OpenAI summary layer failed, routing to backup.");
            }
          }

          // Summary Tier 2: Try Gemini 3.5 / 3.1
          if (!summarySuccess && genAI) {
            const geminiOrder = [
              MODELS.GEMINI_3_5_LITE,
              MODELS.GEMINI_3_1_LITE,
              MODELS.GEMINI_2_5_LITE,
            ];

            for (const modelName of geminiOrder) {
              if (summarySuccess) break;
              try {
                console.log(`🧠 [Summary Engine] Requesting report via Gemini: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(summaryPrompt + "\n\n" + transcriptText);
                callSummary = result.response.text();
                summarySuccess = true;
              } catch (gSummaryErr) {
                console.warn(`⚠️ [Summary Engine] ${modelName} backup summary failed.`);
              }
            }
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
        
        if (activeLeadId || activePhone) {
           const query = activeLeadId ? { _id: activeLeadId } : { phoneNumber: { $regex: new RegExp(activePhone.replace(/\D/g, '').slice(-10) + '$') } };
           await Lead.findOneAndUpdate(query, {
              $set: { lastCallSummary: callSummary, lastCallDate: new Date() },
              $push: { timeline: { eventType: 'Follow-up Completed', description: 'Voice Call session ended. Analytics logged.', timestamp: new Date() } }
           }).exec().catch(() => {});
        }
      } catch (e) { 
        console.log("❌ DB Save Error:", e.message); 
      }
    }
  });
};