const mongoose = require('mongoose');

const aiUsageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  internalCost: { type: Number, default: 0 }, // Your internal cost in USD
  userCost: { type: Number, default: 0 },     // Cost charged to the user in USD
}, {
  timestamps: true,
});

const AiUsageLog = mongoose.models.AiUsageLog || mongoose.model('AiUsageLog', aiUsageLogSchema);

module.exports = AiUsageLog;