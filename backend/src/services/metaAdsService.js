const axios = require('axios');
const crypto = require('crypto');

// Meta requires user data to be hashed in SHA256 before sending
const hashData = (str) => {
  if (!str) return null;
  return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
};

// 1. Send Instagram Direct Message (DM)
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

// 2. Send Private DM Reply to an Instagram Comment
exports.sendInstagramCommentPrivateReply = async (accessToken, commentId, messageText) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${commentId}/private_replies`,
      {
        message: messageText
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Meta Graph API Comment Reply Error:", error.response?.data || error.message);
    throw error;
  }
};

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