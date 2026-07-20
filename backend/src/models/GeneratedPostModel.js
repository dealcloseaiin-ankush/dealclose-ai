// backend/src/models/generatedPostModel.js
const mongoose = require('mongoose');

const generatedPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId: { type: String, default: 'main' },
  // 🚀 UPGRADE: Support for single post and carousel posts
  caption: { type: String, required: true }, // Main caption for the whole post
  media: [{
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    url: { type: String, required: true }, // Cloudinary URL
    textOverlay: { type: String } // Text to be shown on the image (for carousels)
  }],
  status: { 
    type: String, 
    enum: ['pending_approval', 'posted', 'rejected', 'failed'], 
    default: 'pending_approval' 
  },
  postedAt: { type: Date },
  feedback: { type: String } // User ne reject kiya toh uska reason
}, { timestamps: true });

const GeneratedPost = mongoose.model('GeneratedPost', generatedPostSchema);
module.exports = GeneratedPost;
