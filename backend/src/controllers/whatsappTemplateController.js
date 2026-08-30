const User = require('../models/userModel');
const metaTemplateService = require('../services/metaTemplateService');

// @desc    Get all templates from Meta for the logged-in user
// @route   GET /api/whatsapp/templates
exports.getTemplates = async (req, res) => {
    try {
        // Authenticated user ID
        const userId = req.user?._id || req.user?.id;
        
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized. Please login again.' });
        }

        const user = await User.findById(userId);

        if (!user || !user.whatsappConfig?.wabaId || !user.whatsappConfig?.accessToken) {
            // Instead of throwing an error, return an empty array to prevent frontend crashes
            return res.status(200).json([]);
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
        const userId = req.user?._id || req.user?.id; 
        
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized. Please login again.' });
        }

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

// @desc    Get Pre-Approved Industry Reusable Template Bank
// @route   GET /api/whatsapp/templates/industry
exports.getIndustryTemplates = async (req, res) => {
    try {
        const { industry = 'all' } = req.query;
        if (industry !== 'all' && metaTemplateService.INDUSTRY_TEMPLATES[industry]) {
            return res.json({ success: true, templates: metaTemplateService.INDUSTRY_TEMPLATES[industry] });
        }
        res.json({ success: true, templates: metaTemplateService.INDUSTRY_TEMPLATES });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching industry templates.' });
    }
};

// @desc    Send Approved Meta WhatsApp Template Broadcast to Filtered CRM Leads
// @route   POST /api/whatsapp/templates/broadcast
exports.sendTemplateBroadcast = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const { templateName, languageCode = 'en_US', targetFilter = 'all', customVariables = {}, workspaceId = 'main' } = req.body;

        const user = await User.findById(userId);
        if (!user || !user.whatsappConfig?.phoneNumberId || !user.whatsappConfig?.accessToken) {
            return res.status(400).json({ success: false, message: 'WhatsApp Meta Cloud API is not connected. Please connect from Settings.' });
        }

        const Lead = require('../models/leadModel');
        const Message = require('../models/messageModel');

        // 🎯 1. Target Filter Logic
        let leadQuery = { userId };
        if (workspaceId && workspaceId !== 'main') leadQuery.workspaceId = workspaceId;

        if (targetFilter === 'new') leadQuery.status = 'new';
        else if (targetFilter === 'interested' || targetFilter === 'warm') leadQuery.status = { $in: ['interested', 'contacted', 'warm'] };
        else if (targetFilter === 'hot') leadQuery.status = { $in: ['proposal_sent', 'hot', 'site_visit_scheduled'] };
        else if (targetFilter === 'converted') leadQuery.status = { $in: ['converted', 'won', 'closed'] };

        const targetLeads = await Lead.find(leadQuery).limit(500);

        if (!targetLeads || targetLeads.length === 0) {
            return res.status(404).json({ success: false, message: `No leads found matching filter "${targetFilter}".` });
        }

        let sentCount = 0;
        let failCount = 0;

        // 🎯 2. Dispatch Bulk Messages with Dynamic Variable Replacements
        for (const lead of targetLeads) {
            try {
                const customerName = lead.name ? lead.name.split(' (')[0] : 'Customer';
                const businessName = user.businessName || 'DealClose AI';

                // Map variables in order: {{1}} = Name, {{2}} = Business, {{3}} = Price / Custom
                const params = [
                    customerName,
                    businessName,
                    customVariables.price || customVariables.discount || 'Special Offer'
                ];

                await metaTemplateService.sendTemplateMessage(
                    user.whatsappConfig.phoneNumberId,
                    user.whatsappConfig.accessToken,
                    lead.phoneNumber,
                    templateName,
                    languageCode,
                    params
                );

                sentCount++;

                // Record outgoing message in chat history
                await Message.create({
                    userId,
                    workspaceId,
                    customerPhone: lead.phoneNumber,
                    channel: 'whatsapp',
                    messageText: `[Broadcast Template: ${templateName}] -> Sent to ${customerName}`,
                    direction: 'outgoing',
                    status: 'sent',
                    sentBy: 'broadcast'
                });

                // Update lead timeline
                await Lead.updateOne(
                    { _id: lead._id },
                    { $push: { timeline: { eventType: 'Template Broadcast Sent', description: `Received Meta Template: ${templateName}`, timestamp: new Date() } } }
                );
            } catch (err) {
                failCount++;
                console.warn(`[Broadcast Failed for ${lead.phoneNumber}]:`, err.message);
            }
        }

        res.json({
            success: true,
            message: `Broadcast completed! Sent to ${sentCount} leads (${failCount} failed).`,
            stats: { target: targetLeads.length, sent: sentCount, failed: failCount }
        });
    } catch (error) {
        console.error('Broadcast Execution Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};