const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: { type: String, required: true },
  customerPhone: { type: String },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' },
  deliveryMethod: { type: String, enum: ['Courier', 'Transport', 'Local Delivery', 'Pending'], default: 'Pending' },
  trackingLink: { type: String },
  shippingAddress: { type: String },
  pincode: { type: String },
  builtyNo: { type: String },
  shippingNotes: { type: String },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);