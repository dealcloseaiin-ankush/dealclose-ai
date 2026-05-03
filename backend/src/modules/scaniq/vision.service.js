const OpenAI = require('openai');
const promptBuilder = require('./promptBuilder');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.analyzeImage = async (imageUrl, platform, scanType, scrapedData = null) => {
  const prompt = promptBuilder.buildPrompt(platform, scanType, scrapedData);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
      ]
    }]
  });
  
  const raw = response.choices[0].message.content;
  
  // AI kabhi kabhi markdown (```json ... ```) bhej deta hai, usko hatane ke liye:
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  return JSON.parse(cleaned);
};