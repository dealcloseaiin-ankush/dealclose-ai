const mongoose = require('mongoose');

const DesignPostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId: { type: String, default: 'main' },
  platform: { type: String, default: 'instagram' },
  
  // The main caption that goes below the image on Instagram
  caption: { type: String, default: '' },
  hashtags: { type: String, default: '' },

  // The complete Canva-like design specification
  designJson: { type: Object, required: true },

  // A rasterized preview image for quick loading in lists
  previewImageUrl: { type: String },

  status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft' },
  scheduledAt: { type: Date, default: null },
}, {
  timestamps: true,
});

const DesignPost = mongoose.model('DesignPost', DesignPostSchema);
module.exports = DesignPost;