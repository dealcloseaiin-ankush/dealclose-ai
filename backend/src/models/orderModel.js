const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: { type: String, required: true },
  customerPhone: { type: String },
  status: { type: String, default: 'Pending' },
  trackingLink: { type: String },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);