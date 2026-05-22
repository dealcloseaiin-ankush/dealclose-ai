const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');
const { protect } = require('../middleware/authMiddleware'); // Standard JWT Auth

router.route('/').get(protect, catalogController.getCatalog).post(protect, catalogController.addCatalogItem);

module.exports = router;