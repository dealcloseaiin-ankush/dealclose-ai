const express = require('express');
const router = express.Router();
const { getTemplates, createTemplate } = require('../controllers/whatsappTemplateController');
// const authMiddleware = require('../middleware/authMiddleware');

// router.use(authMiddleware); // Uncomment this line after creating auth middleware
router.route('/')
    .get(getTemplates)
    .post(createTemplate);

module.exports = router;