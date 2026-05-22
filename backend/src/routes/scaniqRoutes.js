const express = require('express');
const router = express.Router();
const scaniqController = require('../controllers/scaniqController');

router.post('/search', scaniqController.searchAndCompare);
router.post('/screenshot', scaniqController.processScreenshot);
router.post('/url', scaniqController.processUrl);
router.get('/:scanId', scaniqController.getScanStatus);

module.exports = router;