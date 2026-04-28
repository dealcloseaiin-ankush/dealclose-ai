const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/userModel');

exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // Amount is in paise (₹1 = 100 paise)
      currency: "INR",
      receipt: "receipt_order_" + Date.now(),
    };

    const order = await instance.orders.create(options);
    if (!order) return res.status(500).json({ message: "Some error occurred with Razorpay" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amountToAdd, userId } = req.body;
    
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest("hex");

    if (razorpay_signature === expectedSign) {
      // Update wallet balance in DB
      if (userId) await User.findByIdAndUpdate(userId, { $inc: { walletBalance: amountToAdd } });
      return res.status(200).json({ message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ message: "Invalid signature sent!" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};