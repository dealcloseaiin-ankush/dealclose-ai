const OpenAI = require('openai');
const promptBuilder = require('./promptBuilder');

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