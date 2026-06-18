const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const leadSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'negotiating', 'not_interested', 'converted', 'lost', 'ignored'],
    default: 'new',
  },
  source: {
    type: String,
    default: 'manual',
  },
  notes: {
    type: String,
    default: '',
  },
  dealValue: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isAiPaused: {
    type: Boolean,
    default: false
  },
  aiPausedUntil: {
    type: Date,
    default: null
  },
  activeFlowState: {
    type: Object,
    default: null
  },
  lastSelectedWorkspaceId: {
    type: String,
    default: 'main'
  },
  // Custom fields can be stored in a flexible way
  customFields: {
    type: Map,
    of: String,
  },
  timeline: [{
    eventType: { type: String },
    description: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  expiresAt: {
    type: Date
  },
  // --- Retention & Cold Storage (For 120-Day Rule) ---
  isArchived: { type: Boolean, default: false }, // Hides from UI but stays in DB
  archivedAt: { type: Date },
  archiveUrl: { type: String }, // AWS S3 / Cloud Link if moved to cold storage

  // --- Call AI Tracking ---
  lastCallSummary: { type: String },
  lastCallActionTaken: { type: String },
  lastCallDate: { type: Date },
  callConfidenceStatus: { type: String, enum: ['High', 'Medium', 'Low'] }
});

// TTL Index: MongoDB will automatically delete the document when current time > expiresAt
leadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
