const express = require('express');
const router = express.Router();
const { getForms, createForm, submitForm } = require('../controllers/formController');
const { protect } = require('../middleware/authMiddleware');

// 🚀 FIX: Added 'protect' middleware to secure the routes
router.route('/')
  .get(protect, getForms)
  .post(protect, createForm);

router.post('/:formId/submit', submitForm);

module.exports = router;
