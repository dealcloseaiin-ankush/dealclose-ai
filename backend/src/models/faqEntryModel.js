const mongoose = require('mongoose');

const faqEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  source: { type: String, default: 'manual' }, // manual or auto-learned
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('FaqEntry', faqEntrySchema);