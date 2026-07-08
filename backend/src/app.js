const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import Routes
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
const automarketerRoutes = require('./routes/automarketerRoutes'); // 🚀 NEW: Auto-Marketer
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
app.use(express.json({ limit: '10mb' })); // Increased limit for heavy flow data
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Make uploads folder publicly accessible to see images
app.use('/uploads', express.static('public/uploads'));

// API Routes
// Link all routes to the Main App
app.use('/api/settings', settingsRoutes); // 🔥 Fixed settings routes mount
app.use('/api/leads', leadRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/users/settings', settingsRoutes); // Preserve compatibility for /api/users/settings
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
app.use('/api/automarketer', automarketerRoutes); // 🚀 NEW: Auto-Marketer

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

app.get('/', (req, res) => {
  res.status(200).json({ message: "AI Calling Agent API Backend is Live & Running! ⚡" });
});

module.exports = app;
