const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Call = require('../models/callModel');
const Order = require('../models/orderModel');
const Lead = require('../models/leadModel');
const WebSocket = require('ws'); // 🚀 NEW: Bulletproof Raw Connection

// 🚀 GLOBAL CACHE: Twilio calls (mulaw) ke liye alag cache
let cachedTwilioFallbackAudio = null;

// 🌊 ULTRA COST-EFFECTIVE MODELS FOR TWILIO AUDIO PIPELINE
const MODELS = {
  GEMINI_3_1_LIGHT: 'gemini-3.1-flash-light', // Priority 1 (Latest, Fast & Ultra-Cheapest)
  GEMINI_2_5_LIGHT: 'gemini-2.5-flash-light', // Priority 2 (Backup Gemini)
  OPENAI_MINI: 'gpt-4o-mini',                  // Priority 3 (Final Tools Fallback)
};

module.exports = function (ws) {
  let streamSid = null;
  let callSid = null; 
  
  // 🚀 RAW DATA ARRAY (Yehi Dashboard me dikhega)
  let rawTranscript = []; 
  let conversationHistory = [];
  
  // 1. Initialize API Clients (STT/TTS via Deepgram, Brain via Gemini/OpenAI)
  const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy' ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
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

      const systemPromptText = "You are a friendly DealClose AI sales agent. Keep answers extremely short. Speak in conversational Hinglish. CRITICAL RULE: Use simple words so an American AI voice can pronounce them. DO NOT use Devanagari script.";
      let aiSuccess = false;

      // 🚀 MULTI-MODEL DYNAMIC CHAIN FOR TWILIO INTERACTION
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
          console.warn(`⚠️ [AI Voice] ${MODELS.GEMINI_3_1_LIGHT} busy/failed: ${gemini3Err.message}. Trying ${MODELS.GEMINI_2_5_LIGHT}...`);
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

      // Level 3: Fallback to OpenAI gpt-4o-mini (Supports Function Calling / Sales Tools)
      if (!aiSuccess) {
        if (!openai) throw new Error("OpenAI API Key is missing and Gemini failed.");
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
      }

      aiText = aiText.replace(/\*/g, '').trim();
      conversationHistory.push({ role: "assistant", content: aiText });

      console.log(`🤖 [AI Agent]: ${aiText}`);
      
      // Save AI's raw text for Dashboard
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
      
      // Send audio back to Phone Call
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
      callSid = msg.start.callSid; // 🚀 Catch the Call ID to update DB later
      console.log(`📞 [Twilio Stream] Live Call Started! Call SID: ${callSid}`);
      
      // Call uthate hi pehla message
      processAIResponse();

    } else if (msg.event === 'media') {
      const audioPayload = msg.media.payload;
      const audioBuffer = Buffer.from(audioPayload, 'base64');
      
      // Send raw audio to Deepgram to listen
      if (deepgramLive.getReadyState() === 1) {
        deepgramLive.send(audioBuffer);
      }
      
    } else if (msg.event === 'stop') {
      console.log(`🛑 [Twilio Stream] Call Ended. Stream SID: ${streamSid}`);
      deepgramLive.finish();
    }
  });

  ws.on('close', async () => {
    console.log('🔌 [WebSocket] Twilio Stream Connection Closed');
    if (deepgramLive.getReadyState() === 1) deepgramLive.finish();
    
    // 🚀 SAVE RAW TRANSCRIPT & GENERATE AI SUMMARY WHEN CALL ENDS!
    if (callSid && rawTranscript.length > 0) {
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
           console.log(`✅ [Post-Call Analysis] Summary:\n${callSummary}`);
        }
        
        const callDoc = await Call.findOneAndUpdate({ sid: callSid }, { $set: { transcript: rawTranscript, summary: callSummary } }, { new: true });
        console.log("💾 [DB] Raw Transcript & Summary saved successfully.");
        
        // 🚀 NEW: Update CRM Lead with Call Summary
        if (callDoc && (callDoc.leadId || callDoc.to)) {
           const query = callDoc.leadId ? { _id: callDoc.leadId } : { phoneNumber: { $regex: new RegExp(callDoc.to.replace(/\D/g, '').slice(-10) + '$') } };
           await Lead.findOneAndUpdate(query, {
              $set: { lastCallSummary: callSummary, lastCallDate: new Date() },
              $push: { timeline: { eventType: 'Call Completed', description: `Voice session ended. Summary: ${callSummary}`, timestamp: new Date() } }
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