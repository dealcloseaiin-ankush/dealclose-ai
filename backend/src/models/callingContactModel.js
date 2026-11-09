const mongoose = require('mongoose');

const callingContactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contact_id: { type: String, required: true }, // Unique contact id or auto-generated
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role_id: { type: String, required: true, ref: 'CallingRole' }, // plumber/painter/thekedar/electrician/wholesale
  
  // 🎯 4-Tier Sub-Segmentation
  subSegment: { 
    type: String, 
    enum: ['regular', 'inactive', 'new_cold', 'payment_due'], 
    default: 'regular' 
    // regular: Hamesha / beech-beech me lene wale (Repeat orders & site check)
    // inactive: Pehle lete the, ab band kar diya (Comeback & reactivate)
    // new_cold: Naye jo dukan ko jante hi nahi (Intro + Address + Rate card)
    // payment_due: Hisaab / udhari baaki wale (Settlement & bill follow-up)
  },

  siteLocation: { type: String, default: '' },
  pendingBalance: { type: Number, default: 0 },

  status: { 
    type: String, 
    enum: ['pending', 'queued', 'in_progress', 'called', 'interested', 'ordered', 'callback_scheduled', 'no_answer', 'failed', 'archived'], 
    default: 'pending' 
  },
  last_call_date: { type: Date, default: null },
  next_call_date: { type: Date, default: () => new Date() },
  attempts: { type: Number, default: 0 },
  do_not_call: { type: Boolean, default: false }, // Mana kiya -> true
  notes: { type: String, default: '' },
  lastCallSummary: { type: String, default: '' },
  
  metadata: {
    siteLocation: { type: String, default: '' },
    pendingBalance: { type: Number, default: 0 },
    preferredTime: { type: String, default: '' }
  }
}, { timestamps: true });

callingContactSchema.index({ userId: 1, phone: 1 });
callingContactSchema.index({ userId: 1, next_call_date: 1, do_not_call: 1 });
callingContactSchema.index({ userId: 1, role_id: 1, subSegment: 1 });

module.exports = mongoose.model('CallingContact', callingContactSchema);
