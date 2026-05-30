const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const whatsappOtpController = require('../controllers/whatsappOtpController');
const { protect } = require('../middleware/authMiddleware');

// Standard Email/Password Auth
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', protect, authController.changePassword);

// WhatsApp OTP Auth
router.post('/whatsapp/send-otp', whatsappOtpController.sendWhatsAppOtp);
router.post('/whatsapp/verify-otp', whatsappOtpController.verifyWhatsAppOtp);

module.exports = router;