const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  flowData: { type: Object, required: true }, // Contains nodes and edges from ReactFlow
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure one main flow per user for now
flowSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Flow', flowSchema);