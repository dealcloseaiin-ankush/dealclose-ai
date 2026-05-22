const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

// Razorpay Wallet Routes
router.post('/create-order', walletController.createRazorpayOrder);
router.post('/verify-payment', walletController.verifyRazorpayPayment);

module.exports = router;