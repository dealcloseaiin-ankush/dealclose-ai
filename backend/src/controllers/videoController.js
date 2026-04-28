const videoService = require('../services/videoService');
const Video = require('../models/videoModel');
const MediaAsset = require('../models/mediaAssetModel');

exports.generateVideo = async (req, res) => {
  try {
    const { prompt, style } = req.body;
    // const userId = req.user.id; // Assuming auth middleware
    
    const video = await Video.create({
      prompt,
      status: 'processing',
      // createdBy: userId
    });

    // Start async generation
    videoService.startGeneration(video._id, prompt, style);

    res.status(202).json({ message: 'Video generation started', videoId: video._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- NEW PIPELINE CONTROLLERS ---

exports.generateAudio = async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    // Integration Point: Call PlayHT / ElevenLabs API here
    const audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; // Mock URL
    
    const asset = await MediaAsset.create({ type: 'audio', url: audioUrl, prompt: text, isPublic: true });
    res.json({ message: "Audio generated", url: audioUrl, assetId: asset._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateImage = async (req, res) => {
  try {
    const { prompt, style } = req.body;
    
    // First: Check if a similar reusable image exists in Library to save cost
    const existingAsset = await MediaAsset.findOne({ prompt, type: 'image', isPublic: true });
    if (existingAsset) {
      console.log("♻️ Reused Image from Library!");
      return res.json({ message: "Image fetched from library", url: existingAsset.url, isReused: true });
    }

    // Integration Point: Call Fal.ai / Stable Diffusion API here
    const imageUrl = style === '2d-anime' 
      ? "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=500&auto=format&fit=crop" 
      : "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=500";
    
    // Save new image to reusable library
    const asset = await MediaAsset.create({ type: 'image', url: imageUrl, prompt, style, isPublic: true });
    res.json({ message: "New Image generated", url: imageUrl, assetId: asset._id, isReused: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.animateImage = async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;
    
    // Integration Point: Call RunwayML / Fal.ai SVD (Image to Video) API here
    const videoUrl = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";
    
    // Save motion video to reusable library
    const asset = await MediaAsset.create({ type: 'video', url: videoUrl, prompt: prompt || 'motion', isPublic: true });
    res.json({ message: "Motion Video generated", url: videoUrl, assetId: asset._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateLipSync = async (req, res) => {
  try {
    const { avatarImageUrl, script } = req.body;
    
    // Integration Point: Call Replicate (SadTalker / Wav2Lip) API here
    const videoUrl = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";
    
    // Save Avatar video as PRIVATE (isPublic: false) because it's user's personal face
    const asset = await MediaAsset.create({ type: 'avatar_video', url: videoUrl, prompt: script, isPublic: false });
    res.json({ message: "Avatar Lip-sync generated", url: videoUrl, assetId: asset._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLibraryAssets = async (req, res) => {
  try {
    // Fetch all public assets that can be reused by anyone
    const assets = await MediaAsset.find({ isPublic: true }).sort({ createdAt: -1 }).limit(20);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVideoStatus = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    res.json(video);
  } catch (error) {
    res.status(404).json({ message: 'Video not found' });
  }
};

exports.createVideoFromImage = async (req, res) => {
  try {
    const { imageUrl, voiceoverText } = req.body;
    
    // Mock Video Generation
    // In real app: Use RunwayML / Stability Video API
    // And ElevenLabs for voiceover
    
    const videoId = "vid_" + Date.now();
    // Start async process...
    
    res.json({ message: "Video creation started", videoId, url: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};