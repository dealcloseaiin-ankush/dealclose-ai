const Scan = require('./Scan.model');
const visionService = require('./vision.service');
const scraperService = require('./scraper.service');
const crypto = require('crypto');

// Helper: Generate random token for sharing results (e.g. scaniq.in/results/ab12cd34)
const generateShareToken = () => crypto.randomBytes(6).toString('hex');

// @desc    Handle Screenshot Upload & Analyze (Method 1)
// @route   POST /api/scaniq/screenshot
exports.scanScreenshot = async (req, res) => {
  try {
    console.log(`\n[ScanIQ Debug] 📸 Received new Screenshot Scan request.`);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a screenshot' });
    }

    // Get the Cloudinary secure URL directly from multer-storage-cloudinary
    const imageUrl = req.file.path;
    const { platform = 'instagram', scanType = 'post' } = req.body;

    // 1. Create a Scan record in Database (Status: 'processing')
    console.log(`[ScanIQ Debug] 🛠️ Step 1: Creating DB record for screenshot scan...`);
    const scan = await Scan.create({
      inputType: 'screenshot',
      platform,
      scanType,
      screenshotUrl: imageUrl,
      ipAddress: req.ip,
      status: 'processing',
      shareToken: generateShareToken()
    });

    // 2. Return instantly to Frontend so it can show the "Loading/Progress" bar
    res.status(202).json({ success: true, scanId: scan._id, message: 'AI Analysis started' });

    // 3. Run OpenAI Vision processing in the background
    console.log(`[ScanIQ Debug] 🚀 Step 2: Triggering background processor for screenshot (ScanID: ${scan._id})...`);
    processScreenscan(scan._id, imageUrl, platform, scanType);

  } catch (error) {
    console.error('Screenshot Scan Error:', error);
    res.status(500).json({ success: false, message: 'Server Error during upload' });
  }
};

// @desc    Handle URL Paste & Analyze (Method 2)
// @route   POST /api/scaniq/url
exports.scanUrl = async (req, res) => {
  try {
    const { url, platform = 'instagram', scanType = 'post' } = req.body;
    console.log(`\n[ScanIQ Debug] 🔗 Received new URL Scan request. URL: ${url}`);

    if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

    console.log(`[ScanIQ Debug] 🛠️ Step 1: Creating DB record for URL scan...`);
    const scan = await Scan.create({
      inputType: 'url',
      platform,
      scanType,
      originalUrl: url,
      ipAddress: req.ip,
      status: 'processing',
      shareToken: generateShareToken()
    });

    res.status(202).json({ success: true, scanId: scan._id, message: 'URL AI Analysis started' });

    // Run Apify Scraper + OpenAI Vision in the background
    console.log(`[ScanIQ Debug] 🚀 Step 2: Triggering background processor for URL (ScanID: ${scan._id})...`);
    processUrlScan(scan._id, url, platform, scanType);
  } catch (error) {
    console.error('URL Scan Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Check status & get results of a Scan
// @route   GET /api/scaniq/:scanId
exports.getScanResult = async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.scanId);
    if (!scan) return res.status(404).json({ success: false, message: 'Scan not found' });

    res.status(200).json({ 
      success: true, 
      status: scan.status,
      analysis: scan.status === 'completed' ? scan.analysis : null,
      processingTime: scan.processingTime,
      errorMessage: scan.errorMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Handle Competitor Search & Compare (Method 3)
// @route   POST /api/scaniq/search
exports.searchAd = async (req, res) => {
  try {
    const { query, userAdUrl } = req.body;
    console.log(`\n[ScanIQ Debug] 🔍 Received new Search & Compare request. Query: "${query}"`);

    if (!query) return res.status(400).json({ success: false, message: 'Search query is required' });

    // Synchronous call (Frontend iski immediate wait kar raha hai)
    console.log(`[ScanIQ Debug] 🚀 Step 1: Calling Vision Service for Search & Compare...`);
    const analysis = await visionService.searchAndCompareAd(query, userAdUrl);

    console.log(`[ScanIQ Debug] ✅ Process Complete! Returning analysis to frontend.`);
    res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error('Search & Compare Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// Background Processor Function
async function processScreenscan(scanId, imageUrl, platform, scanType) {
  const start = Date.now();
  try {
    console.log(`[ScanIQ Background] ⏳ Starting Vision AI analysis for ${platform} ${scanType}...`);
    // Call our modular Vision Service
    const analysis = await visionService.analyzeImage(imageUrl, platform, scanType);
    
    console.log(`[ScanIQ Background] 💾 Saving AI results to database...`);
    const processingTime = Math.round((Date.now() - start) / 1000);
    await Scan.findByIdAndUpdate(scanId, { analysis, status: 'completed', processingTime });
    console.log(`[ScanIQ Background] 🎉 Process completed successfully in ${processingTime}s!`);
  } catch (err) {
    console.error("❌ [ScanIQ Background Error] AI Analysis failed:", err);
    await Scan.findByIdAndUpdate(scanId, { status: 'failed', errorMessage: err.message || 'AI processing failed' });
  }
}

// Background Processor Function for URLs
async function processUrlScan(scanId, url, platform, scanType) {
  const start = Date.now();
  try {
    // 1. Scrape post data using Apify
    console.log(`[ScanIQ Background] 🌐 Step 1: Scraping post data from Apify...`);
    const scrapedData = await scraperService.scrape(url, platform);
    console.log(`[ScanIQ Background] ✅ Step 1 Complete. Scraped Data keys:`, Object.keys(scrapedData));
    
    // 2. Extract image URL from the scraped data
    const imageUrl = scrapedData.thumbnailUrl;
    
    // 3. Vision analysis
    console.log(`[ScanIQ Background] 👁️ Step 2: Sending scraped image and data to Vision AI...`);
    const analysis = await visionService.analyzeImage(imageUrl, platform, scanType, scrapedData);
    console.log(`[ScanIQ Background] ✅ Step 2 Complete. AI Analysis generated.`);
    
    console.log(`[ScanIQ Background] 💾 Step 3: Saving all data to Database...`);
    const processingTime = Math.round((Date.now() - start) / 1000);
    await Scan.findByIdAndUpdate(scanId, {
      scrapedData,
      analysis,
      status: 'completed',
      processingTime
    });
    console.log(`[ScanIQ Background] 🎉 Process completed successfully in ${processingTime}s!`);
  } catch (err) {
    console.error("❌ [ScanIQ Background Error] URL Analysis failed:", err);
    await Scan.findByIdAndUpdate(scanId, { 
      status: 'failed',
      errorMessage: err.message || 'Could not fetch this post. Make sure it is public.'
    });
  }
}