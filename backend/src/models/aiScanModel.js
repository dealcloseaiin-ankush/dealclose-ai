const mongoose = require('mongoose');

const aiScanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, enum: ['instagram', 'whatsapp', 'upload'], required: true },
  rawText: { type: String },
  extractedIntent: { type: String, enum: ['high', 'medium', 'low', 'spam'] },
  metadata: { type: mongoose.Schema.Types.Mixed }, // JSON dump of whatever AI found
}, { timestamps: true });

module.exports = mongoose.model('AiScan', aiScanSchema);