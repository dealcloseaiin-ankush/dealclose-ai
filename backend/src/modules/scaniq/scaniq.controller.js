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
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a screenshot' });
    }

    // Generate accessible image URL (Since we are using local multer upload for now)
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const { platform = 'instagram', scanType = 'post' } = req.body;

    // 1. Create a Scan record in Database (Status: 'processing')
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
    if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

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

// Background Processor Function
async function processScreenscan(scanId, imageUrl, platform, scanType) {
  const start = Date.now();
  try {
    // Call our modular Vision Service
    const analysis = await visionService.analyzeImage(imageUrl, platform, scanType);
    
    const processingTime = Math.round((Date.now() - start) / 1000);
    await Scan.findByIdAndUpdate(scanId, { analysis, status: 'completed', processingTime });
  } catch (err) {
    console.error("AI Analysis failed:", err);
    await Scan.findByIdAndUpdate(scanId, { status: 'failed', errorMessage: err.message || 'AI processing failed' });
  }
}

// Background Processor Function for URLs
async function processUrlScan(scanId, url, platform, scanType) {
  const start = Date.now();
  try {
    // 1. Scrape post data using Apify
    const scrapedData = await scraperService.scrape(url, platform);
    
    // 2. Extract image URL from the scraped data
    const imageUrl = scrapedData.thumbnailUrl;
    
    // 3. Vision analysis
    const analysis = await visionService.analyzeImage(imageUrl, platform, scanType, scrapedData);
    
    const processingTime = Math.round((Date.now() - start) / 1000);
    await Scan.findByIdAndUpdate(scanId, {
      scrapedData,
      analysis,
      status: 'completed',
      processingTime
    });
  } catch (err) {
    console.error("URL Analysis failed:", err);
    await Scan.findByIdAndUpdate(scanId, { 
      status: 'failed',
      errorMessage: err.message || 'Could not fetch this post. Make sure it is public.'
    });
  }
}