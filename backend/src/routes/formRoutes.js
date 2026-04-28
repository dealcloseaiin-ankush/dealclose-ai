const express = require('express');
const router = express.Router();
const { getForms, createForm, submitForm } = require('../controllers/formController');

router.route('/')
  .get(getForms)
  .post(createForm);

router.post('/:formId/submit', submitForm);

module.exports = router;
