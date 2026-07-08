const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // SaaS User ID
  customerPhone: { type: String, required: true },
  messageText: { type: String },
  direction: { type: String, enum: ['incoming', 'outgoing'], required: true }, // Chat aayi ya gayi
  status: { type: String, enum: ['sent', 'delivered', 'read', 'received', 'failed'], default: 'sent' },
  // 🚀 FIX: Added the 'channel' field to distinguish between message sources.
  // This was a critical missing field. Without it, the retention policy couldn't
  // apply different TTLs for WhatsApp vs. Instagram, and the data was inconsistent.
  channel: {
    type: String, enum: ['whatsapp', 'instagram_dm', 'instagram_comment'],
  },
  sentBy: { type: String, enum: ['ai', 'auto-reply', 'staff', 'customer', 'owner_app', 'system', 'crm_broadcast'], required: true }, // Kisne bheja
  timestamp: { type: Date, default: Date.now },
  tags: [{ type: String }], // For CRM categorization like 'inquiry', 'complaint'
  isResolved: { type: Boolean, default: false },
  // 🚀 UPGRADE: TTL Index for Automatic Data Deletion.
  // Yeh MongoDB ko batata hai ki is field mein di gayi date ke 0 seconds baad
  // is document ko automatically permanent delete kar do. Isse database ka size
  // control mein rehta hai aur performance behtar hoti hai.
  // Hum is field ko webhook mein 30 din future ki date par set karenge.
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  // --- Future Archiving System (Cold Storage) ---
  isArchived: { type: Boolean, default: false }, // True if shifted to Firebase/S3
  archiveUrl: { type: String } // Link to the chat file in Cold Storage
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;