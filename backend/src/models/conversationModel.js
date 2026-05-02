const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  platform: { type: String, enum: ['whatsapp', 'instagram', 'voice'], default: 'whatsapp' },
  status: { type: String, enum: ['open', 'resolved', 'bot_handled'], default: 'open' },
  unreadCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: Date.now },
  lastMessagePreview: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);