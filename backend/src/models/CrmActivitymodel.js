const mongoose = require('mongoose');

const crmActivitySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  contactId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Contact', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['stage_change', 'note', 'call', 'whatsapp', 'assignment', 'imported'], 
    required: true 
  },
  description: { type: String, required: true },
  performedBy: { type: String, default: 'system' }, // 'ai', 'system', or specific Agent Name
  metadata: { type: mongoose.Schema.Types.Mixed } // For extra data like 'fromStage', 'toStage', etc.
}, { timestamps: true });

module.exports = mongoose.model('CrmActivity', crmActivitySchema);