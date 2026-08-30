const express = require('express');
const router = express.Router();
const { getTemplates, createTemplate, getIndustryTemplates, sendTemplateBroadcast } = require('../controllers/whatsappTemplateController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure these routes so user._id is available
router.get('/industry', getIndustryTemplates);
router.post('/broadcast', sendTemplateBroadcast);

router.route('/')
    .get(getTemplates)
    .post(createTemplate);

module.exports = router;