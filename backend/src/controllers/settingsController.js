const User = require('../models/userModel');
const Flow = require('../models/flowModel');

// 🔥 HELPER: Magic Onboarding - Auto-create a default flow based on business type
const autoCreateDefaultFlow = async (userId, businessDescription, businessName) => {
    try {
        // Check if a default flow already exists to prevent duplicates
        const existingFlow = await Flow.findOne({ userId: userId, name: { $regex: /Instagram Collab Flow|Lead Generation Auto|Real Estate Lead Capture/i } });
        if (existingFlow) {
            console.log(`[Magic Onboarding] Default flow already exists for user . Skipping creation.`);
            return;
        }

        const isInfluencer = /influencer|creator|collab|youtube|instagram|vlog|artist|model/i.test(businessDescription || '');
        const isRealEstate = /property|real estate|flat|plot|realtor/i.test(businessDescription || '');

        let flowName = "Business Lead Capture";
        let flowData = {
            nodes: [
              { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'hi, hello, price, info, catalog, order, support' }, position: { x: 400, y: 50 } },
              { id: '2', type: 'askQuestion', data: { question: `Welcome to ${businessName || 'our business'}! 👋 To serve you better, please reply with your Full Name and City.`, replyType: 'open' }, position: { x: 400, y: 160 } },
              { id: '3', type: 'menu', data: { message: 'Thanks {{name}}! What would you like to do today?', opt1: 'Explore Services/Products 📦', opt2: 'Customer Support 🎧', opt3: 'Talk to Sales 📞' }, position: { x: 400, y: 310 } },
              { id: '4', type: 'message', data: { message: 'Great! Here is our catalog/details: [Your Link Here]. Let us know what you need!' }, position: { x: 100, y: 500 } },
              { id: '5', type: 'message', data: { message: 'Please drop your query here, and our support team will review it shortly.' }, position: { x: 400, y: 500 } },
              { id: '6', type: 'message', data: { message: 'Our sales expert has been notified and will contact you shortly!' }, position: { x: 700, y: 500 } }
            ],
            edges: [ { id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3', sourceHandle: 'replied' }, { id: 'e3-4', source: '3', target: '4', sourceHandle: 'opt_0' }, { id: 'e3-5', source: '3', target: '5', sourceHandle: 'opt_1' }, { id: 'e3-6', source: '3', target: '6', sourceHandle: 'opt_2' } ]
        };

        if (isInfluencer) {
            flowName = "Instagram Collab Flow";
            flowData = {
                nodes: [
                  { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'collab, sponsor, brand, pr, ad, promotion, fan, hi' }, position: { x: 400, y: 50 } },
                  { id: '2', type: 'menu', data: { message: 'Hi! 👋 Thanks for reaching out. What are you looking for?', opt1: 'Collab / PR', opt2: 'Brand Promotion', opt3: 'Just a Fan ❤️' }, position: { x: 400, y: 160 } },
                  { id: '3', type: 'askQuestion', data: { question: 'Awesome! Please share your Brand Name, Budget, and Campaign Details.', replyType: 'open' }, position: { x: 100, y: 350 } },
                  { id: '4', type: 'askQuestion', data: { question: 'Great! What kind of promotion? (Reel/Story) Will you provide the script? And what is the budget?', replyType: 'open' }, position: { x: 400, y: 350 } },
                  { id: '5', 'type': 'message', data: { message: 'Aww! Thank you so much for the love and support! Means the world to me. ❤️✨' }, position: { x: 700, y: 350 } },
                  { id: '6', type: 'message', data: { message: 'Thank you! ✅ I have saved your details. My team will review and share the Media Kit shortly!' }, position: { x: 250, y: 550 } }
                ],
                edges: [ { id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3', sourceHandle: 'opt_0' }, { id: 'e2-4', source: '2', target: '4', sourceHandle: 'opt_1' }, { id: 'e2-5', source: '2', target: '5', sourceHandle: 'opt_2' }, { id: 'e3-6', source: '3', target: '6', sourceHandle: 'replied' }, { id: 'e4-6', source: '4', target: '6', sourceHandle: 'replied' } ]
            };
        } else if (isRealEstate) {
            flowName = "Real Estate Lead Capture";
            flowData = {
              nodes: [
                { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'hi, hello, property, buy, rent, flat, plot' }, position: { x: 400, y: 50 } },
                { id: '2', type: 'askQuestion', data: { question: `Welcome to ${businessName || 'our Real Estate agency'}! 🏢 Are you looking to Buy or Rent a property today?`, replyType: 'open' }, position: { x: 400, y: 160 } },
                { id: '3', type: 'askQuestion', data: { question: 'Great! To help you better, could you please share your preferred City and Budget?', replyType: 'open' }, position: { x: 400, y: 310 } },
                { id: '4', type: 'message', data: { message: 'Thanks, {{name}}! I have saved your details. Our property expert will contact you shortly with the best options! ⏳' }, position: { x: 400, y: 460 } }
              ],
              edges: [ { id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3', sourceHandle: 'replied' }, { id: 'e3-4', source: '3', target: '4', sourceHandle: 'replied' } ]
            };
        }

        await Flow.create({ userId, workspaceId: 'main', name: flowName, flowData });
        console.log(`✅ [Magic Onboarding] Automatically created '' for user .`);

    } catch (error) {
        console.error(`❌ [Magic Onboarding] Failed to auto-create flow for user :`, error.message);
    }
};

// @desc    Get User Settings
// @route   GET /api/users/settings
exports.getSettings = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized Session' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save User & Integration Settings (WhatsApp, Twilio, Business Info)
// @route   POST /api/users/settings
exports.saveSettings = async (req, res) => {
  try {
    console.log(`\n➡️ [DEBUG Settings Update] Request received!`);
    console.log(`➡️ [DEBUG] Auth Header:`, req.headers.authorization ? 'Present' : 'Missing');
    console.log(`➡️ [DEBUG] req.user object:`, req.user);

    const userId = req.user?._id || req.user?.id; 
    if (!userId) {
      console.log('❌ [DEBUG Settings Update] Failed: Unauthorized Session. No user ID.');
      return res.status(401).json({ success: false, message: 'Unauthorized Session' });
    }

    const updates = req.body;
    console.log("➡️ [Settings Update] Payload Received:", JSON.stringify(updates));

    // Pehle existing user fetch kar lo taaki purana data (jaise access token) delete na ho
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updateData = {};

    if (updates.ownerPhone !== undefined) updateData.ownerPhone = updates.ownerPhone;
    if (updates.pinCode !== undefined) updateData.servedPinCodes = [updates.pinCode];
    if (updates.businessDesc !== undefined) updateData.businessDescription = updates.businessDesc;
    if (updates.businessDescription !== undefined) updateData.businessDescription = updates.businessDescription;
    if (updates.businessName !== undefined) updateData.businessName = updates.businessName.trim() === '' ? 'Main Business' : updates.businessName;
    if (updates.aiRules !== undefined) updateData.aiRules = updates.aiRules;
    if (updates.fallbackAction !== undefined) updateData.fallbackAction = updates.fallbackAction;
    if (updates.aiAgentEnabled !== undefined) updateData.aiAgentEnabled = updates.aiAgentEnabled;
    if (updates.businessUrls !== undefined) updateData.businessUrls = updates.businessUrls;
    if (updates.externalApiUrl !== undefined) updateData.externalApiUrl = updates.externalApiUrl;
    if (updates.externalApiToken !== undefined) updateData.externalApiToken = updates.externalApiToken;
    if (updates.externalApiSearchUrl !== undefined) updateData.externalApiSearchUrl = updates.externalApiSearchUrl;
    if (updates.externalApiPostUrl !== undefined) updateData.externalApiPostUrl = updates.externalApiPostUrl;
    if (updates.externalApiBlogUrl !== undefined) updateData.externalApiBlogUrl = updates.externalApiBlogUrl;
    if (updates.externalApiVisitUrl !== undefined) updateData.externalApiVisitUrl = updates.externalApiVisitUrl;
    if (updates.customWebhooks !== undefined) updateData.customWebhooks = updates.customWebhooks;
    
    // 🔥 MAGIC ONBOARDING: If business description is being set for the first time, create a default flow.
    if (updates.businessDescription && !user.businessDescription) {
        await autoCreateDefaultFlow(userId, updates.businessDescription, updates.businessName || user.businessName);
    }

    // Save multiple Workspaces/Businesses
    if (updates.workspaces !== undefined) {
      // Filter out any empty rows just to be safe
      updateData.workspaces = updates.workspaces.filter(w => w.name && w.name.trim() !== '');
      
      // Note: Mongoose automatically generates a unique _id for each item 
      // inside an array of subdocuments when we save it!
    }

    // Merge existing whatsappConfig with new updates (Overwrites old data securely)
    const currentWaConfig = user.whatsappConfig || {};
    let newWaConfig = null;

    // Meta / WhatsApp Config - FIXED FRONTEND PAYLOAD MAPPING
    if (updates.whatsappConfig) {
      newWaConfig = {
        accessToken: updates.whatsappConfig.accessToken || currentWaConfig.accessToken,
        phoneNumberId: updates.whatsappConfig.phoneNumberId || currentWaConfig.phoneNumberId,
        wabaId: updates.whatsappConfig.wabaId || currentWaConfig.wabaId
      };
    } else if (updates.whatsappToken || updates.phoneNumberId || updates.wabaId) {
      newWaConfig = {
        accessToken: updates.whatsappToken || currentWaConfig.accessToken,
        phoneNumberId: updates.phoneNumberId || currentWaConfig.phoneNumberId,
        wabaId: updates.wabaId || currentWaConfig.wabaId
      };
    }

    if (newWaConfig) {
      updateData.whatsappConfig = newWaConfig;
    }

    // Twilio Config - FIXED FRONTEND PAYLOAD MAPPING
    const currentTwilioConfig = user.twilioConfig || {};
    let newTwilioConfig = null;

    if (updates.twilioConfig) {
      newTwilioConfig = { 
        accountSid: updates.twilioConfig.sid || currentTwilioConfig.accountSid, 
        authToken: updates.twilioConfig.authToken || currentTwilioConfig.authToken, 
        phoneNumber: updates.twilioConfig.phone || currentTwilioConfig.phoneNumber 
      };
    } else if (updates.twilioSid || updates.twilioAuthToken || updates.twilioPhone) {
      newTwilioConfig = { 
        accountSid: updates.twilioSid || currentTwilioConfig.accountSid, 
        authToken: updates.twilioAuthToken || currentTwilioConfig.authToken, 
        phoneNumber: updates.twilioPhone || currentTwilioConfig.phoneNumber 
      };
    }

    if (newTwilioConfig) {
      updateData.twilioConfig = newTwilioConfig;
    }

    // Digital Card Config
    if (updates.digitalCardConfig) {
      updateData.digitalCardConfig = updates.digitalCardConfig;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { $set: updateData }, 
      { returnDocument: 'after', upsert: true, strict: false }
    ).lean();
    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Save Settings Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Automated Meta Embedded Signup Callback (Tech Provider Setup)
// @route   POST /api/users/settings/meta-connect
exports.connectMetaAccount = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized Session' });

    // Frontend SDK will send these details after the Meta popup flow is completed
    const { accessToken, wabaId, phoneNumberId } = req.body;

    if (!accessToken || !phoneNumberId) {
      return res.status(400).json({ success: false, message: 'Missing Meta credentials from Embedded Signup.' });
    }

    // Save the credentials securely to the user's dashboard
    const updateData = {
      whatsappConfig: {
        accessToken: accessToken,
        phoneNumberId: phoneNumberId,
        wabaId: wabaId || ''
      }
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).lean();

    console.log(`✅ [Meta Onboarding] Account connected successfully for User: `);
    res.status(200).json({ success: true, message: 'WhatsApp API connected successfully!', user: updatedUser });
  } catch (error) {
    console.error('Meta Connect Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    // Use .lean() here to ensure the full, raw document is returned, including potentially newly added fields
    const user = await User.findById(userId).select('-password').lean();

    if (!user) return res.status(404).json({ success: false, message: 'User profile not found.' });
    
    // YAHI WOH LINE THI JO TERMINAL MEIN KACHRA BHAR RAHI THI, ISEY BAND KAR DIYA GAYA HAI
    // console.log(`\n🔍 [FETCHING PROFILE FOR FRONTEND]
    // - AI Rules Exist?: ${user.aiRules ? '✅ YES' : '❌ NO'}
    // - Business Desc Exist?: ${user.businessDescription ? '✅ YES' : '❌ NO'}
    // - IG Connected Token Exist?: ${user.igConfig?.accessToken ? '✅ YES' : '❌ NO'}`);

    if (!user.role) user.role = 'owner'; // UI ke liye safe fallback
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
};
