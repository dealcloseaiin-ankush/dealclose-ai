const axios = require('axios');
const querystring = require('querystring');

/**
 * Initiates a phone call using Exotel.
 * @param {string} to The recipient's phone number.
 * @param {string} from Your Exotel phone number (Exophone).
 * @param {string} webhookUrl The URL Exotel will request to get call flow instructions.
 * @returns {Promise<object>} The Exotel call object.
 */
exports.initiateCall = async (to, from, webhookUrl) => {
  try {
    const exotelSid = process.env.EXOTEL_API_KEY;
    const exotelToken = process.env.EXOTEL_API_TOKEN;

    const data = querystring.stringify({
      From: to, // Customer's number
      To: from, // Your Exotel number
      CallerId: from, // Your Exotel number
      Url: webhookUrl, // Your webhook to control the call
      StatusCallback: `${process.env.BASE_URL}/api/webhooks/voice/status` // To get call status updates
    });

    const response = await axios.post(
      `https://api.exotel.com/v1/Accounts/${exotelSid}/Calls/connect.json`,
      data,
      {
        auth: {
          username: exotelSid,
          password: exotelToken,
        },
      }
    );

    return response.data.Call; // Exotel returns the call object inside a 'Call' key
  } catch (error) {
    console.error('Exotel Call Service Error:', error.response ? error.response.data : error.message);
    throw error;
  }
};
