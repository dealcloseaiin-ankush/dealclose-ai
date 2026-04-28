const Template = require('../models/templateModel');

/**
 * Fetches all available ad templates.
 * @returns {Promise<Array>} A list of templates.
 */
exports.getTemplates = async () => {
  try {
    const templates = await Template.find();
    // If no templates in DB, return some mock data for development
    if (!templates || templates.length === 0) {
      return [
        { _id: 'mock1', name: 'Summer Sale Banner', category: 'E-commerce' },
        { _id: 'mock2', name: 'New Arrival Showcase', category: 'Fashion' },
      ];
    }
    return templates;
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw new Error('Could not fetch templates.');
  }
};

/**
 * Creates a new ad template.
 * @param {object} templateData - The data for the new template.
 * @returns {Promise<object>} The created template object.
 */
exports.createTemplate = async (templateData) => {
  const newTemplate = new Template(templateData);
  await newTemplate.save();
  return newTemplate;
};