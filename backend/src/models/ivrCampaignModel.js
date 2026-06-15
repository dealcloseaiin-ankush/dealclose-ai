const mongoose = require('mongoose');

const ivrCampaignSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  audioUrl: { type: String, required: true }, // Hosted on Cloudinary
  isDirectAI: { type: Boolean, default: false }, // If True -> AI starts directly without pressing 1
  menuOptions: {
    type: Map,
    of: new mongoose.Schema({
      action: { type: String, enum: ['connect_to_ai', 'forward_to_human', 'play_message'] },
      targetPhone: { type: String }, // For 'forward_to_human' (E.g. Sales Team number)
      replyAudioUrl: { type: String } // For 'play_message' (E.g. Address details audio)
    })
  },
  isActive: { type: Boolean, default: true },
  twilioPhoneNumber: { type: String } // Which virtual number this is attached to
}, { timestamps: true });

module.exports = mongoose.model('IvrCampaign', ivrCampaignSchema);