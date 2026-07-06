const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const whatsappOtpController = require('../controllers/whatsappOtpController');
const { protect } = require('../middleware/authMiddleware');

// Standard Email/Password Auth
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', protect, authController.changePassword);
router.post('/supabase-auth', authController.supabaseAuth); // Google Login ke liye

router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);

// WhatsApp OTP Auth
router.post('/whatsapp/send-otp', whatsappOtpController.sendWhatsAppOtp);
router.post('/whatsapp/verify-otp', whatsappOtpController.verifyWhatsAppOtp);

module.exports = router;