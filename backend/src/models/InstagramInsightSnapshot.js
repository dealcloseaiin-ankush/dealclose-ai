const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  workspaceId: { type: String, default: 'main', index: true },
  date: { type: Date, required: true },
  followerCount: { type: Number, default: 0 },
  reach: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  profileViews: { type: Number, default: 0 },
  websiteClicks: { type: Number, default: 0 },
  accountsEngaged: { type: Number, default: 0 },
}, { timestamps: true });

schema.index({ userId: 1, workspaceId: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('InstagramInsightSnapshot', schema);
