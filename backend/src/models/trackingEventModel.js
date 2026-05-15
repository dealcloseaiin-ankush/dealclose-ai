const mongoose = require('mongoose');

const trackingEventSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true },
  event: { type: String, required: true }, // e.g., 'page_view', 'add_to_cart'
  url: { type: String },
  visitorId: { type: String }, // Anonymous browser cookie ID
  metadata: { type: Object } // Holds extra details like cart items, amount etc.
}, { timestamps: true });

module.exports = mongoose.model('TrackingEvent', trackingEventSchema);