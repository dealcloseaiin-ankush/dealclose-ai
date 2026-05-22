const mongoose = require('mongoose');

const trackingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: String, required: true }, // e.g., 'page_view', 'add_to_cart'
  pageUrl: { type: String },
  visitorId: { type: String }, // Session or Cookie ID
  metadata: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('TrackingActivity', trackingSchema);