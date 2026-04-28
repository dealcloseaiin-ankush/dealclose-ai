const nodemailer = require('nodemailer');
const whatsappService = require('./whatsappService');

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.BREVO_SMTP_USER, // Your Brevo login email
    pass: process.env.BREVO_SMTP_KEY   // Master password from Brevo SMTP settings
  }
});

// @desc Send OTP via Both Email and WhatsApp
exports.sendOTP = async (user, otpCode) => {
  const message = `Your CloseDeal AI Login OTP is: ${otpCode}. Please do not share this with anyone.`;

  // 1. Send via Email
  if (user.email) {
    await transporter.sendMail({
      from: `"CloseDeal AI" <${process.env.BREVO_SMTP_USER}>`,
      to: user.email,
      subject: 'Security OTP - CloseDeal AI',
      text: message
    });
  }

  // 2. Send via WhatsApp
  if (user.phone && user.whatsappConfig?.accessToken) {
    await whatsappService.sendTextMessage(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId,
      user.phone,
      message
    );
  }
};

// @desc Send Alerts (like Low Balance or Welcome Email)
exports.sendAlert = async (user, subject, message) => {
  if (user.email) {
    await transporter.sendMail({ 
      from: `"CloseDeal Alerts" <${process.env.BREVO_SMTP_USER}>`, 
      to: user.email, 
      subject, 
      text: message 
    });
  }
  if (user.phone && user.whatsappConfig?.accessToken) {
    await whatsappService.sendTextMessage(
      user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, user.phone, `🔔 Alert: ${message}`
    );
  }
};