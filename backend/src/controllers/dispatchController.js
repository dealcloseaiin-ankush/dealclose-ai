const User = require('../models/userModel');
const whatsappService = require('../services/whatsappService');
// Assuming Order model is required to save tracking data
const Order = require('../models/orderModel'); 

// @desc    Update order dispatch status & auto-notify customer via WhatsApp
// @route   POST /api/dispatch/update
exports.updateDispatchStatus = async (req, res) => {
  try {
    const { orderId, customerPhone, status, deliveryMethod, trackingLink, builtyNo, shippingNotes } = req.body;
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
          { orderId: orderId, userId },
          { $set: { status, deliveryMethod, trackingLink, builtyNo, shippingNotes, lastUpdated: new Date() } },
          { upsert: true, new: true }
        );
      }
    } catch (dbErr) { console.error("Could not save to Order DB, but proceeding with WhatsApp:", dbErr.message); }

    let message = `📦 *Order Update*\nHi! Your order #${orderId} status has been updated to: *${status}*.`;
    
    // Dynamic Message based on Delivery Method
    if (deliveryMethod === 'Courier' && trackingLink) {
      message += `\n\nTrack your order here: ${trackingLink}`;
    } else if (deliveryMethod === 'Transport' && builtyNo) {
      message += `\n\nYour order has been dispatched via Transport.\n*Builty/LR No:* ${builtyNo}\n${shippingNotes ? `*Notes:* ${shippingNotes}` : ''}`;
    } else if (deliveryMethod === 'Local Delivery' && shippingNotes) {
      message += `\n\n*Delivery Notes:* ${shippingNotes}`;
    } else if (trackingLink) {
      message += `\n\nTrack your order here: ${trackingLink}`;
    }

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

// 🚀 NEW: Webhook API for Shopify / Custom Websites
// @desc    Receive direct order from website (No Excel needed)
// @route   POST /api/dispatch/webhook/store
exports.handleStoreWebhook = async (req, res) => {
  try {
    // We assume the URL contains the User ID or it's passed in headers
    const { userId, orderId, customerPhone, customerName, totalAmount } = req.body;

    if (!userId || !orderId || !customerPhone) {
      return res.status(400).json({ success: false, message: 'Missing required order fields' });
    }

    // Save Order to DB
    await Order.create({
      userId,
      orderId,
      customerPhone,
      totalAmount,
      status: 'Confirmed'
    });

    // Find user to send WhatsApp Message
    const user = await User.findById(userId);
    if (user && user.whatsappConfig?.accessToken) {
      const msg = `🎉 *Order Confirmed!*\nHi ${customerName || ''}, we have received your order #${orderId} amounting to ₹${totalAmount || 0}.\nWe will notify you once it is dispatched!`;
      await whatsappService.sendTextMessage(user.whatsappConfig.accessToken, user.whatsappConfig.phoneNumberId, customerPhone, msg);
    }
    res.status(200).json({ success: true, message: 'Order Saved & Customer Notified' });
  } catch (error) {
    console.error('Store Webhook Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};