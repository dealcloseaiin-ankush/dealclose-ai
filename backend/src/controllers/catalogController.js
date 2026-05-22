const Catalog = require('../models/catalogModel');

// @desc    Get all catalog items for a user
// @route   GET /api/catalog
exports.getCatalog = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const items = await Catalog.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    console.error('Get Catalog Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a new catalog item
// @route   POST /api/catalog
exports.addCatalogItem = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { name, price, description, imageUrl } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    const newItem = await Catalog.create({ userId, name, price, description, imageUrl });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Add Catalog Item Error:', error);
    res.status(500).json({ message: error.message });
  }
};