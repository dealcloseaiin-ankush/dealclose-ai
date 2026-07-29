const aiService = require('./aiService');
const aiValidationService = require('./aiValidationService');

exports.generateDesignJson = async (prompt, businessContext) => {
  const systemPrompt = `
    You are a world-class graphic designer and social media expert, similar to Canva's Magic Design AI.
    Your task is to generate a complete, professional Instagram post design based on a user's prompt and their business context.
    The output MUST be a single, valid JSON object representing the design specification for a 1080x1080 canvas.
    
    **CRITICAL INSTRUCTION FOR CAPTION:** The Call-to-Action (CTA) in the caption MUST explicitly ask the user to send a Direct Message (DM). For example, instead of "Click the link in bio", you MUST write "DM us 'INFO' to learn more!" or "DM us the keyword 'DEAL' to get a special discount!". This is essential for driving engagement and leads directly through Instagram DMs.
    
    BUSINESS CONTEXT: ${JSON.stringify(businessContext) || 'A generic local business.'}

    **Your output MUST be a single, valid JSON object matching this exact structure:**
    {
      "canvas": { "width": 1080, "height": 1080, "backgroundColor": "#ffffff" },
      "caption": "A creative and engaging caption for the post, including a CTA.",
      "hashtags": "#relevant #hashtags #for #the #post",
      "layers": [
        {
          "type": "text", "text": "Compelling Headline Here", "fontFamily": "Poppins", "fontSize": 120, "fontWeight": "bold", "fill": "#000000",
          "left": 540, "top": 200, "originX": "center", "originY": "center", "textAlign": "center"
        },
        {
          "type": "text", "text": "Supporting text or offer details", "fontFamily": "Roboto", "fontSize": 60, "fontWeight": "normal", "fill": "#555555",
          "left": 540, "top": 350, "originX": "center", "originY": "center", "textAlign": "center"
        },
        {
          "type": "rect", "width": 300, "height": 100, "fill": "#ff4136", "left": 540, "top": 850, "originX": "center", "originY": "center", "rx": 20, "ry": 20
        },
        {
          "type": "text", "text": "SHOP NOW", "fontFamily": "Montserrat", "fontSize": 40, "fontWeight": "bold", "fill": "#ffffff",
          "left": 540, "top": 850, "originX": "center", "originY": "center"
        },
        {
          "type": "image", "src": "AI_IMAGE_PROMPT: A high-quality, professional product shot of [product] on a clean background.",
          "left": 540, "top": 550, "originX": "center", "originY": "center", "width": 600, "height": 400, "scaleX": 1, "scaleY": 1
        }
      ]
    }

    **DESIGN RULES:**
    1.  Analyze the user's prompt (e.g., "Rakshabandhan offer") and business context.
    2.  Choose a suitable, professional color palette. Set the 'backgroundColor'. Use brand colors from context if available.
    3.  Create a compelling Headline and a supporting Subheading.
    4.  If it's an offer, create a CTA button using a 'rect' and a 'text' layer.
    5.  For images, DO NOT provide a URL. Instead, for the "src" property, provide a detailed AI image generation prompt starting with "AI_IMAGE_PROMPT:". The backend will generate the image.
    6.  Position elements logically. Use 'originX': 'center' for easy centering.
    7.  Choose professional and readable fonts from Google Fonts (e.g., Poppins, Montserrat, Roboto).
    8.  Generate a relevant 'caption' and 'hashtags' for the post.
    9.  The final output must be ONLY the JSON object, with no extra text, comments, or markdown.
  `;

  try {
    // ✅ FIX: The `generateAIResponse` function now returns a direct string, not an object.
    // The previous code was trying to destructure a `content` property, which caused
    // a `TypeError: Cannot read properties of undefined (reading 'replace')`.
    // We now correctly handle the string response and temporarily lose the 'usage' data from this path.
    const rawJsonResponse = await aiService.generateAIResponse(prompt, systemPrompt, 'instagram-design');
    const cleanedJson = (rawJsonResponse || '').replace(/```json|```/g, '').trim();
    const designSpec = JSON.parse(cleanedJson);

    // This service's only job is to generate. The orchestrator (aiTemplateService) will be responsible for validation.
    // This removes the duplicate validation call.
    return { designJson: designSpec, usage: null }; // Return null for usage for now
  } catch (error) {
    console.error("AI Design Service Error:", error);
    throw new Error("AI failed to generate a valid design. Please try a different prompt.");
  }
};