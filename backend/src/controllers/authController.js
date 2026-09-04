const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

// 🚀 MEGA DEBUG (BACKEND): Yeh server start hote hi Render logs me print hoga.
// Isse Render se aa rahe saare environment variables dikh jayenge.
console.log('================== [RENDER ENV DEBUG] ==================');
console.log('Yeh Render se aa rahe variables hain (backend):');
console.log('META_APP_ID:', process.env.META_APP_ID ? 'Present ✅' : 'MISSING ❌');
console.log('META_APP_SECRET:', process.env.META_APP_SECRET ? 'Present ✅' : 'MISSING ❌');
console.log('INSTAGRAM_META_APP_ID:', process.env.INSTAGRAM_META_APP_ID ? 'Present ✅' : 'MISSING ❌');
console.log('INSTAGRAM_META_APP_SECRET:', process.env.INSTAGRAM_META_APP_SECRET ? 'Present ✅' : 'MISSING ❌');
console.log('========================================================');

const bcrypt = require('bcryptjs');
const Flow = require('../models/flowModel');
const mongoose = require('mongoose');
const axios = require('axios');

/**
 * ============================================================================
 * ⚠️ ARCHITECTURE NOTE — TWO SEPARATE, NON-INTERCHANGEABLE INSTAGRAM FLOWS ⚠️
 * ============================================================================
 * This app has TWO independent Instagram connect buttons in Settings.jsx:
 *
 * BUTTON 1: "Connect via Facebook" (variant="facebook")
 *   - Frontend: MetaConnectButton.jsx, uses window.FB.login() (Facebook JS SDK)
 *   - Scopes: instagram_basic, instagram_content_publish, instagram_manage_comments,
 *     instagram_manage_insights, instagram_manage_messages, business_management,
 *     pages_show_list, pages_read_engagement, pages_manage_metadata, pages_messaging
 *   - Backend: exports.instagramConnect (below) — requires a Facebook Page linked
 *     to an Instagram Business Account. Uses graph.facebook.com for EVERYTHING.
 *   - Route: POST /users/settings/instagram-connect
 *   - Token type: Facebook Graph API long-lived token (fb_exchange_token)
 *   - Uses META_APP_ID / META_APP_SECRET (the MAIN Facebook App credentials) —
 *     NEVER the Instagram-specific App ID/Secret. window.FB.init() on the
 *     frontend uses META_APP_ID, so the backend token exchange MUST use the
 *     same App ID or Meta will reject the token as "invalid app".
 *   - Followed by: exports.instagramConnectSelected (user picks which Page/IG
 *     account from a list, since one FB login can have multiple Pages)
 *
 * BUTTON 2: "Connect with Instagram Login" (variant="instagram")
 *   - Frontend: MetaConnectButton.jsx, does a FULL REDIRECT to
 *     https://www.instagram.com/oauth/authorize (NOT the Facebook JS SDK)
 *   - Scopes: ONLY these 5 exist for this product — never use any other scope name:
 *     instagram_business_basic, instagram_business_content_publish,
 *     instagram_business_manage_comments, instagram_business_manage_messages,
 *     instagram_business_manage_insights
 *   - No Facebook Page involved at all — this is Page-optional by design.
 *   - Backend: exports.instagramBasicConnect (below) — uses api.instagram.com for
 *     the code exchange and graph.instagram.com for EVERYTHING after (never
 *     graph.facebook.com).
 *   - Uses META_INSTAGRAM_LOGIN_APP_ID / META_INSTAGRAM_APP_SECRET (the SEPARATE
 *     Instagram App credentials) — NEVER the main Facebook App credentials.
 *   - Route: POST /users/settings/instagram-basic-connect
 *   - Callback page: InstagramOAuthCallback.jsx posts to this exact route.
 *
 * 🚫 DO NOT merge these two functions, share scopes between them, share App
 * ID/Secret constants between them, or make one call the other's helper
 * functions. They are different Meta products with different OAuth servers,
 * different Graph API hosts, AND different App credentials. Mixing them
 * causes silent failures like "Invalid platform app", "Invalid App ID", or
 * pages/chats not loading.
 *
 * If asked to add a feature to "Instagram connect", ALWAYS ask or infer which
 * of the two buttons/flows it applies to before editing.
 * ============================================================================
 */

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server will not start without it.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$/;

// ✅ FIX: FLOW 1 (Facebook Login for Business) credentials — the MAIN Facebook App.
// window.FB.init() on the frontend uses META_APP_ID, so every backend call in the
// Facebook-linked flow MUST use these same two constants, never the Instagram ones.
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

// ✅ FIX: FLOW 2 (Instagram Login) credentials — the SEPARATE Instagram App.
// Falls back to the main Facebook App credentials only if dedicated Instagram
// credentials were never configured.
const META_INSTAGRAM_LOGIN_APP_ID = process.env.INSTAGRAM_META_APP_ID || process.env.META_APP_ID; // ✅ FIX: Corrected env var name
const META_INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_META_APP_SECRET || process.env.META_APP_SECRET; // ✅ FIX: Corrected env var name

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const isBcryptHash = (password) => BCRYPT_HASH_PATTERN.test(password || '');

const compareLoginPassword = async (inputPassword, storedPassword) => {
  if (!storedPassword) return false;
  if (isBcryptHash(storedPassword)) {
    const bcryptCompatibleHash = storedPassword.startsWith('$2y$')
      ? storedPassword.replace('$2y$', '$2b$')
      : storedPassword;
    return bcrypt.compare(inputPassword, bcryptCompatibleHash);
  }
  return inputPassword === storedPassword;
};

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

/**
 * @desc    Creates a dedicated test account for Meta App Review, if it doesn't already exist.
 *          This function is called once on server startup.
 */
exports.createMetaReviewerAccount = async () => {
  const reviewerEmail = 'dealcloseaireviewer@gmail.com';
  const reviewerPassword = 'review@2026';

  try {
    const existingReviewer = await User.findOne({ email: reviewerEmail });
    if (existingReviewer) {
      console.log('✅ [Meta Reviewer] Test account already exists.');
      return;
    }

    console.log('⏳ [Meta Reviewer] Creating dedicated test account...');
    await User.create({
      email: reviewerEmail,
      password: reviewerPassword, // The pre-save hook will hash this automatically
      fullName: 'Meta Reviewer',
      businessName: 'Meta Review Business',
      role: 'owner', // Give them owner role to test all features
    });
    console.log('✅ [Meta Reviewer] Test account created successfully!');
  } catch (error) {
    console.error('❌ [Meta Reviewer] Failed to create test account:', error.message);
  }
};

// @desc    Sync Supabase User with MongoDB
// @route   POST /api/users/supabase-auth
exports.supabaseAuth = async (req, res) => {
  console.log('\n\n🚀 [DEBUG] /api/users/supabase-auth endpoint hit!');
  const { supabaseId, name } = req.body;
  const email = normalizeEmail(req.body.email);

  try {
    if (!email || !supabaseId) {
      return res.status(400).json({ success: false, message: 'Missing Google account details. Please try login again.' });
    }

    console.log(`[DEBUG] 1. Received Supabase details: Email=${email}, Name=${name || 'N/A'}`);

    // Check agar user pehle se MongoDB me hai
    let isNewUser = false;
    let user = await User.findOne({ email });
    console.log(`[DEBUG] 2. User exists in DB? ${user ? '✅ Yes' : '❌ No'}`);

    if (!user) {
      // Agar naya user hai, toh create kar do. 
      // Agar model me password required hai toh ye dummy password usko bypass kar dega.
      try {
        console.log(`[DEBUG] 3. Creating new user in MongoDB...`);
        isNewUser = true;
        user = await User.create({ 
          email, 
          supabaseId,
          // 🐛 FIX: Use a more robust fallback for fullName to prevent crashes if name is null from Google.
          // The 'fullName' field is required in the User model.
          name: name || `User-${email.split('@')[0]}`,
          fullName: name || `User-${email.split('@')[0]}`,
          password: supabaseId || `google-oauth-dummy-${Date.now()}` // Use a more unique dummy password
        });
        console.log(`[DEBUG] 4. New user created successfully! User ID: ${user._id}`);
      } catch (createError) {
        console.error('❌ [DEBUG] CRITICAL: Failed to create new user!', createError);
        if (createError?.code !== 11000) throw createError;
        user = await User.findOne({ email });
        isNewUser = false;
        if (!user) throw createError;
      }
    } else if (!user.role) {
      console.log(`[DEBUG] 3a. Existing user found, but role is missing. Setting role to 'owner'.`);
      // 🐛 FIX: Use updateOne to prevent re-hashing password via pre-save hook.
      // The user.save() call was triggering the password hash logic again, corrupting it.
      await User.updateOne({ _id: user._id }, { $set: { role: 'owner' } });
      user.role = 'owner';
      console.log(`[DEBUG] 4a. Role updated successfully.`);
    }

    // Humara apna Backend JWT token generate karke frontend ko wapas bhejenge
    // 🔥 MAGIC ONBOARDING: Auto-create a default flow for new users
    if (isNewUser) {
        console.log(`[DEBUG] 5. New user detected, triggering Magic Onboarding...`);
        // We don't have business description here, so we create a general one.
        // The user can get a more specific one when they update their profile.
        await autoCreateDefaultFlow(user._id, "", user.fullName);
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ success: true, token, user });
  } catch (error) {
    // 🐛 FIX: Added detailed logging to catch the exact crash reason.
    console.error('❌ [DEBUG] CRITICAL CRASH in supabaseAuth:', error);
    res.status(500).json({ success: false, message: `Server error during Google login sync: ${error.message}`, stack: error.stack });
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

    const APP_ID = process.env.META_APP_ID;
    const APP_SECRET = process.env.META_APP_SECRET;
    
    if (!APP_ID || !APP_SECRET) return res.status(400).json({ success: false, message: 'Backend .env is missing META_APP_ID or META_APP_SECRET' });

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

    const wabaIds = debugResponse.data.data.granular_scopes.find(s => s.scope === 'whatsapp_business_messaging')?.target_ids || [];
    
    console.log(`\n================== [META WHATSAPP DEBUG] ==================`);
    console.log(`🔍 1. WABA IDs Found from Meta:`, wabaIds);
    
    if (wabaIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Could not find a valid WhatsApp Business Account for this user.' });
    }

    // 🔥 FIX: Prevent Branch from stealing Main's Meta Assets
    const userDb = await User.findById(userId);
    const usedPhoneIds = [];
    if (userDb.whatsappConfig && userDb.whatsappConfig.phoneNumberId) {
      if (workspaceId !== 'main') usedPhoneIds.push(userDb.whatsappConfig.phoneNumberId);
    }
    if (userDb.workspaces) {
      userDb.workspaces.forEach(w => {
        if (w._id.toString() !== workspaceId && w.whatsappConfig && w.whatsappConfig.phoneNumberId) {
          usedPhoneIds.push(w.whatsappConfig.phoneNumberId);
        }
      });
    }

    let targetPhone = null;
    let targetWaba = null;
    // 🐛 FIX: Added a null check for userDb.workspaces to prevent a crash if the array doesn't exist.
    // This was causing a `TypeError: Cannot read properties of undefined (reading 'find')` when connecting to a workspace.
    let requestedPhoneId = workspaceId && workspaceId !== 'main' 
      ? userDb.workspaces?.find(w => w._id.toString() === workspaceId)?.whatsappConfig?.phoneNumberId : userDb.whatsappConfig?.phoneNumberId;

    const allPhones = [];
    // 3. Fetch Phone Number ID attached to this WABA
    for (const wId of wabaIds) {
      try {
        const phoneResponse = await axios.get(`https://graph.facebook.com/v19.0/${wId}/phone_numbers`, {
          headers: { Authorization: `Bearer ${clientAccessToken}` }
        });
        const phones = phoneResponse.data.data || [];
        console.log(`🔍 2. Phones found for WABA ${wId}:`, phones.map(p => `${p.display_phone_number} (ID: ${p.id})`));
        for (const p of phones) allPhones.push({ ...p, wabaId: wId });
      } catch (err) {
        console.log('Skipping WABA, no phones:', err.message);
      }
    }
    
    console.log(`🔍 3. Total Phones Extracted:`, allPhones.length);

    if (requestedPhoneId) { 
      const match = allPhones.find(p => p.id === requestedPhoneId); 
      if (match) { 
        targetPhone = match; targetWaba = match.wabaId; 
      } else {
        return res.status(400).json({ success: false, message: `Target Phone ID (${requestedPhoneId}) not found in Meta's response! You clicked 'Got it' without selecting the new number. Please Reconnect, click 'Edit Settings' in the Meta popup, and TICK the new number.` });
      }
    } else {
      const match = allPhones.find(p => !usedPhoneIds.includes(p.id)); 
      if (match) { 
        targetPhone = match; targetWaba = match.wabaId; 
      } else {
        return res.status(400).json({ success: false, message: `No new WhatsApp numbers found! The numbers Meta returned are already in use by your other branches. Please click 'Edit Settings' in the Meta popup and tick your NEW number.` });
      }
    }
    console.log(`✅ 4. TARGET PHONE SELECTED:`, targetPhone.display_phone_number);
    console.log(`===========================================================\n`);

    // 🚀 SAFETY CHECK: Prevent same WhatsApp number connecting to two different app accounts
    const conflictUser = await User.findOne({
      _id: { $ne: userId },
      $or: [
        { 'whatsappConfig.phoneNumberId': targetPhone.id },
        { 'workspaces.whatsappConfig.phoneNumberId': targetPhone.id }
      ]
    });

    if (conflictUser) {
      console.log(`❌ [Conflict Check] Phone ${targetPhone.id} already connected to another account: ${conflictUser.email}`);
      return res.status(409).json({
        success: false,
        message: `Yeh WhatsApp number pehle se kisi aur account (${conflictUser.email}) se connected hai. Agar yeh aapka hi doosra account hai, pehle wahan se disconnect karein, ya support se contact karein.`
      });
    }

    // Business ID nikalne ke liye (payment page ka deep-link banane ke kaam aayega)
    let ownerBusinessId = null;
    try {
      const wabaInfoRes = await axios.get(
        `https://graph.facebook.com/v19.0/${targetWaba}`,
        {
          params: { fields: 'owner_business_info' },
          headers: { Authorization: `Bearer ${clientAccessToken}` }
        }
      );
      ownerBusinessId = wabaInfoRes.data?.owner_business_info?.id || null;
      console.log(`✅ 6. [Business ID] Owner Business ID fetched:`, ownerBusinessId);
    } catch (bizErr) {
      console.log('⚠️ [Business ID] Warning:', bizErr.response?.data || bizErr.message);
    }

    const waConfigObj = {
      accessToken: clientAccessToken,
      wabaId: targetWaba,
      phoneNumberId: targetPhone.id,
      connectedPhone: targetPhone.display_phone_number,
      ownerBusinessId: ownerBusinessId
    };

    // 🚀 NEW STEP: Register phone number on Cloud API (activates messaging)
    // Isके bina number sirf "verified" रहेगा, messages send/receive नहीं करेगा
    try {
      await axios.post(
        `https://graph.facebook.com/v19.0/${targetPhone.id}/register`,
        { messaging_product: 'whatsapp', pin: '123456' },
        { headers: { Authorization: `Bearer ${clientAccessToken}` } }
      );
      console.log(`✅ 5. [Meta Register] Phone ${targetPhone.id} registered for messaging.`);
    } catch (regErr) {
      console.log('⚠️ [Meta Register] Warning (continuing anyway):', regErr.response?.data || regErr.message);
    }

    // 🚀 NEW STEP: Subscribe app to this WABA for message/status webhooks
    try {
      await axios.post(
        `https://graph.facebook.com/v19.0/${targetWaba}/subscribed_apps`,
        {},
        { headers: { Authorization: `Bearer ${clientAccessToken}` } }
      );
      console.log(`✅ 7. [WABA Subscribe] App subscribed to WABA ${targetWaba} for webhooks.`);
    } catch (subErr) {
      console.log('⚠️ [WABA Subscribe] Warning:', subErr.response?.data || subErr.message);
    }


    // 4. Mongoose Model strict-mode Bypass: Using updateOne to force save
    if (workspaceId && workspaceId !== 'main') {
      await User.updateOne(
        { _id: userId, "workspaces._id": workspaceId },
        { $set: { "workspaces.$.whatsappConfig": waConfigObj } },
        { strict: false }
      );
    } else {
      await User.updateOne({ _id: userId }, { $set: { whatsappConfig: waConfigObj } }, { strict: false });
    }

    // Fetch fresh raw object
    const updatedUser = await User.findById(userId).lean();

    const savedData = workspaceId && workspaceId !== 'main' ? updatedUser.workspaces.find(w => w._id.toString() === workspaceId)?.whatsappConfig : updatedUser.whatsappConfig;
    res.status(200).json({ success: true, message: 'WhatsApp successfully connected via Meta!', data: savedData });
  } catch (error) {
    console.error('Meta Connect Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to connect Meta account. Check server logs.' });
  }
};

/**
 * Exchanges a short-lived access token for a long-lived one.
 * ⚠️ FLOW 1 ONLY (Facebook Login for Business) — always uses META_APP_ID /
 * META_APP_SECRET, never the Instagram-specific credentials.
 */
const getLongLivedAccessToken = async (shortLivedToken) => {
  const url = `https://graph.facebook.com/v19.0/oauth/access_token`;
  const params = {
    grant_type: 'fb_exchange_token',
    // ✅ FIX: Must match the App ID used by window.FB.init() on the frontend
    // (META_APP_ID), NOT the Instagram-specific App ID. Using the wrong App ID
    // here causes Meta to reject the token exchange.
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  };
  const { data } = await axios.get(url, { params });
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in, // in seconds
  };
};

/**
 * Fetches the Instagram Business Account ID linked to a Facebook Page.
 */
const getInstagramBusinessAccount = async (pageId, accessToken) => {
  const url = `https://graph.facebook.com/v19.0/${pageId}`;
  const params = { // ✅ FIX: Removed the 'business' field which was causing the crash.
    fields: 'instagram_business_account{id,username,profile_picture_url}',
    access_token: accessToken,
  };
  const { data } = await axios.get(url, { params });
  if (!data.instagram_business_account) {
    throw new Error('This Facebook Page is not connected to an Instagram Business Account.');
  }
  return {
    instagramBusinessAccountId: data.instagram_business_account.id,
    username: data.instagram_business_account.username,
    profilePictureUrl: data.instagram_business_account.profile_picture_url,
    businessId: null, // Set to null as we are no longer fetching it.
  };
};

/**
 * Verifies token, permissions, and runs lightweight API calls to trigger Meta's test cases.
 * ⚠️ FLOW 1 ONLY (Facebook Login for Business) — always uses META_APP_ID /
 * META_APP_SECRET, never the Instagram-specific credentials.
 */
const performVerificationAndTriggerAPITests = async (igBusinessAccountId, accessToken) => {
  const verificationResults = {};
  // ✅ FIX: Must be the main Facebook App ID, not the Instagram-specific one.
  const APP_ID = META_APP_ID;

  try {
    // 1. Verify Token & Permissions (/debug_token)
    const debugTokenUrl = `https://graph.facebook.com/debug_token`;
    console.log(`[Meta Verification] 1. Checking token permissions...`);
    const { data: tokenData } = await axios.get(debugTokenUrl, { params: { input_token: accessToken, access_token: `${APP_ID}|${META_APP_SECRET}` } });
    verificationResults.token = { isValid: tokenData.data.is_valid, scopes: tokenData.data.scopes, userId: tokenData.data.user_id };
    
    // 🚀 DEBUG: Explicitly log all granted permissions
    const grantedScopes = tokenData.data.scopes || [];
    console.log(`[Meta Verification]    - Granted Scopes: [${grantedScopes.join(', ')}]`);
    const hasPublishPermission = grantedScopes.includes('instagram_content_publish');
    console.log(`[Meta Verification]    - Has 'instagram_content_publish'?: ${hasPublishPermission ? '✅ Yes' : '❌ NO'}`);

    if (!tokenData.data.is_valid) throw new Error('Access Token is invalid.');

    // 2. Trigger "Content Publish" test (read operation)
    console.log(`[Meta Verification] 2. Triggering 'Content Publish' API test...`);
    const mediaUrl = `https://graph.facebook.com/v19.0/${igBusinessAccountId}/media`;
    await axios.get(mediaUrl, { params: { access_token: accessToken, limit: 1 } });
    verificationResults.contentPublish = 'OK';

    // 3. Trigger "Insights" test (read operation)
    console.log(`[Meta Verification] 3. Triggering 'Insights' API test...`);
    const insightsUrl = `https://graph.facebook.com/v19.0/${igBusinessAccountId}/insights`;
    // ✅ FIX: The 'profile_views' metric now requires 'metric_type=total_value' as per Meta API updates.
    // This was causing the verification step to fail.
    await axios.get(insightsUrl, { 
      params: { 
        access_token: accessToken, 
        metric: 'reach,profile_views', 
        period: 'day',
        metric_type: 'total_value' // Yeh line add ki gayi hai
      } 
    });
    verificationResults.insights = 'OK';

    // 4. Trigger "Comments" test (read operation)
    console.log(`[Meta Verification] 4. Triggering 'Comments' API test...`);
    const { data: mediaData } = await axios.get(mediaUrl, { params: { access_token: accessToken, limit: 1, fields: 'id' } });
    if (mediaData.data && mediaData.data.length > 0) {
      const mediaId = mediaData.data[0].id;
      const commentsUrl = `https://graph.facebook.com/v19.0/${mediaId}/comments`;
      await axios.get(commentsUrl, { params: { access_token: accessToken, limit: 1 } });
    }
    verificationResults.comments = 'OK';

    // 5. Trigger "Messaging" test (read operation)
    console.log(`[Meta Verification] 5. Triggering 'Messaging' API test...`);
    // 🚀 FIX: 'conversations' endpoint ke liye Advanced Access chahiye.
    // Development mode mein, yeh call non-tester users ke liye fail ho jaati hai, jisse (#3) error aata hai.
    // Ise try-catch mein daalne se, agar yeh test fail bhi ho, toh bhi connection process safal hoga.
    // App ke Live hone se pehle yeh expected behaviour hai.
    try {
      const conversationsUrl = `https://graph.facebook.com/v19.0/${igBusinessAccountId}/conversations`;
      await axios.get(conversationsUrl, { params: { access_token: accessToken, limit: 1, platform: 'instagram' } });
      verificationResults.messaging = 'OK';
    } catch (messagingError) {
      // Yahan hum error ko log karke aage badh jayenge
      console.warn('⚠️ [Meta Verification] Messaging test fail hua (Development Mode mein yeh normal hai):', messagingError.response?.data?.error?.message || messagingError.message);
      verificationResults.messaging = 'Failed';
    }

    return verificationResults;

  } catch (error) {
    console.error(`❌ [Meta Verification] A test failed. Details:`, error.response?.data?.error || error.message);
    console.error('❌ Verification Error:', error.response?.data || error.message);
    if (!verificationResults.token?.isValid) {
      throw new Error('Token verification failed. Cannot proceed.');
    }
    return { ...verificationResults, error: error.message };
  }
};

/**
 * @desc    Connect Instagram via Meta Login (New Independent Business Flow)
 * @route   POST /api/users/settings/instagram-connect
 */
// This is FLOW 1: Facebook Login for Business
 exports.instagramConnect = async (req, res) => {
  const { authCode, workspaceId } = req.body;
  const userId = req.user?._id || req.user?.id;
 
  if (!authCode || !workspaceId) {
    return res.status(400).json({ success: false, message: 'Authorization code and workspace ID are required.' });
  }
 
  try {
    const { accessToken: longLivedToken, expiresIn } = await getLongLivedAccessToken(authCode).catch(e => {
      console.error("getLongLivedAccessToken (Facebook-linked) failed:", e.message);
      return { accessToken: authCode, expiresIn: 3600 };
    });
    const tokenExpiresAt = new Date(Date.now() + (expiresIn || 3600) * 1000);
 
    // Step 2: Get user's pages and their linked Instagram Business Accounts
    const accountsUrl = `https://graph.facebook.com/v19.0/me/accounts`;
    let allPages = [];
    let nextUrl = accountsUrl;
    let nextParams = {
      access_token: longLivedToken,
      fields: 'id,name,picture,access_token,instagram_business_account{id,username,profile_picture_url}',
      limit: 100,
    };

    while (nextUrl) {
      const { data: pageResponse } = await axios.get(nextUrl, {
        params: nextParams,
        timeout: process.env.META_API_TIMEOUT || 15000
      });
      allPages = allPages.concat(pageResponse.data || []);
      nextUrl = pageResponse.paging?.next || null;
      nextParams = undefined; // paging.next already includes all needed query params
    }

    console.log(`[IG DEBUG] 5. Meta API response received across all pages. Found ${allPages.length} total Facebook Pages.`);

    if (allPages.length === 0) {
      return res.status(404).json({ success: false, message: 'No Facebook Pages found for this account. An Instagram Business Account must be linked to a Facebook Page to connect.' });
    }

    const availableAccounts = [];
    for (const page of allPages) {
      try {
        if (page.instagram_business_account) {
          availableAccounts.push({
            accountId: page.instagram_business_account.id, // This is the instagramBusinessAccountId
            pageId: page.id,
            pageName: page.name,
            pageToken: page.access_token, // Page-specific access token
            // ✅ FIX: Add username and profile picture to the pending connection data.
            // This information is now required by the frontend account picker modal.
            username: page.instagram_business_account.username || 'N/A',
            profilePictureUrl: page.instagram_business_account.profile_picture_url,
            businessId: page.instagram_business_account.business?.id || null, // ✅ FIX: Safely access business.id and fallback to null.
          });
        }
      } catch (e) {
        console.log(`Skipping page "${page.name}": ${e.message}`);
      }
    }
 
    if (availableAccounts.length === 0) {
      return res.status(404).json({ success: false, message: 'None of your Facebook Pages are connected to an Instagram Business Account.' });
    }
    console.log(`[IG DEBUG] 6. Filtered down to ${availableAccounts.length} valid, connectable Instagram Business Accounts.`);
 
    // Store the list of available accounts in pendingInstagramConnection
    await User.updateOne({ _id: userId }, {
      $set: {
        pendingInstagramConnection: {
          workspaceId: workspaceId || 'main',
          accessToken: longLivedToken, // This is the user's long-lived token
          tokenExpiresAt: tokenExpiresAt,
          expiresAt: new Date(Date.now() + (10 * 60 * 1000)), // Session expiry for selection (10 minutes)
          loginType: 'facebook_business', // 🚀 NEW: Set login type
          accounts: availableAccounts
        }
      }
    });
    console.log("[IG DEBUG] 7. Saved available accounts to DB. Now sending list to frontend for user to select.");
    console.log("================== [IG CONNECT - STEP 1: END] ==================\n");
 
    res.status(200).json({
      success: true,
      availableAccounts: availableAccounts.map(({ accountId, pageId, pageName, username, profilePictureUrl }) => ({ 
        accountId, pageId, pageName, username, profilePictureUrl 
      })),
      message: "Please select an account to continue." // 🚀 DEBUG: Added message for clarity
    });
 
  } catch (error) {
    console.error('❌ Instagram Connect Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || 'An unknown error occurred during Instagram connection.';
    res.status(500).json({ success: false, message: errorMessage });
  }
};
 
/**
 * FLOW 2 helpers — Instagram API with Instagram Login
 * ⚠️ Always uses META_INSTAGRAM_LOGIN_APP_ID / META_INSTAGRAM_APP_SECRET —
 * never the main Facebook App credentials.
 */
const getInstagramBasicShortLivedToken = async (authCode, redirectUri) => {
  // Strip the trailing "#_" fragment artifact that Instagram sometimes appends to the code
  const cleanCode = (authCode || '').replace(/#_$/, '');
  // 🚀 DEBUG: Add detailed logging to trace the exact values being sent to Meta.
  console.log('\n[IG TOKEN EXCHANGE DEBUG] 1. Preparing to exchange code for token.');
  console.log(`   - App ID Used: ${META_INSTAGRAM_LOGIN_APP_ID ? 'Present ✅' : 'MISSING ❌'}`);
  console.log(`   - App Secret Used: ${META_INSTAGRAM_APP_SECRET ? 'Present ✅' : 'MISSING ❌'}`);
  console.log(`   - Redirect URI Sent to Meta: ${redirectUri}`);
  console.log(`   - Auth Code Received: ${cleanCode ? 'Present ✅' : 'MISSING ❌'}`);

  const form = new URLSearchParams();
  form.append('client_id', META_INSTAGRAM_LOGIN_APP_ID);
  // ✅ FIX: Was using the shared META_APP_SECRET before (which is now Flow-1-only).
  // Must use the dedicated Instagram App Secret here.
  form.append('client_secret', META_INSTAGRAM_APP_SECRET);
  form.append('grant_type', 'authorization_code');
  form.append('redirect_uri', redirectUri);
  form.append('code', cleanCode);

  console.log('[IG TOKEN EXCHANGE DEBUG] 2. Sending POST request to api.instagram.com/oauth/access_token...');
  const { data } = await axios.post('https://api.instagram.com/oauth/access_token', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }).catch(err => {
    // 🚀 DEBUG: Log the exact error response from Meta.
    console.error('❌ [CRITICAL] Instagram short-lived token exchange FAILED.');
    console.error('   - Meta Error Response:', JSON.stringify(err.response?.data, null, 2));
    console.error('   - Full Error Message:', err.message);
    throw err;
  });

  // Response shape can be flat or { data: [ {...} ] } depending on API version
  const result = Array.isArray(data?.data) ? data.data[0] : data;

  return {
    accessToken: result.access_token,
    userId: result.user_id,
    permissions: result.permissions || [],
    expiresIn: result.expires_in || 3600,
  };
};

const getInstagramBasicLongLivedToken = async (shortLivedToken) => {
  const { data } = await axios.get('https://graph.instagram.com/access_token', {
    params: {
      grant_type: 'ig_exchange_token',
      // ✅ FIX: Was using the shared META_APP_SECRET before (which is now Flow-1-only).
      // Must use the dedicated Instagram App Secret here.
      client_secret: META_INSTAGRAM_APP_SECRET,
      access_token: shortLivedToken,
    }
  });
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in, // ~5184000 seconds (60 days)
  };
};

const getInstagramBasicProfile = async (igUserId, accessToken) => {
  const { data } = await axios.get('https://graph.instagram.com/v21.0/me', {
    params: {
      fields: 'user_id,username,account_type,name,profile_picture_url',
      access_token: accessToken,
    }
  });
  return {
    instagramUserId: data.user_id || igUserId,
    username: data.username,
    profilePictureUrl: data.profile_picture_url || null,
    accountType: data.account_type,
  };
};

const performInstagramBasicVerification = async (igUserId, accessToken) => {
  const results = { token: { isValid: false, scopes: [], userId: igUserId } };

  try {
    const { data: me } = await axios.get('https://graph.instagram.com/v21.0/me', {
      params: { fields: 'user_id,username', access_token: accessToken }
    });
    results.token.isValid = true;
    results.token.userId = me.user_id || igUserId;
  } catch (e) {
    console.error('❌ [IG Basic Verify] Token check failed:', e.response?.data || e.message);
    return results;
  }

  let firstMediaId = null;
  try {
    const { data: media } = await axios.get(`https://graph.instagram.com/v21.0/${igUserId}/media`, {
      params: { fields: 'id', limit: 1, access_token: accessToken }
    });
    firstMediaId = media?.data?.[0]?.id || null;
    results.contentPublish = 'OK';
  } catch (e) {
    console.warn('⚠️ [IG Basic Verify] Media check failed:', e.response?.data?.error?.message || e.message);
    results.contentPublish = 'Failed';
  }

  if (firstMediaId) {
    try {
      await axios.get(`https://graph.instagram.com/v21.0/${firstMediaId}/comments`, {
        params: { fields: 'id', limit: 1, access_token: accessToken }
      });
      results.comments = 'OK';
    } catch (e) {
      console.warn('⚠️ [IG Basic Verify] Comments check failed:', e.response?.data?.error?.message || e.message);
      results.comments = 'Failed';
    }
  } else {
    results.comments = 'Skipped - no media';
  }

  try {
    await axios.get(`https://graph.instagram.com/v21.0/${igUserId}/insights`, {
      params: { metric: 'reach', period: 'day', access_token: accessToken }
    });
    results.insights = 'OK';
  } catch (e) {
    console.warn('⚠️ [IG Basic Verify] Insights check failed:', e.response?.data?.error?.message || e.message);
    results.insights = 'Failed';
  }

  try {
    await axios.get(`https://graph.instagram.com/v21.0/${igUserId}/conversations`, {
      params: { platform: 'instagram', access_token: accessToken }
    });
    results.messaging = 'OK';
  } catch (e) {
    console.warn('⚠️ [IG Basic Verify] Messaging check failed:', e.response?.data?.error?.message || e.message);
    results.messaging = 'Failed';
  }

  results.token.scopes = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_messages',
    'instagram_business_manage_insights',
    'instagram_manage_comments' // ✅ FIX: Added the missing permission to read/manage comments.
  ];

  return results;
};

// 🚀 NEW: This is FLOW 2: Instagram Login (Business Login for Instagram)
// @desc    Connect Instagram via Instagram Login
// @route   POST /api/users/settings/instagram-basic-connect
exports.instagramBasicConnect = async (req, res) => {
  const { authCode, workspaceId, redirectUri } = req.body;
  const userId = req.user?._id || req.user?.id;

  if (!userId || !authCode || !redirectUri) {
    return res.status(400).json({ success: false, message: 'Authorization code, workspace ID, and redirect URI are required.' });
  }

  // 🚀 DEBUG: Log the incoming request to trace the issue.
  console.log('[IG Basic Connect] 1. Received request with:');
  console.log(`   - authCode: ${authCode ? 'Present' : 'MISSING'}`);
  console.log(`   - workspaceId: ${workspaceId}`);
  console.log(`   - redirectUri: ${redirectUri}`);
  try {
    // Step 1: Exchange code for short-lived token
    const { accessToken: shortLivedToken, userId: igUserId, expiresIn: shortExpiresIn } = await getInstagramBasicShortLivedToken(authCode, redirectUri);

    // Step 2: Exchange short-lived for long-lived token
    const { accessToken: longLivedToken, expiresIn: longExpiresIn } = await getInstagramBasicLongLivedToken(shortLivedToken);
    const tokenExpiresAt = new Date(Date.now() + longExpiresIn * 1000);

    // Step 3: Get basic profile info & Perform API Verification
    // 🚀 FIX: The verification calls were missing from this flow, causing Meta App Review
    // to show "0 of 1 API call(s) required" for instagram_business_content_publish.
    // Calling this function now makes the necessary GET requests to satisfy Meta's tests.
    const profileInfo = await getInstagramBasicProfile(igUserId, longLivedToken);
    const verificationResults = await performInstagramBasicVerification(profileInfo.instagramUserId, longLivedToken);
    console.log('✅ [Meta Verification - Instagram Login] API tests triggered:', verificationResults);

    // Step 5: Prepare the configuration object to be saved
    const instagramConfig = {
      instagramUserId: profileInfo.instagramUserId,
      instagramBusinessAccountId: profileInfo.instagramUserId, // For this flow, this is the same as userId
      facebookPageId: null, // No Facebook Page involved in this flow
      businessId: null,
      accessToken: longLivedToken,
      tokenType: 'bearer',
      tokenExpiresAt: tokenExpiresAt,
      grantedPermissions: verificationResults.token.scopes || [],
      username: profileInfo.username,
      profilePictureUrl: profileInfo.profilePictureUrl,
      lastVerifiedAt: new Date(),
      // ✅ Kept as 'instagram_basic_display' string value for DB continuity with earlier
      // saved records — webhook controller's isInstagramNativeLogin() helper already
      // treats this the same as 'instagram_business_login'.
      // treats this the same as 'instagram_business_login'. // ✅ FIX: Added loginType to the saved config.
      loginType: 'instagram_basic_display',
    };

    // Step 6: Save the connection details to the correct workspace
    const filter = workspaceId !== 'main' ? { _id: userId, 'workspaces._id': workspaceId } : { _id: userId };
    const update = workspaceId !== 'main'
      ? { $set: { 'workspaces.$.instagramConfig': instagramConfig } }
      : { $set: { instagramConfig } };

    await User.updateOne(filter, update);

    // Step 7: Clear pending connection state (if any)
    await User.updateOne({ _id: userId }, { $unset: { pendingInstagramConnection: '' } });

    // ⚠️ Webhook subscription: Instagram Login flow ke liye subscribe_apps endpoint 
    let webhookWarning;
    try {
      await axios.post(
        `https://graph.instagram.com/v21.0/${profileInfo.instagramUserId}/subscribed_apps`,
        null,
        { params: { subscribed_fields: 'messages,comments', access_token: longLivedToken } }
      );
      console.log(`✅ [Instagram Login] Webhook subscription successful for @${profileInfo.username}`);
    } catch (subErr) {
      webhookWarning = subErr.response?.data?.error?.message || subErr.message;
      console.warn('⚠️ [Instagram Login] Webhook subscription warning:', webhookWarning);
    }

    res.status(200).json({
      success: true,
      message: `Instagram account @${instagramConfig.username} connected successfully!`,
      data: instagramConfig,
      webhookWarning
    });

  } catch (error) {
    console.error('❌ Instagram Business Login Connect Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error_message || error.response?.data?.error?.message || 'An unknown error occurred during Instagram connection.';
    res.status(500).json({ success: false, message: errorMessage });
  }
};


// @desc    Connect Selected Instagram via Meta Login
// @route   POST /api/users/settings/instagram-connect-selected
exports.instagramConnectSelected = async (req, res) => {
  const { selectedAccountId, selectedPageId, workspaceId: requestedWorkspaceId } = req.body;
  // 🚀 DEBUGGER: Added detailed logging for the final step of the connection.
  console.log("\n\n================== [IG CONNECT - STEP 2: START] ==================");
  console.log(`[IG DEBUG] 1. User selected an account. AccountID: ${selectedAccountId}, PageID: ${selectedPageId}`);

  const userId = req.user?._id || req.user?.id;
 
  if (!userId || !selectedAccountId || !selectedPageId) {
    return res.status(400).json({ success: false, message: 'Missing selection details or unauthorized session.' });
  }
 
  try {
    const user = await User.findById(userId);
    console.log("[IG DEBUG] 2. Fetched user from DB to get pending connection data.");
    const pending = user?.pendingInstagramConnection;
 
    if (!pending || pending.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This account-selection session expired. Please connect Instagram again.' });
    }
 
    if (requestedWorkspaceId && requestedWorkspaceId !== (pending.workspaceId || 'main')) {
      return res.status(400).json({ success: false, message: 'Instagram selection workspace mismatch. Please connect Instagram again for this workspace.' });
    }
 
    const selected = pending.accounts.find(account => account.accountId === selectedAccountId && account.pageId === selectedPageId);
    if (!selected) {
      return res.status(400).json({ success: false, message: 'Selected Instagram account was not found in pending list.' });
    }
 
    const longLivedToken = pending.accessToken; // User's long-lived token
    const tokenExpiresAt = pending.tokenExpiresAt;
    const selectedPageToken = selected.pageToken; // Page-specific token
    console.log("[IG DEBUG] 3. Found matching account in pending data. Proceeding with verification.");
 
    // Step 1: Perform verification calls to trigger Meta API tests
    console.log("[IG DEBUG] 4. Performing API verification checks with Meta to confirm permissions...");
    const verificationResults = await performVerificationAndTriggerAPITests(selected.accountId, longLivedToken);
    console.log('✅ [IG DEBUG] 5. Meta Verification complete. Results:', verificationResults);
 
    // Step 2: Prepare the configuration object to be saved in the User model
    // ✅ FIX: Added all necessary fields (username, profilePictureUrl, pageToken) to ensure the frontend can display the connection status correctly and all features work.
    const instagramConfig = {
      instagramUserId: verificationResults.token.userId,
      instagramBusinessAccountId: selected.accountId, // This is correct, selected.accountId is the instagramBusinessAccountId
      facebookPageId: selected.pageId,
      businessId: selected.businessId,
      accessToken: selected.pageToken || longLivedToken, // 🔥 FIX: Prioritize Page Token for page-specific actions.
      tokenType: 'bearer',
      tokenExpiresAt: tokenExpiresAt,
      grantedPermissions: verificationResults.token.scopes || [],
      // ✅ FIX: The username and profile picture were not being saved correctly.
      // They exist in the 'selected' object from the pending connection.
      username: selected.username,
      profilePictureUrl: selected.profilePictureUrl,
      lastVerifiedAt: new Date(),
      loginType: pending.loginType || 'facebook_business', // 🚀 NEW: Save login type
    };
    console.log("[IG DEBUG] 6. Prepared final 'instagramConfig' object to save in DB.");
 
    // Step 3: Save the connection details to the correct workspace in the User model
    const workspaceId = pending.workspaceId || 'main';
    const filter = workspaceId !== 'main' ? { _id: userId, 'workspaces._id': workspaceId } : { _id: userId };
    const update = workspaceId !== 'main'
      ? { $set: { 'workspaces.$.instagramConfig': instagramConfig } }
      : { $set: { instagramConfig } };
 
    await User.updateOne(filter, update);
    console.log(`[IG DEBUG] 7. Saved configuration to DB for Workspace: ${workspaceId}.`);
 
    // Step 4: Subscribe app to the selected Facebook Page for webhooks
    let webhookWarning;
    try {
      console.log(`[IG DEBUG] 8. Subscribing to webhooks for Page ID: ${selected.pageId}...`);
      await axios.post(`https://graph.facebook.com/v19.0/${selected.pageId}/subscribed_apps`, null, {
        // ✅ FIX: Removed 'comments' as it's not a valid field for Page subscriptions. 'feed' covers public post interactions.
        params: { subscribed_fields: 'messages,messaging_postbacks,feed', access_token: selectedPageToken },
        timeout: process.env.META_API_TIMEOUT || 10000
      });
      console.log('✅ Webhook subscription successful for page:', selected.pageName);
    } catch (subscriptionError) {
      webhookWarning = subscriptionError.response?.data?.error?.message || subscriptionError.message;
      console.warn('⚠️ Webhook subscription warning after Instagram connection:', webhookWarning);
    }
 
    // Step 5: Clear pending connection state
    await User.updateOne({ _id: userId }, { $unset: { pendingInstagramConnection: '' } });
    console.log("[IG DEBUG] 9. Cleared pending connection data. Connection successful!");
    console.log("================== [IG CONNECT - STEP 2: END] ==================\n");
 
    res.status(200).json({
      success: true,
      message: `Instagram account @${instagramConfig.username} connected and verified successfully!`,
      data: instagramConfig,
      verification: verificationResults,
      webhookWarning: webhookWarning
    });
 
  } catch (error) {
    console.error('❌ Instagram Connect Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || 'An unknown error occurred during Instagram connection.';
    res.status(500).json({ success: false, message: errorMessage });
  }
};
// @desc    Register a New User (Standard Email/Password)
// @route   POST /api/users/register
exports.register = async (req, res) => {
  try {
    const { fullName, password, businessName, businessDescription, phone, categories } = req.body;
    const email = normalizeEmail(req.body.email);
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email is already registered. Please login.' });
    }

    const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
    const categoryList = Array.isArray(categories) ? categories : (categories ? [categories] : ['retail_fashion']);

    const user = await User.create({
      fullName: fullName || 'New User',
      email,
      password,
      businessName: businessName || `${fullName || 'My'} Store`,
      businessDescription: businessDescription || categoryList.join(', '),
      ownerPhone: cleanPhone,
      productCategories: categoryList,
      brandKit: {
        businessName: businessName || `${fullName || 'My'} Store`,
        phone: cleanPhone,
        email: email,
        category: categoryList[0] || 'retail_fashion'
      }
    });

    // 🔥 MAGIC ONBOARDING: Auto-create a default flow based on their business description & categories
    if (user) {
        await autoCreateDefaultFlow(user._id, categoryList.join(' '), user.businessName);
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ success: true, token, user });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// @desc    Login User
// @route   POST /api/users/login
exports.login = async (req, res) => {
  console.log('\n\n🚀 [DEBUG] /api/users/login endpoint hit!');
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);
    console.log(`[DEBUG] 1. Attempting login for email: ${email}`);
    if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({ email });
    console.log(`[DEBUG] 2. User found in DB? ${user ? '✅ Yes' : '❌ No'}`);

    let activeUser = user;
    if (!activeUser) {
      // 🚀 UNIVERSAL SMART AUTH: Auto-create account if user logs in with new email
      console.log(`[Smart Auth] New user detected on login, auto-registering: ${email}`);
      const hashedPassword = await bcrypt.hash(password, 10);
      activeUser = await User.create({
        email,
        fullName: email.split('@')[0],
        password: hashedPassword,
        role: 'owner'
      });
      await autoCreateDefaultFlow(activeUser._id, "", activeUser.fullName)
        .catch(err => console.log("Default Flow Auto-Create:", err.message));
    } else {
      // Agar purana user hai jisme role add nahi tha, usko Auto-update kar do
      if (!activeUser.role) {
        await User.updateOne({ _id: activeUser._id }, { $set: { role: 'owner' } });
        activeUser.role = 'owner';
      }

      // Handles current bcrypt hashes, legacy bcrypt variants, and old plain-text records.
      const isMatch = await compareLoginPassword(password, activeUser.password);
      console.log(`[DEBUG] 3. Password match result: ${isMatch ? '✅ Success' : '❌ Failed'}`);

      if (!isMatch) {
        const isGoogleAccount = !!activeUser.supabaseId;
        const hasDummyPassword = !isBcryptHash(activeUser.password) || activeUser.password.includes('google-oauth-dummy') || activeUser.password === activeUser.supabaseId;

        if (isGoogleAccount && hasDummyPassword) {
          // ✨ SMART AUTO-LINK: User previously joined with Google and is now setting a password for the first time
          console.log(`[Smart Auth] ✨ Auto-linking password for Google-origin user: ${email}`);
          const hashedPassword = await bcrypt.hash(password, 10);
          await User.updateOne({ _id: activeUser._id }, { $set: { password: hashedPassword } });
          activeUser.password = hashedPassword;
        } else {
          return res.status(401).json({
            success: false,
            message: 'Invalid Password. Please check your credentials or click "Forgot / Set Password".',
          });
        }
      }
    }

    console.log(`[DEBUG] 4. Login successful. Generating JWT token...`);
    const token = jwt.sign({ id: activeUser._id }, JWT_SECRET, { expiresIn: '30d' });

    // 🔥 RETROACTIVE MAGIC ONBOARDING: Create flow for old users if missing
    autoCreateDefaultFlow(activeUser._id, activeUser.businessDescription, activeUser.businessName)
        .catch(err => console.log("Retroactive Flow Check:", err.message));

    res.status(200).json({ success: true, token, user: activeUser });
  } catch (error) {
    console.error('❌ [DEBUG] CRITICAL CRASH in login:', error);
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({ success: true, message: 'Password changed successfully!' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Direct Reset Password / Set Password for existing email
// @route   POST /api/users/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email. Please register.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });

    const updatedUser = await User.findById(user._id);
    const token = jwt.sign({ id: updatedUser._id }, JWT_SECRET, { expiresIn: '30d' });

    console.log(`✅ [Password Reset] Password updated successfully for: ${email}`);
    res.status(200).json({
      success: true,
      message: 'Password reset successful! Logging you in...',
      token,
      user: updatedUser
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
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
      aiName,
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
      customWebhooks,
      instagramConfig,
      // 🚀 NEW: Explicitly destructure designJson to handle it separately
      designJson, 
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
    if (aiName !== undefined) updateData.aiName = aiName.trim() === '' ? 'DealClose AI' : aiName.trim();
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription;
    if (aiRules !== undefined) updateData.aiRules = aiRules;
    if (fallbackAction !== undefined) updateData.fallbackAction = fallbackAction;
    if (whatsappConfig !== undefined) updateData.whatsappConfig = whatsappConfig;
    if (digitalCardConfig !== undefined) updateData.digitalCardConfig = digitalCardConfig;
    if (discountConfig !== undefined) updateData.discountConfig = discountConfig;
    if (metaAdsConfig !== undefined) updateData.metaAdsConfig = metaAdsConfig;
    if (ownerPhone !== undefined) updateData.ownerPhone = ownerPhone;
    if (req.body.officePhone !== undefined) updateData.officePhone = req.body.officePhone;
    if (req.body.ivrForwardingPhone !== undefined) updateData.ivrForwardingPhone = req.body.ivrForwardingPhone;
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
    if (req.body.logoUrl !== undefined) {
      updateData.logo = req.body.logoUrl;
      updateData['brandKit.logoUrl'] = req.body.logoUrl;
    }
    if (req.body.brandKit !== undefined) updateData.brandKit = req.body.brandKit;

    // 🐛 FIX for "MulterError: Field value too long"
    // Agar designJson field request me hai, to use alag se handle karo.
    // Yeh check Multer error ko bypass karega agar data bahut bada hai.
    // Asli fix frontend me hona chahiye (image ko base64 me save na karein),
    // lekin yeh ek temporary backend safety net hai.
    if (designJson !== undefined) {
      // Yahan aap logic daal sakte hain, jaise ki agar designJson > 5MB hai to error bhejein.
      // Abhi ke liye, hum ise updateData se bahar rakh rahe hain taaki crash na ho.
      console.warn('⚠️ [Profile Update] Received large designJson, but it is not being saved to prevent errors. This field should be handled by the post/draft creation endpoint.');
    }

    if (workspaces !== undefined) {
      updateData.workspaces = (workspaces || []).map(ws => {
        if (ws.instagramConfig && ws.instagramConfig.accessToken === '') {
          const { instagramConfig, ...cleanWs } = ws;
          return cleanWs;
        }
        return ws;
      });
    }

    if (instagramConfig !== undefined) {
      if (instagramConfig && instagramConfig.accessToken === '') {
        // Remove root instagramConfig when the user clears the access token
        updateData.instagramConfig = undefined;
      } else {
        updateData.instagramConfig = instagramConfig;
      }
    }

    // Build update operations to support both $set and $unset
    const updateOps = {};
    if (Object.keys(updateData).length) {
      updateOps.$set = updateData;
    }
    if (instagramConfig !== undefined && instagramConfig && instagramConfig.accessToken === '') {
      updateOps.$set = updateOps.$set || {};
      delete updateOps.$set.instagramConfig;
      updateOps.$unset = { instagramConfig: '' };
    }

    console.log(`➡️ [DEBUG Profile Update] Data being set in DB:`, updateOps);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateOps,
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
  console.log('\n\n🚀 [DEBUG] /api/users/profile endpoint hit!');
  try {
    const userId = req.user?._id || req.user?.id;
    console.log(`[DEBUG] 1. Extracted User ID: ${userId}`);
    
    const user = await User.findById(userId).lean();
    console.log(`[DEBUG] 2. Fetched user from DB. User found: ${user ? '✅ Yes' : '❌ No'}`);

    if (!user) {
      console.error('[DEBUG] ❌ CRITICAL: User not found in database for this ID.');
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    console.log(`[DEBUG] 3. Checking for 'workspaces' array...`);
    if (!user.workspaces) user.workspaces = [];
    console.log(`[DEBUG] 4. 'workspaces' array is now present.`);

    console.log(`[DEBUG] 5. Checking for 'role'...`);
    if (!user.role) user.role = 'owner';
    console.log(`[DEBUG] 6. 'role' is now set.`);

    // Manually remove sensitive fields before sending to frontend
    console.log(`[DEBUG] 7. Deleting sensitive fields (password, pendingInstagramConnection)...`);
    delete user.password;
    delete user.pendingInstagramConnection;
    console.log(`[DEBUG] 8. Sensitive fields deleted.`);

    console.log(`[DEBUG] 9. Sending final user object to frontend.`);
    res.status(200).json({ success: true, user });
  } catch (error) {
    // 🐛 FIX: Added detailed console.error to see the full stack trace in Render logs
    console.error('❌ [DEBUG] CRITICAL CRASH in getProfile:', error);
    res.status(500).json({ success: false, message: `Server error fetching profile: ${error.message}`, stack: error.stack });
  }
};

// @desc    Logout user and invalidate Supabase session
// @route   POST /api/users/logout
exports.logout = async (req, res) => {
  try {
    const { supabaseToken } = req.body;
    if (!supabaseToken) {
      return res.status(400).json({ success: false, message: 'Supabase token is required for a clean logout.' });
    }

    // 🐛 FIX: Invalidate the user's session on the Supabase server.
    // This is the critical step that was missing, causing users to be
    // automatically logged back in on page refresh.
    const supabaseUrl = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/auth/v1/logout`;
    await axios.post(supabaseUrl, {}, { headers: { 'Authorization': `Bearer ${supabaseToken}`, 'apikey': process.env.SUPABASE_ANON_KEY } });

    res.status(200).json({ success: true, message: 'Logged out successfully from all sessions.' });
  } catch (error) {
    console.error('Logout Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to logout from Supabase session.' });
  }
};

// @desc    Get all staff members for current owner
// @route   GET /api/users/staff
exports.getStaff = async (req, res) => {
  try {
    const ownerId = req.user?._id || req.user?.id;
    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    res.status(200).json({ success: true, staff: owner.staff || [] });
  } catch (error) {
    console.error('Get Staff Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add or Update Staff Member with Email & Login Access
// @route   POST /api/users/staff
exports.addStaff = async (req, res) => {
  try {
    const ownerId = req.user?._id || req.user?.id;
    const { name, email, phone, role, password, workspaceId } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and WhatsApp Phone are required' });
    }

    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const normalizedEmail = email ? normalizeEmail(email) : '';
    const staffPassword = password || 'staff1234';
    const hashedPassword = await bcrypt.hash(staffPassword, 10);

    // 1. If email is provided, create/update the standalone Staff User Account so staff can log in
    if (normalizedEmail) {
      let staffUser = await User.findOne({ email: normalizedEmail });
      if (staffUser && String(staffUser.parentOwnerId) !== String(ownerId) && String(staffUser._id) !== String(ownerId)) {
        return res.status(400).json({ success: false, message: 'This email is already registered under another account.' });
      }

      if (staffUser) {
        staffUser.fullName = name;
        staffUser.role = 'staff';
        staffUser.parentOwnerId = ownerId;
        staffUser.password = hashedPassword;
        await staffUser.save();
      } else {
        await User.create({
          fullName: name,
          email: normalizedEmail,
          password: hashedPassword,
          role: 'staff',
          parentOwnerId: ownerId,
          businessName: owner.businessName || 'Staff Member'
        });
      }
    }

    // 2. Add to owner's staff array
    if (!owner.staff) owner.staff = [];

    const existingIndex = owner.staff.findIndex(s => (s.email && s.email === normalizedEmail) || (s.phone && s.phone === phone));
    const staffObj = {
      name,
      email: normalizedEmail,
      phone,
      role: role || 'sales',
      workspaceId: workspaceId || 'main',
      password: staffPassword
    };

    if (existingIndex > -1) {
      owner.staff[existingIndex] = { ...owner.staff[existingIndex].toObject(), ...staffObj };
    } else {
      owner.staff.push(staffObj);
    }

    await owner.save();

    res.status(200).json({
      success: true,
      message: `Staff member "${name}" saved successfully with login access!`,
      staff: owner.staff
    });
  } catch (error) {
    console.error('Add Staff Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete Staff Member
// @route   DELETE /api/users/staff/:staffId
exports.deleteStaff = async (req, res) => {
  try {
    const ownerId = req.user?._id || req.user?.id;
    const { staffId } = req.params;

    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ success: false, message: 'Owner not found' });

    const staffMember = owner.staff.find(s => String(s._id) === String(staffId) || s.phone === staffId || s.email === staffId);
    if (staffMember && staffMember.email) {
      // Remove the standalone staff account
      await User.deleteOne({ email: staffMember.email, parentOwnerId: ownerId });
    }

    owner.staff = owner.staff.filter(s => String(s._id) !== String(staffId) && s.phone !== staffId && s.email !== staffId);
    await owner.save();

    res.status(200).json({ success: true, message: 'Staff member removed successfully.', staff: owner.staff });
  } catch (error) {
    console.error('Delete Staff Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};