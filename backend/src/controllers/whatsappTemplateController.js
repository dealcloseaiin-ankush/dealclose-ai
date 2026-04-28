const User = require('../models/userModel');
const metaTemplateService = require('../services/metaTemplateService');

// @desc    Get all templates from Meta for the logged-in user
// @route   GET /api/whatsapp/templates
exports.getTemplates = async (req, res) => {
    try {
        // Placeholder for auth. Later, this will be req.user.id from a JWT token.
        const userId = "60d0fe4f5311236168a109ca"; 
        const user = await User.findById(userId);

        if (!user || !user.whatsappConfig?.wabaId || !user.whatsappConfig?.accessToken) {
            return res.status(400).json({ message: 'WhatsApp Business Account ID (WABA ID) and Access Token are required in your profile.' });
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

// @desc    Submit a new template to Meta for approval
// @route   POST /api/whatsapp/templates
exports.createTemplate = async (req, res) => {
    try {
        const { templateData } = req.body; // e.g., { name: 'new_offer', components: [...], ... }
        const userId = "60d0fe4f5311236168a109ca"; // Placeholder for auth
        const user = await User.findById(userId);

        if (!user || !user.whatsappConfig?.wabaId || !user.whatsappConfig?.accessToken) {
            return res.status(400).json({ message: 'WhatsApp Business Account ID (WABA ID) and Access Token are required.' });
        }

        const result = await metaTemplateService.submitTemplateToMeta(
            user.whatsappConfig.wabaId,
            user.whatsappConfig.accessToken,
            templateData
        );

        res.status(201).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error submitting template to Meta API.' });
    }
};