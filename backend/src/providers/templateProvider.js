/**
 * @fileoverview Fallback Template Provider
 * This service provides a library of high-quality, multi-layer fallback templates.
 * It's used when the AI fails to generate a valid design, ensuring the user
 * always receives a professional and editable canvas.
 */

const TEMPLATES = {
  generic: {
    name: 'Generic Professional Corporate',
    designJson: {
      canvas: { width: 1080, height: 1080, backgroundColor: '#1a1a1a' },
      caption: '[AI-generated caption]',
      hashtags: '#ai #design',
      layers: [
        { "type": "rect", "width": 1080, "height": 1080, "top": 0, "left": 0, "fill": { "type": "linear", "colorStops": [{ "offset": 0, "color": "#232526" }, { "offset": 1, "color": "#414345" }] } },
        { "type": "text", "text": "[HEADLINE]", "fontFamily": "Poppins", "fontSize": 120, "fontWeight": "bold", "fill": "#ffffff", "left": 540, "top": 200, "originX": "center", "originY": "center", "textAlign": "center", "width": 900, "shadow": "rgba(0,0,0,0.5) 5px 5px 10px" },
        { "type": "text", "text": "[Supporting text or offer details]", "fontFamily": "Roboto", "fontSize": 48, "fontWeight": "normal", "fill": "#cccccc", "left": 540, "top": 350, "originX": "center", "originY": "center", "textAlign": "center", "width": 800 },
        { "type": "rect", "width": 400, "height": 120, "fill": "[primaryColor]", "left": 540, "top": 880, "originX": "center", "originY": "center", "rx": 25, "ry": 25, "shadow": "rgba(0,0,0,0.3) 10px 10px 15px" },
        { "type": "text", "text": "[CTA]", "fontFamily": "Montserrat", "fontSize": 48, "fontWeight": "bold", "fill": "#ffffff", "left": 540, "top": 880, "originX": "center", "originY": "center" },
        { "type": "image", "src": "AI_IMAGE_PROMPT: A stunning, professional product shot of [product] on a clean, modern background.", "left": 540, "top": 580, "originX": "center", "originY": "center", "width": 650, "height": 450, "scaleX": 1, "scaleY": 1 },
        { "type": "image", "src": "[logoUrl]", "left": 100, "top": 100, "originX": "center", "originY": "center", "scaleX": 0.5, "scaleY": 0.5 },
        { "type": "text", "text": "[businessName]", "fontFamily": "Poppins", "fontSize": 36, "fontWeight": "bold", "fill": "#ffffff", "left": 540, "top": 50, "originX": "center", "originY": "top", "textAlign": "center" },
        { "type": "text", "text": "[website]", "fontFamily": "Roboto", "fontSize": 28, "fill": "#bbbbbb", "left": 540, "top": 1000, "originX": "center", "originY": "center" },
        { "type": "rect", "width": 1080, "height": 10, "fill": "[primaryColor]", "top": 0, "left": 0 },
        { "type": "rect", "width": 1080, "height": 10, "fill": "[primaryColor]", "top": 1070, "left": 0 }
      ]
    }
  },
  real_estate: {
    name: 'Real Estate Fallback',
    designJson: {
      "canvas": { "width": 1080, "height": 1080, "backgroundColor": "#f0f4f7" },
      "caption": "[AI-generated caption for a property listing]",
      "hashtags": "#realestate #property #forsale",
      "layers": [
        { "type": "rect", "width": 1080, "height": 540, "top": 0, "left": 0, "fill": "#ffffff" },
        { "type": "image", "src": "AI_IMAGE_PROMPT: A beautiful, bright, modern apartment living room with large windows.", "left": 540, "top": 270, "originX": "center", "originY": "center", "width": 1000, "height": 500, "scaleX": 1, "scaleY": 1 },
        { "type": "rect", "width": 1080, "height": 540, "top": 540, "left": 0, "fill": "#1a2b48" },
        { "type": "text", "text": "[HEADLINE]", "fontFamily": "Merriweather", "fontSize": 100, "fontWeight": "bold", "fill": "#ffffff", "left": 50, "top": 600, "textAlign": "left", "width": 980 },
        { "type": "text", "text": "[City, Location]", "fontFamily": "Lato", "fontSize": 40, "fontWeight": "normal", "fill": "#a0b3d1", "left": 50, "top": 720 },
        { "type": "text", "text": "₹[Price]", "fontFamily": "Lato", "fontSize": 70, "fontWeight": "bold", "fill": "#ffffff", "left": 50, "top": 800 },
        { "type": "rect", "width": 300, "height": 80, "fill": "[primaryColor]", "left": 900, "top": 950, "originX": "center", "originY": "center", "rx": 10, "ry": 10 },
        { "type": "text", "text": "[CTA]", "fontFamily": "Montserrat", "fontSize": 36, "fontWeight": "bold", "fill": "#ffffff", "left": 900, "top": 950, "originX": "center", "originY": "center" },
        { "type": "image", "src": "[logoUrl]", "left": 980, "top": 600, "originX": "right", "scaleX": 0.4, "scaleY": 0.4 },
        { "type": "text", "text": "[phone]", "fontFamily": "Lato", "fontSize": 32, "fill": "#a0b3d1", "left": 50, "top": 950 }
      ]
    }
  },
  saas: {
    name: 'SaaS/Tech Fallback',
    designJson: {
      "canvas": { "width": 1080, "height": 1080, "backgroundColor": "#0d1117" },
      "caption": "[AI-generated caption for a SaaS product]",
      "hashtags": "#saas #software #tech",
      "layers": [
        { "type": "text", "text": "[HEADLINE]", "fontFamily": "Inter", "fontSize": 130, "fontWeight": "bold", "fill": "#ffffff", "left": 540, "top": 250, "originX": "center", "originY": "center", "textAlign": "center", "width": 900 },
        { "type": "text", "text": "[Describe the main benefit or feature]", "fontFamily": "Inter", "fontSize": 50, "fontWeight": "normal", "fill": "#8b949e", "left": 540, "top": 400, "originX": "center", "originY": "center", "textAlign": "center", "width": 800 },
        { "type": "rect", "width": 380, "height": 100, "fill": "[primaryColor]", "left": 540, "top": 900, "originX": "center", "originY": "center", "rx": 15, "ry": 15 },
        { "type": "text", "text": "[CTA]", "fontFamily": "Inter", "fontSize": 40, "fontWeight": "600", "fill": "#ffffff", "left": 540, "top": 900, "originX": "center", "originY": "center" },
        { "type": "image", "src": "AI_IMAGE_PROMPT: A clean, abstract 3D render of a user interface dashboard with charts and graphs, dark mode, glowing elements.", "left": 540, "top": 620, "originX": "center", "originY": "center", "width": 800, "height": 400, "scaleX": 1, "scaleY": 1, "shadow": "rgba(0,0,0,0.5) 0px 20px 30px" },
        { "type": "image", "src": "[logoUrl]", "left": 80, "top": 80, "originX": "center", "originY": "center", "scaleX": 0.4, "scaleY": 0.4 },
      ]
    }
  },
  // ✅ NEW: Added more colorful and diverse templates
  festival_sale: {
    name: 'Festival Sale Fallback',
    designJson: {
      "canvas": { "width": 1080, "height": 1080, "backgroundColor": "#fff8e1" },
      "caption": "[AI-generated caption for a festival sale]",
      "hashtags": "#sale #offer #festival",
      "layers": [
        { "type": "rect", "width": 1080, "height": 150, "top": 0, "left": 0, "fill": "#ff6f00" },
        { "type": "text", "text": "[FESTIVAL NAME] SALE!", "fontFamily": "Lobster", "fontSize": 140, "fontWeight": "bold", "fill": "#ffffff", "left": 540, "top": 75, "originX": "center", "originY": "center" },
        { "type": "text", "text": "UPTO [50% OFF]", "fontFamily": "Anton", "fontSize": 200, "fontWeight": "bold", "fill": "#d84315", "left": 540, "top": 350, "originX": "center", "originY": "center", "shadow": "rgba(0,0,0,0.2) 5px 5px 5px" },
        { "type": "text", "text": "On All Products", "fontFamily": "Poppins", "fontSize": 50, "fontWeight": "600", "fill": "#000000", "left": 540, "top": 480, "originX": "center", "originY": "center" },
        { "type": "image", "src": "AI_IMAGE_PROMPT: A festive flat lay of products with confetti and decorations, bright and colorful.", "left": 540, "top": 700, "originX": "center", "originY": "center", "width": 900, "height": 400 },
        { "type": "text", "text": "Shop Now!", "fontFamily": "Poppins", "fontSize": 40, "fontWeight": "bold", "fill": "#ff6f00", "left": 540, "top": 950, "originX": "center", "originY": "center" },
        { "type": "image", "src": "[logoUrl]", "left": 1000, "top": 1000, "originX": "right", "originY": "bottom", "scaleX": 0.3, "scaleY": 0.3 },
      ]
    }
  },
  restaurant: {
    name: 'Restaurant Food Fallback',
    designJson: {
      "canvas": { "width": 1080, "height": 1080, "backgroundColor": "#111111" },
      "caption": "[AI-generated caption for a delicious food item]",
      "hashtags": "#food #restaurant #delicious",
      "layers": [
        { "type": "image", "src": "AI_IMAGE_PROMPT: A mouth-watering, professional food photography shot of a [pizza/burger/dish], top-down view, on a dark rustic table.", "left": 540, "top": 540, "originX": "center", "originY": "center", "width": 1080, "height": 1080 },
        { "type": "rect", "width": 1080, "height": 1080, "top": 0, "left": 0, "fill": "rgba(0,0,0,0.4)" },
        { "type": "text", "text": "[DISH NAME]", "fontFamily": "Playfair Display", "fontSize": 150, "fontWeight": "bold", "fill": "#ffffff", "left": 540, "top": 400, "originX": "center", "originY": "center", "textAlign": "center" },
        { "type": "text", "text": "Now Available!", "fontFamily": "Lato", "fontSize": 60, "fontWeight": "normal", "fill": "#ffc107", "left": 540, "top": 550, "originX": "center", "originY": "center" },
        { "type": "text", "text": "Order on Zomato/Swiggy", "fontFamily": "Lato", "fontSize": 40, "fill": "#ffffff", "left": 540, "top": 950, "originX": "center", "originY": "center" },
        { "type": "image", "src": "[logoUrl]", "left": 540, "top": 150, "originX": "center", "originY": "center", "scaleX": 0.5, "scaleY": 0.5 },
      ]
    }
  }
};

/**
 * Selects the best fallback template based on the user's prompt or business context.
 * @param {string} prompt The user's prompt.
 * @param {object} businessContext The user's business info.
 * @returns {object} The best matching fallback template.
 */
exports.getBestTemplate = (prompt, businessContext) => {
  const contextString = `${prompt} ${businessContext?.description || ''}`.toLowerCase();

  if (/property|real estate|flat|plot|realtor|listing/i.test(contextString)) {
    return TEMPLATES.real_estate;
  }
  if (/saas|software|tech|app|dashboard|feature/i.test(contextString)) {
    return TEMPLATES.saas;
  }
  if (/sale|offer|discount|diwali|holi|eid|christmas/i.test(contextString)) {
    return TEMPLATES.festival_sale;
  }
  if (/food|restaurant|dish|menu|cafe|hotel/i.test(contextString)) {
    return TEMPLATES.restaurant;
  }

  return TEMPLATES.generic;
};