const Template = require('../models/templateModel');
const aiService = require('./aiService');

/**
 * Intelligently finds a template, fills it, or edits an existing design using AI.
 * @param {string} prompt - The user's request, e.g., "Create a Diwali Sale".
 * @param {object} businessContext - Context about the user's business.
 * @param {object} [existingDesignJson=null] - The current design JSON, if the user is editing.
 * @returns {Promise<object>} The filled and updated Design JSON.
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
    const keywords = prompt.toLowerCase().split(' ');
    const template = await Template.findOne({
      $or: [{ name: { $regex: keywords.join('|'), $options: 'i' } }, { tags: { $in: keywords } }]
    }).sort({ usageCount: -1 }).lean();

    if (!template) throw new Error("No suitable template found. Try a different prompt.");
    designJsonForPrompt = template.designJson;

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
    const rawJsonResponse = await aiService.generateAIResponse("", systemPrompt, 'template-filler');
    
    // Clean the response to ensure it's valid JSON
    const cleanedJson = rawJsonResponse.replace(/```json|```/g, '').trim();
    const filledDesignJson = JSON.parse(cleanedJson);

    // Final check: Ensure the core structure is intact
    if (!filledDesignJson.canvas || !filledDesignJson.layers) {
      throw new Error("AI returned an invalid JSON structure.");
    }

    return filledDesignJson;

  } catch (error) {
    console.error("AI Template Filler Service Error:", error);
    throw new Error("AI failed to process the design. Please try again.");
  }
};

// Keep the old function name for backward compatibility if other parts of the app use it.
exports.fillTemplateWithAI = (prompt, businessContext) => exports.generateOrEditDesign(prompt, businessContext, null);