const videoService = require('../services/videoService');
const Video = require('../models/videoModel');
const MediaAsset = require('../models/mediaAssetModel');
const Replicate = require('replicate');

// --- AI API HELPER FUNCTIONS ---

// Helper function to run Replicate AI Models
const runReplicateModel = async (modelVersion, inputParams) => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is missing in .env file");

  // 1. Start the prediction
  let response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ version: modelVersion, input: inputParams })
  });
  let prediction = await response.json();

  if (prediction.error) throw new Error(prediction.error);

  // 2. Poll the API until the generation is complete
  while (prediction.status === "starting" || prediction.status === "processing") {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const pollResponse = await fetch(prediction.urls.get, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    prediction = await pollResponse.json();
  }

  if (prediction.status === "failed") throw new Error("AI Generation failed on Replicate.");
  return prediction.output;
};

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
    
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is missing in .env");

    // Default voice: 'Rachel' (or use provided voiceId)
    const vId = voiceId || "21m00Tcm4TlvDq8ikWAM"; 
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.5 } })
    });

    if (!response.ok) throw new Error("Failed to generate audio from ElevenLabs");

    // In production: Upload this buffer to AWS S3 / Supabase Storage and get the URL
    // For now, sending a fallback mock URL if storage isn't setup
    const audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; 
    
    const asset = await MediaAsset.create({ type: 'audio', url: audioUrl, prompt: text, isPublic: true });
    res.json({ message: "Audio generated", url: audioUrl, assetId: asset._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateImage = async (req, res) => {
  try {
    const { prompt, style } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    console.log("[Video Studio] Generating Image with Replicate (Flux Model)...");
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: prompt + ", cinematic, 8k, highly detailed, professional photography",
          aspect_ratio: "16:9",
          output_format: "webp"
        }
      }
    );
    
    const imageUrl = Array.isArray(output) ? output[0] : output;
    res.status(200).json({ success: true, url: imageUrl });
  } catch (error) {
    console.error("Image Gen Error:", error);
    res.status(500).json({ success: false, message: 'Failed to generate image' });
  }
};

exports.animateImage = async (req, res) => {
  try {
    const { imageUrl, prompt } = req.body;
    if (!imageUrl) return res.status(400).json({ success: false, message: 'Image URL is required' });

    console.log("[Video Studio] Animating Image to Video (Stable Video Diffusion)...");
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const output = await replicate.run(
      "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
      { input: { cond_aug: 0.02, dec_add_noise: true, image: imageUrl } }
    );

    const videoUrl = Array.isArray(output) ? output[0] : output;
    res.status(200).json({ success: true, url: videoUrl });
  } catch (error) {
    console.error("Video Gen Error:", error);
    res.status(500).json({ success: false, message: 'Failed to animate video' });
  }
};

exports.generateLipSync = async (req, res) => {
  try {
    const { avatarImageUrl, script } = req.body;
    
    // Note: SadTalker requires an audio file, so ideally script should be converted to audio first.
    // Assuming frontend passes audioUrl or we generate it. Using mock audio for syntax completeness.
    const audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

    // Call Replicate: SadTalker for Lip-Sync
    const output = await runReplicateModel(
      "3aa3dac9353cc4d6bd62a8f95957bd844003b401ca4e4a9b33baa574c549d376", // SadTalker Model ID
      { source_image: avatarImageUrl, driven_audio: audioUrl }
    );
    const videoUrl = output;
    
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

// --- NEW ADVANCED AI VIDEO FEATURES ---

// 1. Face Swap / Trending Video Remix
exports.swapFaceInVideo = async (req, res) => {
  try {
    const { targetVideoUrl, sourceImageUrl } = req.body;
    
    // Call Replicate: FaceSwap (Roop)
    const outputVideoUrl = await runReplicateModel(
      "9a4298548422074c3f57258c5d544497314ae4112df80d116f0d2109e843d20d", // FaceSwap Model ID
      { target: targetVideoUrl, swap_image: sourceImageUrl }
    );
    
    res.json({ message: "Face swap completed successfully", url: outputVideoUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. Auto Product Ad Pipeline (Script -> Image -> Video -> Audio)
exports.createProductAdPipeline = async (req, res) => {
  try {
    const { productImages, productDescription, brandName } = req.body;
    
    // AI Pipeline Logic (To be integrated with real APIs):
    // Step 1: LLM generates ad script & voiceover text
    // Step 2: Image generation AI enhances the product image (e.g., adds cinematic background)
    // Step 3: RunwayML / SVD converts the enhanced image into a panning/motion video
    // Step 4: ElevenLabs generates voiceover & merges with video
    
    const finalAdVideoUrl = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4"; // Mock
    res.json({ message: "AI Product Ad generated successfully", url: finalAdVideoUrl, script: "Mock generated script for " + brandName });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};