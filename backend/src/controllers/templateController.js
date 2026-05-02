const User = require('../models/userModel');
const metaTemplateService = require('../services/metaTemplateService');

// @desc    Get all templates from Meta
// @route   GET /api/templates
exports.getTemplates = async (req, res) => {
    try {
        const userId = req.user ? req.user._id : "60d0fe4f5311236168a109ca";
        const user = await User.findById(userId);

        if (!user || !user.whatsappConfig?.wabaId || !user.whatsappConfig?.accessToken) {
            return res.status(400).json({ message: 'WhatsApp Business Account ID and Access Token are required.' });
        }

        const templates = await metaTemplateService.getTemplatesFromMeta(
            user.whatsappConfig.wabaId,
            user.whatsappConfig.accessToken
        );
        res.status(200).json(templates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching templates from Meta API.' });
    }
};

// @desc    Create a new template
// @route   POST /api/templates
exports.createTemplate = async (req, res) => {
    try {
        const { templateData } = req.body;
        const userId = req.user ? req.user._id : "60d0fe4f5311236168a109ca"; 
        const user = await User.findById(userId);

        const result = await metaTemplateService.submitTemplateToMeta(
            user.whatsappConfig.wabaId,
            user.whatsappConfig.accessToken,
            templateData
        );
        res.status(201).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting template.' });
    }
};