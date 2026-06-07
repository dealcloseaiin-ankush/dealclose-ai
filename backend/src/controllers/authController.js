const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Flow = require('../models/flowModel');
const axios = require('axios');

// 🔥 HELPER: Magic Onboarding - Auto-create a default flow based on business type
const autoCreateDefaultFlow = async (userId, businessDescription, businessName) => {
    try {
        // Check if a default flow already exists to prevent duplicates
        const existingFlow = await Flow.findOne({ userId: userId, name: { $regex: /Instagram Collab Flow|Lead Generation Auto|Real Estate Lead Capture/i } });
        if (existingFlow) {
            console.log(`[Magic Onboarding] Default flow already exists for user ${userId}. Skipping creation.`);
            return;
        }

        const isInfluencer = /influencer|creator|collab|youtube|instagram|vlog|artist|model/i.test(businessDescription || '');
        const isRealEstate = /property|real estate|flat|plot|realtor/i.test(businessDescription || '');

        let flowName = "Lead Generation Auto";
        let flowData = {
            nodes: [
              { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'hi, hello, price, wholesale, b2b, catalog, order' }, position: { x: 400, y: 50 } },
              { id: '2', type: 'askQuestion', data: { question: `Welcome to ${businessName || 'our store'}! 🏢 To serve you better, please reply with your Full Name and City.`, replyType: 'open' }, position: { x: 400, y: 160 } },
              { id: '3', type: 'menu', data: { message: 'Thanks {{name}}! What would you like to do today?', opt1: 'View Catalog 📦', opt2: 'Track My Order 🚚', opt3: 'Talk to Sales 📞' }, position: { x: 400, y: 310 } },
              { id: '4', type: 'message', data: { message: 'Great! Here is our latest catalog: [Your Catalog Link Here]. Let us know your requirements!' }, position: { x: 100, y: 500 } },
              { id: '5', type: 'message', data: { message: 'Please reply with your Order ID to get the latest tracking status.' }, position: { x: 400, y: 500 } },
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
                  { id: '5', type: 'message', data: { message: 'Aww! Thank you so much for the love and support! Means the world to me. ❤️✨' }, position: { x: 700, y: 350 } },
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
        console.log(`✅ [Magic Onboarding] Automatically created '${flowName}' for user ${userId}.`);

    } catch (error) {
        console.error(`❌ [Magic Onboarding] Failed to auto-create flow for user ${userId}:`, error.message);
    }
};

// @desc    Sync Supabase User with MongoDB
// @route   POST /api/users/supabase-auth
exports.supabaseAuth = async (req, res) => {
  const { email, supabaseId, name } = req.body;

  try {
    // Check agar user pehle se MongoDB me hai
    let isNewUser = false;
    let user = await User.findOne({ email });

    if (!user) {
      // Agar naya user hai, toh create kar do. 
      // Agar model me password required hai toh ye dummy password usko bypass kar dega.
      isNewUser = true;
      user = await User.create({ 
        email, 
        supabaseId, 
        name: name,
        fullName: name || 'Google User', // Fix: MongoDB schema requires 'fullName'
        password: supabaseId || 'google-oauth-dummy-pass' 
      });
    } else if (!user.role) {
      // Agar purana user hai jisme role add nahi tha, usko owner bana do
      user.role = 'owner';
      await user.save();
    }

    // Humara apna Backend JWT token generate karke frontend ko wapas bhejenge
    // 🔥 MAGIC ONBOARDING: Auto-create a default flow for new users
    if (isNewUser) {
        // We don't have business description here, so we create a general one.
        // The user can get a more specific one when they update their profile.
        await autoCreateDefaultFlow(user._id, "", user.fullName);
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretkey123', { expiresIn: '30d' });
    res.status(200).json({ success: true, token, user });
  } catch (error) {
    console.error('Supabase Sync Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Connect WhatsApp via Embedded Signup
// @route   POST /api/users/settings/whatsapp-connect
exports.whatsappConnect = async (req, res) => {
  try {
    const { authCode, workspaceId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId || !authCode) {
      return res.status(400).json({ success: false, message: 'Missing authCode or unauthorized session' });
    }

    // TODO: Apne Meta App ka ID aur Secret yahan dalein (Ya .env se lein)
    const APP_ID = process.env.META_APP_ID || 'YOUR_APP_ID';
    const APP_SECRET = process.env.META_APP_SECRET || 'YOUR_APP_SECRET';

    // 1. Exchange the authCode for a System User Access Token
    const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
      params: {
        client_id: APP_ID,
        client_secret: APP_SECRET,
        code: authCode
      }
    });

    const clientAccessToken = tokenResponse.data.access_token;

    // 2. Fetch the WABA (WhatsApp Business Account) ID and Phone Number ID using the new token
    // Meta's debug_token endpoint gives us the business boundaries
    const debugResponse = await axios.get(`https://graph.facebook.com/v19.0/debug_token`, {
      params: {
        input_token: clientAccessToken,
        access_token: `${APP_ID}|${APP_SECRET}`
      }
    });

    const wabaId = debugResponse.data.data.granular_scopes.find(s => s.scope === 'whatsapp_business_messaging')?.target_ids?.[0];
    
    if (!wabaId) {
      return res.status(400).json({ success: false, message: 'Could not find a valid WhatsApp Business Account for this user.' });
    }

    // 3. Fetch Phone Number ID attached to this WABA
    const phoneResponse = await axios.get(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${clientAccessToken}` }
    });

    const phoneNumberId = phoneResponse.data.data[0]?.id; // Picking the first phone number
    const displayPhoneNumber = phoneResponse.data.data[0]?.display_phone_number;

    const waConfigObj = {
      accessToken: clientAccessToken,
      wabaId: wabaId,
      phoneNumberId: phoneNumberId,
      connectedPhone: displayPhoneNumber
    };

    // 4. Save these details securely in your database for this specific user
    let updatedUser;
    if (workspaceId && workspaceId !== 'main') {
      // Save to specific workspace branch
      updatedUser = await User.findOneAndUpdate(
        { _id: userId, "workspaces._id": workspaceId },
        { $set: { "workspaces.$.whatsappConfig": waConfigObj } },
        { new: true }
      );
    } else {
      // Save to main business
      updatedUser = await User.findByIdAndUpdate(userId, { $set: { whatsappConfig: waConfigObj } }, { new: true });
    }

    const savedData = workspaceId && workspaceId !== 'main' ? updatedUser.workspaces.find(w => w._id.toString() === workspaceId)?.whatsappConfig : updatedUser.whatsappConfig;
    res.status(200).json({ success: true, message: 'WhatsApp successfully connected via Meta!', data: savedData });
  } catch (error) {
    console.error('Meta Connect Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to connect Meta account. Check server logs.' });
  }
};

// @desc    Connect Instagram via Meta Login
// @route   POST /api/users/settings/instagram-connect
exports.instagramConnect = async (req, res) => {
  try {
    const { authCode, workspaceId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId || !authCode) {
      return res.status(400).json({ success: false, message: 'Missing authCode or unauthorized session' });
    }

    const APP_ID = process.env.META_APP_ID || '1611867760088959';
    const APP_SECRET = process.env.META_APP_SECRET; // Ensure this is in your .env file

    let clientAccessToken = authCode;

    // Exchange code for token if it's a short-lived code
    if (!authCode.startsWith('EAA') && !authCode.startsWith('EA')) {
      const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
        params: {
          client_id: APP_ID,
          client_secret: APP_SECRET,
          code: authCode,
          redirect_uri: '' 
        }
      });
      clientAccessToken = tokenResponse.data.access_token;
    }

    // Fetch User's Facebook Pages
    const pagesResponse = await axios.get(`https://graph.facebook.com/v19.0/me/accounts`, {
      params: { access_token: clientAccessToken }
    });

    const pages = pagesResponse.data.data;
    if (!pages || pages.length === 0) {
        return res.status(400).json({ success: false, message: 'No Facebook Pages found for your account.' });
    }

    let igAccountId = null;
    let connectedPageId = null;

    // Find the connected Instagram account
    for (const page of pages) {
        try {
            const igResponse = await axios.get(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${clientAccessToken}`);
            if (igResponse.data.instagram_business_account) {
                igAccountId = igResponse.data.instagram_business_account.id;
                connectedPageId = page.id;
                break;
            }
        } catch (err) {
            console.log('Skipping page, no IG connected:', err.message);
        }
    }

    if (!igAccountId) {
        return res.status(400).json({ success: false, message: 'No Instagram Business Account linked to your Facebook Pages.' });
    }

    const igConfigObj = {
      accessToken: clientAccessToken,
      accountId: igAccountId,
      pageId: connectedPageId,
    };

    // Save to Database
    let updatedUser;
    if (workspaceId && workspaceId !== 'main') {
      updatedUser = await User.findOneAndUpdate(
        { _id: userId, "workspaces._id": workspaceId },
        { $set: { "workspaces.$.igConfig": igConfigObj } },
        { new: true }
      );
    } else {
      updatedUser = await User.findByIdAndUpdate(userId, { $set: { igConfig: igConfigObj } }, { new: true });
    }

    const savedData = workspaceId && workspaceId !== 'main' ? updatedUser.workspaces.find(w => w._id.toString() === workspaceId)?.igConfig : updatedUser.igConfig;
    res.status(200).json({ success: true, message: 'Instagram successfully connected!', data: savedData });
  } catch (error) {
    console.error('Instagram Connect Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to connect Instagram account. Try again.' });
  }
};

// @desc    Register a New User (Standard Email/Password)
// @route   POST /api/users/register
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, businessName, businessDescription } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email is already registered. Please login.' });
    }

    const user = await User.create({
      fullName: fullName || 'New User',
      email,
      password, // Make sure your User model has a pre-save hook to hash this using bcrypt
      businessName,
      businessDescription
    });

    // 🔥 MAGIC ONBOARDING: Auto-create a default flow based on their business description
    if (user) {
        await autoCreateDefaultFlow(user._id, user.businessDescription, user.businessName);
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretkey123', { expiresIn: '30d' });
    res.status(201).json({ success: true, token, user });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// @desc    Login User
// @route   POST /api/users/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found. Please register first.' });

    // Agar purana user hai jisme role add nahi tha, usko Auto-update kar do
    if (!user.role) {
      user.role = 'owner';
      await user.save();
    }

    // Bulletproof Password Check: Handles both Encrypted and Plain Text passwords
    let isMatch = false;
    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      isMatch = await bcrypt.compare(password, user.password); // Compare Hashed
    } else {
      isMatch = (password === user.password); // Fallback: Compare Plain text
    }

    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid Password. Please try again.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretkey123', { expiresIn: '30d' });

    // 🔥 RETROACTIVE MAGIC ONBOARDING: Create flow for old users if missing (runs silently in background)
    autoCreateDefaultFlow(user._id, user.businessDescription, user.businessName)
        .catch(err => console.log("Retroactive Flow Check:", err.message));

    res.status(200).json({ success: true, token, user });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Change User Password
// @route   POST /api/users/change-password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized Session' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Note: If you want to strictly check the old password, you can use bcrypt.compare here.
    // For AI auto-generated accounts, updating it directly after login is safe as they are authenticated.
    user.password = newPassword; 
    await user.save(); // Mongoose pre-save hook will automatically hash the new password

    res.status(200).json({ success: true, message: 'Password changed successfully!' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update User Profile (AI Prompt / Business Description)
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    console.log(`\n➡️ [DEBUG Profile Update] Request received!`);
    console.log(`➡️ [DEBUG] Auth Header:`, req.headers.authorization ? 'Present' : 'Missing');
    console.log(`➡️ [DEBUG] req.user object:`, req.user);

    const { 
      businessName,
      businessDescription, 
      aiRules, 
      fallbackAction,
      whatsappConfig,
      digitalCardConfig,
      discountConfig,
      metaAdsConfig,
      ownerPhone,
      aiAgentEnabled,
      acceptCollabs,
      workspaces,
      twilioConfig,
      externalApiUrl,
      externalApiToken,
      externalApiSearchUrl,
      externalApiPostUrl,
      externalApiBlogUrl,
      externalApiVisitUrl,
      customWebhooks
    } = req.body;

    // Assuming you have an auth middleware that sets req.user
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
       console.log('❌ [DEBUG Profile Update] Failed: Unauthorized Session. User not found in request.');
       return res.status(401).json({ success: false, message: 'Unauthorized Session' });
    }

    // Build the update object dynamically and safely
    const updateData = {};
    if (businessName !== undefined) updateData.businessName = businessName.trim() === '' ? 'Main Business' : businessName;
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription;
    if (aiRules !== undefined) updateData.aiRules = aiRules;
    if (fallbackAction !== undefined) updateData.fallbackAction = fallbackAction;
    if (whatsappConfig !== undefined) updateData.whatsappConfig = whatsappConfig;
    if (digitalCardConfig !== undefined) updateData.digitalCardConfig = digitalCardConfig;
    if (discountConfig !== undefined) updateData.discountConfig = discountConfig;
    if (metaAdsConfig !== undefined) updateData.metaAdsConfig = metaAdsConfig;
    if (ownerPhone !== undefined) updateData.ownerPhone = ownerPhone;
    if (aiAgentEnabled !== undefined) updateData.aiAgentEnabled = aiAgentEnabled;
    if (acceptCollabs !== undefined) updateData.acceptCollabs = acceptCollabs;
    if (workspaces !== undefined) updateData.workspaces = workspaces;
    if (twilioConfig !== undefined) updateData.twilioConfig = twilioConfig;
    if (externalApiUrl !== undefined) updateData.externalApiUrl = externalApiUrl;
    if (externalApiToken !== undefined) updateData.externalApiToken = externalApiToken;
    if (externalApiSearchUrl !== undefined) updateData.externalApiSearchUrl = externalApiSearchUrl;
    if (externalApiPostUrl !== undefined) updateData.externalApiPostUrl = externalApiPostUrl;
    if (externalApiBlogUrl !== undefined) updateData.externalApiBlogUrl = externalApiBlogUrl;
    if (externalApiVisitUrl !== undefined) updateData.externalApiVisitUrl = externalApiVisitUrl;
    if (customWebhooks !== undefined) updateData.customWebhooks = customWebhooks;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { returnDocument: 'after', strict: false }
    );

    // Re-fetch using .lean() to ensure we get the raw object for debugging, but still send the fully updated Mongoose doc to frontend
    const verifyDb = await User.findById(userId).lean(); 
    console.log(`\n🔍 [DB VERIFY AFTER SETTINGS SAVE]
    - AI Rules in DB: ${verifyDb.aiRules ? '✅ SAVED' : '❌ MISSING'}
    - Business Desc in DB: ${verifyDb.businessDescription ? '✅ SAVED' : '❌ MISSING'}`);

    if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found or not updated' });

    res.status(200).json({ success: true, user: updatedUser, message: 'Settings updated successfully!' });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
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
    
    console.log(`\n🔍 [FETCHING PROFILE FOR FRONTEND]
    - AI Rules Exist?: ${user.aiRules ? '✅ YES' : '❌ NO'}
    - Business Desc Exist?: ${user.businessDescription ? '✅ YES' : '❌ NO'}`);

    if (!user.role) user.role = 'owner'; // UI ke liye safe fallback
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
};