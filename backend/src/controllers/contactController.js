const Contact = require('../models/contactModel');

// @desc    Get all contacts
// @route   GET /api/contacts
exports.getContacts = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
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
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
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

// @desc    Get AI Smart Segments (Mock for UI)
// @route   GET /api/contacts/segments
exports.getSegments = async (req, res) => {
  try {
    // This resolves the 404 error and shows smart data in the Contacts UI
    const dummySegments = [
      { id: 1, name: "Hot Prospects", count: 12, reason: "Recent active negotiation / high intent" },
      { id: 2, name: "Needs Follow-up", count: 8, reason: "No response in 7 days" },
      { id: 3, name: "VIP Customers", count: 4, reason: "Repeated purchases" }
    ];
    res.status(200).json(dummySegments);
  } catch (error) {
    console.error('Segments Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};