const mongoose = require('mongoose');

const creditPaymentSchema = new mongoose.Schema({
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
  amount: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  paymentType: { 
    type: String, 
    enum: ['received', 'discount', 'refund'], 
    default: 'received' 
  },
  paymentMode: { 
    type: String, 
    enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'], 
    default: 'CASH' 
  },
  referenceNote: { 
    type: String, 
    default: '' 
  },
  previousBalance: { 
    type: Number, 
    default: 0 
  },
  newBalance: { 
    type: Number, 
    default: 0 
  },
  waReceiptLink: { 
    type: String, 
    default: '' 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('CreditPayment', creditPaymentSchema);
