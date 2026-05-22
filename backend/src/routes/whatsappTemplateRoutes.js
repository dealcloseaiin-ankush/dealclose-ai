const express = require('express');
const router = express.Router();
const { getTemplates, createTemplate } = require('../controllers/whatsappTemplateController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secure these routes so user._id is available
router.route('/')
    .get(getTemplates)
    .post(createTemplate);

module.exports = router;