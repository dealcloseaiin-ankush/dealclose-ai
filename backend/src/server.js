require('dotenv').config();

// Fallback/Dummy key add kar rahe hain taaki agar real key na ho, toh server crash na ho
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'sk-dummy-key-to-prevent-startup-crash-123';
}

// Firebase ko temporarily comment kar diya hai taaki server bina error start ho sake
// require('./config/firebase'); 
const mongoose = require('mongoose');

// 🚀 NEW: Schedule background jobs like trash cleanup
require('../../jobs/trashCleanup'); // Cron job ko start karne ke liye
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

// 🚀 MULTI-WEBSOCKET SETUP: Twilio Calling & Mobile/Web App Calling
const wssTwilio = new WebSocket.Server({ noServer: true });
const wssMobile = new WebSocket.Server({ noServer: true });

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

server.on('upgrade', (request, socket, head) => {
  // Safely parse URL to ignore query parameters that might break routing
  let pathname = request.url.split('?')[0];
  if (pathname.endsWith('/') && pathname.length > 1) pathname = pathname.slice(0, -1);

  console.log(`🔌 [WebSocket] Upgrade request received for: ${pathname}`);

  if (pathname === '/api/webhooks/twilio/stream') {
    wssTwilio.handleUpgrade(request, socket, head, (ws) => wssTwilio.emit('connection', ws, request));
  } else if (pathname === '/api/webhooks/mobile/stream') {
    wssMobile.handleUpgrade(request, socket, head, (ws) => wssMobile.emit('connection', ws, request));
  } else {
    console.log(`❌ [WebSocket] Route not found, destroying socket: ${pathname}`);
    socket.destroy();
  }
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
