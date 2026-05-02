const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');

// Update order and notify
router.post('/update', dispatchController.updateDispatchStatus);

module.exports = router;