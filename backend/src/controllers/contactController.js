const Contact = require('../models/contactModel');

// @desc    Get all contacts
// @route   GET /api/contacts
exports.getContacts = async (req, res) => {
  try {
    // Temporarily using fallback ID for MVP. Will use req.user._id in production.
    const userId = req.user ? req.user._id : "60d0fe4f5311236168a109ca";
    const contacts = await Contact.find({ userId }).sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, count: contacts.length, data: contacts });
  } catch (error) {
    console.error('Get Contacts Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Add a new contact manually
// @route   POST /api/contacts
exports.addContact = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : "60d0fe4f5311236168a109ca";
    const { name, phone, tags } = req.body;

    const newContact = await Contact.create({
      userId,
      name: name || 'Unknown',
      phone,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    res.status(201).json({ success: true, data: newContact });
  } catch (error) {
    console.error('Add Contact Error:', error);
    res.status(500).json({ success: false, message: error.code === 11000 ? 'Contact already exists' : 'Server Error' });
  }
};