const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

const { protect } = require('../middleware/authMiddleware');

// Get AI Smart Segments
router.get('/segments', protect, contactController.getSegments);

// Get all contacts
router.get('/', protect, contactController.getContacts);

// Add a new contact
router.post('/', protect, contactController.addContact);

module.exports = router;