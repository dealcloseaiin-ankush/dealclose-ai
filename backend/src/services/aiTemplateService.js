const Template = require('../models/templateModel');
const aiService = require('./aiService');
const aiDesignService = require('./aiDesignService'); // ✅ NEW: Import the from-scratch design service
const templateProvider = require('../providers/templateProvider'); // ✅ FIX: Correct path to the new providers directory
const aiValidationService = require('./aiValidationService'); // ✅ NEW: Import the validation service
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
    
    if (!template) {
      console.log(`[AI Designer] No specific template found for "${prompt}". Using a popular fallback template.`);
      template = await Template.findOne({}).sort({ usageCount: -1 }).lean();
    }

    // ✅ ARCHITECTURE FIX: If NO template is found in the DB, call the dedicated from-scratch generator.
    if (!template) {
      console.log(`[AI Designer] No templates in DB. Generating a new design from scratch.`);
      return aiDesignService.generateDesignJson(prompt, businessContext);
    }

    designJsonForPrompt = template.designJson; // This will be the base for the AI to fill
    console.log(`[AI Designer] Using template "${template.name}" to generate design.`);

    // ✅ FIX: Improved prompt to ensure AI acts as a copywriter and replaces placeholders.
    systemPrompt = `
      You are an expert copywriter and graphic designer. Your task is to populate a given JSON design template with new content based on a user's prompt and their business details.
      - Business Context: Name: ${businessContext.brandKit?.businessName || 'Our Business'}, Description: ${businessContext.description}, Logo: ${businessContext.brandKit?.logoUrl}, Colors: ${businessContext.brandKit?.primaryColor}, ${businessContext.brandKit?.secondaryColor}.
      - Recent proven post performance, if available: ${JSON.stringify(businessContext.socialPerformance || 'No analytics yet')}
      - User's Request: "${prompt}"
      - Original Template JSON: ${JSON.stringify(designJsonForPrompt, null, 2)}

      **Your Task:**
      1.  Analyze the user's request and business context.
      2.  Replace placeholder text like '[HEADLINE]', '[CTA]', '[businessName]', '[website]' with compelling, relevant content.
      3.  Replace placeholder colors like '[primaryColor]' with the actual brand color from the business context.
      4.  Replace placeholder image sources like '[logoUrl]' with the actual logo URL.
      5.  For image layers with "AI_IMAGE_PROMPT:", update the prompt inside to be specific to the user's request.
      6.  DO NOT change the layout (left, top, width, height, etc.).
      7.  Update the main 'caption' and 'hashtags' to be relevant.
      8.  When proven performance is available, use it as a creative signal only: retain the successful content angle or CTA style without copying the old caption. Do not claim results or invent metrics in the post.
      9.  Return ONLY the modified, complete, and valid JSON object. No markdown.
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

    // ✅ NEW: Validate and repair the AI-filled template.
    const { valid, repairedDesign, errors } = aiValidationService.validateAndRepair(filledDesignJson, businessContext);

    if (!valid) {
      console.warn('[AI Validation] AI-filled template failed validation. Using fallback.', { errors });
      // If validation fails, use the robust fallback template but try to inject the AI's generated text content.
      const fallbackTemplate = templateProvider.getBestTemplate(prompt, businessContext);
      const fallbackWithContent = { ...fallbackTemplate.designJson };
      fallbackWithContent.caption = filledDesignJson.caption || fallbackWithContent.caption;
      fallbackWithContent.layers[1].text = (filledDesignJson.layers?.find(l => l.text?.length > 5)?.text || 'Your Headline Here');
      
      // Return the fallback, but with the original usage data for accurate cost tracking.
      return { designJson: await generateDesignImages(fallbackWithContent), usage };
    }

    return {
      designJson: await generateDesignImages(repairedDesign), // Use the repaired design
      usage // Pass usage data back to the controller
    };

  } catch (error) {
    console.error("AI Template Filler Service Error:", error);
    throw new Error("AI failed to process the design. Please try again.");
  }
};

// Keep the old function name for backward compatibility if other parts of the app use it.
exports.fillTemplateWithAI = (prompt, businessContext) => exports.generateOrEditDesign(prompt, businessContext, null);
