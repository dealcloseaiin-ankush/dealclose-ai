// backend/src/models/generatedPostModel.js
const mongoose = require('mongoose');

const generatedPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId: { type: String, default: 'main' },
  caption: { type: String, required: true },
  imageUrl: { type: String }, // AI se banayi hui image ka URL yahan aayega
  status: { 
    type: String, 
    enum: ['pending_approval', 'approved', 'posted', 'rejected', 'failed'], 
    default: 'pending_approval' 
  },
  postedAt: { type: Date },
  feedback: { type: String } // User ne reject kiya toh uska reason
}, { timestamps: true });

const GeneratedPost = mongoose.model('GeneratedPost', generatedPostSchema);
module.exports = GeneratedPost;
