const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema({
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
    required: true,
  },
  platforms: {
    type: [String], // e.g., ['instagram', 'facebook']
    required: true,
  },
  mediaUrls: [{
    type: { type: String, enum: ['image', 'video'] },
    url: { type: String },
  }],
  status: {
    type: String,
    enum: ['draft', 'publishing', 'scheduled', 'published', 'failed'],
    default: 'draft',
  },
  scheduledAt: {
    type: Date,
  },
  publishedAt: {
    type: Date,
  },
  platformPostIds: {
    instagram: { type: String },
    facebook: { type: String },
  },
  failureReason: {
    type: String,
  },
}, {
  timestamps: true,
});

const SocialPost = mongoose.model('SocialPost', socialPostSchema);
module.exports = SocialPost;