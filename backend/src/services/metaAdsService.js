const axios = require('axios');
const crypto = require('crypto');
const Lead = require('../models/leadModel'); // 🚀 NEW: To fetch lead data

// Meta requires user data to be hashed in SHA256 before sending
const hashData = (str) => {
  if (!str) return null;
  return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
};

// 1. Send Instagram Direct Message (DM) via Profile ID
exports.sendInstagramDM = async (accessToken, recipientId, messageText) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/me/messages`,
      {
        recipient: { id: recipientId },
        message: { text: messageText }
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Meta Graph API DM Error:", error.response?.data || error.message);
    throw error;
  }
};

// 2. 🚀 FIXED: Send Private DM Reply safely via Direct IG User ID or Recipient Comment ID
exports.sendInstagramCommentPrivateReply = async (accessToken, pageId, commentId, messageText, loginType = 'facebook_business', igUserId = null) => {
  if (!accessToken) {
    throw new Error("[PRIVATE_REPLY] Missing access token");
  }

  const isNative = loginType === 'instagram_basic_display' || loginType === 'instagram_business_login';
  const url = isNative
    ? `https://graph.instagram.com/v21.0/me/messages`
    : (pageId ? `https://graph.facebook.com/v19.0/${pageId}/messages` : `https://graph.facebook.com/v19.0/me/messages`);

  console.log("\n[PRIVATE REPLY REQUEST] URL:", url, "loginType:", loginType, "igUserId:", igUserId, "commentId:", commentId);

  // Strategy 1: Direct DM to commenter's Instagram User ID
  if (igUserId) {
    try {
      console.log(`[PRIVATE REPLY] Strategy 1: Sending DM to IG User ID: ${igUserId}`);
      const directResponse = await axios.post(
        url,
        {
          recipient: { id: igUserId },
          message: { text: messageText }
        },
        {
          params: { access_token: accessToken },
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      console.log("✅ [PRIVATE REPLY SUCCESS - DIRECT USER ID]:", directResponse.data);
      return directResponse.data;
    } catch (directErr) {
      console.warn(`⚠️ [PRIVATE REPLY DIRECT ID]:`, directErr.response?.data?.error?.message || directErr.message);
    }
  }

  // Strategy 2: Reply via comment_id token link
  if (commentId) {
    console.log(`[PRIVATE REPLY] Strategy 2: Sending private reply to Comment ID: ${commentId}`);
    const commentResponse = await axios.post(
      url,
      {
        recipient: { comment_id: commentId },
        message: { text: messageText },
        messaging_type: "RESPONSE"
      },
      {
        params: { access_token: accessToken },
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    console.log("✅ [PRIVATE REPLY SUCCESS - COMMENT ID]:", commentResponse.data);
    return commentResponse.data;
  }
};

// 🌟 NEW ADDED: Fires a Public Reply directly on the post comment feed for visibility conversions
exports.sendInstagramPublicCommentReply = async (accessToken, commentId, messageText) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${commentId}/replies`,
      { message: messageText },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Meta Graph API Public Feed Comment Reply Error:", error.response?.data || error.message);
    return null;
  }
};

// 3. Fetch Instagram User Profile (Name, Username)
exports.getInstagramProfile = async (accessToken, igSid) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${igSid}?fields=name,username,profile_pic`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Meta Graph API Profile Fetch Error:", error.response?.data?.error?.message || error.message);
    return null;
  }
};

// 4. Send Conversion Event
exports.sendConversionEvent = async (pixelId, accessToken, phone, eventName = 'Purchase') => {
  try {
    if (!pixelId || !accessToken || !phone) return;

    const payload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "system_generated",
          user_data: {
            ph: [hashData(phone)]
          }
        }
      ]
    };

    const url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
    await axios.post(url, payload);
    console.log(`✅ [Meta Ads] Conversion event '${eventName}' successfully synced for lead: ${phone}`);
  } catch (error) {
    console.error(`❌ [Meta Ads] Conversion API Error:`, error.response?.data || error.message);
  }
};

// 6. 🚀 NEW: Get all Ad Accounts linked to a user's Meta token
exports.getAdAccounts = async (accessToken) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/me/adaccounts`,
      {
        params: {
          fields: 'name,account_id,balance,currency',
          access_token: accessToken,
        }
      }
    );
    return response.data.data;
  } catch (error) {
    console.error("❌ Meta Ad Accounts Fetch Error:", error.response?.data?.error || error.message);
    throw error;
  }
};

// 5. 🚀 NEW: Create a Custom Audience from WhatsApp Leads
exports.createCustomAudience = async (adAccountId, accessToken, audienceName, description, leadStatus) => {
  try {
    // 1. Fetch leads from your database based on status
    // leadStatus can be 'converted', 'hot', 'lost', etc.
    const leads = await Lead.find({ status: leadStatus }).select('phoneNumber email').lean();
    if (leads.length === 0) {
      throw new Error(`No leads found with status '${leadStatus}' to create an audience.`);
    }

    // 2. Prepare the data for hashing (phone numbers and emails)
    const usersData = leads.map(lead => {
      const phone = lead.phoneNumber ? lead.phoneNumber.replace(/\D/g, '') : null;
      // Assuming Indian numbers, add country code if missing
      const formattedPhone = phone && phone.length === 10 ? `91${phone}` : phone;
      return {
        // Meta recommends sending both email and phone for better matching
        email: lead.email ? hashData(lead.email) : null,
        phone: formattedPhone ? hashData(formattedPhone) : null,
      };
    }).filter(u => u.email || u.phone); // Filter out leads with no contact info

    const schema = ['EMAIL', 'PHONE'];
    const dataToUpload = usersData.map(u => [u.email, u.phone]);

    // 3. Create a new Custom Audience on Meta
    const createAudienceResponse = await axios.post(
      `https://graph.facebook.com/v19.0/${adAccountId}/customaudiences`,
      {
        name: audienceName,
        description: description,
        subtype: 'CUSTOM',
        customer_file_source: 'USER_PROVIDED_ONLY',
        access_token: accessToken,
      }
    );
    const audienceId = createAudienceResponse.data.id;

    // 4. Add the hashed user data to this new audience
    await axios.post(
      `https://graph.facebook.com/v19.0/${audienceId}/users`,
      { payload: { schema, data: dataToUpload }, access_token: accessToken }
    );

    return { success: true, audienceId, audienceName, userCount: dataToUpload.length };
  } catch (error) {
    console.error("❌ Meta Custom Audience Error:", error.response?.data?.error || error.message);
    throw error;
  }
};