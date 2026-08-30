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

/**
 * Send an approved Meta WhatsApp Template to a customer with dynamic parameters.
 */
exports.sendTemplateMessage = async (phoneNumberId, accessToken, toPhone, templateName, languageCode = 'en_US', parameters = [], headerMediaUrl = null) => {
  try {
    const components = [];

    if (headerMediaUrl) {
      components.push({
        type: 'header',
        parameters: [{ type: 'image', image: { link: headerMediaUrl } }]
      });
    }

    if (parameters && parameters.length > 0) {
      components.push({
        type: 'body',
        parameters: parameters.map(val => ({ type: 'text', text: String(val) }))
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: toPhone.replace(/[^0-9]/g, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components.length > 0 ? components : undefined
      }
    };

    const response = await axios.post(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Meta API Error (Send Template):', error.response ? error.response.data : error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to send template message via Meta');
  }
};

/**
 * Pre-built Industry-Specific High Converting Template Library (Auto-Learned & Reusable)
 */
exports.INDUSTRY_TEMPLATES = {
  real_estate: [
    {
      name: 'realestate_site_visit_invite',
      category: 'MARKETING',
      language: 'hi',
      header: '🏡 LUXURY PROJECT SITE VISIT',
      text: 'Namaste {{1}}! {{2}} me aapka dream luxury home ready hai. Sunday 11 AM site visit par exclusive pre-launch pricing milegi. Kya main location pass bhej doon?',
      variables: ['Customer Name', 'Project / Business Name'],
      buttons: ['📍 Send Location Pin', '💬 Talk to Property Advisor']
    },
    {
      name: 'realestate_brochure_ratecard',
      category: 'MARKETING',
      language: 'en_US',
      header: '📄 EXCLUSIVE FLOOR PLANS & PRICING',
      text: 'Hello {{1}}, here is the complete rate card & layout for {{2}}. Prices starting at {{3}}. Reply "VISIT" to schedule an inspection.',
      variables: ['Customer Name', 'Project Name', 'Starting Price'],
      buttons: ['📥 Download Brochure', '📞 Schedule Site Visit']
    }
  ],
  retail_fashion: [
    {
      name: 'fashion_festive_offer_v1',
      category: 'MARKETING',
      language: 'hi',
      header: '🎉 FESTIVE MEGA SALE IS LIVE',
      text: 'Namaste {{1}}! {{2}} par exclusive Flat {{3}}% OFF offer chalu hai. Stock limited hai, abhi apna pasandida collection book karein.',
      variables: ['Customer Name', 'Brand Name', 'Discount %'],
      buttons: ['🛍️ View Festive Catalog', '💬 Chat to Order']
    }
  ],
  gym_fitness: [
    {
      name: 'gym_membership_trial_pass',
      category: 'MARKETING',
      language: 'en_US',
      header: '💪 3-DAY VIP GYM PASS',
      text: 'Hey {{1}}! Ready to transform? {{2}} is offering you a FREE 3-Day VIP Workout Pass. Valid this week only.',
      variables: ['Customer Name', 'Gym Name'],
      buttons: ['🎟️ Claim VIP Pass', '📞 Book Trainer Session']
    }
  ],
  restaurant_cafe: [
    {
      name: 'cafe_weekend_dining_deal',
      category: 'MARKETING',
      language: 'hi',
      header: '🍕 WEEKEND TREAT AT YOUR FAVORITE CAFE',
      text: 'Namaste {{1}}! Iss weekend {{2}} me dining par Flat {{3}}% OFF ka voucher aapke liye reserve hai.',
      variables: ['Customer Name', 'Cafe Name', 'Discount %'],
      buttons: ['🍽️ Reserve Table', '📖 View Special Menu']
    }
  ]
};