const { Worker, Queue } = require('bullmq');
const IORedis = require('ioredis');
const User = require('../models/userModel');
const whatsappService = require('../services/whatsappService');

// Redis connection (Supports Upstash Cloud Redis & Local)
if (!process.env.REDIS_URL) {
  console.warn('\n⚠️ [WARNING] REDIS_URL not found in .env! Trying to connect to local Redis (127.0.0.1:6379). Please add REDIS_URL to your backend/.env file.\n');
}

const connection = process.env.REDIS_URL 
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : { host: '127.0.0.1', port: 6379 };

// Create the Queue
const automationQueue = new Queue('automationQueue', { connection });

// Create the Worker that processes jobs
const automationWorker = new Worker('automationQueue', async job => {
  if (job.name === 'abandoned_cart_reminder') {
    const { phone, customerName, userId } = job.data;
    console.log(`⏳ [Worker Started] Executing 15-min delayed job for ${phone}...`);
    
    const user = await User.findById(userId);
    if (!user || !user.whatsappConfig || !user.whatsappConfig.accessToken) {
      console.log(`❌ [Worker Error] WhatsApp config missing for user ${userId}`);
      return;
    }

    // Optional TODO: Yahan database check aayega ki "kya is number ne pichle 15 min me payment ki hai?"
    // Agar payment ho gayi ho, toh return kar denge (message cancel).

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
}, { connection });

module.exports = { automationQueue, automationWorker };