const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'video'], required: true },
  url: { type: String, required: true },
  // ✅ NEW FIELD — add this
  refreshedAt: { type: Date, default: Date.now },
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
  legacySocialPostId: { type: mongoose.Schema.Types.ObjectId, index: true },
  // ✅ NEW: Soft delete flag to prevent re-importing of deleted posts
  isDeleted: { type: Boolean, default: false, index: true },
  analytics: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
  },
}, { timestamps: true });

// ✅ HIGH PERFORMANCE COMPOUND INDEXES to prevent MongoDB Sort 32MB Memory Limit Exceeded errors
postSchema.index({ userId: 1, isDeleted: 1, workspaceId: 1, status: 1, publishedAt: -1 });
postSchema.index({ userId: 1, isDeleted: 1, publishedAt: -1, createdAt: -1 });
postSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ userId: 1, _id: -1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
