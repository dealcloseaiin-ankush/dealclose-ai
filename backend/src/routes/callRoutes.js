const express = require('express');
const router = express.Router();
const { getCalls, initiateCall } = require('../controllers/callController');

router.get('/', getCalls);
router.post('/dial', initiateCall);

module.exports = router;
