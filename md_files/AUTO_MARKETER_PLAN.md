# 🚀 DealClose AI - Auto-Pilot Marketer (Social Media Agency)

Yeh document "Auto-Pilot AI Marketer" feature ka complete blueprint hai. Iska core engine ban chuka hai aur ab hum isme advanced premium features add karenge.

---

## ✅ Phase 1: Completed Core Engine
Yeh features ban chuke hain aur testing ke liye ready hain.

### 1. Daily AI Post Generation
- **Worker:** `automationWorker.js` mein `generate_social_post` cron job roz subah 10 baje chalta hai.
- **Content:** AI (Gemini) user ki business description padhkar ek viral caption aur hashtags banata hai.
- **Image:** AI (Replicate API) caption ke hisaab se ek high-quality image generate karta hai.
- **Database:** `GeneratedPostModel` mein post ko `pending_approval` status ke saath save karta hai.

### 2. Multi-Channel Approval System (HITL)
- **WhatsApp Approval:** System user ke personal WhatsApp par post ka preview (Image URL + Caption) bhejta hai. User `"APPROVE [ID]"` likhkar reply karta hai.
- **Smart Fallback:** Agar user ne apna WhatsApp connect nahi kiya hai, toh system **DealClose AI ke official number** se approval bhejta hai.
- **Dashboard Approval:** `AutoMarketerDashboard.jsx` page par user saare pending posts dekh sakta hai aur wahin se "Approve & Publish" ya "Reject" kar sakta hai.

### 3. Auto-Publishing to Instagram
- **Webhook:** `whatsapp.webhook.controller.js` "APPROVE" command ko handle karta hai.
- **Dashboard API:** `automarketerController.js` dashboard se aane wali approve requests ko handle karta hai.
- **Publisher:** `instagramService.js` Meta Graph API ka use karke image aur caption ko Instagram par live post kar deta hai.

---

## 🚀 Future Roadmap (Premium Add-ons)
Ab hum is core engine ke upar yeh advanced features banayenge.

### Phase 2: Visual Editor (Canva-Lite)
- **Goal:** User ko AI-generated image ko manually edit karne ka control dena.
- **Tech:** Frontend mein `fabric.js` ya `konva.js` library use karenge.
- **Features:**
  - User AI-generated caption ko drag karke image par kahin bhi rakh payega.
  - Text ka font, size, aur color change kar payega.
  - Apna brand logo upload karke image par laga payega.
  - Final edited image ko save karke publish kar payega.

### Phase 3: AI Video Suite
- **Goal:** Static images se aage badhkar short marketing videos banana.
- **Tech:** Deepgram (Transcription), Gemini (AI Director), Creatomate (Cloud Rendering).
- **Features:**
  - **Text-Based Video Editing:** User ek lamba video upload karega. AI uska text (transcript) nikalega. User text ko delete karke video se "Umm", "Aaa" aur silence hata payega.
  - **Viral Clip Finder:** AI poore video ko analyze karke 30-60 second ke best viral parts nikal kar dega.
  - **AI Avatar Lip-Sync:** User apna photo aur script dega, aur Replicate API se bolne wala video banega.

### Phase 4: Performance Audit & Self-Learning Loop
- **Goal:** AI ko "sikhana" ki konsa content kaam kar raha hai.
- **Tech:** Naya BullMQ cron job (`audit_social_post`).
- **Features:**
  - Har post ke 7 din baad, worker us post ke Likes, Comments, aur Reach Meta API se fetch karega.
  - Yeh data Gemini ko bhej kar ek chhota "Performance Review" generate karega.
  - User ko WhatsApp par report jayegi: *"Aapki pichli post par reach acchi thi, par comments kam the. Agli baar hum question puchenge."*
  - Yeh feedback AI ke "memory" (database) mein save ho jayega taaki agla post aur behtar bane.

### Phase 5: Enhanced UX & On-Demand Campaigns
- **Goal:** User experience ko aur smooth banana.
- **Features:**
  - **Interactive Buttons:** Text-based "APPROVE" command ko WhatsApp ke Interactive Buttons (`✅ Approve`, `🔄 Regenerate`, `❌ Cancel`) se replace karna.
  - **On-Demand Chat Commands:** User apne WhatsApp se AI ko command de payega: *"Create a special Diwali post offering 50% discount and schedule it for 6 PM today."*

---