const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const whatsappService = require('../services/whatsappService');

// In-memory store for OTPs (For production, use Redis)
const otpStore = new Map();

// @desc    Send OTP to WhatsApp number
// @route   POST /api/auth/whatsapp/send-otp
exports.sendWhatsAppOtp = async (req, res) => {
  const { phoneNumber } = req.body; // e.g. 919876543210

  if (!phoneNumber) return res.status(400).json({ message: "Phone number is required." });

  // Generate 4 digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Save OTP with 5 mins expiration
  otpStore.set(phoneNumber, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

  try {
    // Send OTP via System's Default Meta Account (Requires a template named 'auth_otp')
    await whatsappService.sendTemplateMessage(
      process.env.SYSTEM_META_TOKEN,
      process.env.SYSTEM_PHONE_ID,
      phoneNumber,
      "auth_otp",
      "en_US",
      [{ type: "body", parameters: [{ type: "text", text: otp }] }]
    );
    
    res.status(200).json({ success: true, message: "OTP sent to WhatsApp" });
  } catch (error) {
    console.error("WhatsApp OTP Error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// @desc    Verify OTP and Login
// @route   POST /api/auth/whatsapp/verify-otp
exports.verifyWhatsAppOtp = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  const record = otpStore.get(phoneNumber);
  if (!record || record.expiresAt < Date.now() || record.otp !== otp) {
    return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
  }

  // Clear OTP
  otpStore.delete(phoneNumber);

  // Find or Create User by Phone Number
  let user = await User.findOne({ phoneNumber });
  if (!user) {
    user = await User.create({ phoneNumber, role: 'owner', fullName: 'New User' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  res.status(200).json({ success: true, token, user });
};