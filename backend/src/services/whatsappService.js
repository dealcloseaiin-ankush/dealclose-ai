const axios = require('axios');

exports.sendTextMessage = async (accessToken, phoneNumberId, to, text) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Meta API Text Error:', error.response?.data || error.message);
    throw error;
  }
};

exports.sendTemplateMessage = async (accessToken, phoneNumberId, to, templateName, language, components) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: components || []
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Meta API Template Error:', error.response?.data || error.message);
    throw error;
  }
};

exports.sendMediaMessage = async (accessToken, phoneNumberId, to, mediaId, caption = "") => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: { 
          id: mediaId,
          caption: caption
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Meta API Media Error:', error.response?.data || error.message);
    throw error;
  }
};

exports.downloadMedia = async (accessToken, mediaId) => {
  try {
    // 1. Get media URL from Meta Graph API
    const urlResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const mediaUrl = urlResponse.data.url;
    const mimeType = urlResponse.data.mime_type;

    // 2. Download the actual binary media buffer
    const mediaResponse = await axios.get(mediaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer' // Get as raw data
    });

    return { buffer: Buffer.from(mediaResponse.data), mimeType };
  } catch (error) {
    console.error('Meta API Media Download Error:', error.response?.data || error.message);
    throw error;
  }
};

exports.sendInteractiveMessage = async (accessToken, phoneNumberId, to, interactiveObj) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: interactiveObj
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Meta API Interactive Error:', error.response?.data || error.message);
    throw error;
  }
};