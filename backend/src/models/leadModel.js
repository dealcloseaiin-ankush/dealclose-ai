const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const leadSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'not_interested', 'converted'],
    default: 'new',
  },
  source: {
    type: String,
    default: 'manual',
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Custom fields can be stored in a flexible way
  customFields: {
    type: Map,
    of: String,
  },
});

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
