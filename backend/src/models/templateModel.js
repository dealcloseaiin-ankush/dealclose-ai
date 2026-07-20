const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const templateSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  designJson: {
    type: Object,
    required: true,
  },
  category: {
    type: String,
    required: true,
    index: true,
  },
  tags: [{
    type: String,
    index: true,
  }],
  usageCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Template', templateSchema);