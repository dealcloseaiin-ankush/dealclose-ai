const User = require('../models/userModel');
const aiService = require('../services/aiService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Flow = require('../models/flowModel');
const Lead = require('../models/leadModel');
const Post = require('../models/postModel');
const InstagramInsightSnapshot = require('../models/InstagramInsightSnapshot');
const whatsappService = require('../services/whatsappService');
const { automationQueue } = require('../workers/automationWorker');

// 🌊 LATEST ULTRA COST-EFFECTIVE & HIGH-AVAILABILITY PRODUCTION CONFIGURATION
const MODELS = {
  GEMINI_3_5_LITE: 'gemini-3.5-flash-lite',  // Priority 1: Latest & Cheapest Gemini 3.5 Model
  GEMINI_3_5_FLASH: 'gemini-3.5-flash',      // Priority 2: Latest Gemini 3.5 Standard Flash
  GEMINI_3_1_LITE: 'gemini-3.1-flash-lite',  // Priority 3: Cost-Optimized 3.1 Flash Lite
  GEMINI_2_5_LITE: 'gemini-2.5-flash-lite',  // Priority 4: Stable 2.5 Fallback
  OPENAI_MINI: 'gpt-4o-mini',                // Priority 5: OpenAI Cheapest Model Fallback
};

// @desc    Get unanswered queries for AI training
// @route   GET /api/ai/training-data
exports.getTrainingData = async (req, res) => {
  try {
    console.log('\n➡️ [DEBUG] GET /api/ai/training-data Called');
    console.log('➡️ [DEBUG] Headers Auth:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('➡️ [DEBUG] req.user object:', req.user);

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      console.log('❌ [DEBUG] Unauthorized Error! User ID not found in req.user');
      return res.status(401).json({ success: false, message: 'Unauthorized. Token missing or invalid.' });
    }
    const user = await User.findById(userId);
    
    res.status(200).json({ 
      success: true, 
      data: user?.trainingData || [],
      aiName: user?.aiName || 'DealClose AI',
      aiRules: user?.aiRules || '',
      businessDescription: user?.businessDescription || '',
      fallbackAction: user?.fallbackAction || 'notify_owner',
      businessName: user?.businessName || 'Main Business',
      workspaces: user?.workspaces || [],
      aiCredits: user?.aiCredits || 0,
      aiObservations: user?.aiObservations || []
    });
  } catch (error) {
    console.error('AI Training Data Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Handle Landing Page AI Chat Widget
// @route   POST /api/ai/webchat
exports.handleWebChat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    const systemContext = `
    # CORE IDENTITY & PERSONA
    - You are "DealClose AI", a world-class AI Sales & Marketing Automation expert.
    - Your persona is a blend of a highly intelligent business partner, a friendly onboarding specialist, and an efficient sales agent.
    - You are professional, proactive, and always focused on helping the user's business grow.

    # PRIMARY OBJECTIVE
    - Your main goal is to explain the features of the DealClose AI platform and encourage new website visitors to sign up for a 14-day free trial.

    # PLATFORM KNOWLEDGE (MY CAPABILITIES)
    - I can automate WhatsApp & Instagram chats, make AI voice calls, analyze competitor ads with ScanIQ, and manage CRM.
    - Pricing Plans:
      1. Basic Automation: ₹999/mo (WhatsApp OR Instagram, keyword-based). Comes with 30-Day Free Trial.
      2. AI Starter Offer: ₹499/mo (Smart AI Chatbot, abandoned cart recovery).
      3. Omnichannel Pro: ₹4,999/mo (WhatsApp AND Instagram, AI Voice Calls).
    - Instagram Manager: I can automatically reply to Instagram DMs, handle comments, filter spam, manage brand collaborations, and extract lead details.
    - AI Voice Calling: I can make smart outbound calls to customers using Exotel integration to close deals.
    - ScanIQ Ads: I analyze competitor Meta and Google ads to give a viral score and suggest improvements.
    - How to Join & Onboard: Tell users to click on 'Get Started' or 'Login', create an account, and from the Dashboard Settings, they can easily connect their Meta/WhatsApp API keys in 1-click via Embedded Signup.

    # RULES OF ENGAGEMENT (HOW I INTERACT WITH NEW VISITORS)
    - My goal is to explain features and politely encourage users to sign up for a free trial at dealcloseai.in.
    - If asked about pricing, politely explain the pricing plans based on their needs, and ALSO provide the official pricing link for details: https://dealcloseai.in/pricing
    - I must always reply in the EXACT same language the user is speaking.
    `;
    
    const prompt = `Website Visitor says: "${message}"\nRespond directly to this visitor.`;
    
    // Note: This function already logs the model used internally.
    const aiReply = await aiService.generateAIResponse(prompt, systemContext, "web");
    
    res.status(200).json({ success: true, reply: aiReply });
  } catch (error) {
    console.error('Web Chat AI Error:', error);
    res.status(500).json({ success: false, reply: 'I am currently undergoing maintenance. Please try again later!' });
  }
};

// @desc    Teach AI a new answer (Add FAQ)
// @route   POST /api/ai/train
exports.trainAI = async (req, res) => {
  try {
    console.log('\n➡️ [DEBUG] POST /api/ai/train Called! Payload:', req.body);
    
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { question, answer, aiName, aiRules, businessDescription, fallbackAction, workspaceId, type, triggerWord, replyMessage } = req.body;
    let updateQuery = {};
    let setQuery = {};

    if (type === 'auto_reply' && triggerWord && replyMessage) {
      updateQuery.$push = { autoReplies: { triggerWord, replyMessage } };
    }
    else if (question && answer) {
      updateQuery.$push = { trainingData: { question, answer, status: 'answered' } };
    }
    
    if (workspaceId && workspaceId !== 'main' && workspaceId !== 'main_business') {
      if (aiName !== undefined) setQuery["workspaces.$.aiName"] = aiName;
      if (aiRules !== undefined) setQuery["workspaces.$.aiRules"] = aiRules;
      if (businessDescription !== undefined) setQuery["workspaces.$.businessDescription"] = businessDescription;
      
      if (Object.keys(setQuery).length > 0) {
        await User.updateOne(
          { _id: userId, "workspaces._id": workspaceId },
          { $set: setQuery }
        );
        console.log(`✅ [DEBUG] AI Brain / Rules successfully saved to Workspace ${workspaceId}!`);
      }
    } else {
      if (aiName !== undefined) setQuery.aiName = aiName.trim() === '' ? 'DealClose AI' : aiName.trim();
      if (aiRules !== undefined) setQuery.aiRules = aiRules;
      if (businessDescription !== undefined) setQuery.businessDescription = businessDescription;
      if (fallbackAction !== undefined) setQuery.fallbackAction = fallbackAction;
  
      if (Object.keys(setQuery).length > 0) updateQuery.$set = setQuery;
      if (Object.keys(updateQuery).length > 0) {
         await User.findByIdAndUpdate(userId, updateQuery, { strict: false });
         console.log('✅ [DEBUG] AI Brain / Rules successfully saved to Main Business!');
      }
    }

    res.status(200).json({ success: true, message: 'AI rules and training data saved successfully!' });
  } catch (error) {
    console.error('AI Training Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Answer a pending training question
// @route   PUT /api/ai/training-data/:id/answer
exports.answerTrainingQuestion = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { id } = req.params;
    const { answer } = req.body;

    if (!answer) return res.status(400).json({ success: false, message: 'Answer is required' });

    await User.updateOne(
      { _id: userId, "trainingData._id": id },
      { $set: { "trainingData.$.answer": answer, "trainingData.$.status": "answered" } }
    );

    res.status(200).json({ success: true, message: 'Question answered and AI trained successfully' });
  } catch (error) {
    console.error('Answer Training Question Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Handle Dashboard Setup Assistant Chat
// @route   POST /api/ai/dashboard-assistant
const parsePlannerScheduleLines = (plannerResponse = '') => {
  const lines = plannerResponse
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const items = [];
  const dayMap = {
    mon: 1,
    monday: 1,
    tue: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
    sun: 0,
    sunday: 0,
  };

  for (const line of lines) {
    const normalized = line.toLowerCase();
    const dayMatch = Object.keys(dayMap).find(day => normalized.startsWith(day));
    if (!dayMatch) continue;

    const dayIndex = dayMap[dayMatch];
    const content = line.replace(/^\s*\w+\s*[:\-–]?\s*/i, '').trim();
    if (!content) continue;

    items.push({ dayIndex, content });
  }

  return items;
};

const getNextDateForWeekday = (weekdayIndex, offsetWeeks = 0) => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayOffset = (weekdayIndex - startOfToday.getDay() + 7) % 7;
  const scheduledDate = new Date(startOfToday);
  scheduledDate.setDate(startOfToday.getDate() + dayOffset + (offsetWeeks * 7));
  scheduledDate.setHours(10, 0, 0, 0);
  return scheduledDate;
};

exports.generateContentPlanSchedule = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { plannerPrompt, plannerResponse, workspaceId } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!plannerResponse || !plannerResponse.trim()) {
      return res.status(400).json({ success: false, message: 'plannerResponse is required' });
    }

    const parsedItems = parsePlannerScheduleLines(plannerResponse);
    if (parsedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No scheduleable dates were found in the AI response.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const fallbackTemplateQuery = Post.findOne({
      userId,
      isDeleted: { $ne: true },
      workspaceId: workspaceId || 'main',
      mediaUrls: { $exists: true, $ne: [] },
    }).sort({ createdAt: -1 });

    const fallbackTemplatePost = await (fallbackTemplateQuery.lean ? fallbackTemplateQuery.lean() : fallbackTemplateQuery);

    const scheduledItems = [];
    for (const [index, item] of parsedItems.entries()) {
      const scheduledAt = getNextDateForWeekday(item.dayIndex, Math.floor(index / 5));
      const mediaUrls = fallbackTemplatePost?.mediaUrls?.length
        ? fallbackTemplatePost.mediaUrls
        : [{ url: 'https://placehold.co/1200x1200/1f2937/ffffff?text=AI+Content+Plan', type: 'image' }];

      const post = await Post.create({
        userId,
        workspaceId: workspaceId || 'main',
        caption: `${item.content}`.trim(),
        mediaUrls,
        platforms: ['instagram'],
        status: 'scheduled',
        scheduledAt,
        designedBy: 'ai-planner',
        isImported: false,
        failureReason: '',
      });

      const delay = Math.max(0, scheduledAt.getTime() - Date.now());
      await automationQueue.add('publish_scheduled_post', { postId: post._id }, { delay });

      scheduledItems.push({
        postId: post._id,
        caption: item.content,
        scheduledAt: scheduledAt.toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      scheduledPosts: scheduledItems.length,
      message: `Successfully queued ${scheduledItems.length} AI-planned posts for automatic publishing.`,
      scheduledItems,
      plannerPrompt,
    });
  } catch (error) {
    console.error('AI Content Plan Scheduler Error:', error);
    res.status(500).json({ success: false, message: 'Failed to schedule AI content plan.', error: error.message });
  }
};

exports.handleDashboardAssistant = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { message } = req.body;
    
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
    console.log(`🤖 [Dashboard Assistant] Received message: "${message}" from user: ${userId}`);
    const user = await User.findById(userId).lean();
    // 🚀 NEW: Fetch user's created flows to give AI context
    const userFlows = await Flow.find({ userId }).select('name').lean();
    const flowNames = userFlows.map(f => f.name).join(', ');
    const userAccountAge = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Give the chat assistant real, compact social-performance context. It can
    // recommend a next post without guessing or exposing raw customer data.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [recentPosts, insightHistory] = await Promise.all([
      Post.find({ userId, isDeleted: { $ne: true }, status: 'published', publishedAt: { $gte: thirtyDaysAgo } })
        .select('caption publishedAt analytics').lean(),
      InstagramInsightSnapshot.find({ userId, date: { $gte: thirtyDaysAgo } })
        .select('date followerCount reach impressions profileViews websiteClicks accountsEngaged').sort({ date: 1 }).lean(),
    ]);
    const postTotals = recentPosts.reduce((total, post) => ({
      reach: total.reach + (post.analytics?.reach || 0),
      likes: total.likes + (post.analytics?.likes || 0),
      comments: total.comments + (post.analytics?.comments || 0),
      saves: total.saves + (post.analytics?.saves || 0),
      shares: total.shares + (post.analytics?.shares || 0),
    }), { reach: 0, likes: 0, comments: 0, saves: 0, shares: 0 });
    const topPost = recentPosts.slice().sort((a, b) => {
      const scoreA = (a.analytics?.likes || 0) + (a.analytics?.comments || 0) + (a.analytics?.saves || 0) + (a.analytics?.shares || 0);
      const scoreB = (b.analytics?.likes || 0) + (b.analytics?.comments || 0) + (b.analytics?.saves || 0) + (b.analytics?.shares || 0);
      return scoreB - scoreA;
    })[0];
    const firstSnapshot = insightHistory[0];
    const latestSnapshot = insightHistory[insightHistory.length - 1];
    const socialAnalyticsContext = recentPosts.length
      ? `Instagram last 30 days: ${recentPosts.length} published posts; reach ${postTotals.reach}; likes ${postTotals.likes}; comments ${postTotals.comments}; saves ${postTotals.saves}; shares ${postTotals.shares}. Top post: "${(topPost?.caption || '').slice(0, 140)}" (reach ${topPost?.analytics?.reach || 0}, saves ${topPost?.analytics?.saves || 0}, shares ${topPost?.analytics?.shares || 0}). Account snapshots: followers ${firstSnapshot?.followerCount ?? 'N/A'} to ${latestSnapshot?.followerCount ?? 'N/A'}; latest profile views ${latestSnapshot?.profileViews ?? 'N/A'}; website clicks ${latestSnapshot?.websiteClicks ?? 'N/A'}.`
      : 'Instagram analytics: no published-post data has been collected yet.';

    // 🚀 NEW: Create a concise summary of the user's progress for the AI.
    const onboardingChecklist = `
    - Business Profile Setup: ${user.businessDescription ? '✅ Done' : '❌ Pending'}
    - Custom AI Rules Defined: ${user.aiRules ? '✅ Done' : '❌ Pending'}
    - Automation Flows Created: ${userFlows.length > 0 ? `✅ Done (${userFlows.length} flows)` : '❌ Pending'}
    - WhatsApp Connected: ${user.whatsappConfig?.accessToken ? '✅ Done' : '❌ Pending'}
    - Instagram Connected: ${user.instagramConfig?.accessToken ? '✅ Done' : '❌ Pending'}
    `;

    const systemContext = `You are DealClose AI, an expert Onboarding Assistant.
    Your goal is to help the user complete their setup by looking at their progress checklist.
    Do NOT ask them to do things that are already marked as 'Done'.
    
    --- USER PROFILE SUMMARY ---
    Business Name: ${user.businessName || 'Not Set'}
    Business Category: ${user.businessDescription ? user.businessDescription.substring(0, 100) + '...' : 'Not Set'}
    User Plan: ${user.isPremium ? 'Premium' : 'Free Trial'}
    Account Age: ${userAccountAge} days
    AI Credits: ${user.aiCredits || 0}
    
    --- ONBOARDING CHECKLIST ---
    ${onboardingChecklist}

    --- REAL INSTAGRAM ANALYTICS (LAST 30 DAYS) ---
    ${socialAnalyticsContext}
    
    --- YOUR JOB ---
    1. Greet the user and review their checklist.
    2. Proactively suggest the NEXT logical step from the 'Pending' items. For example, if their profile is not set up, say "I see your business profile is not set up. Can you tell me about your business so I can configure the AI?".
    3. If all items are 'Done', congratulate them and ask what advanced automation they want to build next.
    4. If the user asks to modify something that is already 'Done' (e.g., "change my business description"), then help them with that.
    5. CREDIT AWARENESS: If the user's AI Credits are below 50, you MUST gently remind them: "I noticed your AI credits are getting low. To ensure uninterrupted service, please recharge from your wallet."
    5. If the user asks about Instagram analytics, content ideas, a post review, or how to improve a post, use ONLY the real Instagram metrics above. Explain one evidence-based insight and give 2 concrete next-post improvements. Never invent metrics.
    
    CRITICAL RULES:
    1. STRICT SCOPE: You are a B2B AI Assistant. You must STRICTLY REFUSE to answer any questions that are unrelated to DealClose AI, marketing automation, CRM, or the user's specific business. If asked about random topics, politely decline and steer the conversation back to business growth.
    2. CRM ANALYTICS: If asked about leads or analytics, base your answers ONLY on the platform's summarized CRM metrics. Do not invent raw data.
    3. MATCH LANGUAGE: Always reply in the EXACT same language the user is speaking. If the user types in Hindi or Hinglish, YOU MUST reply entirely in natural, friendly Hinglish. Do not reply in English if the user asks a question in Hindi.
    4. BULK MESSAGING: If the user explicitly asks you to send a message to certain leads (e.g. "send this template to lost leads" or "sabko bhej do"), you MUST output EXACTLY this JSON format and NOTHING ELSE:
    {"action": "send_bulk", "status": "lost", "message": "Your crafted message here"}
    5. BE CONCISE: Keep normal answers to 1-2 sentences. For analytics requests, use at most 3 short bullets.`;

    const aiMessage = await aiService.generateDashboardAssistantResponse(message, systemContext, userId);

    let responseMessage = "";
    let actionTaken = null;

    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      for (const toolCall of aiMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log(`\n✨ [AI Assistant Tool Triggered]: ${toolCall.function.name}`);
        console.log(`💡 [AI Assistant Tool Arguments]:`, args);

        const updateData = {};

        if (toolCall.function.name === "update_business_profile") {
          if (args.businessName) updateData.businessName = args.businessName;
          if (args.businessDescription) updateData.businessDescription = args.businessDescription;
          
          await User.findByIdAndUpdate(userId, { $set: updateData }, { returnDocument: 'after', strict: false });
          const verifyDb = await User.findById(userId).lean();
          console.log(`\n🔍 [DB VERIFY AFTER AI PROFILE UPDATE] - Business Desc in DB: ${verifyDb.businessDescription ? '✅ SAVED' : '❌ MISSING'}`);
          responseMessage = "✅ I have updated your business profile successfully! What would you like to set up next? Auto-replies or WhatsApp templates?";
          actionTaken = "profile_updated";
        } 
        else if (toolCall.function.name === "draft_whatsapp_template") {
          responseMessage = `📝 I have drafted a template for you named *'${args.templateName}'*.\n\n*Preview:*\n${args.messageBody}\n\nWould you like to customize it further or save it?`;
          actionTaken = { type: "template_drafted", data: args };
        } else if (toolCall.function.name === "add_auto_reply_rule") {
          const updated = await User.findByIdAndUpdate(userId, {
            $push: { autoReplies: { triggerWord: args.triggerWord, replyMessage: args.replyMessage } }
          }, { returnDocument: 'after', strict: false });
          console.log(`\n🔍 [DB VERIFY AFTER AI AUTOREPLY] - Total Auto-Replies in DB: ${updated.autoReplies?.length || 0}`);
          responseMessage = `⚡ Done! I've added an auto-reply. When someone says *'${args.triggerWord}'*, I will automatically reply with: '${args.replyMessage}'.`;
          actionTaken = "auto_reply_added";
        }
        else if (toolCall.function.name === "update_ai_rules") {
          updateData.aiRules = args.customRules;
          updateData.fallbackAction = args.fallbackAction;
          await User.findByIdAndUpdate(userId, { $set: updateData }, { returnDocument: 'after', strict: false });
          const verifyDb = await User.findById(userId).lean();
          console.log(`\n🔍 [DB VERIFY AFTER AI RULES UPDATE] - AI Rules in DB: ${verifyDb.aiRules ? '✅ SAVED' : '❌ MISSING'}`);
          responseMessage = `🧠 Perfect! I have updated my brain. I will strictly follow these rules with your customers:\n- ${args.customRules}\n\nAnd if I get stuck, I will: ${args.fallbackAction}.`;
          actionTaken = "rules_updated";
        }
        else if (toolCall.function.name === "log_business_observation") {
          await User.findByIdAndUpdate(userId, { $push: { aiObservations: args.observationText } }, { strict: false });
          responseMessage = `📝 I have noted this down: "${args.observationText}". I will keep this in mind for your business setup!`;
        }
        else if (toolCall.function.name === "create_automation_flow") {
          let flowData = {};
          let flowPlatform = args.platform || 'whatsapp';
          
          if (args.businessType === 'influencer_collab') {
            flowPlatform = 'instagram';
            flowData = {
              nodes: [
                { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'collab, sponsor, brand, pr, ad, promotion, fan' }, position: { x: 400, y: 50 } },
                { id: '2', type: 'menu', data: { message: 'Hi! 👋 Thanks for reaching out. What are you looking for?', opt1: 'Collab / PR', opt2: 'Brand Promotion', opt3: 'Just a Fan ❤️' }, position: { x: 400, y: 160 } },
                { id: '3', type: 'askQuestion', data: { question: 'Awesome! Please share your Brand Name, Budget, and Campaign Details.', replyType: 'open' }, position: { x: 100, y: 350 } },
                { id: '4', type: 'askQuestion', data: { question: 'Great! What kind of promotion? (Reel/Story) Will you provide the script? And what is the budget?', replyType: 'open' }, position: { x: 400, y: 350 } },
                { id: '5', type: 'message', data: { message: 'Aww! Thank you so much for the love and support! Means the world to me. ❤️✨' }, position: { x: 700, y: 350 } },
                { id: '6', type: 'message', data: { message: 'Thank you! ✅ I have saved your details. My team will review and share the Media Kit shortly!' }, position: { x: 250, y: 550 } }
              ],
              edges: [ { id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3', sourceHandle: 'opt_0' }, { id: 'e2-4', source: '2', target: '4', sourceHandle: 'opt_1' }, { id: 'e2-5', source: '2', target: '5', sourceHandle: 'opt_2' }, { id: 'e3-6', source: '3', target: '6', sourceHandle: 'replied' }, { id: 'e4-6', source: '4', target: '6', sourceHandle: 'replied' } ]
            };
          } else if (args.businessType === 'instagram_business' || args.platform === 'instagram') {
            flowPlatform = 'instagram';
            flowData = {
              nodes: [
                { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'hi, hello, price, offer, discount, buy, catalog, link' }, position: { x: 400, y: 50 } },
                { id: '2', type: 'menu', data: { message: 'Welcome to our Instagram page! 🎉 How can we help you today?', opt1: 'Get 15% OFF Coupon 🎁', opt2: 'Browse Catalog 🛍️', opt3: 'Customer Support 💬' }, position: { x: 400, y: 160 } },
                { id: '3', type: 'message', data: { message: '🎉 Here is your special 15% discount coupon: *WELCOME15*! Use it during checkout.' }, position: { x: 100, y: 350 } },
                { id: '4', type: 'message', data: { message: '🌐 Browse our complete collection and prices here: [Website Link]. Let us know what you like!' }, position: { x: 400, y: 350 } },
                { id: '5', type: 'askQuestion', data: { question: 'Please share your query or order ID, and our team will resolve it quickly.', replyType: 'open' }, position: { x: 700, y: 350 } },
                { id: '6', type: 'message', data: { message: 'Thank you! Our support agent will assist you shortly.' }, position: { x: 700, y: 550 } }
              ],
              edges: [ { id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3', sourceHandle: 'opt_0' }, { id: 'e2-4', source: '2', target: '4', sourceHandle: 'opt_1' }, { id: 'e2-5', source: '2', target: '5', sourceHandle: 'opt_2' }, { id: 'e5-6', source: '5', target: '6', sourceHandle: 'replied' } ]
            };
          } else if (args.businessType === 'real_estate') {
            flowData = {
              nodes: [
                { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'hi, hello, property, buy, rent' }, position: { x: 400, y: 50 } },
                { id: '2', type: 'askQuestion', data: { question: 'Welcome! 🏢 Are you looking to Buy or Rent a property today?', replyType: 'open' }, position: { x: 400, y: 160 } },
                { id: '3', type: 'askQuestion', data: { question: 'Great! Please share your City and Budget.', replyType: 'open' }, position: { x: 400, y: 310 } },
                { id: '4', type: 'message', data: { message: 'Thanks! I have saved your details. Let me find the best properties for you... ⏳' }, position: { x: 400, y: 460 } }
              ],
              edges: [ { id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3', sourceHandle: 'replied' }, { id: 'e3-4', source: '3', target: '4', sourceHandle: 'replied' } ]
            };
          } else if (args.businessType === 'ecommerce') {
            flowData = {
              nodes: [
                { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'hi, catalog, buy, order' }, position: { x: 400, y: 50 } },
                { id: '2', type: 'menu', data: { message: 'Welcome to our store! 🛍️ What would you like to do?', opt1: 'View Catalog', opt2: 'Track Order', opt3: 'Talk to Sales' }, position: { x: 400, y: 160 } },
                { id: '3', type: 'message', data: { message: 'Here is our latest catalog link! Let us know what you like.' }, position: { x: 100, y: 350 } },
                { id: '4', type: 'message', data: { message: 'Please reply with your Order ID to track it.' }, position: { x: 400, y: 350 } },
                { id: '5', type: 'message', data: { message: 'A sales executive will be with you shortly! 📞' }, position: { x: 700, y: 350 } }
              ],
              edges: [ { id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3', sourceHandle: 'opt_0' }, { id: 'e2-4', source: '2', target: '4', sourceHandle: 'opt_1' }, { id: 'e2-5', source: '2', target: '5', sourceHandle: 'opt_2' } ]
            };
          } else {
             flowData = {
              nodes: [
                { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'hi, hello, help' }, position: { x: 400, y: 50 } },
                { id: '2', type: 'askQuestion', data: { question: `Welcome! To assist you better, please reply with your Full Name and City.`, replyType: 'open' }, position: { x: 400, y: 160 } },
                { id: '3', type: 'message', data: { message: 'Thank you! Your details are saved. How can we help you today?' }, position: { x: 400, y: 310 } }
              ],
              edges: [ { id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3', sourceHandle: 'replied' } ]
            };
          }

          await Flow.create({
            userId: userId,
            workspaceId: 'main',
            platform: flowPlatform,
            name: args.flowName,
            flowData: flowData
          });

          responseMessage = `✨ Magic! I have automatically built and deployed a new Flow named *${args.flowName}* for your business. You can view or edit it in the Flow Builder!`;
          actionTaken = "flow_created";
        }
      }
    } else {
      responseMessage = aiMessage.content;
    }

    // Object safe fallback conversion layer
    const responseTextString = typeof responseMessage === 'string' 
      ? responseMessage 
      : (responseMessage?.content || "");

    // CATCH BULK SEND JSON COMMAND
    if (responseTextString && responseTextString.includes('"action":') && responseTextString.includes('"send_bulk"')) {
        try {
            const jsonMatch = responseTextString.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const bulkCmd = JSON.parse(jsonMatch[0]);
                if (bulkCmd.action === 'send_bulk') {
                    const leads = await Lead.find({ userId: userId, status: bulkCmd.status, phoneNumber: { $exists: true, $ne: "" } });
                    let sentCount = 0;
                    for (let l of leads) {
                        let phone = l.phoneNumber.replace(/\D/g, '');
                        if (phone.length === 10) phone = '91' + phone;
                        if (!l.phoneNumber.startsWith('IG_') && user.whatsappConfig?.accessToken) {
                            await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, phone, bulkCmd.message).catch(e => console.log(e.message));
                            sentCount++;
                        }
                    }
                    responseMessage = `✅ Done! Maine successfully **${sentCount} ${bulkCmd.status} leads** ko aapka message (retargeting) bhej diya hai! 🚀\n\n**Message Sent:**\n"${bulkCmd.message}"`;
                    actionTaken = "bulk_sent";
                }
            }
        } catch (e) {
            console.log("Failed to parse bulk command", e.message);
        }
    }

    // CATCH IVR CAMPAIGN JSON COMMAND & GENERATE VOICE
    if (responseTextString && responseTextString.includes('"action":') && responseTextString.includes('"create_ivr"')) {
        try {
            const jsonMatch = responseTextString.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const ivrCmd = JSON.parse(jsonMatch[0]);
                if (ivrCmd.action === 'create_ivr') {
                    const cloudinary = require('cloudinary').v2;
                    console.log(`🔊 Generating TTS for IVR via Deepgram...`);
                    const ttsResponse = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3', {
                      method: 'POST',
                      headers: { 'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: ivrCmd.ttsText })
                    });
                    const arrayBuffer = await ttsResponse.arrayBuffer();
                    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
                    
                    const uploadRes = await cloudinary.uploader.upload(`data:audio/mp3;base64,${base64Audio}`, { resource_type: 'video', folder: 'dealclose_assets' });
                    
                    const IvrCampaign = require('../models/ivrCampaignModel');
                    await IvrCampaign.create({ userId, name: ivrCmd.campaignName, audioUrl: uploadRes.secure_url, menuOptions: ivrCmd.menuOptions, isActive: true });
                    
                    responseMessage = `🎙️ Success! I generated the voice using AI, saved it permanently, and created your IVR Campaign "${ivrCmd.campaignName}". It's ready to handle calls at Zero extra TTS cost! 🚀`;
                    actionTaken = "ivr_created";
                }
            }
        } catch (e) { console.log("Failed to parse IVR command", e.message); }
    }

    const finalReplyText = typeof responseMessage === 'string' ? responseMessage : (responseMessage?.content || "Hello! How can I help you manage your dashboard today?");
    res.status(200).json({ success: true, reply: finalReplyText, actionTaken });
  } catch (error) {
    console.error('Dashboard Assistant Error:', error);
    res.status(500).json({ success: false, reply: 'Oops, something went wrong while processing your request.' });
  }
};

// @desc    Generate ReactFlow data using high-availability fallback chain
// @route   POST /api/ai/generate-flow
exports.generateFlow = async (req, res) => {
  try {
    const { prompt, businessName } = req.body;
    const userId = req.user?._id || req.user?.id;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    let businessContext = businessName ? `Business Name: ${businessName}` : "Unknown Business";
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        businessContext = `Business Name: ${user.businessName || businessName || 'Not Set'}. Description: ${user.businessDescription || 'Not Set'}.`;
        if (user.workspaces && user.workspaces.length > 0) {
          businessContext += ` Other divisions: ${user.workspaces.map(w => w.name).join(', ')}.`;
        }
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy');

    if (!apiKey && !hasOpenAI) {
      console.warn("AI Keys missing.");
      return res.status(500).json({ success: false, reply: 'Mera AI engine abhi disconnect ho gaya hai (API Key missing).' });
    }

    const systemPrompt = `You are the DealClose AI Flow Builder Assistant, a highly intelligent automation expert.
    The user will describe what automation flow they want to build in any language (like Hindi, Hinglish, or English).
    
    DEALCLOSE AI FEATURES YOU KNOW ABOUT:
    - WhatsApp & Instagram DM Automation (Auto-reply, Lead Capture, Abandoned Cart, Custom Menus, Post/Story Comment Triggers)
    - AI Voice Calling (Inbound/Outbound sales calls via Exotel)
    - CRM & Lead Management (Auto-save leads, Track deal stages)
    - ScanIQ (Meta/Google Ad Competitor Analysis)
    - Real Estate Automation (Integration with NewPropertyHub.in APIs to list, search, and book properties!)
    
    USER'S BUSINESS DETAILS: 
    ${businessContext}
    
    CRITICAL BUSINESS TYPE & PLATFORM AWARENESS:
    1. STRICT DISTINCTION BETWEEN BUSINESS vs INFLUENCER:
       - IF THE USER IS A BUSINESS (Real Estate, E-Commerce, Retail, Clinic, Coaching, Services, SaaS, Local Store, Agency, etc.):
         * NEVER create "Influencer Collab / Brand Promotion / Fan" flows! Businesses do not look for collabs; they sell products/services to buyers.
         * For Businesses (WhatsApp or Instagram): Generate high-converting BUSINESS flows like:
           a) "Lead Capture & Qualification" (Ask Name, City, Product requirement)
           b) "Direct Instagram Promo & Discount Offer" (Give 15% discount code, share product catalog link)
           c) "Real Estate Property Finder & Site Visit Booking"
           d) "E-Commerce Order Tracking & Catalog Menu"
           e) "Customer Support & Inquiry Escalation"
       - IF AND ONLY IF THE USER IS AN INFLUENCER / CONTENT CREATOR (or explicitly asks for "influencer collab / sponsor rates / PR"):
         * Generate Creator Collab flows (Collab / PR inquiry, Brand budget, Media Kit sharing, Fan gratitude).
    
    CONSULTATIVE APPROACH & COST SAVING:
    1. YOU ALREADY KNOW THE BUSINESS DETAILS. Do NOT ask "Aapka business kya hai?". 
    2. If the user says "hi", "help", or seems confused, IMMEDIATELY greet them using their business name (e.g., "Welcome to DealClose Flow Builder! Since you run [Business Name], I suggest these 2 high-converting business flows...").
    3. Give them 2-3 clear options tailored to their actual business category. Ask them to just reply with the number.
    4. Once they choose an option or describe a flow, GENERATE THE FULL FLOW (nodes and edges) immediately. Do not stretch out the conversation.
    5. ZERO-COST LEAD CAPTURE EXPLANATION: To save AI tokens, the backend automatically reads Flow answers. If you want to capture a name or city, simply use the exact words 'Name' or 'City' in the 'askQuestion' node's text. The system will auto-save it to the CRM natively.
    6. VERY IMPORTANT: Whenever you generate nodes and edges, add this exact instruction in your reply: "Mene aapke liye flow canvas par bana diya hai. Ise hamesha ke liye save karne ke liye please upar ek 'Naam' likhein aur 'Save Flow' button par click karein."
    
    You must return a JSON object with this exact structure:
    {
      "reply": "Friendly response IN THEIR LANGUAGE (Hindi/Hinglish). Greet with their business name if starting. Give numbered options if asking. Tell them to 'Save' if you generated nodes.",
      "nodes": [ /* Array of node objects, or empty [] if just chatting */ ],
      "edges": []
    }

    Node Types & EXACT Data Schema YOU MUST USE:
    - 'trigger': { "id": "1", "type": "trigger", "position": {"x":250,"y":50}, "data": { "triggerType": "keyword", "keyword": "hi, hello, price, offer, info" } }
    - 'message': { "id": "node_2", "type": "message", "position": {"x":250,"y":150}, "data": { "message": "Write the actual reply text here!" } }
    - 'askQuestion': { "id": "node_3", "type": "askQuestion", "position": {"x":250,"y":250}, "data": { "question": "Write the actual question here!", "replyType": "open" } }
    - 'menu': { "id": "node_m", "type": "menu", "position": {"x":250,"y":250}, "data": { "message": "Choose option:", "opt1": "Browse Products 🛍️", "opt2": "Get 15% OFF Coupon 🎁", "opt3": "Customer Support 🎧" } }
    - 'delay': { "id": "node_4", "type": "delay", "position": {"x":250,"y":350}, "data": { "delay": "15", "unit": "Minutes" } }
    - 'condition': { "id": "node_5", "type": "condition", "position": {"x":250,"y":450}, "data": { "condition": "If User Replied" } }
    - 'tag_lead': { "id": "node_6", "type": "tag_lead", "position": {"x":250,"y":550}, "data": { "tag": "Hot Lead" } }
    - 'crm_update': { "id": "node_7", "type": "crm_update", "position": {"x":250,"y":650}, "data": { "status": "hot", "leadScore": "80" } }
    - 'human_handover': { "id": "node_8", "type": "human_handover", "position": {"x":250,"y":750}, "data": { "message": "Assigning to staff..." } }
    - 'google_sheet': { "id": "node_9", "type": "google_sheet", "position": {"x":250,"y":850}, "data": { "action": "sync" } }
    - 'ai_agent': { "id": "node_10", "type": "ai_agent", "position": {"x":250,"y":950}, "data": { "message": "Connecting to AI..." } }
    
    CRITICAL RULES:
    0. If asked to "hand over to AI", just end the flow with a 'message' node. Do NOT invent new node types.
    1. ALWAYS PUT REAL TEXT IN 'data.message' AND 'data.question'. Never leave them blank! Write the Hindi/English text inside them!
    2. SMART MODIFICATION: Deeply analyze 'Current Canvas Nodes'. If a node with a similar purpose already exists, DO NOT create a duplicate! REUSE existing nodes, update their text if needed, and just fix the edges. Take the 'Current Canvas Nodes' and 'Current Canvas Edges', modify them, and return the FULL updated arrays.
    3. Edges must logically connect 'source' to 'target'. If a node has multiple outputs, you MUST specify "sourceHandle" in the edge. 
    4. EVEN IF YOU ARE JUST CHATTING, YOU MUST RETURN JSON! Do NOT output plain text outside the JSON. Format: {"reply": "...", "nodes": [], "edges": []}
    5. Return ONLY a valid JSON object starting with { and ending with }. Do not include markdown formatting, trailing commas, or unescaped newlines in strings. If you need a newline in a message, use \\n.
    6. FALLBACK MESSAGE RULE: Always ensure your flow has a fallback or ending 'message' node.`;

    let rawResponse = "";
    let flowGenSuccess = false;

    // 🚀 DYNAMIC MULTI-MODEL ROUTING & FALLBACK CHAIN
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);

      // Gemini Multi-Model Fallback Chain
      const geminiOrder = [
        MODELS.GEMINI_3_5_LITE,
        MODELS.GEMINI_3_5_FLASH,
        MODELS.GEMINI_3_1_LITE,
        MODELS.GEMINI_2_5_LITE,
      ];

      for (const modelName of geminiOrder) {
        if (flowGenSuccess) break;
        try {
          console.log(`[Flow Gen] 🤖 Requesting canvas model: ${modelName}`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([systemPrompt, prompt]);
          console.log(`✅ [Flow Gen] Responded using model: ${modelName}`);
          rawResponse = result.response.text();
          flowGenSuccess = true;
        } catch (geminiErr) {
          console.warn(`⚠️ [Flow Gen] ${modelName} failed, trying next fallback...`);
        }
      }
    }

    // Level 2: Final Fallback to OpenAI gpt-4o-mini
    if (!flowGenSuccess && hasOpenAI) {
      console.log(`[Flow Gen] 🤖 Requesting canvas model: ${MODELS.OPENAI_MINI}`);
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const chatCompletion = await openaiClient.chat.completions.create({
        model: MODELS.OPENAI_MINI,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
      });
      console.log(`✅ [Flow Gen] Responded using model: ${MODELS.OPENAI_MINI}`);
      rawResponse = chatCompletion.choices[0].message.content;
      flowGenSuccess = true;
    }

    if (!flowGenSuccess) throw new Error("All pipeline generation models failed.");

    let cleaned = rawResponse.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    const flowData = JSON.parse(cleaned);
    res.status(200).json(flowData);
  } catch (error) {
    console.error('Flow Gen Error:', error.message);
    res.status(500).json({ success: false, reply: "Maafi chahunga, mujhe flow banane me kuch technical error aa raha hai. Kripya dobara try karein." });
  }
};
