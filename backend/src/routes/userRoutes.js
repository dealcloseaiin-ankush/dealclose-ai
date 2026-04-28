const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/userController');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

router.post('/register', registerUser);
router.post('/login', loginUser);

// Wallet & Billing Routes
router.post('/wallet/create-order', createOrder);
router.post('/wallet/verify', verifyPayment);

module.exports = router;