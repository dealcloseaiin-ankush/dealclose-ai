const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Call = require('../models/callModel');
const Order = require('../models/orderModel');
const Lead = require('../models/leadModel');
const WebSocket = require('ws'); // 🚀 NEW: Bulletproof Raw Connection

// 🚀 GLOBAL CACHE: Twilio calls (mulaw) ke liye alag cache
let cachedTwilioFallbackAudio = null;

// 🌊 DEALCLOSE AI ULTRA COST-EFFECTIVE CALLING MODELS CONFIGURATION
const MODELS = {
  GEMINI_3_5_LITE: 'gemini-3.5-flash-lite',  // Priority 1: Primary Calling Model
  GEMINI_3_1_LITE: 'gemini-3.1-flash-lite',  // Priority 2: Secondary Calling Model
  GEMINI_2_5_LITE: 'gemini-2.5-flash-lite',  // Priority 3: Backup Calling Model
  OPENAI_MINI: 'gpt-4o-mini',                // Priority 4: OpenAI Calling & Function Calling Fallback
};

module.exports = function (ws) {
  let streamSid = null;
  let callSid = null; 
  
  // 🚀 RAW DATA ARRAY (Yehi Dashboard me dikhega)
  let rawTranscript = []; 
  let conversationHistory = [];
  
  // 1. Initialize API Clients Safely
  const openai = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy') ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

  // 2. 🚀 Setup Bulletproof Raw STT Connection
  let deepgramLive;
  try {
    deepgramLive = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&language=en-IN&smart_format=true&encoding=mulaw&sample_rate=8000', {
      headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` }
    });

    deepgramLive.on('message', async (data) => {
      const response = JSON.parse(data);
      if (response.channel && response.channel.alternatives[0]) {
        const transcript = response.channel.alternatives[0].transcript;
        if (transcript && response.is_final) {
          console.log(`👤 [Customer]: ${transcript}`);
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
  }

  // 4. The Brain (LLM) -> Text to Speech (TTS) -> Send to Twilio
  async function processAIResponse() {
    try {
      console.log(`🧠 [AI Soch Raha Hai...]`);
      let aiText = "";
      let aiSuccess = false;

      const systemPromptText = "You are a friendly DealClose AI sales agent. Keep answers extremely short. Speak in conversational Hinglish. CRITICAL RULE: Use simple words so an American AI voice can pronounce them. DO NOT use Devanagari script.";

      // 🚀 MULTI-MODEL DYNAMIC CHAIN FOR TWILIO INTERACTION
      if (genAI) {
        const geminiOrder = [
          MODELS.GEMINI_3_5_LITE,
          MODELS.GEMINI_3_1_LITE,
          MODELS.GEMINI_2_5_LITE,
        ];

        for (const modelName of geminiOrder) {
          if (aiSuccess) break;
          try {
            console.log(`🧠 [AI] Trying model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            let promptStr = systemPromptText + "\n\nConversation History:\n";
            conversationHistory.forEach(msg => { promptStr += `${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.content}\n`; });
            promptStr += "AI:";
            
            const result = await model.generateContent(promptStr);
            aiText = result.response.text();
            aiSuccess = true;
          } catch (geminiErr) {
            console.warn(`⚠️ [AI Voice] ${modelName} busy/failed: ${geminiErr.message}. Trying next fallback...`);
          }
        }
      }

      // Level 3: Fallback to OpenAI gpt-4o-mini (Supports Function Calling / Sales Tools)
      if (!aiSuccess && openai) {
        console.log(`🧠 [AI] Using OpenAI model: ${MODELS.OPENAI_MINI}...`);
        const chatCompletion = await openai.chat.completions.create({
          model: MODELS.OPENAI_MINI,
          messages: [{ role: "system", content: systemPromptText }, ...conversationHistory],
          tools: [
            { type: "function", function: { name: "create_sales_order", description: "Punch an order.", parameters: { type: "object", properties: { itemName: { type: "string" }, quantity: { type: "number" }, deliveryCity: { type: "string" } }, required: ["itemName", "quantity"] } } },
            { type: "function", function: { name: "add_call_notes", description: "Save notes.", parameters: { type: "object", properties: { noteSummary: { type: "string" } }, required: ["noteSummary"] } } }
          ]
        });
        
        const responseMessage = chatCompletion.choices[0].message;
        if (responseMessage.tool_calls) {
          for (const toolCall of responseMessage.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments);
            if (toolCall.function.name === "create_sales_order") {
              console.log(`🛍️ [AI SALES TOOL] Taking Order: ${args.quantity}x ${args.itemName}`);
              aiText = `Done! Maine aapka ${args.quantity} ${args.itemName} ka order punch kar diya hai. Kuch aur help karu?`;
            } else if (toolCall.function.name === "add_call_notes") {
              console.log(`📝 [AI CRM TOOL] Saving Note: ${args.noteSummary}`);
              aiText = "Maine aapki requirement note kar li hai. Hamari team aapse jaldi connect karegi.";
            }
          }
        } else {
          aiText = responseMessage.content;
        }
        aiSuccess = true;
      }

      if (!aiSuccess) {
        throw new Error("All pipeline streaming components failed.");
      }

      aiText = aiText.replace(/\*/g, '').trim();
      conversationHistory.push({ role: "assistant", content: aiText });

      console.log(`🤖 [AI Agent]: ${aiText}`);
      rawTranscript.push({ speaker: 'AI', text: aiText, time: new Date() });

      // 🚀 RAW TTS API CALL
      console.log(`🔊 [TTS] Converting text to speech via Raw API...`);
      const ttsResponse = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mulaw&sample_rate=8000', {
        method: 'POST',
        headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText })
      });

      if (!ttsResponse.ok) return;
      
      const arrayBuffer = await ttsResponse.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const base64Audio = audioBuffer.toString('base64');
      
      sendAudioToTwilio(base64Audio);

    } catch (error) {
      console.error("❌ AI/TTS Error:", error.message);
      // 🚀 FALLBACK AUDIO IF AI SERVER IS DOWN
      try {
        if (cachedTwilioFallbackAudio) {
          console.log(`🔊 [Fallback TTS] Using CACHED audio for Twilio (Zero Cost)...`);
          sendAudioToTwilio(cachedTwilioFallbackAudio);
        } else {
          const fallbackText = "I am sorry, our systems are currently very busy. Please try calling again in a few minutes.";
          console.log(`🔊 [Fallback TTS] Generating busy message via Deepgram...`);
          const fallbackTts = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mulaw&sample_rate=8000', {
            method: 'POST',
            headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fallbackText })
          });
          if (fallbackTts.ok) {
            const arrayBuffer = await fallbackTts.arrayBuffer();
            cachedTwilioFallbackAudio = Buffer.from(arrayBuffer).toString('base64');
            sendAudioToTwilio(cachedTwilioFallbackAudio);
          }
        }
      } catch (fallbackErr) {}
    }
  }

  ws.on('message', (message) => {
    const msg = JSON.parse(message);

    if (msg.event === 'start') {
      streamSid = msg.start.streamSid;
      callSid = msg.start.callSid; 
      console.log(`📞 [Twilio Stream] Live Call Started! Call SID: ${callSid}`);
      processAIResponse();

    } else if (msg.event === 'media') {
      const audioPayload = msg.media.payload;
      const audioBuffer = Buffer.from(audioPayload, 'base64');
      
      if (deepgramLive && deepgramLive.readyState === 1) {
        deepgramLive.send(audioBuffer);
      }
      
    } else if (msg.event === 'stop') {
      console.log(`🛑 [Twilio Stream] Call Ended. Stream SID: ${streamSid}`);
      if (deepgramLive && deepgramLive.readyState === 1) deepgramLive.close();
    }
  });

  ws.on('close', async () => {
    console.log('🔌 [WebSocket] Twilio Stream Connection Closed');
    if (deepgramLive && deepgramLive.readyState === 1) deepgramLive.close();
    
    if (callSid && rawTranscript.length > 0) {
      try {
        let callSummary = "No summary generated.";
        if (conversationHistory.length > 0) {
           console.log("🧠 [Post-Call Analysis] Generating AI Summary...");
           const summaryPrompt = "Analyze this call transcript and provide a short summary (2-3 lines). Identify the customer's intent, whether an order was placed, or if a follow-up is needed. Format: \nIntent: ... \nOutcome: ...";
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
               console.warn("OpenAI summary failed, switching to backup pipelines.");
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
                  console.log(`🧠 [Summary Engine] Requesting report using Gemini: ${modelName}`);
                  const model = genAI.getGenerativeModel({ model: modelName });
                  const result = await model.generateContent(summaryPrompt + "\n\n" + transcriptText);
                  callSummary = result.response.text();
                  summarySuccess = true;
                } catch (sErr) {
                  console.warn(`⚠️ [Summary Engine] ${modelName} summary failed.`);
                }
              }
            }
           console.log(`✅ [Post-Call Analysis] Summary:\n${callSummary}`);
        }
        
        const callDoc = await Call.findOneAndUpdate({ sid: callSid }, { $set: { transcript: rawTranscript, summary: callSummary } }, { new: true });
        console.log("💾 [DB] Raw Transcript & Summary saved successfully.");
        
        if (callDoc && (callDoc.leadId || callDoc.to)) {
           const query = callDoc.leadId ? { _id: callDoc.leadId } : { phoneNumber: { $regex: new RegExp(callDoc.to.replace(/\D/g, '').slice(-10) + '$') } };
           await Lead.findOneAndUpdate(query, {
              $set: {
                lastCallSummary: callSummary,
                lastCallDate: new Date(),
                lastCallerType: 'ai',
                lastCallerName: 'AI Voice Bot (Twilio)',
                callingBucket: 'today_queue'
              },
              $inc: { callAttempts: 1 },
              $push: {
                timeline: {
                  eventType: 'AI Call Completed',
                  description: `🤖 AI Voice Bot (Twilio) completed call session. Niskoor (Summary): ${callSummary}`,
                  timestamp: new Date()
                }
              }
           }).exec().catch(() => {});
        }
      } catch (e) {
        console.log("❌ DB/Summary Save Error:", e.message);
      }
    }
  });

  function sendAudioToTwilio(base64Audio) {
    const payload = {
      event: 'media',
      streamSid: streamSid,
      media: { payload: base64Audio }
    };
    if (ws.readyState === 1) ws.send(JSON.stringify(payload));
  }
};