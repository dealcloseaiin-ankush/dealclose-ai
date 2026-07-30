# 📞 DealClose AI - Voice Calling Architecture

Yeh document AI Calling (Twilio aur Web/Mobile App) ke architecture ko explain karta hai.

## 1. System Components
Hamara AI Voice Agent 3 hisson mein kaam karta hai:
- **Kaan (STT - Speech to Text):** Deepgram (`nova-2` model) customer ki aawaz ko text mein badalta hai.
- **Dimaag (LLM - The Brain):** Gemini 2.5 Flash / OpenAI GPT-4o-mini us text ko padh kar apna jawab (text) sochta hai.
- **Aawaz (TTS - Text to Speech):** Deepgram (`aura-asteria-en`) AI ke text ko wapas human-like voice audio mein convert karta hai.

## 2. Calling Modes
Humaare paas 2 tarike ke WebSocket connections hain jo `server.js` mein handle hote hain:

### A. Twilio Stream (`/api/webhooks/twilio/stream`)
- **Use Case:** Jab koi customer humaare Twilio/Exotel virtual number par regular phone call karta hai.
- **Format:** Twilio audio ko `mulaw` (8000Hz) format mein bhejta hai.
- **Cost:** High (Telecom cost + AI Cost).
- **File:** `twilioStreamHandler.js`

### B. Mobile / Web App Stream (`/api/webhooks/mobile/stream`)
- **Use Case:** Local dukaan wale ya PWA web app ke liye jahan browser/app direct internet ke through baat karta hai.
- **Format:** Browser audio ko `linear16` (16000Hz PCM) format mein bhejta hai.
- **Cost:** Low / Zero (Sirf AI Cost lagti hai, telecom calling bilkul free hai).
- **File:** `mobileStreamHandler.js`

## 3. CRM Tools (AI Actions)
AI sirf baatein nahi karta, woh action bhi le sakta hai (Function Calling):
1. **Take Notes (`add_call_notes`):** Call ke beech agar customer koi detail batata hai, toh AI usko CRM (`Lead` model) mein save kar leta hai.
2. **Take Order (`create_sales_order`):** Agar customer order deta hai, toh AI database mein `Order` generate kar deta hai.

## 4. Post-Call Analysis (Call Cut Hone Ke Baad)
Jaise hi call disconnect hoti hai (WebSocket close hota hai):
1. **Transcript Save:** Customer aur AI ke beech hui saari baatcheet WhatsApp chat ki tarah `Call` collection mein save ho jati hai.
2. **Auto-Summary:** AI turant poori transcript ko padhta hai aur 2-line ki Summary (Intent & Outcome) generate karke dashboard ke liye save karta hai.

## ⚠️ Troubleshooting
- **Aawaz Kat Rahi Hai?** Check karo ki internet connection stable hai ya nahi. WebSocket ping-pong miss nahi hona chahiye.
- **AI Jawab Nahi De Raha?** Check karo ki `.env` mein `DEEPGRAM_API_KEY` aur `GEMINI_API_KEY` valid hain.