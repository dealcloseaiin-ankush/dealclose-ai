const { GoogleGenerativeAI } = require('@google/generative-ai');

// 🌊 ULTRA COST-EFFECTIVE MODELS FOR VISION / OCR
const VISION_MODELS = {
  GEMINI_3_1_LIGHT: 'gemini-3.1-flash-light', // Priority 1 (Latest, Cheapest & Fast)
  GEMINI_2_5_LIGHT: 'gemini-2.5-flash-light', // Priority 2 (Backup Gemini)
};

/**
 * Extracts text and structured data from an image buffer using Google Gemini Vision.
 * @param {Buffer} imageBuffer The binary data of the image.
 * @param {string} mimeType The mime type (e.g., 'image/jpeg').
 * @returns {Promise<string>} The extracted text.
 */
exports.extractTextFromImage = async (imageBuffer, mimeType) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in .env");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const prompt = "Please carefully read this handwritten or printed list. Extract all items, quantities, and any mentioned prices. Return the result nicely formatted as a clean, structured list. If you cannot read it, politely say so.";

    const imageParts = [
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: mimeType
        }
      }
    ];

    // 🚀 DYNAMIC MULTI-MODEL FALLBACK CHAIN FOR VISION
    
    // Priority 1: Try Gemini 3.1 Flash Light (Vision Supported)
    try {
      const model = genAI.getGenerativeModel({ model: VISION_MODELS.GEMINI_3_1_LIGHT });
      const result = await model.generateContent([prompt, ...imageParts]);
      console.log(`✅ [OCR AI] Successfully extracted text using model: ${VISION_MODELS.GEMINI_3_1_LIGHT}`);
      return result.response.text();
    } catch (gemini3Error) {
      console.warn(`⚠️ [OCR AI] ${VISION_MODELS.GEMINI_3_1_LIGHT} failed or busy: ${gemini3Error.message}. Trying ${VISION_MODELS.GEMINI_2_5_LIGHT}...`);
    }

    // Priority 2: Try Gemini 2.5 Flash Light (Vision Supported)
    try {
      const model = genAI.getGenerativeModel({ model: VISION_MODELS.GEMINI_2_5_LIGHT });
      const result = await model.generateContent([prompt, ...imageParts]);
      console.log(`✅ [OCR AI] Successfully extracted text using model: ${VISION_MODELS.GEMINI_2_5_LIGHT}`);
      return result.response.text();
    } catch (gemini2Error) {
      console.error(`❌ [OCR AI] Both Vision models failed.`);
      throw gemini2Error; // Agar dono models fail ho jayein toh error aage pass karein
    }

  } catch (error) {
    console.error('Gemini Vision API Error:', error);
    throw error;
  }
};