const User = require('../models/userModel');
const whatsappService = require('../services/whatsappService');
// Assuming Order model is required to save tracking data
const Order = require('../models/orderModel'); 

// @desc    Update order dispatch status & auto-notify customer via WhatsApp
// @route   POST /api/dispatch/update
exports.updateDispatchStatus = async (req, res) => {
  try {
    const { orderId, customerPhone, status, trackingLink } = req.body;
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const user = await User.findById(userId);

    if (!user || !user.whatsappConfig?.accessToken) {
      return res.status(400).json({ success: false, message: 'WhatsApp configuration is missing.' });
    }

    // 🚀 NEW: Update the database with the new order status (MVP Upgrade)
    try {
      if (Order) {
        await Order.findOneAndUpdate(
          { orderId, userId },
          { $set: { status, trackingLink, lastUpdated: new Date() } },
          { upsert: true, new: true }
        );
      }
    } catch (dbErr) { console.error("Could not save to Order DB, but proceeding with WhatsApp:", dbErr.message); }

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