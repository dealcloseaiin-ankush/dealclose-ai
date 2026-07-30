const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const whatsappOtpController = require('../controllers/whatsappOtpController');
const { protect } = require('../middleware/authMiddleware');
const createRateLimiter = require('../middleware/rateLimiter');

// Rate limiters for sensitive authentication routes
const registerLimiter = createRateLimiter(10, 15, 'Too many registration attempts from this IP, please try again after 15 minutes.');
const loginLimiter = createRateLimiter(10, 15, 'Too many login attempts from this IP, please try again after 15 minutes.');
const changePasswordLimiter = createRateLimiter(10, 15, 'Too many password change requests from this IP, please try again after 15 minutes.');
const sendOtpLimiter = createRateLimiter(5, 15, 'Too many OTP requests from this IP, please try again after 15 minutes.');
const verifyOtpLimiter = createRateLimiter(10, 15, 'Too many OTP verification attempts from this IP, please try again after 15 minutes.');

// Standard Email/Password Auth
router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/change-password', protect, changePasswordLimiter, authController.changePassword);
router.post('/supabase-auth', authController.supabaseAuth); // Google Login ke liye

router.get('/profile', protect, authController.getProfile);
router.put('/profile', protect, authController.updateProfile);

// WhatsApp OTP Auth
router.post('/whatsapp/send-otp', sendOtpLimiter, whatsappOtpController.sendWhatsAppOtp);
router.post('/whatsapp/verify-otp', verifyOtpLimiter, whatsappOtpController.verifyWhatsAppOtp);

module.exports = router;