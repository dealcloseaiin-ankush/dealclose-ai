const aiService = require('./aiService');
const aiValidationService = require('./aiValidationService');

exports.generateDesignJson = async (prompt, businessContext) => {
  const systemPrompt = `
    You are a world-class graphic designer and social media expert, similar to Canva's Magic Design AI and Apple keynote designers.
    Your task is to generate a complete, stunning, high-converting Instagram/LinkedIn post design (1080x1080) based on a user's prompt OR full script/dialogue.

    **SMART CONTENT EXTRACTION RULES (If user provides a long script, bullet points, or dialogue):**
    1. DO NOT dump massive paragraphs onto the canvas.
    2. Extract a Punchy Hook/Headline (max 5-7 words, e.g. "Tired of Endless Follow-ups? 🚀" or "Automate Sales with AI 🤖").
    3. Extract 2-3 Core Value Highlight Badges (e.g. "✅ Smart Auto-Followup", "✅ AI Client Insights", "✅ Close 10x More Deals").
    4. Create a prominent Call-to-Action (CTA) button or badge (e.g. "👉 www.dealcloseai.in | DM us 'CLOSE'").
    5. In the "caption" field, preserve the user's FULL detailed script and story along with the hashtags!

    BUSINESS CONTEXT: ${JSON.stringify(businessContext) || 'DealClose AI sales platform.'}

    **Your output MUST be a single, valid JSON object matching this exact structure:**
    {
      "canvas": { "width": 1080, "height": 1080, "backgroundColor": "#0c0d14" },
      "caption": "Full formatted caption with all bullet points, explanation, and CTA.",
      "hashtags": "#DealCloseAI #SalesTips #AIForBusiness #B2BSales #LeadGeneration",
      "layers": [
        {
          "type": "rect", "width": 1080, "height": 1080, "fill": "#0c0d14",
          "left": 540, "top": 540, "originX": "center", "originY": "center"
        },
        {
          "type": "text", "text": "MAIN PUNCHY HEADLINE 🚀", "fontFamily": "Poppins", "fontSize": 82, "fontWeight": "bold", "fill": "#ffffff",
          "left": 540, "top": 240, "originX": "center", "originY": "center", "textAlign": "center", "width": 950
        },
        {
          "type": "text", "text": "Subheading or Hook sentence", "fontFamily": "Inter", "fontSize": 42, "fontWeight": "normal", "fill": "#a1a1aa",
          "left": 540, "top": 360, "originX": "center", "originY": "center", "textAlign": "center", "width": 900
        },
        {
          "type": "rect", "width": 860, "height": 90, "fill": "rgba(255,255,255,0.06)", "stroke": "#ec4899", "strokeWidth": 2,
          "left": 540, "top": 480, "originX": "center", "originY": "center", "rx": 18, "ry": 18
        },
        {
          "type": "text", "text": "✅ Smart Automation: Emails & WhatsApp on autopilot", "fontFamily": "Poppins", "fontSize": 34, "fontWeight": "bold", "fill": "#ffffff",
          "left": 540, "top": 480, "originX": "center", "originY": "center", "textAlign": "center"
        },
        {
          "type": "rect", "width": 860, "height": 90, "fill": "rgba(255,255,255,0.06)", "stroke": "#8b5cf6", "strokeWidth": 2,
          "left": 540, "top": 600, "originX": "center", "originY": "center", "rx": 18, "ry": 18
        },
        {
          "type": "text", "text": "✅ AI Client Insights: Predict needs & pitch perfectly", "fontFamily": "Poppins", "fontSize": 34, "fontWeight": "bold", "fill": "#ffffff",
          "left": 540, "top": 600, "originX": "center", "originY": "center", "textAlign": "center"
        },
        {
          "type": "rect", "width": 860, "height": 90, "fill": "rgba(255,255,255,0.06)", "stroke": "#10b981", "strokeWidth": 2,
          "left": 540, "top": 720, "originX": "center", "originY": "center", "rx": 18, "ry": 18
        },
        {
          "type": "text", "text": "✅ 10x Growth: Close more deals with zero stress", "fontFamily": "Poppins", "fontSize": 34, "fontWeight": "bold", "fill": "#ffffff",
          "left": 540, "top": 720, "originX": "center", "originY": "center", "textAlign": "center"
        },
        {
          "type": "rect", "width": 600, "height": 95, "fill": "#ec4899",
          "left": 540, "top": 890, "originX": "center", "originY": "center", "rx": 24, "ry": 24
        },
        {
          "type": "text", "text": "👉 Visit: dealcloseai.in (Link in Bio)", "fontFamily": "Poppins", "fontSize": 36, "fontWeight": "bold", "fill": "#ffffff",
          "left": 540, "top": 890, "originX": "center", "originY": "center"
        }
      ]
    }

    **DESIGN RULES:**
    1. Always use luxury dark (#0c0d14, #111827) or clean modern aesthetic themes.
    2. Keep text layers readable, properly spaced, and within 1080x1080 bounds.
    3. Return ONLY the JSON object, with no extra text or markdown.
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