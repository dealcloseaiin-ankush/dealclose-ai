const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const socialPostSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  workspaceId: {
    type: String, // Can be 'main' or a workspace ObjectId
    required: true,
  },
  caption: {
    type: String,
    required: true,
  },
  mediaUrls: [{
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true },
  }],
  platforms: [{
    type: String,
    enum: ['instagram', 'facebook', 'threads', 'linkedin', 'twitter'],
    required: true,
  }],
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'queued', 'publishing', 'published', 'failed'],
    default: 'draft',
  },
  scheduledAt: {
    type: Date, // For 'scheduled' and 'queued' posts
  },
  publishedAt: {
    type: Date, // When the post went live
  },
  // To store the post IDs from each platform after publishing
  platformPostIds: {
    instagram: String,
    facebook: String,
    // ... other platforms
  },
  analytics: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    profileVisits: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 }, // Sum of likes, comments, shares, saves
  },
  failureReason: {
    type: String,
  },
}, { timestamps: true });

const SocialPost = mongoose.model('SocialPost', socialPostSchema);
module.exports = SocialPost;