const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true // Which broker/user owns this listing
  },
  propertyType: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  price: {
    type: String,
    default: "Price on request"
  },
  amenities: [{
    type: String
  }],
  socialLinks: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'listed', 'sold'],
    default: 'listed'
  },
  customerPhone: {
    type: String, // The WhatsApp number from where it was listed
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Property', propertySchema);