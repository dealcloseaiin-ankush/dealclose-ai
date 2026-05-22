// backend/src/controllers/scraperController.js
const aiService = require('../services/aiService'); // Optional if you want to use AI to clean data

// @desc    Search Google Maps for B2B Leads via SerpApi
// @route   POST /api/scraper/search
exports.searchBusinesses = async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ success: false, message: "Search query is required." });
    }

    // Get API key from env or use provided one
    const SERPAPI_KEY = process.env.SERPAPI_KEY || 'YOUR_SERP_API_KEY_HERE'; 
    
    console.log(`🔍 [Scraper] Fetching B2B Leads for: "${query}"`);

    // Fetching Page 1 (Top 20 results) to save credits. 
    // For more, you can pass &start=20 for page 2
    const url = `https://serpapi.com/search.json?engine=google_local&q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ success: false, message: data.error });
    }

    // Extracting only the useful fields for our B2B CRM
    const localResults = data.local_results || [];
    const leads = localResults.map(result => ({
      name: result.title || 'Unknown Business',
      phone: result.phone || '',
      rating: result.rating || 0,
      reviews: result.reviews || 0,
      address: result.address || '',
      website: result.website || '',
      type: result.type || 'Business'
    })).filter(lead => lead.phone); // Only keep leads that have a phone number (Very important for calling!)

    res.status(200).json({ 
      success: true, 
      totalFound: leads.length, 
      data: leads 
    });

  } catch (error) {
    console.error('Scraper Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};