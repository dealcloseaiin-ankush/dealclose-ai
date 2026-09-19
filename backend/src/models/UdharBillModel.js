const mongoose = require('mongoose');

const udharBillSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  partyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CreditParty', 
    required: true, 
    index: true 
  },
  billNumber: { 
    type: String, 
    required: true, 
    trim: true 
  },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    rate: { type: Number, required: true, default: 0 },
    amount: { type: Number, required: true, default: 0 }
  }],
  totalAmount: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  paymentMode: {
    type: String,
    enum: ['CREDIT', 'CASH', 'UPI', 'SPLIT', 'DIRECT_UDHAR', 'LIMIT_KHATA'],
    default: 'CREDIT'
  },
  creditType: {
    type: String,
    enum: ['DIRECT_UDHAR', 'LIMIT_KHATA', 'NONE'],
    default: 'DIRECT_UDHAR'
  },
  isThresholdMilestoneBill: {
    type: Boolean,
    default: false
  },

  // 📊 Dynamic 5-Point Daily Statement Snapshot
  creditLineSnapshot: {
    previousBalance: { type: Number, default: 0 },
    billAmount: { type: Number, default: 0 },
    newTotalBalance: { type: Number, default: 0 },
    sanctionedLimit: { type: Number, default: 0 },
    remainingLimit: { type: Number, default: 0 }
  },

  // 🛡️ Udhar Handover Gatekeeper & OTP Protection
  isCreditLineBill: { 
    type: Boolean, 
    default: true 
  },
  isUdharProtected: { 
    type: Boolean, 
    default: true 
  },
  otpCode: { 
    type: String, 
    default: null 
  },
  otpExpiresAt: { 
    type: Date, 
    default: null 
  },
  handoverStatus: {
    type: String,
    enum: ['DELIVERED', 'PENDING_OTP', 'BYPASSED', 'DISPUTED'],
    default: 'PENDING_OTP',
    index: true
  },

  // ⚡ Merchant "काम न रुके" (Business-Continuity 1-Click Bypass)
  isOwnerBypassed: { 
    type: Boolean, 
    default: false 
  },
  ownerBypassedAt: { 
    type: Date, 
    default: null 
  },
  bypassReason: { 
    type: String, 
    default: '' 
  },

  // 📲 WhatsApp Link Cache
  waLink: { 
    type: String, 
    default: '' 
  },

  // 🎁 Loyalty & Rewards applied
  loyaltyStampAwarded: { 
    type: Boolean, 
    default: false 
  },
  rewardCouponApplied: { 
    type: String, 
    default: null 
  },
  discountAmount: { 
    type: Number, 
    default: 0 
  }
}, { 
  timestamps: true 
});

udharBillSchema.index({ userId: 1, billNumber: 1 });

module.exports = mongoose.model('UdharBill', udharBillSchema);
