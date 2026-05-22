const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: 'Unknown' },
  phone: { type: String, required: true },
  email: { type: String },
  tags: [{ type: String }],
  optedIn: { type: Boolean, default: true },
  lastInteraction: { type: Date, default: Date.now },
  
  // --- CRM Pipeline Fields ---
  crmStage: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'negotiating', 'converted', 'lost'],
    default: 'new'
  },
  crmStageHistory: [{
    from: String,
    to: String,
    changedBy: { type: String, default: 'system' }, // 'ai' or Agent Name
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
  dealValue: { type: Number, default: 0 },
  followUpDate: { type: Date },
  assignedAgent: { type: String },
  
  // --- Scoring ---
  aiScore: { type: Number, default: 0 }, // 0-100, updated by AI bot
  humanScore: { type: Number, default: 0 }, // manually set by agent
  
  // --- External CRM Sync (Zoho/HubSpot) ---
  zohoId: { type: String },
  hubspotId: { type: String },
  externalCrmId: { type: String },
  lastSyncedAt: { type: Date },
  
  // --- Custom Fields (Flexible Data from Excel/Forms) ---
  customFields: {
    type: Map,
    of: String
  }
  
}, { timestamps: true });

contactSchema.index({ userId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Contact', contactSchema);