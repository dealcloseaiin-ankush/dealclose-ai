const { GoogleGenerativeAI } = require('@google/generative-ai');

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
    // gemini-1.5-flash is extremely fast and handles images perfectly
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Please carefully read this handwritten or printed list. Extract all items, quantities, and any mentioned prices. Return the result nicely formatted as a clean, structured list. If you cannot read it, politely say so.";

    const imageParts = [
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: mimeType
        }
      }
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini Vision API Error:', error);
    throw error;
  }
};