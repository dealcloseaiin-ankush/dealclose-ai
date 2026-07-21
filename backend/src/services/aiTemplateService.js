const Template = require('../models/templateModel');
const aiService = require('./aiService');
const Replicate = require('replicate');

const IMAGE_MODEL = 'bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637';

const generateDesignImages = async (design) => {
  if (!process.env.REPLICATE_API_TOKEN || !Array.isArray(design.layers)) return design;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  await Promise.all(design.layers.map(async layer => {
    if (layer.type !== 'image' || typeof layer.src !== 'string' || !layer.src.startsWith('AI_IMAGE_PROMPT:')) return;
    try {
      const output = await replicate.run(IMAGE_MODEL, {
        // ✅ NEW: Add more context to the image prompt for better results
        input: { prompt: `${layer.src.replace('AI_IMAGE_PROMPT:', '').trim()}, professional social-media design, high quality` }
      });
      const imageUrl = Array.isArray(output) ? output[0] : output;
      if (imageUrl) {
        layer.src = imageUrl;
        layer.crossOrigin = 'anonymous';
      }
    } catch (error) {
      console.warn('[AI Designer] ⚠️ Background image generation failed:', error.message);
    }
  }));

  return design;
};
const aiDesignService = require('./aiDesignService'); // ✅ NEW: Import the from-scratch design service

/**
 * Intelligently finds a template, fills it, or edits an existing design using AI.
 * @param {string} prompt - The user's request, e.g., "Create a Diwali Sale".
 * @param {object} businessContext - Context about the user's business.
 * @param {object} [existingDesignJson=null] - The current design JSON, if the user is editing.
 * @returns {Promise<{designJson: object, usage: object}>} The filled design and AI usage data.
 */
exports.generateOrEditDesign = async (prompt, businessContext, existingDesignJson = null) => {
  let designJsonForPrompt;
  let systemPrompt;

  if (existingDesignJson) {
    // --- EDITING LOGIC ---
    console.log(`[AI Designer] Editing existing design.`);
    designJsonForPrompt = existingDesignJson;
    systemPrompt = `
      You are an expert graphic designer. Your task is to modify an existing JSON design based on a user's edit request.
      - User's Request: "${prompt}"
      - Business Context: Brand Colors are ${businessContext.brandKit?.primaryColor} and ${businessContext.brandKit?.secondaryColor}. Logo is at ${businessContext.brandKit?.logoUrl}.
      - Existing Design JSON: ${JSON.stringify(designJsonForPrompt, null, 2)}
      
      **Your Task:**
      1.  Analyze the user's request (e.g., "move logo left", "make text bigger", "add fireworks").
      2.  Modify ONLY the necessary properties of the layers in the JSON to fulfill the request.
      3.  DO NOT change layer IDs or recreate the entire design. Only edit values.
      4.  If asked to add something new (like "add fireworks"), create a new layer for it.
      5.  Return ONLY the modified, complete, and valid JSON object. No markdown or other text.
    `;
  } else {
    // --- CREATION LOGIC (Existing Logic) ---
    console.log(`[AI Designer] Creating new design from template.`);
    const keywords = prompt.toLowerCase().split(/\s+/).filter(k => k.length > 2); // Filter out short words
    let template = await Template.findOne({
      $or: [{ name: { $regex: keywords.join('|'), $options: 'i' } }, { tags: { $in: keywords } }]
    }).sort({ usageCount: -1 }).lean();

    // ✅ FIX: If no specific template is found, use the most popular generic one as a fallback.
    if (!template) {
      console.log(`[AI Designer] No specific template found for "${prompt}". Using a popular fallback template.`);
      template = await Template.findOne({}).sort({ usageCount: -1 }).lean();
    }

    // ✅ FIX: If still no template, generate a design from scratch.
    if (!template) {
      console.log(`[AI Designer] No templates found in DB. Generating a new design from scratch.`);
      // This service asks the AI to create a full design, not just fill one.
      // ✅ FIX: The generateDesignJson service returns an object { designJson, usage }.
      // We need to extract the 'designJson' part before passing it to the image generator.
      const { designJson: generatedDesignSpec, usage: designUsage } = await aiDesignService.generateDesignJson(prompt, businessContext);
      const finalDesignWithImages = await generateDesignImages(generatedDesignSpec);
      console.log(`✅ [AI Designer] Generated a new design from scratch with a background color and AI image.`);
      return { designJson: finalDesignWithImages, usage: designUsage };
    }

    designJsonForPrompt = template.designJson;
    console.log(`[AI Designer] Using template "${template.name}" to generate design.`);

    systemPrompt = `
      You are an expert copywriter and graphic designer. Your task is to populate a given JSON design template with new content based on a user's prompt and their business details.
      - Business Context: Name: ${businessContext.brandKit?.businessName || 'Our Business'}, Description: ${businessContext.description}, Logo: ${businessContext.brandKit?.logoUrl}, Colors: ${businessContext.brandKit?.primaryColor}, ${businessContext.brandKit?.secondaryColor}.
      - User's Request: "${prompt}"
      - Original Template JSON: ${JSON.stringify(designJsonForPrompt, null, 2)}

      **Your Task:**
      1.  Intelligently modify ONLY the 'text', 'fill' (color), and 'src' (for logo/images) properties.
      2.  DO NOT change the layout (left, top, width, height).
      3.  Update the main 'caption' and 'hashtags' to be relevant.
      4.  Return ONLY the modified, complete, and valid JSON object. No markdown.
    `;
    // Increment usage count for the template
    await Template.updateOne({ _id: template._id }, { $inc: { usageCount: 1 } });
  }

  try {
    // We send an empty user message because all context is in the system prompt
    const { content: rawJsonResponse, usage } = await aiService.generateAIResponse("", systemPrompt, 'template-filler');

    // Clean the response to ensure it's valid JSON
    const cleanedJson = rawJsonResponse.replace(/```json|```/g, '').trim();
    const filledDesignJson = JSON.parse(cleanedJson);

    // Final check: Ensure the core structure is intact
    if (!filledDesignJson.canvas || !filledDesignJson.layers) {
      throw new Error("AI returned an invalid JSON structure.");
    }

    return {
      designJson: await generateDesignImages(filledDesignJson),
      usage // Pass usage data back to the controller
    };

  } catch (error) {
    console.error("AI Template Filler Service Error:", error);
    throw new Error("AI failed to process the design. Please try again.");
  }
};

/**
 * Generates a complete design from scratch using AI.
 * @param {string} prompt The user's prompt.
 * @param {object} businessContext Business context.
 * @returns {Promise<{designJson: object, usage: object}>} The generated design and usage data.
 */
aiDesignService.generateDesignJson = async (prompt, businessContext) => {
  // ... (existing system prompt)
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
    const { content: rawJsonResponse, usage } = await aiService.generateAIResponse(prompt, systemPrompt, 'instagram-design');
    const cleanedJson = rawJsonResponse.replace(/```json|```/g, '').trim();
    const designSpec = JSON.parse(cleanedJson);
    return { designJson: designSpec, usage }; // Return both design and usage
  } catch (error) {
    console.error("AI Design Service Error:", error);
    throw new Error("AI failed to generate a valid design. Please try a different prompt.");
  }
};

// Keep the old function name for backward compatibility if other parts of the app use it.
exports.fillTemplateWithAI = (prompt, businessContext) => exports.generateOrEditDesign(prompt, businessContext, null);
