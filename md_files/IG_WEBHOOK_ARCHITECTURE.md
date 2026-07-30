# 🚀 DealClose AI - Instagram Webhook Architecture

## 📌 Core File: `instagram.webhook.controller.js`
Ye file sabse important hai. Instagram se koi bhi DM ya comment aata hai, toh Meta seedha is file ke `handleInstagramWebhook` function ko hit karta hai.

### 🔄 Data Flow (Step-by-Step):
1. **Event Received:** Meta se JSON payload aata hai. Server turant `200 OK` bhejta hai taaki Meta retry na kare.
2. **Anti-Loop Check:** Agar message AI ne khud bheja hai (`isEcho: true` with same App ID), toh code usko wahi rok deta hai taaki AI khud se baat na karne lage.
3. **User Identification:** Code check karta hai ki ye IG Account kis SaaS user (aapke customer) ka hai. `user.igConfig.accountId` se match karta hai.
4. **Token Extraction:** Agar user mil gaya, toh uska `igToken` nikala jata hai jisse hum Meta ko wapas reply bhejte hain.

### 🧠 Processing Stages:

**🟢 Stage 0: Human Owner Check**
Agar Instagram ke official mobile app se koi insaan reply karta hai (`isEcho: true`), toh AI 24 ghante ke liye Pause (`isAiPaused: true`) ho jata hai.

**🟢 Stage 1: Quick Reply Buttons (Link Delivery)**
Agar kisi ne button dabaya (`GET_AUTO_LINK_...`), toh code bina AI ke seedha PDF ya Link bhej deta hai.

**🟢 Stage 2: Flow Builder Engine**
Code check karta hai ki kya Flow Builder mein is keyword ke liye koi rule bana hai?
- Agar User abhi kisi Flow (Ask Question / Menu) ke andar hai, toh next step chalta hai.
- Agar keyword match hota hai, toh Flow Builder message bhejta hai aur AI ko aage aane se rok deta hai (`flowReplyHandled = true`).

**🟢 Stage 3: AI Manager (LLM)**
Agar Flow Builder ne handle nahi kiya, tab message **Google Gemini AI** ke paas jata hai.
- AI user se baat karta hai, aur uska Name/Number mangta hai.
- Jab number mil jata hai, toh AI ek secret tool (`extract_lead_requirements`) use karta hai.
- Ye tool seedha database mein Lead bana deta hai aur **Google Sheets** mein data append kar deta hai.

### ⚠️ Debugging Tips (Mera Code Fail Kyun Hua?):
- Agar Dashboard mein "Connected ✅" hai par messages nahi aa rahe: Instagram app mein "Allow Access to Messages" band hoga.
- Agar AI galat jawab de raha hai: Flow Builder mein galti se koi dusra template load ho gaya hoga.
- Agar Meta message block kar raha hai: `sendInstagramDM` function mein `messaging_type: "RESPONSE"` check karo.