const mongoose = require('mongoose');
const schema = new mongoose.Schema({ name: String, layers: Array, category: String });
module.exports = mongoose.model('Template', schema);