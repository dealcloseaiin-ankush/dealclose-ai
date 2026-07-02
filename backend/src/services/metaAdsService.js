const axios = require('axios');
const crypto = require('crypto');

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

// 2. 🚀 FIXED: Send Private DM Reply safely via Recipient Comment ID Token Link
exports.sendInstagramCommentPrivateReply = async (accessToken, pageId, commentId, messageText) => {
  if (!accessToken) {
    throw new Error("[PRIVATE_REPLY] Missing access token");
  }
  if (!pageId) {
    throw new Error("[PRIVATE_REPLY] Missing Facebook Page ID");
  }
  if (!commentId) {
    throw new Error("[PRIVATE_REPLY] Missing comment ID");
  }

  const url = `https://graph.facebook.com/v19.0/${pageId}/messages`;
  console.log("\n[PRIVATE REPLY REQUEST] URL:", url);
  console.log("[PRIVATE REPLY REQUEST] token snippet:", `${accessToken.slice(0, 12)}...${accessToken.slice(-12)}`);
  console.log("[PRIVATE REPLY REQUEST] payload:", {
    recipient: { comment_id: commentId },
    message: { text: messageText },
    messaging_type: "RESPONSE"
  });

  try {
    const response = await axios.post(
      url,
      {
        recipient: { comment_id: commentId },
        message: { text: messageText },
        messaging_type: "RESPONSE"
      },
      {
        params: { access_token: accessToken }
      }
    );
    console.log("[PRIVATE REPLY SUCCESS] response:", response.data);
    return response.data;
  } catch (error) {
    const metaErr = error.response?.data?.error;
    console.error("[PRIVATE REPLY ERROR] request failed", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      pageId,
      commentId,
      tokenSnippet: accessToken ? `${accessToken.slice(0, 12)}...${accessToken.slice(-12)}` : null
    });
    if (metaErr) {
      console.error("[PRIVATE REPLY ERROR] meta error details", {
        type: metaErr.type,
        code: metaErr.code,
        subcode: metaErr.error_subcode,
        message: metaErr.message,
        fbtrace_id: metaErr.fbtrace_id
      });
    }
    throw error;
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