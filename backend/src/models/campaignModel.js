const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prompt: { type: String, required: true },
  mode: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
  targeting: {
    country: String,
    state: String,
    city: String,
    ageMin: Number,
    ageMax: Number,
    gender: String,
    interests: String,
    retargetType: String
  },
  generatedAd: {
    headline: String,
    primaryText: String,
    audience: String,
    budget: String,
    imageIdea: String,
    aiExplanation: String,
    refinementQuestions: [String]
  },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' }
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);