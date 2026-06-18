const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const callSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  workspaceId: { type: String, default: 'main' },
  sid: {
    type: String,
    required: true,
    unique: true
  },
  to: {
    type: String,
    required: true
  },
  from: { type: String },
  provider: { type: String },
  callType: { type: String, enum: ['web', 'twilio', 'bulk_ivr', 'exotel'], default: 'twilio' },
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
  callGoal: { type: String }, 
  summary: { type: String },
  actionTaken: { type: String },
  confidence: { type: String, enum: ['High', 'Medium', 'Low'] },
  recordingUrl: { type: String },
  transcript: [{
    speaker: { type: String },
    text: { type: String },
    time: { type: Date, default: Date.now }
  }],
  expiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Call', callSchema);