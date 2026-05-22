const visionService = require('../modules/scaniq/vision.service');

// In-memory DB for polling endpoints (screenshot uploads)
const activeScans = {};

// @desc    Search live Google/Meta ads and compare using Gemini AI
// @route   POST /api/scaniq/search
exports.searchAndCompare = async (req, res) => {
  console.log(`\n======================================================`);
  console.log(`🚀 [ScanIQ API] LIVE SEARCH & COMPARE STARTED`);
  console.log(`======================================================`);
  
  try {
    const { query, userAdUrl } = req.body;
    console.log(`📌 User Search Query: "${query}"`);
    console.log(`🔗 Competitor/User URL: "${userAdUrl || 'Not provided'}"`);
    
    console.log(`\n🛠️  [DEBUG] Checking API Keys...`);
    if (!process.env.GEMINI_API_KEY) {
      console.log(`❌ GEMINI_API_KEY is MISSING in backend .env!`);
      return res.status(400).json({ success: false, message: "GEMINI_API_KEY missing in .env" });
    } else {
      console.log(`✅ GEMINI_API_KEY is Present!`);
    }

    if (!process.env.SERP_API_KEY) {
      console.log(`❌ SERP_API_KEY is MISSING in backend .env!`);
      return res.status(400).json({ success: false, message: "SERP_API_KEY missing in .env" });
    } else {
      console.log(`✅ SERP_API_KEY is Present!`);
    }

    console.log(`\n⏳ [DEBUG] Fetching Live Data (Google) & Passing to Gemini AI...`);
    
    // Ye function aapke 'vision.service.js' ko call karega jahan Gemini aur SerpApi ka logic hai
    const analysis = await visionService.searchAndCompareAd(query, userAdUrl);
    
    console.log(`✅ [DEBUG] Gemini AI successfully analyzed the data!`);
    console.log(`📊 AI Viral Score Generated: ${analysis.viralScore}`);
    
    res.status(200).json({ success: true, analysis });

  } catch (error) {
    console.error(`\n❌ [CRITICAL ERROR] ScanIQ Failed:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mock processing for screenshot uploads
// @route   POST /api/scaniq/screenshot
exports.processScreenshot = async (req, res) => {
  const scanId = 'scan_' + Date.now();
  activeScans[scanId] = { status: 'processing' };
  console.log(`📸 [ScanIQ API] Screenshot Uploaded. Generated Scan ID: ${scanId}`);
  res.status(200).json({ success: true, scanId });

  // Mocking 3-second background processing for image analysis
  setTimeout(() => {
    activeScans[scanId] = {
      status: 'completed',
      analysis: {
        viralScore: 88,
        viralLabel: "High",
        overallSummary: "AI processed your screenshot successfully. (Note: True image analysis requires AWS S3 bucket to store the file before sending to Gemini Vision).",
        strengths: ["Great color contrast", "Clear Call to Action"],
        weaknesses: ["Text is a bit too small for mobile devices"],
        actionableTips: ["Increase font size", "Use a brighter background"]
      }
    };
    console.log(`✅ [ScanIQ API] Background Screenshot Processing Completed for ${scanId}`);
  }, 3000);
};

// @desc    Get status of an ongoing scan
// @route   GET /api/scaniq/:scanId
exports.getScanStatus = async (req, res) => {
  const { scanId } = req.params;
  const scan = activeScans[scanId];
  if (!scan) return res.status(404).json({ success: false, message: "Scan not found" });
  res.status(200).json(scan);
};

// @desc    Process a direct URL
// @route   POST /api/scaniq/url
exports.processUrl = async (req, res) => {
  console.log(`🔗 [ScanIQ API] URL processing requested for: ${req.body.url}`);
  res.status(200).json({ success: true, message: "URL processing initiated." });
};