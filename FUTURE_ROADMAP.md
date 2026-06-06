# DealClose AI - Future Roadmap & Pro Add-ons

This file tracks all the advanced features that are currently disabled (Coming Soon) or planned for post-MVP phases. We will activate these one by one as Premium Add-ons.

## 1. Native WhatsApp E-commerce (Meta Graph Catalog API)
- **Description:** Upgrade the current text/Excel-based B2B Smart Quotes into a full visual WhatsApp Store.
- **Features Planned:**
  - Dashboard UI for users to upload product photos, names, and prices.
  - Backend script to automatically push these products to Facebook Commerce Manager via Graph API.
  - Customers will see a native "View Catalog" button and "Shopping Cart" inside WhatsApp.
  - Webhook will catch the native "Cart" order and instantly generate a UPI/Razorpay payment link for the total amount.

## 2. ScanIQ (Competitor Ad Analyzer)
- **Description:** Spy on competitors' ads, analyze viral hooks, and compare stats.
- **Current Status:** UI built (`ScanIQ.jsx`) and linked on the Landing page. Needs backend scraper logic to be fully activated.

## 3. AI Video Studio
- **Description:** Generate marketing videos, lip-sync avatars, and product motion ads.
- **Current Status:** UI built (`AIVideoDashboard.jsx`). Replicate API integration needs to be connected with a Pay-Per-Video billing system.

## 4. Advanced Instagram Automation
- **Description:** Smart comment clustering, auto-DMs, and silent phone number extraction from IG DMs.
- **Current Status:** Backend flow logic ("Instagram Collab Flow") and post-campaign worker jobs are already built. Requires full Facebook App Review (Instagram Graph API permissions) to go fully live.

## 5. B2B Lead Extractor
- **Description:** Scrape verified business numbers from Google Maps and import them directly to CRM.
- **Current Status:** UI built (`LeadExtractor.jsx`). Backend scraper (Puppeteer/Google Places API) integration required.

## 6. AI Voice Calling (Outbound)
- **Description:** Call high-ticket leads automatically using Twilio WebSockets.
- **Current Status:** Twilio WebSocket stream handler (`twilioStreamHandler.js`) is built to catch live audio. Needs integration with Deepgram/ElevenLabs for real-time AI voice processing.

## 7. Advanced AI Analytics & Monthly Reports
- **Description:** Provide users with PDF reports on how much ROI the AI generated.
- **Current Status:** Disabled in MVP sidebar.

---
## ✅ MVP Core - Completed & Active (Foundation Ready)
- **AI Flow Builder:** Powered by Gemini 2.5 Flash for prompt-to-flow generation (`aiController.js`).
- **Magic Onboarding:** Auto-creates dynamic logic flows (E-commerce / Real Estate / Influencer) upon user sign-up (`authController.js`).
- **Smart CRM:** Human takeover logic (pauses AI for 24 hours on manual reply) and chat status tagging (`chatController.js`).
- **Background Automation:** BullMQ workers active for Abandoned Cart Rescue, Influencer ROI Pitch, and Feedback logic (`automationWorker.js`).