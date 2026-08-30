const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');
const { protect } = require('../middleware/authMiddleware'); // Standard JWT Auth

router.route('/')
  .get(protect, catalogController.getCatalog)
  .post(protect, catalogController.addCatalogItem);

router.post('/remove-background', protect, catalogController.removeProductBackground);

router.route('/:id')
  .put(protect, catalogController.updateCatalogItem)
  .delete(protect, catalogController.deleteCatalogItem);

module.exports = router;