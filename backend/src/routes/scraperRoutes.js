// backend/src/routes/scraperRoutes.js
const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const { protect } = require('../middleware/authMiddleware'); // Optional: protect this route

router.post('/search', scraperController.searchBusinesses);

module.exports = router;