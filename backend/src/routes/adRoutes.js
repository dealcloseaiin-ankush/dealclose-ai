const express = require('express');
const router = express.Router();
const { createAd, getTemplates, generateFashionImage } = require('../controllers/adController');

router.post('/create', createAd);
router.post('/fashion-generate', generateFashionImage);
router.get('/templates', getTemplates);

module.exports = router;