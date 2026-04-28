const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import Routes
// Import all route files
const leadRoutes = require('./routes/leadRoutes');
const callRoutes = require('./routes/callRoutes');
const formRoutes = require('./routes/formRoutes');
const userRoutes = require('./routes/userRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const adRoutes = require('./routes/adRoutes');
const videoRoutes = require('./routes/videoRoutes');
const chatRoutes = require('./routes/chatRoutes');
const whatsappTemplateRoutes = require('./routes/whatsappTemplateRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const walletRoutes = require('./routes/walletRoutes');

// Initialize Background Workers
require('./workers/automationWorker');

const app = express();

// Middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Allow your Vite frontend
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
app.use('/api/users', userRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/ad-studio', adRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/whatsapp/templates', whatsappTemplateRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wallet', walletRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ message: "AI Calling Agent API Backend is Live & Running! ⚡" });
});

module.exports = app;
