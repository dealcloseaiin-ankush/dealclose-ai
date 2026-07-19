const mongoose = require('mongoose');

const flowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  platform: { type: String, enum: ['whatsapp', 'instagram'], default: 'whatsapp' }, // 🚀 NEW: Platform field
  workspaceId: { type: String, default: 'main' },
  name: { type: String, required: true },
  flowData: { type: Object, required: true }, // Contains nodes and edges from ReactFlow
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Allow the same flow name across different workspaces/platforms, but prevent duplicates in the same scope.
flowSchema.index({ userId: 1, platform: 1, workspaceId: 1, name: 1 }, { unique: true });
flowSchema.index({ userId: 1, platform: 1, workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model('Flow', flowSchema);