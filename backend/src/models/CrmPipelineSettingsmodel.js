const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#3b82f6' }, // Defaults to Tailwind blue-500
  order: { type: Number, required: true },
  isDefault: { type: Boolean, default: false }
});

const autoMoveRuleSchema = new mongoose.Schema({
  condition: { type: String, required: true }, // e.g., 'replied_to_whatsapp', 'no_reply_7_days'
  fromStage: { type: String },
  toStage: { type: String, required: true },
  enabled: { type: Boolean, default: true }
});

const crmPipelineSettingsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  stages: [stageSchema],
  defaultAssignee: { type: String },
  autoMoveRules: [autoMoveRuleSchema]
}, { timestamps: true });

module.exports = mongoose.model('CrmPipelineSettings', crmPipelineSettingsSchema);