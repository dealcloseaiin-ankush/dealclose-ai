const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Call = require('../models/callModel');
const WebSocket = require('ws'); // RAW STT Connection
const Lead = require('../models/leadModel');

// ============================================================================
// 🚀 GLOBAL CACHE: Pre-cached Ethical AI Greeting & Latency Filler Audio
// ============================================================================
let cachedInitialGreetingAudio = null;
let cachedFillerAudio = null;
let cachedDncAudio = null;

const ETHICAL_AI_GREETING = "Namaste! Main DealClose ka AI assistant bol raha hoon. Boliye, main aapki kya madad kar sakta hoon?";
const FILLER_AUDIO_TEXT = "Ji, ek second...";
const DNC_CONFIRMATION_TEXT = "Theek hai ji, main aapka number Do Not Call list me daal raha hoon. Aage se aapko call nahi aayegi. Namaste.";

// Regex to detect Do-Not-Call (DNC) requests from customer
const DNC_REGEX = /(mat karo|nahi chahiye|band karo|call mat karna|phone mat karo|delete karo|dnd|don't call|do not call|hata do|hatao)/i;

/**
 * Helper to synthesize text via Deepgram TTS and return stripped 16kHz Linear16 PCM Base64
 */
async function synthesizeDeepgramTts(text) {
  if (!process.env.DEEPGRAM_API_KEY) return null;
  try {
    const ttsResponse = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=16000', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (ttsResponse.ok) {
      let buf = Buffer.from(await ttsResponse.arrayBuffer());
      // Strip 44-byte WAV RIFF header if present so app receives pure 16kHz linear16 PCM samples
      if (buf.length > 44 && buf.slice(0, 4).toString('ascii') === 'RIFF') {
        buf = buf.slice(44);
      }
      return buf.toString('base64');
    }
  } catch (err) {
    console.warn("TTS synthesis error for text:", text, err.message);
  }
  return null;
}

async function getPreCachedGreeting() {
  if (cachedInitialGreetingAudio) return cachedInitialGreetingAudio;
  cachedInitialGreetingAudio = await synthesizeDeepgramTts(ETHICAL_AI_GREETING);
  if (cachedInitialGreetingAudio) {
    console.log(`⚡ [Instant Greeting] Pre-cached (${Buffer.from(cachedInitialGreetingAudio, 'base64').length} bytes PCM)`);
  }
  return cachedInitialGreetingAudio;
}

async function getPreCachedFiller() {
  if (cachedFillerAudio) return cachedFillerAudio;
  cachedFillerAudio = await synthesizeDeepgramTts(FILLER_AUDIO_TEXT);
  return cachedFillerAudio;
}

async function getPreCachedDnc() {
  if (cachedDncAudio) return cachedDncAudio;
  cachedDncAudio = await synthesizeDeepgramTts(DNC_CONFIRMATION_TEXT);
  return cachedDncAudio;
}

// Pre-warm caches immediately if API key available
if (process.env.DEEPGRAM_API_KEY) {
  getPreCachedGreeting();
  getPreCachedFiller();
  getPreCachedDnc();
}

/**
 * Fuzzy check to prevent acoustic echo loops:
 * Compares incoming STT transcript with recent AI utterances.
 */
function isAcousticEcho(transcript, recentAiUtterances) {
  if (!transcript || recentAiUtterances.length === 0) return false;
  const cleanT = transcript.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, '').trim();
  if (cleanT.length < 3) return false;
  const tWords = cleanT.split(/\s+/).filter(Boolean);

  for (const aiText of recentAiUtterances) {
    if (!aiText) continue;
    const cleanAi = aiText.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, '').trim();
    if (cleanAi.includes(cleanT) && tWords.length >= 2) return true;

    // Word overlap / Jaccard
    const aiWords = new Set(cleanAi.split(/\s+/).filter(Boolean));
    let matchCount = 0;
    for (const w of tWords) {
      if (aiWords.has(w)) matchCount++;
    }
    const overlapRatio = matchCount / Math.max(tWords.length, 1);
    if (overlapRatio >= 0.60 && tWords.length >= 2) return true;
  }
  return false;
}

// AI Calling Models
const MODELS = {
  GEMINI_PRIMARY: 'gemini-1.5-flash',
  GEMINI_FALLBACK: 'gemini-2.0-flash',
  OPENAI_MINI: 'gpt-4o-mini',
};

module.exports = function (ws) {
  const callSid = 'MOBILE_' + Date.now();
  let rawTranscript = [];
  let conversationHistory = [];
  let recentAiUtterances = []; // Ring buffer of last 3 AI utterances for echo guard
  let audioChunkCount = 0;
  let activeLeadId = null;
  let activePhone = null;
  let activeUserId = null;
  let activeWorkspaceId = 'main';
  let activeCallGoal = null;
  let currentLead = null;

  // Latency & Half-duplex tracking
  let callAnsweredTime = null;
  let greetingStartedTime = null;
  let aiPlaybackEndTime = 0; // Epoch ms when AI speech output + tail guard finishes
  let isAiResponding = false;
  let activeAbortController = null;
  let callLatencies = []; // Measured turn latencies

  console.log(`\n================== [AI CALLING COMPANION CONNECTED] ==================`);
  console.log(`📱 Call SID: ${callSid}`);
  console.log(`🔑 DEEPGRAM_API_KEY:`, process.env.DEEPGRAM_API_KEY ? `LOADED` : `MISSING!`);
  console.log(`🔑 OPENAI_API_KEY:`, process.env.OPENAI_API_KEY ? `LOADED` : `MISSING!`);
  console.log(`======================================================================\n`);

  if (!process.env.DEEPGRAM_API_KEY) {
    console.error("❌ DEEPGRAM_API_KEY missing. Closing WebSocket.");
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ event: 'error', data: 'DEEPGRAM_API_KEY missing on server' }));
    }
    return ws.close();
  }

  const openai = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy')
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;
  const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

  // Deepgram Live STT connection (endpointing=300ms, model=nova-2, language=hi)
  let deepgramLive;
  try {
    deepgramLive = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&language=hi&smart_format=true&encoding=linear16&sample_rate=16000&endpointing=300&interim_results=true', {
      headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` }
    });

    deepgramLive.on('open', () => {
      console.log(`✅ [Deepgram STT] Live Ears opened (model=nova-2&language=hi, endpointing=300ms).`);
    });

    deepgramLive.on('message', async (data) => {
      try {
        const response = JSON.parse(data);
        if (!response.channel || !response.channel.alternatives[0]) return;

        const alt = response.channel.alternatives[0];
        const transcript = alt.transcript ? alt.transcript.trim() : '';
        if (transcript.length === 0) return;

        const now = Date.now();

        // 1. ECHO GUARD: Check if transcript matches recent AI speech
        if (isAcousticEcho(transcript, recentAiUtterances)) {
          console.log(`🚫 [Echo Guard Discard] Suppressed self-echo: "${transcript}"`);
          return;
        }

        // 2. BARGE-IN CHECK: If customer speaks during AI playback
        if (now < aiPlaybackEndTime && transcript.length >= 4) {
          console.log(`🚨 [Barge-in] Customer spoke while AI was playing: "${transcript}". Triggering interrupt!`);
          aiPlaybackEndTime = 0; // Clear playback lock
          if (activeAbortController) {
            activeAbortController.abort();
            activeAbortController = null;
          }
          isAiResponding = false;
          // Send interrupt signal to Android to flush AudioTrack playback immediately
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'interrupt' }));
          }
        }

        // 3. FINAL CUSTOMER SPEECH
        if (response.is_final || response.speech_final) {
          const customerSpeechEndTime = Date.now();
          console.log(`👤 [Customer on Mobile]: "${transcript}"`);
          rawTranscript.push({ speaker: 'Customer', text: transcript, time: new Date() });
          conversationHistory.push({ role: "user", content: transcript });

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: 'transcript', text: transcript }));
          }

          // 4. DO-NOT-CALL (DNC) OPT-OUT CHECK
          if (DNC_REGEX.test(transcript)) {
            await handleDncOptOut(transcript);
            return;
          }

          // 5. PROCESS AI RESPONSE WITH STREAMING & LATENCY LOGGING
          await processStreamingAIResponse(customerSpeechEndTime);
        }
      } catch (msgErr) {
        console.error("Deepgram message processing error:", msgErr.message);
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

  /**
   * Handle Do-Not-Call (DNC) Opt-out
   */
  async function handleDncOptOut(customerText) {
    console.log(`🛑 [DNC Opt-Out] Customer requested DNC: "${customerText}"`);
    isAiResponding = false;
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }

    // 1. Update Lead in Database
    if (activeLeadId || activePhone) {
      const query = activeLeadId
        ? { _id: activeLeadId }
        : { phoneNumber: { $regex: new RegExp(activePhone.replace(/\D/g, '').slice(-10) + '$') } };

      Lead.findOneAndUpdate(query, {
        $set: {
          isDnc: true,
          dncDate: new Date(),
          isCallEnabled: false,
          status: 'not_interested',
          callingBucket: 'lost_archive',
          lastCallOutcome: 'not_interested',
          lastCallSummary: `DNC Requested: "${customerText}"`
        },
        $push: {
          timeline: {
            eventType: 'DNC Opt-Out',
            description: `Customer requested Do Not Call: "${customerText}"`,
            timestamp: new Date()
          }
        }
      }).catch(err => console.warn('DNC lead update error:', err.message));
    }

    // 2. Play polite DNC closing audio
    const dncAudio = await getPreCachedDnc();
    if (dncAudio && ws.readyState === WebSocket.OPEN) {
      const durationMs = Math.round(Buffer.from(dncAudio, 'base64').length / 32);
      aiPlaybackEndTime = Date.now() + durationMs + 350;

      rawTranscript.push({ speaker: 'AI', text: DNC_CONFIRMATION_TEXT, time: new Date() });
      recentAiUtterances.push(DNC_CONFIRMATION_TEXT);

      ws.send(JSON.stringify({ event: 'ai_response', text: DNC_CONFIRMATION_TEXT }));
      ws.send(JSON.stringify({ event: 'audio', data: dncAudio }));

      // 3. Hangup call cleanly after playback finishes
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log(`📴 [DNC Hangup] Closing active call following DNC opt-out.`);
          ws.send(JSON.stringify({ event: 'hangup' }));
        }
      }, durationMs + 400);
    }
  }

  /**
   * Sentence-Level Streaming AI Response with Measured Latency & 1.5s Filler
   */
  async function processStreamingAIResponse(customerSpeechEndTime) {
    if (isAiResponding) return;
    isAiResponding = true;

    const turnIndex = callLatencies.length + 1;
    let llmFirstTokenTime = null;
    let ttsFirstByteTime = null;
    let playbackStartedTime = null;

    activeAbortController = new AbortController();

    // ⏱️ 1.5s FILLER FALLBACK TIMER
    let firstAudioDispatched = false;
    const fillerTimer = setTimeout(async () => {
      if (!firstAudioDispatched && ws.readyState === WebSocket.OPEN) {
        console.log(`⏱️ [Latency Guard] >1500ms elapsed before LLM/TTS response. Dispatching filler audio: "${FILLER_AUDIO_TEXT}"`);
        const fillerAudio = await getPreCachedFiller();
        if (fillerAudio && !firstAudioDispatched && ws.readyState === WebSocket.OPEN) {
          const durationMs = Math.round(Buffer.from(fillerAudio, 'base64').length / 32);
          aiPlaybackEndTime = Date.now() + durationMs + 350;
          ws.send(JSON.stringify({ event: 'audio', data: fillerAudio }));
        }
      }
    }, 1500);

    try {
      // Build Prompt
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

🇮🇳 RURAL & SMALL-TOWN GROUND RULES:
1. IDENTITY: You are an AI assistant. Be respectful, warm and concise.
2. CHHATTISGARHI & RURAL DIALECT: Fully understand eastern Hindi / Chhattisgarhi words ("khet me haanw", "kaam chalat he", "kaik rupiya laghi", "bhej da").
3. FAMILY / THIRD-PARTY PICKUP: Never mention debt or udhar to family or third parties!
4. RESPECT ALWAYS: Never argue or be rude.`;

      let fullAiText = "";
      let sentenceBuffer = "";

      // 🚀 Streaming LLM Generation via OpenAI gpt-4o-mini
      if (openai) {
        try {
          const stream = await openai.chat.completions.create({
            model: MODELS.OPENAI_MINI,
            messages: [{ role: "system", content: systemPromptText }, ...conversationHistory],
            max_tokens: 65,
            temperature: 0.2,
            stream: true,
          }, { signal: activeAbortController.signal });

          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || "";
            if (!token) continue;

            if (!llmFirstTokenTime) {
              llmFirstTokenTime = Date.now();
              console.log(`⚡ [Latency] LLM First Token received in ${llmFirstTokenTime - customerSpeechEndTime}ms`);
            }

            sentenceBuffer += token;
            fullAiText += token;

            // Sentence boundary detection: [. ? ! । \n]
            const sentenceMatch = sentenceBuffer.match(/([^\.?!।\n]+[\.?!।\n]+)/);
            if (sentenceMatch) {
              const sentenceToSpeak = sentenceMatch[1].trim();
              sentenceBuffer = sentenceBuffer.slice(sentenceMatch[0].length);

              if (sentenceToSpeak.length > 0) {
                firstAudioDispatched = true;
                clearTimeout(fillerTimer);

                const audioB64 = await synthesizeDeepgramTts(sentenceToSpeak);
                if (audioB64 && ws.readyState === WebSocket.OPEN) {
                  const now = Date.now();
                  if (!ttsFirstByteTime) ttsFirstByteTime = now;
                  if (!playbackStartedTime) {
                    playbackStartedTime = now;
                    const turnaroundMs = playbackStartedTime - customerSpeechEndTime;
                    callLatencies.push({
                      turn: turnIndex,
                      llmFirstTokenMs: llmFirstTokenTime - customerSpeechEndTime,
                      ttsFirstByteMs: ttsFirstByteTime - customerSpeechEndTime,
                      turnaroundMs: turnaroundMs
                    });
                    console.log(`📊 [Latency Turn #${turnIndex}] speech_end -> playback_started: ${turnaroundMs}ms | LLM: ${llmFirstTokenTime - customerSpeechEndTime}ms | TTS: ${ttsFirstByteTime - llmFirstTokenTime}ms`);
                  }

                  const pcmDurationMs = Math.round(Buffer.from(audioB64, 'base64').length / 32);
                  // Half-duplex tail guard: lock mic input during playback + 350ms tail buffer
                  aiPlaybackEndTime = Date.now() + pcmDurationMs + 350;

                  recentAiUtterances.push(sentenceToSpeak);
                  if (recentAiUtterances.length > 3) recentAiUtterances.shift();

                  ws.send(JSON.stringify({ event: 'ai_response', text: sentenceToSpeak }));
                  ws.send(JSON.stringify({ event: 'audio', data: audioB64 }));
                }
              }
            }
          }

          // Flush any trailing tokens in sentenceBuffer
          if (sentenceBuffer.trim().length > 0 && ws.readyState === WebSocket.OPEN) {
            const trailingText = sentenceBuffer.trim();
            const audioB64 = await synthesizeDeepgramTts(trailingText);
            if (audioB64 && ws.readyState === WebSocket.OPEN) {
              const pcmDurationMs = Math.round(Buffer.from(audioB64, 'base64').length / 32);
              aiPlaybackEndTime = Date.now() + pcmDurationMs + 350;

              recentAiUtterances.push(trailingText);
              if (recentAiUtterances.length > 3) recentAiUtterances.shift();

              ws.send(JSON.stringify({ event: 'ai_response', text: trailingText }));
              ws.send(JSON.stringify({ event: 'audio', data: audioB64 }));
            }
          }
        } catch (streamErr) {
          if (streamErr.name === 'AbortError') {
            console.log(`🛑 [AI Stream] LLM generation aborted due to customer interruption.`);
            return;
          }
          console.warn(`⚠️ [AI Voice] OpenAI stream error: ${streamErr.message}`);
        }
      }

      // Record in conversation history and transcript
      if (fullAiText.trim().length > 0) {
        const cleanAi = fullAiText.replace(/\*/g, '').trim();
        conversationHistory.push({ role: "assistant", content: cleanAi });
        rawTranscript.push({ speaker: 'AI', text: cleanAi, time: new Date() });
      }
    } catch (err) {
      console.error("❌ processStreamingAIResponse error:", err.message);
    } finally {
      clearTimeout(fillerTimer);
      isAiResponding = false;
      activeAbortController = null;
    }
  }

  // Handle incoming messages from Android
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.event === 'start') {
        callAnsweredTime = Date.now();
        console.log(`📞 [Mobile Stream] Android App connected & answered call.`);
        if (msg.leadId) activeLeadId = msg.leadId;
        if (msg.phone) activePhone = msg.phone;
        if (msg.userId) activeUserId = msg.userId;
        if (msg.workspaceId) activeWorkspaceId = msg.workspaceId;
        if (msg.callGoal) activeCallGoal = msg.callGoal;

        // Immediate Instant Pre-cached Ethical Greeting playback
        getPreCachedGreeting().then(greetingAudio => {
          if (greetingAudio && ws.readyState === WebSocket.OPEN) {
            greetingStartedTime = Date.now();
            const greetingDelay = greetingStartedTime - callAnsweredTime;
            console.log(`⚡ [Latency] call_answered -> greeting_audio_started: ${greetingDelay}ms`);

            recentAiUtterances.push(ETHICAL_AI_GREETING);
            conversationHistory.push({ role: 'assistant', content: ETHICAL_AI_GREETING });
            rawTranscript.push({ speaker: 'AI', text: ETHICAL_AI_GREETING, time: new Date() });

            const audioBytes = Buffer.from(greetingAudio, 'base64').length;
            const pcmDurationMs = Math.round(audioBytes / 32);
            // Half-duplex tail guard: suppress mic frames while greeting plays + 350ms
            aiPlaybackEndTime = Date.now() + pcmDurationMs + 350;

            ws.send(JSON.stringify({ event: 'ai_response', text: ETHICAL_AI_GREETING }));
            ws.send(JSON.stringify({ event: 'audio', data: greetingAudio }));
          }
        }).catch(err => {
          console.warn("Instant greeting dispatch failed:", err.message);
        });

        // Lookup Customer Context in MongoDB
        if (activeLeadId || activePhone) {
          const query = activeLeadId
            ? { _id: activeLeadId }
            : { phoneNumber: { $regex: new RegExp(activePhone.replace(/\D/g, '').slice(-10) + '$') } };

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
        const now = Date.now();

        // 🛡️ HALF-DUPLEX TAIL GUARD: Drop mic audio frames while AI is speaking + 350ms
        if (now < aiPlaybackEndTime) {
          // Frame dropped to prevent acoustic feedback into Deepgram STT
          return;
        }

        // Forward customer mic audio to Deepgram STT
        if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
          deepgramLive.send(Buffer.from(msg.data, 'base64'));
        }

        if (audioChunkCount % 100 === 0) {
          console.log(`📡 [Audio Stream In] Forwarded ${audioChunkCount} microphone chunks to Deepgram STT`);
        }
      } else if (msg.event === 'stop') {
        if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
          deepgramLive.close();
        }
      }
    } catch (e) {
      if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
        deepgramLive.send(message);
      }
    }
  });

  // Call End / Disconnect Handler
  ws.on('close', async () => {
    console.log(`🔌 [WebSocket] Mobile App Connection Closed for ${callSid}`);
    if (deepgramLive && deepgramLive.readyState === WebSocket.OPEN) {
      deepgramLive.close();
    }
    if (activeAbortController) {
      activeAbortController.abort();
    }

    // ========================================================================
    // 📊 POST-CALL MEASURED LATENCY SUMMARY
    // ========================================================================
    const greetingDelayMs = (callAnsweredTime && greetingStartedTime)
      ? (greetingStartedTime - callAnsweredTime)
      : null;

    let avgTurnaround = 0;
    let worstTurnaround = 0;

    if (callLatencies.length > 0) {
      const turnarounds = callLatencies.map(l => l.turnaroundMs);
      avgTurnaround = Math.round(turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length);
      worstTurnaround = Math.max(...turnarounds);
    }

    console.log(`\n================== [POST-CALL LATENCY SUMMARY] ==================`);
    console.log(`📞 Call SID: ${callSid}`);
    console.log(`⚡ Call Answered -> Greeting Audio Started: ${greetingDelayMs !== null ? `${greetingDelayMs}ms` : 'N/A'}`);
    console.log(`🔢 Total Conversational Turns: ${callLatencies.length}`);
    if (callLatencies.length > 0) {
      console.log(`📈 Average Turnaround (Speech End -> Playback Start): ${avgTurnaround}ms`);
      console.log(`📉 Worst Turnaround: ${worstTurnaround}ms`);
      console.log(`📋 Turn Details:`);
      callLatencies.forEach(l => {
        console.log(`   Turn #${l.turn}: Turnaround = ${l.turnaroundMs}ms (LLM: ${l.llmFirstTokenMs}ms, TTS: ${l.ttsFirstByteMs}ms)`);
      });
    } else {
      console.log(`ℹ️ No conversational turns recorded.`);
    }
    console.log(`=================================================================\n`);

    // Save Call Record & CRM Summary
    if (rawTranscript.length > 0) {
      try {
        let callSummary = "No summary generated.";
        if (conversationHistory.length > 0 && openai) {
          try {
            const summaryPrompt = "Analyze this call transcript and provide a short summary (2-3 lines). Format: \nIntent: ... \nOutcome: ...";
            const transcriptText = JSON.stringify(rawTranscript.map(t => `${t.speaker}: ${t.text}`));
            const summaryResponse = await openai.chat.completions.create({
              model: MODELS.OPENAI_MINI,
              messages: [{ role: "system", content: summaryPrompt }, { role: "user", content: transcriptText }]
            });
            callSummary = summaryResponse.choices[0]?.message?.content || callSummary;
          } catch (sumErr) {
            console.warn("Call summary generation failed:", sumErr.message);
          }
        }

        const formattedTranscript = rawTranscript.map(t => ({
          ...t,
          speaker: t.speaker === 'AI' ? 'Agent' : t.speaker
        }));

        await Call.create({
          userId: activeUserId,
          workspaceId: activeWorkspaceId,
          sid: callSid,
          to: 'Mobile App',
          from: activePhone || 'Customer',
          callType: 'web',
          status: 'completed',
          provider: 'android_app',
          transcript: formattedTranscript,
          summary: callSummary,
          callGoal: activeCallGoal,
          latencyStats: {
            greetingDelayMs,
            avgTurnaroundMs: avgTurnaround,
            worstTurnaroundMs: worstTurnaround,
            totalTurns: callLatencies.length,
            turns: callLatencies
          }
        });

        if (activeLeadId || activePhone) {
          const query = activeLeadId
            ? { _id: activeLeadId }
            : { phoneNumber: { $regex: new RegExp(activePhone.replace(/\D/g, '').slice(-10) + '$') } };

          await Lead.findOneAndUpdate(query, {
            $set: {
              lastCallSummary: callSummary,
              lastCallDate: new Date(),
              lastCallerType: 'ai',
              lastCallerName: 'DealClose AI Assistant'
            },
            $push: {
              timeline: {
                eventType: 'AI Call Completed',
                description: `🤖 DealClose AI Assistant completed call. Niskoor (Summary): ${callSummary} | Avg Latency: ${avgTurnaround}ms`,
                timestamp: new Date()
              }
            }
          }).exec().catch(() => {});
        }
      } catch (dbErr) {
        console.error("❌ DB Save Error:", dbErr.message);
      }
    }
  });
};
