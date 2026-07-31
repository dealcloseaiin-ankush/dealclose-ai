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
    //  UPGRADE: Expanded the enum to include all possible CRM stages from the Kanban board
    // and system processes. This prevents validation errors when a lead's status is
    // updated to a stage like 'hot', 'warm', 'cold', or the soft-delete status 'deleted'.
    enum: [
      'new', 'contacted', 'interested', 'negotiating', 'not_interested',
      'converted', 'lost', 'ignored',
      // Kanban Stages
      'hot', 'warm', 'cold', 'existing', 'vip',
      // System & Filter Stages
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
  // --- Call AI Tracking ---
  lastCallSummary: { type: String },
  lastCallActionTaken: { type: String },
  lastCallDate: { type: Date },
  callConfidenceStatus: { type: String, enum: ['High', 'Medium', 'Low'] },

  // 🚀 UPGRADE: Soft-delete tombstone tracking (prevents zombie leads)
  // Jab user CRM se lead delete karega, to hum use permanent delete nahi karenge,
  // balki 'deleted' status set kar denge. Isse agar woh customer dobara message
  // karta hai, to system use pehchan lega aur naya "zombie lead" nahi banega.
  isArchived: { type: Boolean, default: false }, // Legacy, use status:'deleted'
  archivedAt: { type: Date },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: String, default: null },
  deletionBatchId: { type: String, default: null, index: true },
  restoredAt: { type: Date, default: null },
  restoredFrom: { type: String, default: null },
  restoreCount: { type: Number, default: 0 },
  // 🚀 NEW: Separate timeline for better auditing and performance.
  timeline: [{
    eventType: { type: String },
    description: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
});

// --- Indexes for Performance ---
leadSchema.index({ userId: 1, phoneNumber: 1 });

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;