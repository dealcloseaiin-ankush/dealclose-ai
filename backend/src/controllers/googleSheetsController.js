const { google } = require('googleapis');
const User = require('../models/userModel');

const getOAuth2Client = (req = null) => {
  // 🚀 MEGA DEBUG & FIX: Automatically generate correct Redirect URL to prevent Google 400 Error
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;  
  // 🚀 BULLETPROOF FIX: Use Explicit URI directly from Frontend Payload to avoid Browser CORS drops
  const explicitUri = req?.body?.redirectUri || req?.query?.redirectUri;
  
  if (explicitUri) {
    redirectUri = explicitUri;
  } else if (!redirectUri || redirectUri === 'postmessage' || redirectUri === '') {
    // Bulletproof Origin Extraction using standard URL API
    let origin = req?.headers?.origin || req?.headers?.referer;
    if (origin) {
      const urlObj = new URL(origin);
      redirectUri = `${urlObj.origin}/settings`; // Automatically handles http/https and exact domain
    } else {
      redirectUri = 'https://dealclose-ai.onrender.com/settings';
    }
  }
  
  console.log(`\n================== [MEGA DEBUG: GOOGLE AUTH] ==================`);
  console.log(`1. Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Present ✅' : 'Missing ❌'}`);
  console.log(`2. Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'Present ✅' : 'Missing ❌'}`);
  console.log(`3. Using Redirect URI: ${redirectUri}`);
  console.log(`===============================================================\n`);

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

// @desc    Generate Google Auth URL
// @route   GET /api/settings/google/auth-url
exports.getAuthUrl = async (req, res) => {
  try {
    console.log("\n▶️ [MEGA DEBUG: GOOGLE] Hit /google/auth-url route from Frontend!");
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ success: false, message: 'Google Client ID is missing in backend .env' });
    }

    const userId = req.user?._id || req.user?.id;
    const user = await User.findById(userId);

    // 🚀 RESTRICTION WITH DEVELOPER BYPASS
    const hasPremiumAccess = user.isPremium || user.role === 'superadmin' || user.email === 'ankush.bani@gmail.com';
    if (!hasPremiumAccess) {
      return res.status(403).json({ success: false, message: 'Google Sheets sync is a Premium Feature. Please upgrade your plan.' });
    }

    const oauth2Client = getOAuth2Client(req);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Important for getting refresh_token
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email' // 🚀 NEW: Fetch Email Scope
      ],
      prompt: 'consent' // Forces Google to send refresh token every time
    });

    res.status(200).json({ success: true, url: authUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save Google Auth Code to DB
// @route   POST /api/settings/google/connect
exports.connectGoogleAccount = async (req, res) => {
  try {
    console.log("\n▶️ [MEGA DEBUG: GOOGLE] Hit /google/connect route from Frontend (Saving Token)!");
    const { code } = req.body;
    const userId = req.user?._id || req.user?.id;
    
    const user = await User.findById(userId);
    const hasPremiumAccess = user.isPremium || user.role === 'superadmin' || user.email === 'ankush.bani@gmail.com';
    if (!hasPremiumAccess) return res.status(403).json({ success: false, message: 'Premium Feature Only.' });

    const oauth2Client = getOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(code);
    
    oauth2Client.setCredentials(tokens);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // 🚀 NEW: Extract connected Google Email
    let connectedEmail = user.googleConfig?.connectedEmail || '';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      connectedEmail = userInfo.data.email;
    } catch (e) {
      console.warn('Could not fetch google email, using existing if available.', e.message);
    }

    // Create a new Spreadsheet automatically for the user
    const spreadsheet = await sheets.spreadsheets.create({
      resource: {
        properties: { title: `DealClose CRM Leads - ${user.businessName || 'My Business'}` },
        sheets: [{ properties: { title: "Leads" } }]
      }
    });

    // Add Header Row
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheet.data.spreadsheetId,
      range: 'Leads!A1:E1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['Date', 'Name', 'Phone', 'Source', 'AI Notes']]
      }
    });

    // Save tokens and sheet ID to Database
    await User.findByIdAndUpdate(userId, {
      $set: {
        googleSheetsConfig: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          // 🚀 UPGRADE: Rename to be more generic for Drive backups
          spreadsheetId: spreadsheet.data.spreadsheetId, 
          connectedEmail: connectedEmail // 🚀 NEW: Saved to DB
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      message: 'Google Sheets connected!', 
      sheetUrl: spreadsheet.data.spreadsheetUrl 
    });
  } catch (error) {
    console.error('Google Sheets Connect Error:', error);
    res.status(500).json({ success: false, message: 'Failed to connect Google Sheets.' });
  }
};

// @desc    Helper Function to Append Lead to connected Google Sheet
// Can be called internally by webhooks (WhatsApp/Instagram)
exports.appendLeadToSheet = async (userId, leadData) => {
  try {
    const user = await User.findById(userId);
    
    // Only Premium (or Developer) users with active connection get auto-sync
    const hasPremiumAccess = user && (user.isPremium || user.role === 'superadmin' || user.email === 'ankush.bani@gmail.com');
    if (!hasPremiumAccess || !user.googleSheetsConfig || !user.googleSheetsConfig.accessToken) {
      return; 
    }

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: user.googleSheetsConfig.accessToken,
      refresh_token: user.googleSheetsConfig.refreshToken
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: user.googleSheetsConfig.spreadsheetId,
      range: 'Leads!A:E',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          new Date().toLocaleString(),
          leadData.name || 'Unknown',
          leadData.phoneNumber || 'Unknown',
          leadData.source || 'Bot API',
          leadData.notes || 'N/A'
        ]]
      }
    });
    console.log(`✅ [Google Sheets Sync] Successfully appended lead ${leadData.name} to sheet!`);
  } catch (error) {
    console.error('❌ [Google Sheets Sync Error]:', error.message);
  }
};