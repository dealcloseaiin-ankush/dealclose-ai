const mongoose = require('mongoose');

const postAnalysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId: { type: String, default: 'main' },
  postId: { type: String, required: true, index: true }, // Instagram Media ID
  analysisText: { type: String, required: true },
  metrics: {
    reach: Number,
    impressions: Number,
    likes: Number,
    comments: Number,
    saves: Number,
    video_views: Number,
  },
}, { timestamps: true });

const PostAnalysis = mongoose.model('PostAnalysis', postAnalysisSchema);
module.exports = PostAnalysis;