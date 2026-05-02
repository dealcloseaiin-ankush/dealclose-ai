const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Get all contacts
router.get('/', contactController.getContacts);

// Add a new contact
router.post('/', contactController.addContact);

module.exports = router;