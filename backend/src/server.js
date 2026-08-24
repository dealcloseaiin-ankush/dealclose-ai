const path = require('path');
// The repository keeps .env at its root, while this server is normally started
// from /backend. Load it explicitly so AI credentials are available in both
// local development and production (existing environment variables still win).
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Fallback/Dummy key add kar rahe hain taaki agar real key na ho, toh server crash na ho
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'sk-dummy-key-to-prevent-startup-crash-123';
}

// Firebase ko temporarily comment kar diya hai taaki server bina error start ho sake
// require('./config/firebase'); 
const mongoose = require('mongoose');
const compression = require('compression'); // 🚀 NEW: Import compression

// 🚀 NEW: Schedule background jobs like trash cleanup
require('../jobs/trashCleanup'); // Cron job ko start karne ke liye
const { scheduleTokenRefreshJob } = require('./workers/tokenRefreshWorker');
const { createMetaReviewerAccount } = require('./controllers/authController'); // 🚀 NEW: Import reviewer account creator
const app = require('./app');
const http = require('http');
const WebSocket = require('ws');
app.use(compression()); // 🚀 NEW: Compress all API responses

// 🔍 GLOBAL DEBUGGER: Track every request that comes to the backend
// This now only logs errors or slow requests in production to reduce I/O overhead.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isProduction = process.env.NODE_ENV === 'production';
    const isError = res.statusCode >= 400;
    const isSlow = duration > 1000;

    if (!isProduction || isError || isSlow) {
      console.log(`[🤖 SYSTEM MONITOR] ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | Time: ${duration}ms`);
    }
  });
  next();
});

// Fix for Express Rate Limit 'trust proxy' error on Render/Heroku
app.set('trust proxy', 1);

const port = process.env.PORT || 5000;

const server = http.createServer(app);

// 🚀 MULTI-WEBSOCKET SETUP: Twilio Calling & Mobile/Web App Calling
const wssTwilio = new WebSocket.Server({ noServer: true });
const wssMobile = new WebSocket.Server({ noServer: true });
const wssChat = new WebSocket.Server({ noServer: true }); // 🚀 NEW: For Live Chat Updates

wssTwilio.on('connection', (ws) => {
  console.log('🔗 [WebSocket] Twilio Stream Connection established');
  require('./websockets/twilioStreamHandler')(ws);
});

wssMobile.on('connection', (ws) => {
  console.log('📱 [WebSocket] Mobile/Web Stream Connection established');
  try {
    require('./websockets/mobileStreamHandler')(ws);
  } catch (error) {
    console.error('❌ [WebSocket] Mobile Stream Handler Error:', error.message);
    ws.close();
  }
});

wssChat.on('connection', (ws) => {
  console.log('💬 [WebSocket] Chat Dashboard Connection established');
  // Is connection ko zinda rakho taaki server isse message bhej sake
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

server.on('upgrade', (request, socket, head) => {
  // Safely parse URL to ignore query parameters that might break routing
  let pathname = request.url.split('?')[0];
  if (pathname.endsWith('/') && pathname.length > 1) pathname = pathname.slice(0, -1);

  console.log(`🔌 [WebSocket] Upgrade request received for: ${pathname}`);

  if (pathname === '/api/webhooks/twilio/stream') {
    wssTwilio.handleUpgrade(request, socket, head, (ws) => wssTwilio.emit('connection', ws, request));
  } else if (pathname === '/api/webhooks/mobile/stream') {
    wssMobile.handleUpgrade(request, socket, head, (ws) => wssMobile.emit('connection', ws, request));
  } else if (pathname === '/api/chat/stream') { // 🚀 NEW: Chat WebSocket Route
    wssChat.handleUpgrade(request, socket, head, (ws) => wssChat.emit('connection', ws, request));
  } else {
    console.log(`❌ [WebSocket] Route not found, destroying socket: ${pathname}`);
    socket.destroy();
  }
});

// 🚀 NEW: WebSocket Health Check (Connection ko zinda rakhne ke liye)
setInterval(() => {
  wssChat.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping(null, false, true);
  });
}, 30000);

app.set('wssChat', wssChat); // 🚀 NEW: Make wssChat available in controllers

// Pehle server start kar dete hain taaki Render "No open ports" ka error na de
server.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000 // 5 second timeout taaki app jaldi error throw kare aur hang na ho
}).then(async () => { // ✅ Make this async
  console.log('Connected to MongoDB');
  // ✅ NEW: Create Meta Reviewer account on startup if it doesn't exist.
  await createMetaReviewerAccount();
}).catch(err => {
  console.error('Database connection error:', err);
});

// Schedule the daily Instagram token refresh job
scheduleTokenRefreshJob();
