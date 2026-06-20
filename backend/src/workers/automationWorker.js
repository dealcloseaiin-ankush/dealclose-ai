const { Worker, Queue } = require('bullmq');
const IORedis = require('ioredis');

// 🚀 FIX: Disable BullMQ Eviction Warning (Prevents console spam & memory warnings)
process.env.BULLMQ_DISABLE_REDIS_EVICTION_WARNING = '1';

const User = require('../models/userModel');
const GeneratedPost = require('../models/GeneratedPostModel'); // 🚀 FIX: Case-sensitive path for Linux/Render
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

  // ==========================================
  // 3. ZERO-COST AI FEEDBACK (22 HOURS LATER)
  // ==========================================
  if (job.name === 'ask_feedback') {
    const { phone, userId } = job.data;
    console.log(`⏳ [Worker Started] Requesting 0-cost AI feedback from ${phone}...`);
    
    const user = await User.findById(userId);
    if (!user || !user.whatsappConfig || !user.whatsappConfig.accessToken) return;

    const lead = await Lead.findOne({ phoneNumber: phone, userId });
    // If they already gave a score, don't ask again
    if (!lead || lead.aiFeedbackScore) return;

    try {
      const msg = "Hi! 🙏 Just checking in before we close today's chat session.\n\nHow would you rate your conversation with our AI Assistant today? \n\nPlease reply with a number from *1 to 5* (5 = Excellent ⭐). Your feedback helps us improve!";
      await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, phone, msg);
      
      await Lead.updateOne({ _id: lead._id }, { $set: { awaitingFeedback: true } }, { strict: false });
      console.log(`✅ [Worker Success] Sent AI feedback request to ${phone}`);
    } catch (error) {
      console.error(`❌ [Worker Failed] Could not send feedback request:`, error.message);
    }
  }

  // ==========================================
  // 4. DAILY AUTO-BACKUP & EXPIRY WARNING
  // ==========================================
  if (job.name === 'daily_auto_backup') {
    console.log(`⏳ [Worker Started] Running Daily Auto-Backup & Expiry Check...`);
    
    // Find leads expiring in the next 3 days
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const expiringLeads = await Lead.find({ expiresAt: { $lte: threeDaysFromNow, $gt: new Date() } });

    // Group by userId
    const userLeads = {};
    for (const lead of expiringLeads) {
      if (!userLeads[lead.userId]) userLeads[lead.userId] = [];
      userLeads[lead.userId].push(lead);
    }

    for (const userId in userLeads) {
      const user = await User.findById(userId);
      if (user && user.whatsappConfig && user.whatsappConfig.accessToken && user.ownerPhone) {
        const leads = userLeads[userId];
        let msg = `🚨 *DealClose AI Backup Alert*\n\nYou have ${leads.length} leads that will be auto-deleted soon due to your current plan's data retention policy.\n\n*Top Expiring Leads:*\n`;
        leads.slice(0, 5).forEach(l => {
          msg += `- ${l.name} (${l.phoneNumber})\n`;
        });
        msg += `\n*Action Required:* Please open your Dashboard -> CRM and click 'Share via WhatsApp' or 'Export' to save them!`;

        let formattedPhone = user.ownerPhone.replace(/\D/g, ''); 
        if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

        await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, formattedPhone, msg).catch(e => console.log(e.message));
      }
    }
  }

  // ==========================================
  // 5. PROACTIVE META TOKEN AUTO-REFRESH
  // ==========================================
  if (job.name === 'daily_token_refresh') {
    console.log(`⏳ [Worker Started] Running Daily Meta Token Auto-Refresh...`);
    
    // Find users whose token is expiring in the next 5 days
    const expiringSoonDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const usersToRefresh = await User.find({ "instagramConfig.tokenExpiresAt": { $lte: expiringSoonDate, $gt: new Date() } });
    
    for (const user of usersToRefresh) {
      try {
         console.log(`🔄 Refreshing IG Token for User: ${user.email}`);
         
         // Call Meta to exchange old token for a fresh 60-day token
          const response = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${user.instagramConfig.accessToken}`);
         const data = await response.json();
         
         if (data.access_token) {
            const newExpiry = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
             await User.updateOne({ _id: user._id }, { $set: { "instagramConfig.accessToken": data.access_token, "instagramConfig.tokenExpiresAt": newExpiry } });
            console.log(`✅ Successfully auto-refreshed IG Token for User: ${user.email}`);
         }
      } catch (err) {
         console.error(`❌ Auto-refresh failed for user ${user.email}:`, err.message);
      }
    }
  }

  // ==========================================
  // 6. DAILY CRM AI SUMMARY & FOLLOW-UPS ALERTS
  // ==========================================
  if (job.name === 'daily_crm_summary') {
    console.log(`⏳ [Worker Started] Generating Daily AI CRM Summary...`);
    const users = await User.find({ "whatsappConfig.accessToken": { $exists: true } });
    
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

    for (const user of users) {
      if (!user.ownerPhone) continue;

      const hotLeads = await Lead.countDocuments({ userId: user._id, status: { $in: ['hot', 'negotiating'] } });
      const warmLeads = await Lead.countDocuments({ userId: user._id, status: { $in: ['warm', 'interested'] } });
      const coldLeads = await Lead.countDocuments({ userId: user._id, status: 'cold' });
      const existingCustomers = await Lead.countDocuments({ userId: user._id, status: 'existing' });
      const followUpsToday = await Lead.find({ userId: user._id, nextFollowUpDate: { $gte: startOfDay, $lte: endOfDay } });

      let msg = `🤖 *DealClose AI: Daily CRM Summary*\nGood Morning! Here is your lead status update:\n\n`;
      msg += `🔥 *${hotLeads}* Hot Leads\n`;
      msg += `🌟 *${warmLeads}* Warm Leads\n`;
      msg += `❄️ *${coldLeads}* Cold Leads\n`;
      msg += `💼 *${existingCustomers}* Existing Customers\n\n`;

      if (followUpsToday.length > 0) {
        msg += `📅 *Today's Follow-ups (${followUpsToday.length}):*\n`;
        followUpsToday.slice(0, 5).forEach(l => { msg += `- ${l.name} (${l.phoneNumber})\n`; });
        if (followUpsToday.length > 5) msg += `+ ${followUpsToday.length - 5} more... Please check your CRM dashboard.`;
      } else {
        msg += `📅 No follow-ups scheduled for today.`;
      }

      let formattedPhone = user.ownerPhone.replace(/\D/g, ''); 
      if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
      await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, formattedPhone, msg).catch(() => {});
    }
  }

  // ==========================================
  // 7. AUTO-PILOT SOCIAL MEDIA MARKETER (DAILY POST GENERATION)
  // ==========================================
  if (job.name === 'generate_social_post') {
    console.log(`⏳ [Worker Started] Generating Daily Social Media Post for all users...`);
    
    // Find users who have Instagram connected and ownerPhone set
    const users = await User.find({ 
      "instagramConfig.accessToken": { $exists: true }, 
      ownerPhone: { $exists: true, $ne: "" } 
    });

    for (const user of users) {
      try {
        const bizName = user.businessName || "our business";
        const bizDesc = user.businessDescription || "a great company";
        
        const prompt = `Act as an expert Instagram Social Media Manager for a business named "${bizName}". 
        Business details: ${bizDesc}.
        Write a highly engaging, viral Instagram caption for a new post today. Include emojis, a strong hook, and 5-10 relevant hashtags. Do not include any placeholder brackets.`;

        // Generate Caption using AI
        const generatedCaption = await aiService.generateAIResponse("Create a viral Instagram post", prompt);

        // 🚀 NEW: Generate Real AI Image using Replicate API (SDXL Lightning)
        let generatedImageUrl = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=2070&auto=format&fit=crop'; // Fallback
        if (process.env.REPLICATE_API_TOKEN) {
          try {
            const Replicate = require('replicate');
            const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
            
            // Create a smart prompt for the image based on the caption
            const imgPrompt = `A high quality, professional promotional image for an Instagram post about: ${bizName}. Concept: ${generatedCaption.substring(0, 100).replace(/[^a-zA-Z0-9 ]/g, '')}, highly detailed, cinematic lighting, 8k, modern photography`;
            
            const output = await replicate.run(
              "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637",
              { input: { prompt: imgPrompt } }
            );
            
            if (output && (Array.isArray(output) ? output[0] : output)) {
              generatedImageUrl = Array.isArray(output) ? output[0] : output;
            }
          } catch (imgErr) {
            console.error(`❌ [Worker Error] Replicate Image Gen Failed for ${user._id}:`, imgErr.message);
          }
        }

        // 🚀 NEW: Save the generated post to the database with 'pending_approval' status
        const newPost = new GeneratedPost({
          userId: user._id,
          caption: generatedCaption,
          imageUrl: generatedImageUrl
        });
        await newPost.save();

        // Send WhatsApp Approval Message to the Business Owner
        let formattedPhone = user.ownerPhone.replace(/\D/g, ''); 
        if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;

        const waMessage = `🚀 *DealClose Auto-Marketer*\n\nHere is your AI-generated Instagram Post for today:\n\n🖼️ *Image:* ${generatedImageUrl}\n\n💬 *Caption:*\n${generatedCaption}\n\n👉 Reply with "APPROVE ${newPost._id.toString().slice(-6).toUpperCase()}" to publish this.`;
        
        // 🚀 SMART ROUTING: Use User's WA API if available, ELSE use DealClose AI's System WA API
        const waToken = user.whatsappConfig?.accessToken || process.env.SYSTEM_META_TOKEN;
        const waPhoneId = user.whatsappConfig?.phoneNumberId || process.env.SYSTEM_PHONE_ID;

        if (waToken && waPhoneId) {
          await whatsappService.sendTextMessage(waToken, waPhoneId, formattedPhone, waMessage);
          const sentVia = user.whatsappConfig?.accessToken ? 'User API' : 'DealClose System API';
          console.log(`✅ [Worker Success] Sent Auto-Post approval to ${user.businessName} via ${sentVia}`);
        } else {
          // Both are missing (Very rare if SYSTEM_META_TOKEN is set in .env)
          console.log(`⚠️ [Worker Info] Could not send WA approval to ${user.businessName}. Post is saved in Dashboard.`);
        }

      } catch (err) {
        console.error(`❌ [Worker Failed] Error generating post for user ${user._id}:`, err.message);
      }
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

// 🚀 NEW: Start the Daily Cron Job for Auto Backups
// This runs every day at 10:00 AM automatically
automationQueue.add('daily_auto_backup', {}, {
  repeat: {
    pattern: '0 10 * * *' // Cron syntax for 10:00 AM daily
  },
  jobId: 'system_daily_backup'
});

// 🚀 NEW: Start the Daily Cron Job for Token Refresh
// Runs every day at 02:00 AM automatically (Low traffic time)
automationQueue.add('daily_token_refresh', {}, {
  repeat: {
    pattern: '0 2 * * *' // Cron syntax for 02:00 AM daily
  },
  jobId: 'system_token_refresh'
});

// 🚀 NEW: Start the Daily Cron Job for CRM Summary & Follow-ups
// Runs every day at 09:00 AM automatically
automationQueue.add('daily_crm_summary', {}, {
  repeat: { pattern: '0 9 * * *' }, // Cron syntax for 09:00 AM daily
  jobId: 'daily_crm_summary_job'
});

// 🚀 NEW: Start the Daily Cron Job for Auto-Pilot Marketer (Social Media)
// Runs every day at 10:00 AM automatically
automationQueue.add('generate_social_post', {}, {
  repeat: { pattern: '0 10 * * *' }, // Cron syntax for 10:00 AM daily
  jobId: 'generate_social_post_job'
});

module.exports = { automationQueue, automationWorker };
