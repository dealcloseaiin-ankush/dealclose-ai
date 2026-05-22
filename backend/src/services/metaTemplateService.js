const axios = require('axios');

/**
 * Fetch all templates and their approval status directly from Meta.
 */
exports.getTemplatesFromMeta = async (wabaId, accessToken) => {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v17.0/${wabaId}/message_templates`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data.data; // Returns array of templates
  } catch (error) {
    console.error('Meta API Error (Get Templates):', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch templates from Meta');
  }
};

/**
 * Submit a new template to Meta for approval.
 */
exports.submitTemplateToMeta = async (wabaId, accessToken, templateData) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${wabaId}/message_templates`,
      templateData,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Meta API Error (Submit Template):', error.response ? error.response.data : error.message);
    throw new Error('Failed to submit template to Meta');
  }
};