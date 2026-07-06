const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/userModel');
const notificationService = require('../services/notificationService');
const Message = require('../models/messageModel'); // Data restore ke liye
const Lead = require('../models/leadModel'); // Data restore ke liye

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, amount, isPremiumUpgrade } = req.body;

    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                               .update(text.toString())
                               .digest("hex");

    if (razorpay_signature === expectedSign) {
      const updatePayload = { $inc: { walletBalance: amount } };
      if (isPremiumUpgrade) {
        updatePayload.$set = { isPremium: true };
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updatePayload, { new: true });
      
      if (updatedUser) {
        if (isPremiumUpgrade) {
          await notificationService.sendAlert(updatedUser, "🎉 Welcome to Premium!", `Your account has been upgraded to Premium! ₹${amount} added to your wallet. New Balance: ₹${updatedUser.walletBalance}`);
          
          // 🚀 NEW: Restore user's old soft-deleted data
          // Saare messages se expiry date hata do
          await Message.updateMany(
              { userId: userId, expiresAt: { $exists: true } },
              { $unset: { expiresAt: "" } }
          );
          // Saare leads se expiry date hata do
          await Lead.updateMany(
              { userId: userId, expiresAt: { $exists: true } },
              { $unset: { expiresAt: "" } }
          );

          console.log(`✅ [Premium Upgrade] Data restored for user ${userId}.`);

        } else {
          await notificationService.sendAlert(updatedUser, "Wallet Recharged", `Success! ₹${amount} added to your DealClose AI Wallet. New Balance: ₹${updatedUser.walletBalance}`);
        }
      }
      
      return res.status(200).json({ success: true, message: "Payment Successful!" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid Signature!" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};