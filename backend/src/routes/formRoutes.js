const express = require('express');
const router = express.Router();
const { getForms, createForm, submitForm, getFormSubmissions } = require('../controllers/formController');
const { protect } = require('../middleware/authMiddleware');

// 🚀 Protected routes for Form Creator
router.route('/')
  .get(protect, getForms)
  .post(protect, createForm);

router.get('/:formId/submissions', protect, getFormSubmissions);

// Public route for Customer Form Submission
router.post('/:formId/submit', submitForm);

module.exports = router;
