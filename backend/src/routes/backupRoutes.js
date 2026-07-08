const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { protect } = require('../middleware/authMiddleware'); // Assuming you have this

// @desc    Create a backup of user data to Google Drive
// @route   POST /api/backup/create
router.post('/create', protect, backupController.createBackup);

// @desc    List available backups from Google Drive
// @route   GET /api/backup/list
router.get('/list', protect, backupController.listBackups);

module.exports = router;