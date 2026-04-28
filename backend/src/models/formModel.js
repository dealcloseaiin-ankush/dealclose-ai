const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const formSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  fields: [{
    label: String,
    inputType: {
      type: String,
      enum: ['text', 'number', 'email', 'date', 'textarea'],
      default: 'text'
    },
    required: {
      type: Boolean,
      default: false
    }
  }],
  submissions: [{
    data: {
      type: Map,
      of: String // Stores field label -> value
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Form', formSchema);