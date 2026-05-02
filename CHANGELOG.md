# Project Update & Cleanup Log

## Phase: Core Architecture Cleanup & Modularization
**Objective:** Streamline the application by separating the core "Omnichannel AI Calling & Chat Agent" features from heavy Add-on tools (Video Generator, Ad Studio, etc.). This ensures faster server response times, smaller frontend bundle sizes, and a clean professional UI.

### 1. Frontend Updates
- **Routing Cleaned (`App.jsx`):** Removed routes for standalone features like `RealisticStory`, `TwoDAnimation`, `AvatarProductAds`, `AdStudio`, and `VideoGenerator`.
- **Navigation Simplified (`Sidebar.jsx`):** Removed UI links for "Ad Studio" and "Avatar Ads" so the dashboard is strictly focused on CRM, Leads, Automations, and Chats.
- **Files Relocated (Untracked):** 
  - Moved all components under `src/modules/adstudio/` and `src/modules/video/` to the `frontend_clean_files` backup folder.
  - Moved unused design components like `BackgroundPicker.jsx` and default Vite assets (`react.svg`).

### 2. Backend Updates
- **Endpoints Removed (`app.js`):** Unlinked `/api/ad-studio` and `/api/video` routes to prevent the server from listening to non-core requests.
- **Heavy Services Relocated:** 
  - Moved CPU-intensive controllers (`adController.js`, `videoController.js`).
  - Moved rendering utilities (`canvasRenderer.js`, `videoService.js`).
  - Moved non-core database models (`videoModel.js`, `mediaAssetModel.js`) to the `backend_clean_files` backup folder.
- **Core Webhooks (`webhookController.js`):** Maintained and refined webhook logic for Exotel (Voice), Meta (WhatsApp), and Instagram integration.

### 3. Repository & Version Control
- **Gitignore Updated:** Added `frontend_clean_files/` and `backend_clean_files/` to `.gitignore`.
- **Cache Cleared:** Untracked the backup folders from Git history so they do not bloat the repository during deployment.

### 4. Authentication (Supabase to MongoDB)
- Fixed Google OAuth redirect mismatch by updating Supabase URL configurations.
- Ensured `Setup.jsx` captures the Google session and syncs it accurately with the `authController.js` in the backend.
- Proper generation of JWT tokens upon successful 3rd-party login.

## Next Steps / Roadmap
1. **Deployment:** Push the clean branch to GitHub and deploy the Frontend (Vercel) and Backend (Render/Railway).
2. **Testing Core AI:** Verify Exotel voice webhook responses and WhatsApp Meta API messaging via live domains.
3. **Feature Scaling:** Focus exclusively on AI Chat Training, Lead Extraction pipelines, and Smart Campaigns.

---
*Documented to maintain a clean track of structural architectural decisions.*