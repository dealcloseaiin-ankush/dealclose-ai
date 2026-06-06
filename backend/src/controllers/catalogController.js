const Catalog = require('../models/catalogModel');

// @desc    Get all catalog items for a user
// @route   GET /api/catalog
exports.getCatalog = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { workspaceId } = req.query;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const query = { userId };
    if (workspaceId && workspaceId !== 'main' && workspaceId !== 'all') {
      query.workspaceId = workspaceId;
    } else if (workspaceId === 'main') {
      query.$or = [{ workspaceId: 'main' }, { workspaceId: { $exists: false } }, { workspaceId: null }];
    }

    const items = await Catalog.find(query).sort({ createdAt: -1 });
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

    const { name, price, description, imageUrl, workspaceId } = req.body;

    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    const newItem = await Catalog.create({ userId, name, price, description, imageUrl, workspaceId: workspaceId || 'main' });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Add Catalog Item Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a catalog item
// @route   PUT /api/catalog/:id
exports.updateCatalogItem = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { name, price, description, imageUrl } = req.body;
    
    const updatedItem = await Catalog.findOneAndUpdate(
      { _id: req.params.id, userId },
      { name, price, description, imageUrl },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: 'Catalog item not found' });
    }

    res.status(200).json(updatedItem);
  } catch (error) {
    console.error('Update Catalog Item Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a catalog item
// @route   DELETE /api/catalog/:id
exports.deleteCatalogItem = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const deletedItem = await Catalog.findOneAndDelete({ _id: req.params.id, userId });

    if (!deletedItem) {
      return res.status(404).json({ message: 'Catalog item not found' });
    }

    res.status(200).json({ message: 'Catalog item deleted successfully' });
  } catch (error) {
    console.error('Delete Catalog Item Error:', error);
    res.status(500).json({ message: error.message });
  }
};