const mongoose = require('mongoose');

const aiUsageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  feature: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  provider: { type: String, required: true, enum: ['gemini', 'openai'] },
  model: { type: String, required: true },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, required: true, default: 0 },
  isEstimated: { type: Boolean, default: false },
  internalCost: { type: Number, default: 0 },    // Internal API cost in INR
  userCost: { type: Number, default: 0 },        // Cost billed to user in INR (10x markup)
  internalCostUsd: { type: Number, default: 0 }, // API cost in USD
  userCostUsd: { type: Number, default: 0 },     // Billed cost in USD
  chargedTo: { 
    type: String, 
    enum: ['free_quota', 'wallet', 'billable', 'unassigned'], 
    default: 'billable' 
  },
}, {
  timestamps: true,
});

aiUsageLogSchema.index({ userId: 1, createdAt: -1 });

const AiUsageLog = mongoose.models.AiUsageLog || mongoose.model('AiUsageLog', aiUsageLogSchema);

module.exports = AiUsageLog;