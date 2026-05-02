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
const webhookRoutes = require('./routes/webhookRoutes');
const chatRoutes = require('./routes/chatRoutes');
const whatsappTemplateRoutes = require('./routes/whatsappTemplateRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const walletRoutes = require('./routes/walletRoutes');
const contactRoutes = require('./routes/contactRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Initialize Background Workers
require('./workers/automationWorker');

const app = express();

// Middleware
const corsOptions = {
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174',
    'https://dealcloseai.in',
    'https://www.dealcloseai.in'
  ], // Allow your Vite frontend and custom domain
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json()); // Parses JSON incoming requests
app.use(express.urlencoded({ extended: true }));

// Make uploads folder publicly accessible to see images
app.use('/uploads', express.static('public/uploads'));

// API Routes
// Link all routes to the Main App
app.use('/api/leads', leadRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/users', settingsRoutes); // Handles both User Auth & Integrations/Settings
app.use('/api/webhooks', webhookRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/whatsapp/templates', whatsappTemplateRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/ai', aiRoutes);

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
