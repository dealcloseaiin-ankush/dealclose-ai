const OpenAI = require('openai');
const promptBuilder = require('./promptBuilder');
const axios = require('axios');

exports.analyzeImage = async (imageUrl, platform, scanType, scrapedData = null) => {
  const prompt = promptBuilder.buildPrompt(platform, scanType, scrapedData);
  
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
      console.log("[Vision AI] Trying Gemini 1.5 Flash...");
      const geminiClient = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
      });
      rawResponse = await callAI(geminiClient, 'gemini-1.5-flash');
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

  let searchData = "";
  try {
    // 1. SerpAPI se live data lana (Google Search)
    const serpApiKey = process.env.SERP_API_KEY;
    if (serpApiKey) {
      const response = await axios.get('https://serpapi.com/search.json', {
        params: { q: query, engine: "google", api_key: serpApiKey }
      });
      // Top 5 organic results ki summary nikal rahe hain
      searchData = JSON.stringify(response.data.organic_results?.slice(0, 5) || "No organic results found");
    } else {
      searchData = "Live search disabled. Base your answer on your internal knowledge database.";
    }
  } catch (error) {
    console.error("[Vision Service] SerpAPI Error:", error.message);
    searchData = "Failed to fetch live web data. Provide a general marketing analysis.";
  }

  // 1.5. Meta Ad Library API se live Facebook/Instagram Ads lana
  let metaAdsData = "";
  try {
    const metaToken = process.env.META_AD_API_TOKEN;
    if (metaToken) {
      const metaRes = await axios.get('https://graph.facebook.com/v19.0/ads_archive', {
        params: {
          search_terms: query,
          ad_reached_countries: "['IN', 'US']", // Default searching in India and US
          ad_active_status: 'ACTIVE',
          fields: 'page_name,ad_creative_bodies,ad_creation_time',
          access_token: metaToken
        }
      });
      metaAdsData = JSON.stringify(metaRes.data.data?.slice(0, 3) || "No Meta ads found");
    }
  } catch (error) {
    console.error("[Vision Service] Meta Ad API Error:", error.response?.data?.error?.message || error.message);
  }

  // 2. AI ko comparison aur analysis ke liye command (Prompt) dena
  const prompt = `
  You are an expert Ad Analyst and Marketer.
  The user searched for competitor ads or products using the query: "${query}".
  Here are the top web search results for this query: ${searchData}
  Here are the active Meta (Facebook/Instagram) Ads for this query: ${metaAdsData}

  Analyze why these top results/competitors are viral, successful, and ranking high.
  ${userAdUrl ? `The user also provided their own Ad/Product URL for comparison: "${userAdUrl}". Compare the user's ad to the top competitors. Explain the difference and how they can improve.` : 'Provide a breakdown of the top ads and give 3 tips on how the user can create a viral ad in this niche.'}
  
  Return ONLY valid JSON format:
  {
    "viralScore": 95,
    "viralLabel": "High",
    "overallSummary": "summary of the top competitors here...",
    "strengths": ["strength 1", "strength 2"],
    "weaknesses": ["weakness 1"],
    "comparison": "Detailed comparison with user's ad (if provided) or general gap analysis.",
    "actionableTips": ["Tip 1", "Tip 2"]
  }
  `;

  const client = new OpenAI({ 
    apiKey: hasGemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY,
    baseURL: hasGemini ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined
  });
  const aiResponse = await client.chat.completions.create({
    model: hasGemini ? 'gemini-1.5-flash' : 'gpt-4o', 
    messages: [{ role: 'user', content: prompt }]
  });

  const cleaned = aiResponse.choices[0].message.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
};