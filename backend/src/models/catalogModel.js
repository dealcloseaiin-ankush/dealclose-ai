const mongoose = require('mongoose');

const catalogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId: { type: String, default: 'main' },
  name: { type: String, required: true },
  price: { type: String, required: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  images: [{ type: String }],
  inStock: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Catalog', catalogSchema);