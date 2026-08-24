const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai');
const aiUsageTracker = require('./aiUsageTracker');

// 🌊 DEALCLOSE AI ULTRA COST-EFFECTIVE MODELS FOR VISION / OCR
const VISION_MODELS = {
  GEMINI_3_5_LITE: 'gemini-3.5-flash-lite',  // Priority 1: Primary Vision Flash-Lite
  GEMINI_3_1_LITE: 'gemini-3.1-flash-lite',  // Priority 2: Secondary Vision Flash-Lite
  GEMINI_2_5_LITE: 'gemini-2.5-flash-lite',  // Priority 3: Backup Vision Flash-Lite
  OPENAI_MINI: 'gpt-4o-mini',                // Priority 4: OpenAI Vision Fallback
};

/**
 * Extracts text and structured data from an image buffer using Google Gemini Vision.
 * @param {Buffer} imageBuffer The binary data of the image.
 * @param {string} mimeType The mime type (e.g., 'image/jpeg').
 * @returns {Promise<string>} The extracted text.
 */
exports.extractTextFromImage = async (imageBuffer, mimeType, userId = null) => {
  try {
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('dummy');

    if (!hasGemini && !hasOpenAI) {
      throw new Error("AI API keys (GEMINI or OPENAI) are not defined in .env");
    }

    const prompt = "Please carefully read this handwritten or printed list. Extract all items, quantities, and any mentioned prices. Return the result nicely formatted as a clean, structured list. If you cannot read it, politely say so.";

    const imageParts = [
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: mimeType
        }
      }
    ];

    let extractedText = "";
    let modelUsed = "";

    // 🚀 DYNAMIC MULTI-MODEL FALLBACK CHAIN FOR VISION
    if (hasGemini) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const visionChain = [
        VISION_MODELS.GEMINI_3_5_LITE,
        VISION_MODELS.GEMINI_3_1_LITE,
        VISION_MODELS.GEMINI_2_5_LITE,
      ];

      for (const modelName of visionChain) {
        if (extractedText) break;
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([prompt, ...imageParts]);
          const response = await result.response;
          extractedText = response.text();
          modelUsed = modelName;
          if (userId) aiUsageTracker.trackUsage({ userId, feature: 'ocr-vision', provider: 'gemini', model: modelUsed, usage: response.usageMetadata });
          console.log(`✅ [OCR AI] Successfully extracted text using model: ${modelUsed}`);
          return extractedText;
        } catch (geminiError) {
          console.warn(`⚠️ [OCR AI] ${modelName} failed or busy: ${geminiError.message}. Trying next fallback...`);
        }
      }
    }

    // Priority 3: Final Fallback to OpenAI gpt-4o-mini
    if (hasOpenAI) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const completion = await openai.chat.completions.create({
        model: VISION_MODELS.OPENAI_MINI,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
      });
      extractedText = completion.choices[0].message.content;
      modelUsed = VISION_MODELS.OPENAI_MINI;
      if (userId) aiUsageTracker.trackUsage({ userId, feature: 'ocr-vision', provider: 'openai', model: modelUsed, usage: completion.usage });
      console.log(`✅ [OCR AI] Successfully extracted text using fallback model: ${modelUsed}`);
      return extractedText;
    }

    throw new Error('All AI vision models failed to respond.');

  } catch (error) {
    console.error('Gemini Vision API Error:', error);
    throw error;
  }
};