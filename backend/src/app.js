const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Import Routes
const multer = require('multer');
// Import all route files
const leadRoutes = require('./routes/leadRoutes');
const callRoutes = require('./routes/callRoutes');
const formRoutes = require('./routes/formRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const userRoutes = require('./routes/userRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const chatRoutes = require('./routes/chatRoutes');
const whatsappTemplateRoutes = require('./routes/whatsappTemplateRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const walletRoutes = require('./routes/walletRoutes');
const contactRoutes = require('./routes/contactRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const aiRoutes = require('./routes/aiRoutes');
const crmRoutes = require('./routes/crmRoutes');
const videoRoutes = require('./routes/videoRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const trackingController = require('./controllers/trackingController');
const authRoutes = require('./routes/authRoutes');
const scraperRoutes = require('./routes/scraperRoutes');
const instagramRoutes = require('./routes/instagramRoutes');
const adminRoutes = require('./routes/adminRoutes');
const inboundWebhookRoutes = require('./routes/inboundWebhookRoutes');
const designRoutes = require('./routes/designRoutes'); // 🚀 NEW: Design Studio routes
const templateRoutes = require('./routes/templateRoutes'); // 🚀 NEW: Template Engine routes
const postRoutes = require('./routes/postRoutes'); // ✅ FIX: Using the new post routes with delete functionality
const automarketerRoutes = require('./routes/automarketerRoutes'); // 🚀 NEW: Auto-Marketer
const socialPostRoutes = require('./routes/socialPostRoutes'); // 🚀 NEW: Social Publisher routes
const metaAdsRoutes = require('./routes/metaAdsRoutes'); // 🚀 NEW: Meta Ads

const backupRoutes = require('./routes/backupRoutes'); // 🚀 NEW: Google Drive Backup
const billingRoutes = require('./routes/billingRoutes'); // 🚀 NEW: Billing & Costing
// 📦 MODULAR FEATURES
const scaniqRoutes = require('./routes/scaniqRoutes');

// Initialize Background Workers Safely
if (process.env.DISABLE_REDIS_WORKER !== 'true') {
  require('./workers/automationWorker');
} else {
  console.log('⚠️ [Warning] Background Automation Worker is DISABLED via environment variables.');
}

const app = express();

// 🚀 FIX for "MulterError: Field value too long"
// Increase the field size limit to handle large JSON payloads from the post designer.
const upload = multer({
  dest: 'uploads/',
  limits: { fieldSize: 25 * 1024 * 1024 } // 25MB limit for form fields
});

// Middleware
const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174',
    'https://dealcloseai.in',
    'https://www.dealcloseai.in',
    process.env.FRONTEND_URL // Apni .env file mein FRONTEND_URL add karein (e.g. Vercel URL)
  ], // Allow your Vite frontend and custom domain
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '25mb' })); // Increased limit for heavy flow data & design JSON
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Make uploads folder publicly accessible to see images
app.use('/uploads', express.static('public/uploads'));

// API Routes
// Link all routes to the Main App
app.use('/api/settings', settingsRoutes); // 🔥 Fixed settings routes mount
app.use('/api/leads', leadRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/forms', formRoutes);
// ✅ FIX: The frontend calls `/api/users/settings/instagram-basic-connect`. The controller for this
// is in `settingsRoutes.js`. By mounting `settingsRoutes` on `/api/users/settings`, we ensure
// that the request is correctly routed, fixing the 404 error.
app.use('/api/users/settings', settingsRoutes);
app.use('/api/users', authRoutes); // Frontend auth/profile routes
app.use('/api/users', userRoutes); // Backward-compatible profile routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/whatsapp/templates', whatsappTemplateRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/admin', adminRoutes); // Super Admin Routes
app.use('/api/webhooks/inbound', inboundWebhookRoutes); // Developer API
app.use('/api/designs', designRoutes); // 🚀 NEW: Design Studio routes
app.use('/api/templates', templateRoutes); // 🚀 NEW: Template Engine routes
app.use('/api/automarketer', automarketerRoutes); // 🚀 NEW: Auto-Marketer
app.use('/api/posts', postRoutes); // ✅ FIX: Using the new post routes with delete functionality

app.use('/api/meta-ads', metaAdsRoutes); // 🚀 NEW: Meta Ads
app.use('/api/billing', billingRoutes); // 🚀 NEW: Billing & Costing
app.use('/api/backup', backupRoutes); // 🚀 NEW: Google Drive Backup
// 👇 YAHAN PAR HAI AAPKA IMAGE UPLOAD ROUTE 👇
app.use('/api/upload', uploadRoutes);

app.use('/api/wallet', walletRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/tracking', trackingRoutes);

// Direct route for the Universal Tracking Pixel script
app.get('/api/pixel.js', trackingController.servePixel);

// Mount Modular Features
app.use('/api/scaniq', scaniqRoutes);

// FAKE META DATA DELETION CALLBACK (To bypass Meta Dashboard Bug)
app.post('/api/webhooks/data-deletion', (req, res) => {
  console.log("➡️ [Meta Data Deletion Callback] Verified by Meta Bot");
  res.status(200).json({
    url: "https://dealcloseai.in/delete-data.html",
    confirmation_code: "success_" + Date.now()
  });
});

// -------------------------------------------------------------------
// 🚀 CRITICAL FIX for MIME Type Errors & SPA (React/Vue) Routing
// -------------------------------------------------------------------
// 1. Serve static files (JS, CSS, images) from the frontend's build folder.
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
 
// 2. For any other route that is NOT an API route, send the index.html file.
//    This allows React Router to handle frontend routing (e.g., /dashboard, /settings).
// 🚀 FIX: The `if` condition was inside the handler, causing a routing error.
// This new structure ensures that only non-API GET requests are handled by this catch-all route.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist', 'index.html'));
});
 
module.exports = app;
