const mongoose = require('mongoose');

const draftPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  workspaceId: {
    type: String,
    default: 'main',
  },
  caption: {
    type: String,
    trim: true,
  },
  imageUrl: {
    type: String, // For the preview thumbnail
  },
  designJson: {
    type: Object, // Stores the full Fabric.js JSON
  },
  status: {
    type: String,
    default: 'draft',
  },
  // ✅ NEW: Fields to remember user's publishing choices
  platforms: {
    type: Object,
    default: { instagram: true, facebook: false },
  },
  publishMode: {
    type: String,
    default: 'now',
  },
  scheduleDate: {
    type: Date,
  },
}, { timestamps: true });

// ✅ Compound indexes for fast sorting and memory optimization
draftPostSchema.index({ userId: 1, workspaceId: 1, createdAt: -1 });
draftPostSchema.index({ userId: 1, createdAt: -1 });

const DraftPost = mongoose.model('DraftPost', draftPostSchema);
module.exports = DraftPost;