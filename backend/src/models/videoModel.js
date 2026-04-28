const mongoose = require('mongoose');
const schema = new mongoose.Schema({ prompt: String, status: String, url: String, createdBy: mongoose.Schema.Types.ObjectId });
module.exports = mongoose.model('Video', schema);