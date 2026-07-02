// backend/src/controllers/scraperController.js

// @desc    Search Google Maps for B2B Leads via SerpApi (with pagination + city/industry support)
// @route   POST /api/scraper/search
exports.searchBusinesses = async (req, res) => {
  try {
    const { query, city, industry, maxResults = 60 } = req.body;

    // 🆕 FEATURE: Ab sirf ek free-text query nahi, balki city + industry alag-alag
    // bhej sakte ho (structured search) — ya purana single "query" bhi chalega.
    const finalQuery = query || `${industry || 'businesses'} in ${city || ''}`.trim();

    if (!finalQuery || finalQuery === 'businesses in') {
      return res.status(400).json({ success: false, message: "Please provide a search query, or both city and industry." });
    }

    const SERPAPI_KEY = process.env.SERPAPI_KEY || 'YOUR_SERP_API_KEY_HERE';
    console.log(`🔍 [Scraper] Fetching B2B Leads for: "${finalQuery}" (max: ${maxResults})`);

    let allResults = [];
    let start = 0;
    const PAGE_SIZE = 20; // SerpApi google_local ek baar mein ~20 deta hai

    // 🐛 BUG 1 FIX: Pagination loop — jab tak maxResults na mil jaaye ya
    // API se naye results aana band na ho jaayein, tab tak agle pages maango.
    while (allResults.length < maxResults) {
      const url = `https://serpapi.com/search.json?engine=google_local&q=${encodeURIComponent(finalQuery)}&start=${start}&api_key=${SERPAPI_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        // Agar pehle hi page pe error aaye to turant fail karo
        if (start === 0) {
          return res.status(400).json({ success: false, message: data.error });
        }
        // Agle pages pe error aaye (jaise credits khatam) to jo mila usi pe ruk jao
        console.log(`⚠️ [Scraper] Stopped pagination early: ${data.error}`);
        break;
      }

      const pageResults = data.local_results || [];
      if (pageResults.length === 0) {
        console.log(`✅ [Scraper] No more results found. Stopping at ${allResults.length} leads.`);
        break; // Is city/industry mein aur listings nahi hain
      }

      allResults = allResults.concat(pageResults);
      start += PAGE_SIZE;

      // Safety cap — kabhi bhi 5 pages (100 results) se zyada na maangein
      if (start >= 100) break;
    }

    // 🐛 BUG 2 FIX: Ab phone-wale leads ko drop nahi karte, balki
    // unhe "hasPhone" flag ke saath rakhte hain aur phone-wale leads
    // ko upar sort kar dete hain (calling ke liye sabse useful pehle).
    const leads = allResults.map(result => ({
      name: result.title || 'Unknown Business',
      phone: result.phone || null,
      hasPhone: !!result.phone,
      rating: result.rating || 0,
      reviews: result.reviews || 0,
      address: result.address || '',
      website: result.website || '',
      type: result.type || industry || 'Business',
      city: city || null
    }));

    // Phone-wale leads pehle dikhao, bina-phone wale baad mein (drop nahi karte)
    leads.sort((a, b) => (b.hasPhone ? 1 : 0) - (a.hasPhone ? 1 : 0));

    const withPhoneCount = leads.filter(l => l.hasPhone).length;

    res.status(200).json({
      success: true,
      totalFound: leads.length,
      withPhoneCount,
      query: finalQuery,
      data: leads
    });

  } catch (error) {
    console.error('Scraper Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};