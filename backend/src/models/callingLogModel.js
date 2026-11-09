const mongoose = require('mongoose');

const callingLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  log_id: { type: String, required: true },
  contact_id: { type: String, required: true }, // ref contact_id
  contactPhone: { type: String, required: true },
  contactName: { type: String, default: '' },
  role_id: { type: String, default: '' },
  call_time: { type: Date, default: Date.now },
  provider: { type: String, enum: ['mobile_sim_apk', 'manual_dialer', 'twilio', 'exotel', 'elevenlabs_ai'], default: 'mobile_sim_apk' },
  durationSeconds: { type: Number, default: 0 },
  transcript_or_summary: { type: String, default: '' },
  
  // AI Output Structure:
  // { interest: 'haan' | 'na' | 'baad_me', order: { item, qty }, payment_promise_date, callback_date, notes }
  result_json: {
    interest: { type: String, enum: ['haan', 'na', 'baad_me', 'no_answer', 'wrong_number', 'unknown'], default: 'unknown' },
    order: {
      item: { type: String, default: '' },
      qty: { type: String, default: '' },
      estimatedAmount: { type: Number, default: 0 }
    },
    payment_promise_date: { type: Date, default: null },
    callback_date: { type: Date, default: null },
    notes: { type: String, default: '' },
    objectionRaised: { type: String, default: '' }
  },

  // State Transition Audit Log (what code calculated for next_call_date)
  transitionDetails: {
    ruleApplied: { type: String, default: '' },
    previousNextCallDate: { type: Date, default: null },
    newNextCallDate: { type: Date, default: null },
    doNotCallSet: { type: Boolean, default: false }
  }
}, { timestamps: true });

callingLogSchema.index({ userId: 1, contact_id: 1 });
callingLogSchema.index({ userId: 1, call_time: -1 });

module.exports = mongoose.model('CallingLog', callingLogSchema);
