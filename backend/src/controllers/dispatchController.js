const User = require('../models/userModel');
const whatsappService = require('../services/whatsappService');

// @desc    Update order dispatch status & auto-notify customer via WhatsApp
// @route   POST /api/dispatch/update
exports.updateDispatchStatus = async (req, res) => {
  try {
    const { orderId, customerPhone, status, trackingLink } = req.body;
    const userId = req.user ? req.user._id : "60d0fe4f5311236168a109ca"; // Fallback for MVP
    const user = await User.findById(userId);

    if (!user || !user.whatsappConfig?.accessToken) {
      return res.status(400).json({ success: false, message: 'WhatsApp configuration is missing.' });
    }

    let message = `📦 *Order Update*\nHi! Your order #${orderId} status has been updated to: *${status}*.`;
    if (trackingLink) message += `\n\nTrack your order here: ${trackingLink}`;

    await whatsappService.sendTextMessage(
      user.whatsappConfig.accessToken,
      user.whatsappConfig.phoneNumberId,
      customerPhone,
      message
    );

    res.status(200).json({ success: true, message: 'Dispatch status updated and customer notified on WhatsApp.' });
  } catch (error) {
    console.error('Dispatch Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};