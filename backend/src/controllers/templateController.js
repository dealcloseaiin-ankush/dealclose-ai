const Template = require('../models/templateModel');
const aiService = require('../services/aiService');

/**
 * @desc    Upload, analyze, and save a new template
 * @route   POST /api/templates/upload
 * @access  Admin
 */
exports.uploadTemplate = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No template file uploaded.' });
  }

  try {
    const designJson = JSON.parse(req.file.buffer.toString('utf8'));

    // AI Analysis to get category and tags
    const analysisPrompt = `Analyze the following design template JSON and determine its primary category and relevant tags.
    Categories can be: Real Estate, Restaurant, Fashion, Education, Festival, Health, Technology, etc.
    JSON: ${JSON.stringify(designJson, null, 2)}
    Respond in JSON format: { "category": "...", "tags": ["...", "..."] }`;

    const rawJsonResponse = await aiService.generateAIResponse(analysisPrompt, "You are a design analysis expert.", 'template-analyzer');
    const cleanedJson = rawJsonResponse.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(cleanedJson);

    const template = new Template({
      name: req.file.originalname.replace('.json', ''),
      designJson,
      category: analysis.category || 'General',
      tags: analysis.tags || [],
    });

    await template.save();
    res.status(201).json({ success: true, message: 'Template uploaded and analyzed successfully.', template });

  } catch (error) {
    console.error('Template upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during template processing.' });
  }
};

/**
 * @desc    Get all templates
 * @route   GET /api/templates
 * @access  Private
 */
exports.getTemplates = async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, templates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch templates.' });
  }
};