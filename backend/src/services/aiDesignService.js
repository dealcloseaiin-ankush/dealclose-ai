const aiService = require('./aiService');

exports.generateDesignJson = async (prompt, businessContext) => {
  const systemPrompt = `
    You are a world-class graphic designer and social media expert, similar to Canva's Magic Design AI.
    Your task is to generate a complete, professional Instagram post design based on a user's prompt and their business context.
    The output MUST be a single, valid JSON object representing the design specification for a 1080x1080 canvas.

    BUSINESS CONTEXT: ${businessContext || 'A generic local business.'}

    JSON STRUCTURE:
    {
      "canvas": { "width": 1080, "height": 1080, "backgroundColor": "#ffffff" },
      "caption": "A creative and engaging caption for the post, including a CTA.",
      "hashtags": "#relevant #hashtags #for #the #post",
      "layers": [
        {
          "type": "text", "text": "Headline Text", "fontFamily": "Poppins", "fontSize": 120, "fontWeight": "bold", "fill": "#000000",
          "left": 540, "top": 200, "originX": "center", "originY": "center", "textAlign": "center"
        },
        {
          "type": "text", "text": "Subheading or offer details", "fontFamily": "Roboto", "fontSize": 60, "fontWeight": "normal", "fill": "#555555",
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

    DESIGN RULES:
    1.  Analyze the user's prompt (e.g., "Rakshabandhan offer") and business context.
    2.  Choose a suitable color palette. Set the 'backgroundColor'.
    3.  Create a compelling Headline and Subheading.
    4.  If it's an offer, create an offer badge or a CTA button using 'rect' and 'text' layers.
    5.  For images, DO NOT provide a URL. Instead, for the "src" property, provide a detailed AI image generation prompt starting with "AI_IMAGE_PROMPT:". The backend will generate the image.
    6.  Position elements logically using 'left' and 'top' coordinates. Use 'originX': 'center' for easy centering.
    7.  Choose professional and readable fonts from Google Fonts (e.g., Poppins, Montserrat, Roboto, Lato).
    8.  Generate a relevant 'caption' and 'hashtags' for the Instagram post itself.
    9.  The final output must be ONLY the JSON object, with no extra text or markdown.
  `;

  try {
    const rawJsonResponse = await aiService.generateAIResponse(prompt, systemPrompt, 'instagram-design');
    // Clean the response to ensure it's valid JSON
    const cleanedJson = rawJsonResponse.replace(/```json|```/g, '').trim();
    const designSpec = JSON.parse(cleanedJson);
    return designSpec;
  } catch (error) {
    console.error("AI Design Service Error:", error);
    throw new Error("AI failed to generate a valid design. Please try a different prompt.");
  }
};