require('dotenv').config();

// Fallback/Dummy key add kar rahe hain taaki agar real key na ho, toh server crash na ho
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'sk-dummy-key-to-prevent-startup-crash-123';
}

// Firebase ko temporarily comment kar diya hai taaki server bina error start ho sake
// require('./config/firebase'); 
const mongoose = require('mongoose');
const app = require('./app');
const http = require('http');
const WebSocket = require('ws');

// 🔍 GLOBAL DEBUGGER: Track every request that comes to the backend
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[🤖 SYSTEM MONITOR] ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Time: ${duration}ms`);
  });
  next();
});

// Fix for Express Rate Limit 'trust proxy' error on Render/Heroku
app.set('trust proxy', 1);

const port = process.env.PORT || 5000;

const server = http.createServer(app);

// 🚀 NEW: Setup WebSocket Server for Twilio Fast AI Calling
const wss = new WebSocket.Server({ server, path: '/api/webhooks/twilio/stream' });

wss.on('connection', (ws) => {
  console.log('🔗 [WebSocket] New Twilio Stream Connection established');
  const twilioStreamHandler = require('./websockets/twilioStreamHandler');
  twilioStreamHandler(ws);
});

// Pehle server start kar dete hain taaki Render "No open ports" ka error na de
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000 // 5 second timeout taaki app jaldi error throw kare aur hang na ho
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Database connection error:', err);
});
