const { Worker, Queue } = require('bullmq');
const IORedis = require('ioredis');
const User = require('../models/userModel');
const Lead = require('../models/leadModel');
const whatsappService = require('../services/whatsappService');
const aiService = require('../services/aiService');

// Redis connection (Supports Upstash Cloud Redis & Local)
if (!process.env.REDIS_URL) {
  console.warn('\n⚠️ [WARNING] REDIS_URL not found in .env! Trying to connect to local Redis (127.0.0.1:6379). Please add REDIS_URL to your backend/.env file.\n');
}

const connection = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, { 
      maxRetriesPerRequest: null,
      retryStrategy(times) {
        // Connection break hone par dheere-dheere retry karega, crash nahi hoga
        return Math.min(times * 100, 3000); 
      }
    })
  : { host: '127.0.0.1', port: 6379 };

// 🔴 PREVENT CRASH: Agar Redis limit cross ho jaye toh server crash na ho
connection.on('error', (err) => {
  console.error('⚠️ [Redis Error] Server bacha liya gaya hai:', err.message);
});

// Create the Queue
const automationQueue = new Queue('automationQueue', { connection });

automationQueue.on('error', (err) => {
  console.error('⚠️ [Queue Error]:', err.message);
});

// Create the Worker that processes jobs
const automationWorker = new Worker('automationQueue', async job => {
  
  // ==========================================
  // 1. ABANDONED CART REMINDER
  // ==========================================
  if (job.name === 'abandoned_cart_reminder') {
    const { phone, customerName, userId } = job.data;
    console.log(`⏳ [Worker Started] Executing 15-min delayed job for ${phone}...`);
    
    const user = await User.findById(userId);
    if (!user || !user.whatsappConfig || !user.whatsappConfig.accessToken) {
      console.log(`❌ [Worker Error] WhatsApp config missing for user ${userId}`);
      return;
    }

    // 🚀 NEW: VERIFY IF CUSTOMER ALREADY COMPLETED PURCHASE BEFORE SENDING
    const lead = await Lead.findOne({ phoneNumber: phone, userId });
    if (lead && (lead.status === 'converted' || lead.status === 'won' || lead.status === 'completed')) {
      console.log(`✅ [Worker Info] Customer ${phone} already completed purchase. Abandoned cart message cancelled.`);
      return; // Stop execution
    }

    try {
      // Send META APPROVED TEMPLATE with Dynamic Variables
      await whatsappService.sendTemplateMessage(
        user.whatsappConfig.accessToken,
        user.whatsappConfig.phoneNumberId,
        phone,
        "abandoned_cart_rescue", // Aapki banayi hui Meta template ka naam
        "en_US",
        [
          {
            type: "body",
            parameters: [
              { type: "text", text: customerName } // Ye Meta template me {{1}} ko replace karega
            ]
          }
        ]
      );
      
      console.log(`✅ [Worker Success] Sent abandoned cart rescue message to ${phone}`);
    } catch (error) {
      console.error(`❌ [Worker Failed] Could not send message to ${phone}:`, error.message);
    }
  }

  // ==========================================
  // 2. POST-CAMPAIGN ROI & REPEAT PITCH (INFLUENCER)
  // ==========================================
  if (job.name === 'campaign_followup') {
    const { contactId, userId } = job.data;
    console.log(`⏳ [Worker Started] Executing Post-Campaign Follow-up for lead ${contactId}...`);
    
    const user = await User.findById(userId);
    const lead = await Lead.findOne({ _id: contactId }); // Note: Align this with Contact/Lead schema you are using

    if (!user || !lead) return;
    
    // Generate a highly personalized follow-up using AI
    const systemContext = `You are the highly professional AI Talent Manager for ${user.businessName || 'an influencer'}.
    This brand (${lead.name}) recently completed a campaign with you.
    Write a short, polite follow-up message asking how the campaign performed (ROI/Sales).
    CRITICAL RULES:
    1. Tone should be BALANCED: Professional, welcoming, and collaborative. Do NOT sound desperate (don't use "free" or "empty schedule"), but also do NOT sound arrogant. 
    2. Acknowledge the success of the past campaign and express a genuine interest in a long-term partnership.
    3. Use phrasing like: "We really enjoyed working on the last campaign! We are currently planning our content calendar for next month and would love to collaborate again if you have any upcoming product launches."
    Keep it professional, premium, and concise.`;
    
    try {
      const followUpMsg = await aiService.generateAIResponse("Draft a post-campaign ROI and repeat collaboration pitch.", systemContext);
      
      // Agar IG DM ka support hai, toh Meta IG API use karenge.
      // For now, if we have a phone number, send via WhatsApp, or log it to Dashboard Inbox
      if (lead.phoneNumber && user.whatsappConfig?.accessToken && !lead.phoneNumber.includes('IG_')) {
        await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, lead.phoneNumber, followUpMsg);
      }
      
      console.log(`✅ [Worker Success] Follow-up generated and sent for ${lead.name}: ${followUpMsg}`);
    } catch (error) {
      console.error(`❌ [Worker Failed] Post-campaign follow-up failed:`, error.message);
    }
  }
}, { 
  connection,
  // 🔴 TRICK: Stop the "Tick-Tick" polling!
  settings: {
    drainDelay: 60000,      // Jab queue khali ho, toh agla check 60 seconds baad kare (Default 5s hota hai)
    stalledInterval: 300000 // Stalled jobs ko har 5 minute me check kare, bar-bar nahi
  }
});

// 🔴 PREVENT CRASH: Worker fail hone par process kill hone se bachayega
automationWorker.on('error', err => {
  console.error('⚠️ [BullMQ Worker Error]:', err.message);
});

module.exports = { automationQueue, automationWorker };