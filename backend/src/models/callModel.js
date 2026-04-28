const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const callSchema = new Schema({
  sid: {
    type: String,
    required: true,
    unique: true
  },
  to: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'queued'
  },
  leadId: {
    type: Schema.Types.ObjectId,
    ref: 'Lead'
  },
  duration: {
    type: Number,
    default: 0
  },
  cost: {
    type: Number,
    default: 0.0
  },
  result: {
    type: String, // e.g., 'interested', 'not_interested', 'voicemail'
    default: 'pending'
  },
  transcript: [{
    speaker: { type: String, enum: ['user', 'ai'] },
    text: { type: String }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Call', callSchema);