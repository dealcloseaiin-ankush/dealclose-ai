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
    // 🐛 FIX: Pehle sirf 8 values thi, jinme Kanban columns 'hot', 'warm',
    // 'cold', 'existing', 'vip' missing the. Isse jab bhi lead in columns
    // mein drag hoti thi, .save() Mongoose ValidationError se crash ho
    // jaata tha (silent 500 error). 'deleted' bhi add kiya hai for soft-delete,
    // 'visitor'/'unqualified' bhi (pipeline already inhe filter karta hai).
    enum: [
      'new', 'contacted', 'interested', 'negotiating', 'not_interested',
      'converted', 'lost', 'ignored',
      'hot', 'warm', 'cold', 'existing', 'vip',
      'deleted', 'visitor', 'unqualified'
    ],
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
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archiveUrl: { type: String },

  // --- Call AI Tracking ---
  lastCallSummary: { type: String },
  lastCallActionTaken: { type: String },
  lastCallDate: { type: Date },
  callConfidenceStatus: { type: String, enum: ['High', 'Medium', 'Low'] },

  // 🆕 NEW: Soft-delete tombstone tracking (prevents zombie leads)
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null }
});

leadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;