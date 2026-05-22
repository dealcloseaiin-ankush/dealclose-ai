const User = require('../models/userModel');
const aiService = require('../services/aiService');

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
      aiRules: user?.aiRules || '',
      businessDescription: user?.businessDescription || '',
      fallbackAction: user?.fallbackAction || 'notify_owner',
      workspaces: user?.workspaces || []
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

    // 🧠 DEALCLOSE AI MASTER PROMPT (Properly wrapped in a JavaScript String)
    // This prompt defines the personality of the AI on the main public website.
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
      1. Basic Automation: ₹199/mo (WhatsApp OR Instagram, keyword-based). Comes with 30-Day Free Trial.
      2. AI Starter Offer: ₹99/mo for the 1st month (Smart AI Chatbot, abandoned cart recovery). Renews at ₹299/mo.
      3. Omnichannel Pro: ₹498/mo (WhatsApp AND Instagram, AI Voice Calls).
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
    
    const { question, answer, aiRules, businessDescription, fallbackAction, workspaceId } = req.body;
    let updateQuery = {};

    // MongoDB strict update rules ke liye $set aur $push ko alag kiya gaya hai
    let setQuery = {};

    // Agar specific Q&A aaya hai
    if (question && answer) {
      updateQuery.$push = { trainingData: { question, answer, status: 'answered' } };
    }
    
    if (workspaceId && workspaceId !== 'main' && workspaceId !== 'main_business') {
      // Update Specific Workspace
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
      // Update Main Business
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

    // FUTURE TODO: We can write code here to automatically send this answer back to the customer on WhatsApp too!

    res.status(200).json({ success: true, message: 'Question answered and AI trained successfully' });
  } catch (error) {
    console.error('Answer Training Question Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Handle Dashboard Setup Assistant Chat
// @route   POST /api/ai/dashboard-assistant
exports.handleDashboardAssistant = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { message } = req.body;
    
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
    console.log(`🤖 [Dashboard Assistant] Received message: "${message}" from user: ${userId}`);
    const user = await User.findById(userId).lean(); // 🔥 Added .lean()
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const systemContext = `You are DealClose AI, a world-class AI Sales & Marketing Automation expert acting as an Onboarding Assistant.
    The user's business name is '${user.businessName || 'Not Set'}'. 
    The user currently has ${user.aiCredits || 0} AI Credits (Free Limit) remaining.
    
    YOUR PLATFORM KNOWLEDGE (What DealClose AI can do):
    1. WhatsApp Chat Automation & Voice Calling
    2. Meta Ad integration & Lead Extraction
    3. Creating Marketing Templates (e.g., "Google/Insta Star Rating" templates to boost followers/reviews).
    
    YOUR JOB WITH THE OWNER:
    1. If their credits are 50 or below, kindly inform them: "I will set up your entire business automation for free. You also get 50 free AI customer replies. After that, you'll need to upgrade to Premium/Recharge for me to continue chatting with your customers."
    2. Ask them to define their personal AI Rules (e.g., "Do you want me to offer discounts?", "Should I talk in English or Hindi?").
    3. Ask for a fallback plan: "If a customer asks a question I don't know the answer to, should I notify your personal WhatsApp number, or just say 'Please wait for our team'?"
    4. Suggest features actively: Tell them they should set up a Star Rating/Instagram Follow template to grow their business.
    5. Observe their business needs and log any knowledge gaps you notice.
    
    Use your tools to update rules, profile, or draft templates immediately when they agree. Talk like a friendly, intelligent human business partner.
    
    CRITICAL RULE: Always reply in the EXACT same language the user is speaking. If the user types in Hindi or Hinglish, YOU MUST reply entirely in natural, friendly Hinglish. Do not reply in English if the user asks a question in Hindi.`;

    const aiMessage = await aiService.generateDashboardAssistantResponse(message, systemContext);

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
          
          const updated = await User.findByIdAndUpdate(userId, { $set: updateData }, { returnDocument: 'after', strict: false });
          const verifyDb = await User.findById(userId).lean();
          console.log(`\n🔍 [DB VERIFY AFTER AI PROFILE UPDATE]
            - Business Desc in DB: ${verifyDb.businessDescription ? '✅ SAVED' : '❌ MISSING'}`);
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
          console.log(`\n🔍 [DB VERIFY AFTER AI AUTOREPLY]
            - Total Auto-Replies in DB: ${updated.autoReplies?.length || 0}`);
          responseMessage = `⚡ Done! I've added an auto-reply. When someone says *'${args.triggerWord}'*, I will automatically reply with: '${args.replyMessage}'.`;
          actionTaken = "auto_reply_added";
        }
        else if (toolCall.function.name === "update_ai_rules") {
          updateData.aiRules = args.customRules;
          updateData.fallbackAction = args.fallbackAction;
          const updated = await User.findByIdAndUpdate(userId, { $set: updateData }, { returnDocument: 'after', strict: false });
          const verifyDb = await User.findById(userId).lean();
          console.log(`\n🔍 [DB VERIFY AFTER AI RULES UPDATE]
            - AI Rules in DB: ${verifyDb.aiRules ? '✅ SAVED' : '❌ MISSING'}`);
          responseMessage = `🧠 Perfect! I have updated my brain. I will strictly follow these rules with your customers:\n- ${args.customRules}\n\nAnd if I get stuck, I will: ${args.fallbackAction}.`;
          actionTaken = "rules_updated";
        }
        else if (toolCall.function.name === "log_business_observation") {
          await User.findByIdAndUpdate(userId, { $push: { aiObservations: args.observationText } }, { strict: false });
          responseMessage = `📝 I have noted this down: "${args.observationText}". I will keep this in mind for your business setup!`;
        }
      }
    } else {
      responseMessage = aiMessage.content;
    }

    res.status(200).json({ success: true, reply: responseMessage, actionTaken });
  } catch (error) {
    console.error('Dashboard Assistant Error:', error);
    res.status(500).json({ success: false, reply: 'Oops, something went wrong while processing your request.' });
  }
};