const express = require('express');
const router = express.Router();
const { uploadTemplate, getTemplates } = require('../controllers/templateController');
const { protect, admin } = require('../middleware/authMiddleware'); // Assuming you have an 'admin' middleware
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', protect, upload.single('template'), uploadTemplate); // Add 'admin' middleware here later
router.get('/', protect, getTemplates);

module.exports = router;