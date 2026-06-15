const deepgramSdk = require('@deepgram/sdk');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Call = require('../models/callModel');
const Order = require('../models/orderModel');
const Lead = require('../models/leadModel');

module.exports = function (ws) {
  let streamSid = null;
  let callSid = null; 
  
  // 🚀 RAW DATA ARRAY (Yehi Dashboard me dikhega)
  let rawTranscript = []; 
  let conversationHistory = [];
  
  // 1. Initialize API Clients (STT/TTS via Deepgram, Brain via Gemini/OpenAI)
  let deepgram;
  if (typeof deepgramSdk.createClient === 'function') {
    deepgram = deepgramSdk.createClient(process.env.DEEPGRAM_API_KEY || 'dummy');
  } else {
    console.error("📦 [Deepgram Error] Available Exports:", Object.keys(deepgramSdk));
    throw new Error("createClient is missing! Render is using an old cached node_modules. Please use 'Clear build cache & deploy' on Render.");
  }
  const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy' ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

  // 2. Setup Deepgram Live Transcription (Kaano ke liye - STT)
  const deepgramLive = deepgram.listen.live({
    model: 'nova-2',
    language: 'en-IN', // Supports Indian English/Hinglish
    smart_format: true,
    encoding: 'mulaw',
    sample_rate: 8000,
  });

  // 3. Handle Text coming from Deepgram
  deepgramLive.on('Results', async (data) => {
    const transcript = data.channel.alternatives[0].transcript;
    if (transcript && data.is_final) {
      console.log(`👤 [Customer]: ${transcript}`);
      
      // Save Customer's raw text
      rawTranscript.push({ speaker: 'Customer', text: transcript, time: new Date() });
      conversationHistory.push({ role: "user", content: transcript });

      // Jab customer bolna band kare, dimaag (OpenAI) ko sochna shuru karne bolo
      await processAIResponse();
    }
  });

  // 4. The Brain (LLM) -> Text to Speech (TTS) -> Send to Twilio
  async function processAIResponse() {
    try {
      console.log(`🧠 [AI Soch Raha Hai...]`);
      let aiText = "";

      const systemPromptText = "You are a friendly DealClose AI sales agent. Keep your answers extremely short (1-2 sentences). Speak in Hinglish.";
      let useGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy');

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

      if (!useGemini) {
          if (!openai) throw new Error("OpenAI API Key is missing and Gemini failed.");
          console.log(`🧠 [AI] Using OpenAI GPT-4o-mini...`);
          const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
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

      // Convert AI Text to Audio (Deepgram Aura TTS - Sasta aur Fast)
      console.log(`🔊 [TTS] Converting text to speech via Deepgram...`);
      const ttsResponse = await deepgram.speak.request(
        { text: aiText },
        { model: 'aura-asteria-en', encoding: 'mulaw', sample_rate: 8000, container: 'none' } // Twilio format
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
      
      // Send audio back to Phone Call
      sendAudioToTwilio(base64Audio);

    } catch (error) {
      console.error("❌ AI/TTS Error:", error.message);
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
           
           if (genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'dummy') {
               const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
               const result = await model.generateContent(summaryPrompt + "\n\n" + transcriptText);
               callSummary = result.response.text();
           } else if (openai) {
               const summaryResponse = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: summaryPrompt }, { role: "user", content: transcriptText }] });
               callSummary = summaryResponse.choices[0].message.content;
           }
           console.log(`✅ [Post-Call Analysis] Summary:\n${callSummary}`);
        }
        await Call.findOneAndUpdate({ sid: callSid }, { $set: { transcript: rawTranscript, summary: callSummary } });
        console.log("💾 [DB] Raw Transcript & Summary saved successfully.");
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