const mongoose = require('mongoose');

const callingRoleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role_id: { type: String, required: true }, // e.g. 'plumber', 'painter', 'electrician', 'thekedar', 'wholesale', 'customer'
  role_name: { type: String, required: true }, // Display Name: e.g. "Plumber (प्लंबर)"
  firm_name: { type: String, default: 'DealClose Hardware & Building Supplies' },
  goal: { 
    type: String, 
    required: true, 
    default: 'Check weekly site requirements, take repeat orders, inform current pipe & fitting scheme' 
  },
  prompt_template: {
    type: String,
    required: true,
    default: `Aap {firm_name} ke virtual business assistant Neha hain. Aap {name} ji ({role_name}) se baat kar rahi hain. 
Pehle politely bataiye ki aap unke regular material supplier {firm_name} ke assistant hain. 
Aapka goal hai: {goal}.
Aaj ka vishesh offer: {offer}.
Customer ki purani history: {call_history}.
Aapko respectful, natural Hindi/Hinglish me baat karni hai. Rates ke liye real-time rate system use karein. Order ya callback time confirm karein.`
  },
  offer: { type: String, default: 'Flat 5% extra discount on full carton fittings order this week' },
  default_frequency_days: { type: Number, default: 7 }, // Repeat call cycle (e.g. 7 days for plumber, 3 days for thekedar)
  call_window: {
    start: { type: String, default: '10:00' }, // 10:00 AM (HH:mm format)
    end: { type: String, default: '19:00' }    // 07:00 PM
  },
  max_attempts: { type: Number, default: 3 }, // Max unanswered retries before pause
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

callingRoleSchema.index({ userId: 1, role_id: 1 }, { unique: true });

module.exports = mongoose.model('CallingRole', callingRoleSchema);
