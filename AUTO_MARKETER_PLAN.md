# 🚀 DealClose AI - Auto-Pilot Marketer (Social Media Agency)

Yeh document future "Auto-Pilot AI Marketer" feature ka blueprint hai. Yeh feature user ke businesses ke liye automatically posts sochega, banayega, WhatsApp par approval lega, aur publish karega.

---

## 1. Multi-Business (Workspace) Support
- Ek user ke dashboard mein multiple businesses (workspaces) ho sakte hain.
- Har workspace ka alag Meta (Instagram/FB) account connect hoga.
- AI har business ki specific niche (e.g., Real Estate vs E-commerce) ke hisaab se alag content generate karega.

## 2. HITL: WhatsApp Approval Workflow (Safety First)
Direct auto-posting risky ho sakti hai. Isliye hum **Human-In-The-Loop (HITL)** system use karenge:
1. AI Cron Job (e.g., subah 10 baje) ek post (Image + Caption) generate karega.
2. System us post ko user ke personal WhatsApp par bhejega.
3. WhatsApp message mein 3 Interactive Buttons honge:
   - **✅ Approve & Post:** Webhook catch karega aur Meta Graph API se post publish kar dega.
   - **🔄 Regenerate:** AI naya caption/image banakar wapas bhejega.
   - **❌ Cancel:** Post discard ho jayegi.

## 3. On-Demand / Special Campaigns (Via WhatsApp Chat)
- User apne WhatsApp se AI ko command de sakta hai.
- *Example:* "Create a special Diwali post offering 50% discount and schedule it for 6 PM today."
- AI NLP ke through command samjhega, image/caption banayega, aur approval bhej kar schedule (BullMQ) kar dega.

## 4. Required Inputs for Maximum Reach
- **Basic:** Business Name, Niche, Target Audience.
- **Advanced:** Brand Hex Colors, Logo, Competitor IG Handles (for ScanIQ analysis), Specific Offers, Tone of Voice (Humorous, Professional, etc.).

## 5. Media Generation Strategy & APIs Required
### Text & Strategy
- **API:** Gemini 2.5 Flash / OpenAI GPT-4o
### Image Generation
- AI generate karega completely naye visuals.
- **API:** OpenAI DALL-E 3 ya Midjourney API (via Replicate).
### Video Generation (Super-Premium Tier / Add-on)
- AI Avatar Lipsync Videos banaye jayenge.
- **Cost & Provider Comparison:**
  - **HeyGen API:** Top quality but expensive (approx ₹15-20 per min). Needs heavy monthly commitment.
  - **Replicate API (SadTalker/Wav2Lip):** Pay-per-second GPU compute. Bohot sasta (approx ₹5 per video). 
- **Technical Strategy (Why it failed before & Fixes):**
  - Replicate models face "Cold Boot" (Timeout errors). We will use background workers (BullMQ) to handle 5-minute wait times without crashing the server.
  - Audio must be strictly converted using FFmpeg before sending to Replicate.
  - **Flow:** Text -> Deepgram TTS -> FFmpeg format correction -> Replicate (Avatar Image + Audio) -> Final Video.
### Publishing
- **API:** Meta Graph API (IG/FB), YouTube Data API v3 (Shorts).

---

## 6. Execution Steps (For the Future)
1. **Approval Engine:** Sabse pehle backend se WhatsApp message with Interactive Buttons (Approve/Reject) bhejne ka logic banana.
2. **Image Gen:** DALL-E 3 ya Gemini se Image + Text output lena.
3. **Publishing:** Meta Graph API ke `/media` endpoint par image push karke publish karna.
4. **Custom Chat Commands:** AI Controller mein `create_campaign` tool add karna jo text sunkar post bana sake.