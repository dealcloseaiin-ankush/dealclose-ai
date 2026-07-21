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

const DraftPost = mongoose.model('DraftPost', draftPostSchema);
module.exports = DraftPost;