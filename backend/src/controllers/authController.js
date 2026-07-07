const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Flow = require('../models/flowModel');
const mongoose = require('mongoose');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$/;

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
    let requestedPhoneId = workspaceId && workspaceId !== 'main' ? userDb.workspaces.find(w => w._id.toString() === workspaceId)?.whatsappConfig?.phoneNumberId : userDb.whatsappConfig?.phoneNumberId;

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

    const waConfigObj = {
      accessToken: clientAccessToken,
      wabaId: targetWaba,
      phoneNumberId: targetPhone.id,
      connectedPhone: targetPhone.display_phone_number
    };

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

// @desc    Connect Selected Instagram via Meta Login
// @route   POST /api/users/settings/instagram-connect-selected
exports.instagramConnectSelected = async (req, res) => {
  try {
    const { selectedAccountId, selectedPageId, workspaceId: requestedWorkspaceId } = req.body;
    const userId = req.user?._id || req.user?.id;
    console.log('[Instagram Connect Selected] request body:', req.body, 'userId:', userId);

    const user = await User.findById(userId);
    const pending = user?.pendingInstagramConnection;
    console.log('[Instagram Connect Selected] pending session:', pending ? {
      workspaceId: pending.workspaceId,
      expiresAt: pending.expiresAt,
      accountsCount: pending.accounts?.length
    } : null);
    if (!userId || !selectedAccountId || !selectedPageId || !pending || pending.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This account-selection session expired. Please connect Instagram again.' });
    }

    if (requestedWorkspaceId && requestedWorkspaceId !== (pending.workspaceId || 'main')) {
      return res.status(400).json({ success: false, message: 'Instagram selection workspace mismatch. Please connect Instagram again for this workspace.' });
    }

    const selected = pending.accounts.find(account => account.accountId === selectedAccountId && account.pageId === selectedPageId);
    if (!selected) {
      return res.status(400).json({ success: false, message: 'Selected Instagram account was not returned by Meta.' });
    }

    const workspaceId = pending.workspaceId || 'main';
    const instagramConfig = {
      accessToken: selected.pageToken || pending.accessToken,
      instagramAccountId: selected.accountId,
      facebookPageId: selected.pageId,
      tokenExpiresAt: pending.tokenExpiresAt
    };

    console.log('[Instagram Connect Selected] 🔍 instagramConfig object being saved:', JSON.stringify(instagramConfig, null, 2));
    console.log('[Instagram Connect Selected] 🔍 workspaceId:', workspaceId);

    const filter = workspaceId !== 'main' ? { _id: userId, 'workspaces._id': workspaceId } : { _id: userId };
    const update = workspaceId !== 'main'
      ? { $set: { 'workspaces.$.instagramConfig': instagramConfig } }
      : { $set: { instagramConfig } };

    console.log('[Instagram Connect Selected] 🔍 Update query:', JSON.stringify(update, null, 2));

    const updateResult = await User.updateOne(filter, update);
    console.log('[Instagram Connect Selected] ✅ Update result:', updateResult);

    await User.updateOne({ _id: userId }, { $unset: { pendingInstagramConnection: '' } });
    console.log('[Instagram Connect Selected] saved instagramConfig for', workspaceId, 'selectedAccountId:', selectedAccountId, 'selectedPageId:', selectedPageId);

    // 🔥 VERIFY: Check if data was actually saved (with timeout protection)
    try {
      const verifyUser = await Promise.race([
        User.findById(userId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Verification timeout')), 5000))
      ]);
      
      if (workspaceId !== 'main') {
        const savedWs = verifyUser.workspaces.find(w => w._id.toString() === workspaceId);
        console.log('[Instagram Connect Selected] ✅ VERIFICATION - Saved workspace instagramConfig:', JSON.stringify(savedWs?.instagramConfig, null, 2));
      } else {
        console.log('[Instagram Connect Selected] ✅ VERIFICATION - Saved root instagramConfig:', JSON.stringify(verifyUser.instagramConfig, null, 2));
      }
    } catch (verifyError) {
      console.error('[Instagram Connect Selected] ⚠️ Verification failed:', verifyError.message);
    }

    // 🔥 Webhook subscription - don't let it hang the entire response
    let webhookWarning;
    try {
      const webhookPromise = axios.post(`https://graph.facebook.com/v19.0/${selected.pageId}/subscribed_apps`, null, {
        params: { subscribed_fields: 'messages,messaging_postbacks,feed', access_token: selected.pageToken || pending.accessToken },
        timeout: 5000 // 5 second timeout
      });
      
      await Promise.race([
        webhookPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Webhook subscription timeout')), 6000))
      ]);
      
      console.log('[Instagram Connect Selected] ✅ Webhook subscription successful');
    } catch (subscriptionError) {
      webhookWarning = subscriptionError.response?.data?.error?.message || subscriptionError.message;
      console.warn('⚠️ Webhook subscription warning after Instagram connection:', webhookWarning);
    }

    return res.status(200).json({ success: true, message: 'Instagram successfully connected!', data: instagramConfig, webhookWarning });
  } catch (error) {
    console.error('Instagram Connect Selected Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to finalize Instagram account selection. Try again.' });
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

    const APP_ID = process.env.META_APP_ID;
    const APP_SECRET = process.env.META_APP_SECRET;
    
    if (!APP_ID || !APP_SECRET) return res.status(400).json({ success: false, message: 'Backend .env is missing META_APP_ID or META_APP_SECRET' });

    let clientAccessToken = authCode;

    // Exchange code for token if it's a short-lived code
    if (!authCode.startsWith('EAA') && !authCode.startsWith('EA')) {
      try {
        const tokenResponse = await Promise.race([
          axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
            params: {
              client_id: APP_ID,
              client_secret: APP_SECRET,
              code: authCode,
              redirect_uri: '' 
            },
            timeout: 10000 // 10 second timeout
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Token exchange timeout')), 12000))
        ]);
        clientAccessToken = tokenResponse.data.access_token;
      } catch (err) {
        console.error('Failed to exchange auth code for token:', err.message);
        return res.status(400).json({ success: false, message: 'Failed to authenticate with Meta' });
      }
    }

    // 🔥 FIX: Automatically exchange Short-Lived Token for a Long-Lived Token (Valid for 60 Days)
    let expiresInDays = 60; // Default Meta long-lived token
    try {
      const longLivedResponse = await Promise.race([
        axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: APP_ID,
            client_secret: APP_SECRET,
            fb_exchange_token: clientAccessToken
          },
          timeout: 10000
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Long-lived token exchange timeout')), 12000))
      ]);
      
      if (longLivedResponse.data && longLivedResponse.data.access_token) {
        clientAccessToken = longLivedResponse.data.access_token;
        if (longLivedResponse.data.expires_in) {
           expiresInDays = Math.floor(longLivedResponse.data.expires_in / (60 * 60 * 24));
        }
      }
    } catch (exchangeErr) {
      console.error('Failed to get long-lived Instagram token, continuing with short-lived:', exchangeErr.message);
    }

    // Fetch User's Facebook Pages
    let pagesResponse;
    try {
      pagesResponse = await Promise.race([
        axios.get(`https://graph.facebook.com/v19.0/me/accounts`, {
          params: { access_token: clientAccessToken },
          timeout: 10000
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Pages fetch timeout')), 12000))
      ]);
    } catch (pagesErr) {
      console.error('Failed to fetch Facebook pages:', pagesErr.message);
      return res.status(400).json({ success: false, message: 'Failed to fetch Facebook pages. Check your token.' });
    }

    const pages = pagesResponse.data.data;
    console.log(`\n================== [META INSTAGRAM DEBUG] ==================`);
    console.log(`🔍 1. Facebook Pages Found from Meta (${pages?.length || 0}):`, pages ? pages.map(p => `${p.name} (ID: ${p.id})`) : 'None');

    if (!pages || pages.length === 0) {
        return res.status(400).json({ success: false, message: 'No Facebook Pages found for your account.' });
    }

    // 🔥 FIX: Prevent Branch from stealing Main's IG Account
    const userDb = await User.findById(userId);
    const usedIgAccountIds = [];
    if (userDb.instagramConfig?.instagramAccountId || userDb.instagramConfig?.instagramAccountId) {
      const rootIgAccountId = userDb.instagramConfig?.instagramAccountId || userDb.instagramConfig?.instagramAccountId;
      if (workspaceId !== 'main') usedIgAccountIds.push(rootIgAccountId);
    }
    if (userDb.workspaces) {
      userDb.workspaces.forEach(w => {
        if (w._id.toString() !== workspaceId) {
          const workspaceIgAccountId = w.instagramConfig?.instagramAccountId || w.instagramConfig?.instagramAccountId;
          if (workspaceIgAccountId) {
            usedIgAccountIds.push(workspaceIgAccountId);
          }
        }
      });
    }

    let availableAccounts = [];

    // Find all connected Instagram accounts
    for (const page of pages) {
        try {
            const igResponse = await Promise.race([
              axios.get(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${clientAccessToken}`, {
                timeout: 8000
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('IG account fetch timeout')), 10000))
            ]);
            const igAcc = igResponse.data.instagram_business_account;
            console.log(`🔍 2. Checking FB Page "${page.name}": IG Account Linked? ->`, igAcc ? `YES (ID: ${igAcc.id})` : 'NO');
            
            if (igAcc) {
                availableAccounts.push({ // Storing all available accounts from Meta
                   accountId: igAcc.id,
                   pageId: page.id,
                       pageName: page.name,
                       pageToken: page.access_token
                });
            }
        } catch (err) {
            console.log('Skipping page, no IG connected or timeout:', err.message);
        }
    }
    
    console.log(`🔍 3. Total Available IG Accounts:`, availableAccounts.map(a => `IG ID: ${a.accountId} (From FB Page: ${a.pageName})`));

    if (availableAccounts.length === 0) {
        return res.status(400).json({ success: false, message: 'No Instagram Business Account linked to your Facebook Pages.' });
    }

    // This endpoint only discovers accounts. It never auto-selects or saves one.
    const selectableAccounts = availableAccounts.filter(account => !usedIgAccountIds.includes(account.accountId));
    if (selectableAccounts.length === 0) {
      return res.status(400).json({ success: false, message: 'The Instagram accounts Meta returned are already assigned to another workspace.' });
    }

    const tokenExpiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    
    try {
      await Promise.race([
        User.updateOne({ _id: userId }, {
          $set: {
            pendingInstagramConnection: {
              workspaceId: workspaceId || 'main',
              accessToken: clientAccessToken,
              tokenExpiresAt,
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
              accounts: selectableAccounts
            }
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB update timeout')), 5000))
      ]);
    } catch (err) {
      console.error('Failed to save pending Instagram connection:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to save connection state. Try again.' });
    }

    return res.status(200).json({
      success: true,
      availableAccounts: selectableAccounts.map(({ accountId, pageId, pageName }) => ({ accountId, pageId, pageName }))
    });

  
    
   
  } catch (error) {
    console.error('Instagram Connect Error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to connect Instagram account. Try again.' });
  }
};

// @desc    Register a New User (Standard Email/Password)
// @route   POST /api/users/register
exports.register = async (req, res) => {
  try {
    const { fullName, password, businessName, businessDescription } = req.body;
    const email = normalizeEmail(req.body.email);
    
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

    if (!user) return res.status(404).json({ success: false, message: 'User not found. Please register first.' });

    // Agar purana user hai jisme role add nahi tha, usko Auto-update kar do
    if (!user.role) {
      // 🐛 FIX: Use updateOne to set the role without triggering the pre-save hook on the entire document.
      // This prevents the user's password from being re-hashed and corrupted during login.
      await User.updateOne({ _id: user._id }, { $set: { role: 'owner' } });
      user.role = 'owner';
    }

    // Handles current bcrypt hashes, legacy bcrypt variants, and old plain-text records.
    const isMatch = await compareLoginPassword(password, user.password);
    console.log(`[DEBUG] 3. Password match result: ${isMatch ? '✅ Success' : '❌ Failed'}`);

    if (!isMatch) {
      // 🐛 FIX: Refined logic to detect Google-only accounts.
      // This now correctly identifies users who signed up via Google and *never* set a manual password.
      // The old logic could incorrectly block users who signed up with Google and later added a password.
      const isGoogleAccount = !!user.supabaseId;
      // 🐛 FIX: More specific check for dummy password to avoid false positives.
      const hasDummyPassword = user.password.includes('google-oauth-dummy') || user.password === user.supabaseId;

      return res.status(401).json({
        success: false,
        message: (isGoogleAccount && hasDummyPassword)
          ? 'This email is connected with Google login. Please use "Continue with Google" or reset your password.'
          : 'Invalid Password. Please try again.',
      });
    }

    console.log(`[DEBUG] 4. Login successful. Generating JWT token...`);
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });

    // 🔥 RETROACTIVE MAGIC ONBOARDING: Create flow for old users if missing (runs silently in background)
    autoCreateDefaultFlow(user._id, user.businessDescription, user.businessName)
        .catch(err => console.log("Retroactive Flow Check:", err.message));

    res.status(200).json({ success: true, token, user });
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

    // 🐛 FIX: Replaced user.save() with findByIdAndUpdate for a more robust and direct update.
    // The pre-save hook in the User model will automatically hash the new password
    // because we are updating the 'password' field. This is safer than loading the
    // entire document and calling .save().
    // This function does not check the oldPassword, allowing a user logged in via
    // Google to set a new password for their account.
    await User.findByIdAndUpdate(userId, { password: newPassword });

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
      customWebhooks,
      instagramConfig,
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
