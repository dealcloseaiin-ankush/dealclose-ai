// c:\Users\Lenovo1\Desktop\ai-calling-agent\backend\src\routes\templateRoutes.js

const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { protect } = require('../middleware/authMiddleware');

// Secure routes with protect middleware and connect to real controller
router.use(protect);
router.route('/')
    .get(templateController.getTemplates)
    .post(templateController.createTemplate);

module.exports = router;
