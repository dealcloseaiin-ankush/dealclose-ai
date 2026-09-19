const mongoose = require('mongoose');

const creditPartySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  phone: { 
    type: String, 
    required: true, 
    trim: true,
    index: true 
  },
  businessName: { 
    type: String, 
    default: '', 
    trim: true 
  },
  gstin: { 
    type: String, 
    default: '', 
    trim: true 
  },
  address: { 
    type: String, 
    default: '', 
    trim: true 
  },

  // 🛡️ Credit Limit & Promissory Legal Mandate
  creditLimit: { 
    type: Number, 
    default: 0 
  },
  isCreditLimitActive: { 
    type: Boolean, 
    default: false 
  },
  creditLimitStatus: {
    type: String,
    enum: ['INACTIVE', 'PENDING_OTP', 'ACTIVE', 'LOCKED', 'SUSPENDED'],
    default: 'INACTIVE',
    index: true
  },
  creditLimitSanctionedAt: { 
    type: Date, 
    default: null 
  },
  creditLimitValidityDays: { 
    type: Number, 
    default: 365 
  },
  creditLimitOtp: { 
    type: String, 
    default: null 
  },
  creditLimitOtpExpiresAt: { 
    type: Date, 
    default: null 
  },
  creditLimitAgreementText: { 
    type: String, 
    default: '' 
  },

  // 🛑 Gatekeeper & Current Outstanding Balance
  currentOutstandingBalance: { 
    type: Number, 
    default: 0 
  },
  hasPendingBillApproval: { 
    type: Boolean, 
    default: false 
  },
  pendingApprovalBillId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'UdharBill', 
    default: null 
  },
  creditLimitLockedReason: { 
    type: String, 
    default: '' 
  },

  // 🎁 Gamified Visit Milestones (Stamp Card Loyalty)
  loyaltyTargetVisits: { 
    type: Number, 
    default: 5 
  },
  completedVisitsCount: { 
    type: Number, 
    default: 0 
  },
  minBillAmountForStamp: { 
    type: Number, 
    default: 200 
  },
  rewardUnlocked: { 
    type: Boolean, 
    default: false 
  },
  activeRewardCoupon: { 
    type: String, 
    default: null 
  },
  rewardDiscountType: {
    type: String,
    enum: ['PERCENTAGE', 'FLAT_AMOUNT', 'FREE_ITEM'],
    default: 'PERCENTAGE'
  },
  rewardDiscountValue: {
    type: Number,
    default: 20 // e.g. 20% off or Rs. 200
  },

  // 💳 UPI AutoPay / Recurring Mandate Linkage
  upiMandateVpa: { 
    type: String, 
    default: '' 
  },
  hasActiveUpiMandate: { 
    type: Boolean, 
    default: false 
  },
  mandateCycle: { 
    type: String, 
    enum: ['NONE', 'WEEKLY', 'MONTHLY'], 
    default: 'NONE' 
  },
  mandateMaxAmount: { 
    type: Number, 
    default: 0 
  }
}, { 
  timestamps: true 
});

// Compound index to avoid duplicate party phone for same merchant
creditPartySchema.index({ userId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('CreditParty', creditPartySchema);
