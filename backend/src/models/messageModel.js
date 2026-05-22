const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // SaaS User ID
  customerPhone: { type: String, required: true },
  messageText: { type: String },
  direction: { type: String, enum: ['incoming', 'outgoing'], required: true }, // Chat aayi ya gayi
  status: { type: String, enum: ['sent', 'delivered', 'read', 'received'], default: 'sent' },
  sentBy: { type: String, enum: ['ai', 'auto-reply', 'staff', 'customer'], required: true }, // Kisne bheja
  timestamp: { type: Date, default: Date.now },
  tags: [{ type: String }], // For CRM categorization like 'inquiry', 'complaint'
  isResolved: { type: Boolean, default: false }, // To mark chats as settled/closed
  expiresAt: { type: Date }, // Auto-delete old/junk messages to save DB space
  // --- Future Archiving System (Cold Storage) ---
  isArchived: { type: Boolean, default: false }, // True if shifted to Firebase/S3
  archiveUrl: { type: String } // Link to the chat file in Cold Storage
});

// TTL Index: MongoDB will automatically delete the document when current time > expiresAt
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;