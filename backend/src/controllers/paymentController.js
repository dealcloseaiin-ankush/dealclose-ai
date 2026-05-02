const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/userModel');
const notificationService = require('../services/notificationService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id_to_prevent_crash',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret_to_prevent_crash',
});

// @desc Create Order for Wallet Recharge
exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body; // Amount in INR
    
    const options = {
      amount: amount * 100, // Razorpay takes amount in paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Payment Gateway Error" });
  }
};

// @desc Verify Payment and Add Money to Wallet
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, amount } = req.body;

    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                               .update(text.toString())
                               .digest("hex");

    if (razorpay_signature === expectedSign) {
      // Update Wallet Balance
      const updatedUser = await User.findByIdAndUpdate(userId, { $inc: { walletBalance: amount } }, { new: true });
      
      if (updatedUser) {
        await notificationService.sendAlert(updatedUser, "Wallet Recharged", `Success! ₹${amount} added to your DealClose AI Wallet. New Balance: ₹${updatedUser.walletBalance}`);
      }
      
      return res.status(200).json({ success: true, message: "Wallet Recharge Successful!" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid Signature!" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};