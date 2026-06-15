const express = require('express');
const router = express.Router();
const inboundController = require('../controllers/inboundWebhookController');

router.post('/:userId', inboundController.handleZapierPabbly);

module.exports = router;