const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Call = require('../models/callModel');
const WebSocket = require('ws'); // 🚀 RAW STT Connection
const Lead = require('../models/leadModel');

// 🚀 GLOBAL CACHE: Cache fallback audio and instant ethical AI greeting
let cachedMobileFallbackAudio = null;
let cachedInitialGreetingAudio = null;
const ETHICAL_AI_GREETING = "Namaste! Main DealClose AI Assistant bol raha hoon. Boliye, main aapki kya madad kar sakta hoon?";

async function getPreCachedGreeting() {
  if (cachedInitialGreetingAudio) return cachedInitialGreetingAudio;
  try {
    const ttsResponse = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=16000', {
      method: 'POST',
      headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: ETHICAL_AI_GREETING })
    });
    if (ttsResponse.ok) {
      let buf = Buffer.from(await ttsResponse.arrayBuffer());
      if (buf.length > 44 && buf.slice(0, 4).toString('ascii') === 'RIFF') {
        buf = buf.slice(44);
      }
      cachedInitialGreetingAudio = buf.toString('base64');
      console.log(`⚡ [Instant Greeting] Pre-cached (${buf.length} bytes PCM) for instant pickup playback!`);
      return cachedInitialGreetingAudio;
    }
  } catch (e) {
    console.warn("Pre-cache greeting error:", e.message);
  }
  return null;
}
// Pre-warm immediately on module load
if (process.env.DEEPGRAM_API_KEY) {
  getPreCachedGreeting();
}

// 🌊 DEALCLOSE AI COST-EFFECTIVE CALLING MODELS CONFIGURATION
const MODELS = {
  GEMINI_PRIMARY: 'gemini-1.5-flash',       // Priority 1: Primary Ultra-fast Calling Model
  GEMINI_FALLBACK: 'gemini-2.0-flash',      // Priority 2: Next-gen Gemini 2.0 Flash
  OPENAI_MINI: 'gpt-4o-mini',               // Priority 3: OpenAI Fallback Layer
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
  let currentLead = null;
  let lastAiUtterance = "";
  let aiSpeakingUntil = 0;
  
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

  // 2. Setup Raw STT Connection (Ultra-low latency: endpointing=300ms, Hindi+Hinglish support)
  let deepgramLive;
  try {
    deepgramLive = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&language=hi&smart_format=true&encoding=linear16&sample_rate=16000&endpointing=300&interim_results=true', {
      headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` }
    });
    
    deepgramLive.on('open', () => {
      console.log(`✅ [Deepgram STT] Live Ears opened successfully (endpointing=300ms, model=nova-2-hi).`);
    });

    deepgramLive.on('message', async (data) => {
      const response = JSON.parse(data);
      if (response.channel && response.channel.alternatives[0]) {
        const alt = response.channel.alternatives[0];
        const transcript = alt.transcript ? alt.transcript.trim() : '';
        if (transcript.length > 0) {
          console.log(`🎤 [STT Realtime]: "${transcript}" (final: ${response.is_final}, speech_final: ${response.speech_final})`);

          // 🛡️ ACOUSTIC ECHO GUARD: Suppress mic feedback while AI is speaking over loudspeaker
          const now = Date.now();
          if (now < aiSpeakingUntil) {
            console.log(`🚫 [Echo Guard] Ignored mic bleed while AI is speaking (speech ends in ${aiSpeakingUntil - now}ms): "${transcript}"`);
            return;
          }

          // Check if transcript is an acoustic echo of AI's recent words
          if (lastAiUtterance && transcript.length > 6) {
            const firstWords = lastAiUtterance.slice(0, 20).toLowerCase();
            if (transcript.toLowerCase().includes(firstWords)) {
              console.log(`🚫 [Echo Guard] Suppressed self-echo of previous AI speech: "${transcript}"`);
              return;
            }
          }

          if (response.is_final || response.speech_final) {
            console.log(`👤 [Customer on Mobile]: ${transcript}`);
            rawTranscript.push({ speaker: 'Customer', text: transcript, time: new Date() });
            conversationHistory.push({ role: "user", content: transcript });
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event: 'transcript', text: transcript }));
            }
            await processAIResponse();
          }
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

      // 🎯 GRADUATED RECOVERY TONE DIRECTIVE
      let toneDirective = "";
      const attempts = currentLead?.callAttempts || 0;
      if (attempts <= 2) {
        toneDirective = "CALL TONE: Extremely soft, polite and gentle. This is Call #1 or #2. The customer is valued and respected. Speak pleasantly without any harshness or pressure. Never sound rude. Simply ask gently how they are doing and politely inquire about the bill.";
      } else if (attempts <= 4) {
        toneDirective = "CALL TONE: Professional, firm and clear, but always respectful. Remind them that previous reminders were shared, and politely request a specific commitment or date to clear the payment.";
      } else {
        toneDirective = "CALL TONE: Formal, serious and urgent. Emphasize that accounts are pending and need clearance to continue smooth supply/orders. ABSOLUTE CRITICAL RULE: Never be abusive, sarcastic, or disrespectful.";
      }

      let customerContext = "";
      if (currentLead) {
        customerContext = `Customer Name: ${currentLead.name || 'Grahak'}. `;
        if (currentLead.dueAmount > 0) {
          customerContext += `Pending Balance: ₹${currentLead.dueAmount}. Invoice Number: ${currentLead.invoiceNumber || 'N/A'}. Purchase Date: ${currentLead.invoiceDate || 'N/A'}. Overdue: ${currentLead.overdueDays || 0} days. `;
        }
        if (currentLead.notes) {
          customerContext += `Customer Context: ${currentLead.notes}. `;
        }
      }

      const systemPromptText = `You are a professional, polite AI calling assistant for our business.
Keep your answers brief (1-2 short sentences maximum). Speak in natural, everyday conversational Hinglish.
${customerContext}
${toneDirective}

🇮🇳 RURAL & SMALL-TOWN GROUND RULES (CRITICAL):
1. IDENTITY VERIFICATION: At the beginning, confirm who is speaking: "Namaste! Kya meri baat ${currentLead?.name || 'Customer'} ji se ho rahi hai?"
2. CHHATTISGARHI & RURAL REGIONAL DIALECT SUPPORT (CRITICAL):
   - Recognize and fully understand Chhattisgarhi / Desi eastern Hindi dialect spoken in Chhattisgarh (Raipur, Bilaspur, Durg, Bhilai, Rajnandgaon, Korba, Bastar, Raigarh, etc.).
   - Common Chhattisgarhi phrases & intent mapping:
     * "Khet me haanw / kaam chalat he" = I am in the farm / working. Respond: "Koi baat nahi bhaiya, aap kaam nipta lo, shaam ko baat kar lete hain."
     * "Tor dukan me samaan milhi?" = Will I get material at your shop? Respond: "Ji bhaiya, hamari dukan par sab taaza maal aur fittings available hai."
     * "Kaik rupiya laghi / bache he?" = How much money / balance is due? State the exact bill/balance politely.
     * "Kal dehun / paisa aahi tab bhejbo" = Will pay tomorrow / when money comes. Confirm date gently: "Theek hai bhaiya, kal ka note kar leti hoon."
     * "Bhej da / bhej do" = Send it on WhatsApp. Confirm: "Ji, abhi WhatsApp par bhej rahi hoon."
   - ADAPTIVE TONE: Speak in warm, respectful, conversational Desi Hinglish with local warmth (use polite terms like 'Bhaiya ji', 'Ji bilkul'). Never sound like an robotic English bot or stiff bookish Hindi.
3. FAMILY / THIRD-PARTY PICKUP (Beta, Bhai, Patni, Dukan ka ladka):
   - If someone else picks up and says "${currentLead?.name || 'Customer'} ji abhi nahi hain / khet me hain / bahar hain":
   - NEVER mention udhar, pending money, or debt amounts to third parties or family members! (Privacy rule).
   - Simply say: "Theek hai bhaiya, hum dukan se bol rahe the. Jab wo aayein toh bol dijiyega ek baar dukan par call kar lein." Politely disconnect.
4. IF CUSTOMER IS BUSY / IN FIELD / DRIVING:
   - Politely say: "Koi baat nahi ji, main shaam ko 7 baje aapse dobara baat kar leti hoon."
5. BILL / QUOTATION REQUEST:
   - If customer asks for bill or quotation: confirm immediately: "Ji bilkul, main abhi aapke isi number par WhatsApp par details bhej deti hoon."
6. RESPECT ALWAYS: Never shout, argue, or use rude language under any circumstance.`;

      // 🚀 Level 1: Primary Ultra-fast OpenAI engine (gpt-4o-mini with 60 max_tokens for 200ms latency)
      if (openai) {
        try {
          console.log(`🧠 [AI] Processing via OpenAI engine: ${MODELS.OPENAI_MINI} (fast response)...`);
          const chatCompletion = await openai.chat.completions.create({
            model: MODELS.OPENAI_MINI,
            messages: [{ role: "system", content: systemPromptText }, ...conversationHistory],
            max_tokens: 65,
            temperature: 0.2
          });
          aiText = chatCompletion.choices[0].message.content;
          aiSuccess = true;
        } catch (openaiErr) {
          console.warn(`⚠️ [AI Voice] OpenAI error: ${openaiErr.message}. Trying Gemini fallback...`);
        }
      }

      // 🚀 Level 2: Gemini Fallback Chain
      if (!aiSuccess && genAI) {
        const geminiOrder = [
          MODELS.GEMINI_PRIMARY,
          MODELS.GEMINI_FALLBACK,
        ];

        for (const modelName of geminiOrder) {
          if (aiSuccess) break;
          try {
            console.log(`🧠 [AI] Requesting Gemini model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            let promptStr = systemPromptText + "\n\nConversation History:\n";
            conversationHistory.forEach(msg => { promptStr += `${msg.role === 'user' ? 'Customer' : 'AI'}: ${msg.content}\n`; });
            promptStr += "AI:";
            
            const result = await model.generateContent(promptStr);
            aiText = result.response.text();
            aiSuccess = true;
          } catch (geminiErr) {
            console.warn(`⚠️ [AI Voice] ${modelName} error: ${geminiErr.message}`);
          }
        }
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
      let audioBuffer = Buffer.from(arrayBuffer);
      // Strip 44-byte WAV RIFF header if present so app receives pure 16kHz linear16 PCM samples
      if (audioBuffer.length > 44 && audioBuffer.slice(0, 4).toString('ascii') === 'RIFF') {
        audioBuffer = audioBuffer.slice(44);
      }
      const base64Audio = audioBuffer.toString('base64');
      
      if (ws.readyState === WebSocket.OPEN) {
        lastAiUtterance = aiText;
        aiSpeakingUntil = Date.now() + Math.round(audioBuffer.length / 32) + 500;
        console.log(`🔊 [Audio Stream Out] Sent ${audioBuffer.length} raw PCM bytes to Android phone speaker! (Echo guard active for ${Math.round(audioBuffer.length / 32) + 500}ms)`);
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
        
        // Immediate Instant Pre-cached Ethical Greeting playback
        getPreCachedGreeting().then(greetingAudio => {
          if (greetingAudio && ws.readyState === WebSocket.OPEN) {
            console.log(`⚡ [Instant Greeting] Sent ethical AI greeting immediately on call pickup!`);
            lastAiUtterance = ETHICAL_AI_GREETING;
            conversationHistory.push({ role: 'assistant', content: ETHICAL_AI_GREETING });
            rawTranscript.push({ speaker: 'AI', text: ETHICAL_AI_GREETING, time: new Date() });
            
            const audioBytes = Buffer.from(greetingAudio, 'base64').length;
            aiSpeakingUntil = Date.now() + Math.round(audioBytes / 32) + 500;
            
            ws.send(JSON.stringify({ event: 'ai_response', text: ETHICAL_AI_GREETING }));
            ws.send(JSON.stringify({ event: 'audio', data: greetingAudio }));
          } else {
            processAIResponse();
          }
        }).catch(() => {
          processAIResponse();
        });

        if (activeLeadId || activePhone) {
          const query = activeLeadId ? { _id: activeLeadId } : { phoneNumber: { $regex: new RegExp(activePhone.replace(/\D/g, '').slice(-10) + '$') } };
          Lead.findOneAndUpdate(query, {
            $inc: { callAttempts: 1 },
            $push: { timeline: { eventType: 'Call Received', description: 'Voice Call session started via Mobile App.', timestamp: new Date() } }
          }, { new: true }).then(foundLead => {
            if (foundLead) {
              currentLead = foundLead;
              console.log(`👤 [Customer Context Loaded]: ${foundLead.name || 'Unknown'} | Attempts: ${foundLead.callAttempts} | Dues: ₹${foundLead.dueAmount || 0}`);
            }
          }).catch(err => {
            console.warn('Lead lookup non-fatal error:', err.message);
          });
        }

      } else if (msg.event === 'audio') {
        audioChunkCount++;
        if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
          deepgramLive.send(Buffer.from(msg.data, 'base64'));
        }
        if (audioChunkCount % 100 === 0) {
          console.log(`📡 [Audio Stream In] Received ${audioChunkCount} microphone chunks from Android phone`);
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
              $set: {
                lastCallSummary: callSummary,
                lastCallDate: new Date(),
                lastCallerType: 'ai',
                lastCallerName: 'AI Voice Bot',
                callingBucket: 'today_queue'
              },
              $inc: { callAttempts: 1 },
              $push: {
                timeline: {
                  eventType: 'AI Call Completed',
                  description: `🤖 AI Voice Bot completed call session. Niskoor (Summary): ${callSummary}`,
                  timestamp: new Date()
                }
              }
           }).exec().catch(() => {});
        }
      } catch (e) { 
        console.log("❌ DB Save Error:", e.message); 
      }
    }
  });
};