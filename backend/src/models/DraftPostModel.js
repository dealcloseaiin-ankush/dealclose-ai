const mongoose = require('mongoose');

const DraftPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId: { type: String, default: 'main' },
  platform: { type: String, default: 'instagram' },
  caption: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  status: { type: String, default: 'draft' }, // draft, scheduled, posted
  // For future scheduling feature
  scheduledAt: { type: Date, default: null },
}, {
  timestamps: true,
});

// Indexing for faster queries
DraftPostSchema.index({ userId: 1, workspaceId: 1 });

const DraftPost = mongoose.model('DraftPost', DraftPostSchema);

module.exports = DraftPost;