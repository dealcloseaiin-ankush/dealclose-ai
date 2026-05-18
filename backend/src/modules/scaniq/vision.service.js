const OpenAI = require('openai');
const promptBuilder = require('./promptBuilder');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const scraperService = require('./scraper.service');

exports.analyzeImage = async (imageUrl, platform, scanType, scrapedData = null) => {
  const prompt = promptBuilder.buildPrompt(platform, scanType, scrapedData);
  
  console.log(`[Vision Debug] 👁️ analyzeImage called for ${platform} ${scanType}. Image URL length: ${imageUrl.length}`);

  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy');

  if (!hasGemini && !hasOpenAI) {
    throw new Error("No AI API keys configured. Please add GEMINI_API_KEY or OPENAI_API_KEY.");
  }

  let rawResponse = "";

  const callAI = async (client, model) => {
    const response = await client.chat.completions.create({
      model: model,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
        ]
      }]
    });
    return response.choices[0].message.content;
  };

  try {
    if (hasGemini) {
      console.log("[Vision AI] Trying Gemini 1.5 Flash (Official SDK)...");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      console.log(`[Vision Debug] 📥 Downloading image to buffer for Gemini...`);
      const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const base64Data = Buffer.from(imageResp.data, 'binary').toString('base64');
      
      const imagePart = { inlineData: { data: base64Data, mimeType: imageResp.headers['content-type'] || 'image/jpeg' } };
      
      let result;
      let lastError;
      const GEMINI_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash"];
      
      for (const modelName of GEMINI_MODELS) {
        try {
          console.log(`[Vision Debug] 🤖 Triggering Gemini Model: ${modelName}...`);
          const model = genAI.getGenerativeModel({ model: modelName });
          result = await model.generateContent([prompt, imagePart]);
          console.log(`[Vision Debug] ✅ Successfully generated response using: ${modelName}`);
          break;
        } catch (e) {
          console.log(`⚠️ [Vision Debug] Model ${modelName} failed. Reason: ${e.message}. Trying next...`);
          lastError = e;
        }
      }
      if (!result) throw lastError;
      rawResponse = result.response.text();
    } else {
      throw new Error("Gemini key not found, skipping to OpenAI.");
    }
  } catch (geminiError) {
    if (hasOpenAI) {
      console.log(`[Vision AI] Gemini skipped/failed. Falling back to OpenAI GPT-4o...`);
      const openAiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      rawResponse = await callAI(openAiClient, 'gpt-4o');
    } else {
      console.error("[Vision AI] Both AI options failed or keys missing.");
      throw geminiError;
    }
  }
  
  // AI kabhi kabhi markdown (```json ... ```) bhej deta hai, usko hatane ke liye:
  const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  return JSON.parse(cleaned);
};

exports.searchAndCompareAd = async (query, userAdUrl) => {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy');
  if (!hasOpenAI && !hasGemini) throw new Error("OpenAI or Gemini API key is required for complex search analysis.");

  console.log(`\n[Vision Debug] 🕵️‍♂️ Starting 'searchAndCompareAd' Pipeline for query: "${query}"`);

  let searchData = "";
  try {
    // 1. SerpAPI se live data lana (Google Search)
    console.log(`[Vision Debug] 🌐 Step 1: Requesting SerpAPI (Google Search)...`);
    const serpApiKey = process.env.SERP_API_KEY;
    if (serpApiKey) {
      const response = await axios.get('https://serpapi.com/search.json', {
        params: { q: query, engine: "google", api_key: serpApiKey }
      });
      if (response.data.organic_results && response.data.organic_results.length > 0) {
        console.log(`[Vision Debug] ✅ SerpAPI Success: Found ${response.data.organic_results.length} organic results.`);
        // AI ko sirf Title, Link aur snippet bhejenge taaki wo confuse na ho aur URLs zaroor de
        searchData = JSON.stringify(response.data.organic_results.slice(0, 5).map(res => ({
          title: res.title,
          link: res.link,
          snippet: res.snippet
        })));
      } else {
        console.log(`[Vision Debug] ⚠️ SerpAPI Success, but 0 results found.`);
        searchData = "API Success, but no organic Google search results found.";
      }
    } else {
      console.log(`[Vision Debug] ⚠️ SerpAPI Skipped: Key missing.`);
      searchData = "SerpAPI Key is missing in the backend.";
    }
  } catch (error) {
    const errMsg = error.response?.data?.error || error.message;
    console.error("❌ [Vision Debug] SerpAPI Error:", errMsg);
    searchData = `SerpAPI Failed: ${errMsg}`;
  }

  // 1.5. Meta Ad Library API se live Facebook/Instagram Ads lana
  let metaAdsData = "";
  try {
    console.log(`[Vision Debug] 🔵 Step 2: Requesting Official Meta Ad Library API using Master Token...`);
    // Naye token ka naam META_MASTER_TOKEN rakha gaya hai
    const metaToken = process.env.META_MASTER_TOKEN || process.env.META_AD_API_TOKEN;
    
    if (metaToken && !metaToken.includes('DUMMY')) {
      const metaRes = await axios.get('https://graph.facebook.com/v19.0/ads_archive', {
        params: {
          search_terms: query,
          ad_reached_countries: "['IN', 'US']",
          ad_active_status: 'ACTIVE',
          fields: 'page_name,ad_creative_bodies,ad_creation_time',
          access_token: metaToken
        }
      });
      if (metaRes.data.data && metaRes.data.data.length > 0) {
        console.log(`[Vision Debug] ✅ Meta API Success: Found ${metaRes.data.data.length} ads.`);
        metaAdsData = JSON.stringify(metaRes.data.data.slice(0, 3));
      } else {
        console.log(`[Vision Debug] ⚠️ Meta API Success, but 0 active ads found for this query.`);
        metaAdsData = "API Success, but no active Meta ads found for this exact query.";
      }
    } else {
      throw new Error("Meta Token is missing or DUMMY.");
    }
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.log(`❌ [Vision Debug] Meta API Failed (${errMsg}). Switching to Apify Scraper Fallback...`);
    
    // Fallback to Apify agar Meta API block karta hai
    try {
      const apifyToken = process.env.APIFY_TOKEN;
      if (apifyToken && !apifyToken.includes('DUMMY')) {
        const scrapedAds = await scraperService.scrapeFacebookAds(query);
        metaAdsData = scrapedAds.length > 0 ? JSON.stringify(scrapedAds) : "Apify Scraper ran successfully, but no active ads were found.";
      } else {
        metaAdsData = "Both Meta API and Apify Scraper failed/skipped due to missing tokens.";
      }
    } catch (apifyError) {
      metaAdsData = `Meta API and Apify Scraper both failed.`;
    }
  }

  // 2. AI ko comparison aur analysis ke liye command (Prompt) dena
  console.log(`[Vision Debug] 🧠 Step 3: Sending Combined Data (Google + Meta) to AI...`);
  const prompt = `
  You are an expert Ad Analyst and Marketer.
  The user searched for competitor ads or products using the query: "${query}".
  
  --- LIVE DATA FED FROM APIs ---
  Google Search Results: ${searchData}
  Meta (Facebook/Instagram) Ads: ${metaAdsData}
  -------------------------------

  CRITICAL INSTRUCTIONS:
  1. If the live data contains actual ads or URLs, you MUST explicitly include their EXACT clickable URLs (starting with https://) and brand names in your analysis. Users want to see the links, not just read text summaries!
  2. If the live data says an API failed (e.g., Token missing, Permission error, or no ads found), you MUST explicitly inform the user about this exact reason in the "overallSummary" so they know why you can't show specific ads.
  3. Analyze why these top results/competitors are viral and successful.

  ${userAdUrl ? `The user also provided their own Ad/Product URL for comparison: "${userAdUrl}". Compare the user's ad to the top competitors.` : 'Provide a breakdown of the top ads.'}
  
  Return ONLY valid JSON format:
  {
    "viralScore": 95,
    "viralLabel": "High",
    "overallSummary": "A detailed summary. You MUST include the exact exact clickable URLs (Links) you found so the user can click them. If the Meta API failed, state the exact reason.",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1"],
    "comparison": "Detailed comparison with user's ad or gap analysis. Mention the specific competitors.",
    "actionableTips": ["Tip 1", "Tip 2"]
  }
  `;

  let aiResponseText = "";
  try {
    if (hasGemini) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      let result;
      let lastError;
      const GEMINI_MODELS = ["gemini-2.5-pro", "gemini-2.5-flash"];
      
      for (const modelName of GEMINI_MODELS) {
        try {
          console.log(`[Vision Debug] 🤖 Triggering Gemini Model: ${modelName}...`);
          const model = genAI.getGenerativeModel({ model: modelName });
          result = await model.generateContent(prompt);
          console.log(`[Vision Debug] ✅ AI Analysis completed using: ${modelName}`);
          break;
        } catch (e) {
          console.log(`⚠️ [Vision Debug] Model ${modelName} failed. Reason: ${e.message}. Trying next...`);
          lastError = e;
        }
      }
      if (!result) throw lastError;
      aiResponseText = result.response.text();
    } else {
      console.log(`[Vision Debug] 🤖 Triggering OpenAI GPT-4o...`);
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const aiResponse = await client.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }] });
      aiResponseText = aiResponse.choices[0].message.content;
      console.log(`[Vision Debug] ✅ AI Analysis completed using: GPT-4o`);
    }
  } catch (aiErr) {
    console.error("❌ [Vision Debug] AI Inference Error:", aiErr);
    throw new Error("AI generation failed: " + aiErr.message);
  }

  console.log(`[Vision Debug] 🧹 Step 4: Parsing JSON output...`);
  const cleaned = aiResponseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    console.log(`[Vision Debug] 🎉 Pipeline complete! Returning valid JSON.`);
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.error("❌ [Vision Debug] JSON Parse Error. AI returned invalid JSON:", cleaned);
    return {
      viralScore: 0,
      viralLabel: "Error",
      overallSummary: "AI could not properly format the response. Please try scanning again.",
      strengths: [],
      weaknesses: ["Format mismatch from AI"],
      actionableTips: ["Try adjusting the search query."]
    };
  }
};