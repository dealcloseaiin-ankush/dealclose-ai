const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video'], required: true },
  url: { type: String, required: true },
});

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  workspaceId: {
    type: String,
    default: 'main',
    index: true,
  },
  caption: { type: String, trim: true },
  mediaUrls: [mediaSchema],
  platforms: [{ type: String, enum: ['instagram', 'facebook', 'threads'] }],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'publishing', 'published', 'failed'],
    default: 'draft',
    index: true,
  },
  scheduledAt: { type: Date },
  publishedAt: { type: Date },
  failureReason: { type: String },
  platformPostIds: {
    instagram: { type: String },
    facebook: { type: String },
  },
  designJson: { type: Object }, // For fabric.js designs
  isImported: { type: Boolean, default: false }, // To identify posts imported from Instagram
  analytics: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
  },
}, { timestamps: true });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;