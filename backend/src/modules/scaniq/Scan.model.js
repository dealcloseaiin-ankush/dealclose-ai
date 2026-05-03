const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  inputType: { type: String, enum: ['screenshot', 'url'], required: true },
  platform: { type: String, enum: ['instagram', 'facebook', 'youtube'], required: true },
  scanType: { type: String, enum: ['post', 'reel', 'ad', 'thumbnail', 'story'], required: true },
  originalUrl: { type: String },
  screenshotUrl: { type: String }, // Cloudinary URL if they uploaded an image
  ipAddress: { type: String, required: true }, // To enforce the 5/month rule
  
  // Data scraped via Apify (if URL was provided)
  scrapedData: {
    caption: String,
    hashtags: [String],
    likes: Number,
    comments: Number,
    views: Number,
    postedAt: Date,
    authorUsername: String,
    thumbnailUrl: String
  },
  
  // OpenAI GPT-4o Vision Results
  analysis: {
    viralScore: Number, // 0-100
    viralLabel: String, // Poor, Average, Good, Viral
    scoreBreakdown: {
      visualQuality: Number,
      caption: Number,
      hashtags: Number,
      engagementHook: Number,
      timingSignals: Number
    },
    strengths: [String],
    weaknesses: [String],
    suggestions: [String],
    captionRewrite: String,
    improvedHashtags: [String],
    bestTimeToPost: String,
    overallSummary: String
  },
  
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  errorMessage: { type: String },
  processingTime: { type: Number }, // How many seconds AI took
  shareToken: { type: String, unique: true }, // For public sharing link (scaniq.in/results/TOKEN)
  sharedCount: { type: Number, default: 0 }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Scan', scanSchema);