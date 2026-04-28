const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mediaAssetSchema = new Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'avatar_video'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  style: {
    type: String, // e.g., 'realistic', '2d-anime', 'product-ad'
    default: 'general'
  },
  isPublic: {
    type: Boolean,
    default: true // General images/videos are public (reusable), personal avatars will be false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    // For MVP we won't strictly require this until full auth is wired, but good for tracking
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MediaAsset', mediaAssetSchema);