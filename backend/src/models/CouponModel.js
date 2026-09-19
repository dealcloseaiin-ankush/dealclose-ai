const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  code: { 
    type: String, 
    required: true, 
    uppercase: true, 
    trim: true,
    index: true 
  },
  title: { 
    type: String, 
    default: 'विशेष छूट कूपन (Special Discount)' 
  },
  discountType: { 
    type: String, 
    enum: ['PERCENTAGE', 'FLAT_AMOUNT', 'FREE_ITEM'], 
    default: 'FLAT_AMOUNT' 
  },
  discountValue: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  freeItemName: { 
    type: String, 
    default: '' 
  },
  minBillAmount: { 
    type: Number, 
    default: 0 
  },
  maxDiscountAmount: { 
    type: Number, 
    default: 1000 
  },
  assignedPartyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'CreditParty', 
    default: null 
  },
  assignedPartyName: { 
    type: String, 
    default: '' 
  },
  usageLimit: { 
    type: Number, 
    default: 1 // 1 for single-use, e.g. loyalty reward
  },
  timesUsed: { 
    type: Number, 
    default: 0 
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'EXPIRED', 'REDEEMED', 'DISABLED'], 
    default: 'ACTIVE',
    index: true
  },
  validUntil: { 
    type: Date, 
    default: () => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days default
  }
}, { 
  timestamps: true 
});

couponSchema.index({ userId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', couponSchema);
