/**
 * @fileoverview AI Design Validation and Repair Service
 * This service acts as a quality gate for all AI-generated design JSON.
 * It validates the structure, content, and layout, and attempts to repair
 * common AI errors before the design is sent to the frontend.
 */

const REQUIRED_LAYERS = ['text', 'image'];
const MIN_LAYER_COUNT = 3; // A decent design should have at least a headline, image, and CTA.

/**
 * Validates and repairs an AI-generated design JSON.
 * @param {object} designJson The raw JSON from the AI.
 * @param {object} businessContext The user's brand kit and business info.
 * @returns {{valid: boolean, repairedDesign: object, errors: string[]}}
 */
exports.validateAndRepair = (designJson, businessContext) => {
  const errors = [];
  let repairedDesign = JSON.parse(JSON.stringify(designJson)); // Deep copy

  // 1. Basic Structure Validation
  if (!repairedDesign || typeof repairedDesign !== 'object') {
    errors.push('Root is not a valid object.');
    return { valid: false, repairedDesign: null, errors };
  }
  if (!repairedDesign.canvas || typeof repairedDesign.canvas !== 'object') {
    errors.push('Missing or invalid "canvas" object.');
    repairedDesign.canvas = { width: 1080, height: 1080, backgroundColor: '#1a1a1a' };
  }
  if (!Array.isArray(repairedDesign.layers)) {
    errors.push('Missing or invalid "layers" array.');
    repairedDesign.layers = [];
  }

  // 2. Content Validation
  if (!repairedDesign.caption || repairedDesign.caption.trim() === '') {
    errors.push('Caption is missing or empty.');
    repairedDesign.caption = 'Your engaging caption here...';
  }
  if (repairedDesign.layers.length < MIN_LAYER_COUNT) {
    errors.push(`Insufficient layers. Found ${repairedDesign.layers.length}, expected at least ${MIN_LAYER_COUNT}.`);
  }

  // 3. Layer-by-Layer Validation and Repair
  let hasHeadline = false;
  repairedDesign.layers.forEach((layer, index) => {
    if (!layer || typeof layer !== 'object') {
      errors.push(`Layer ${index} is not a valid object.`);
      return;
    }

    // Repair missing type
    if (!layer.type) {
      layer.type = 'text';
      errors.push(`Layer ${index} missing "type". Defaulted to "text".`);
    }

    // Validate text layers
    if (layer.type.includes('text')) {
      if (!layer.text || layer.text.trim() === '' || layer.text.includes('[') || layer.text.length < 3) {
        errors.push(`Layer ${index} (${layer.type}) has empty or placeholder text.`);
        layer.text = 'Your Text Here';
      }
      if (layer.fontSize > 40) hasHeadline = true;
    }

    // Validate coordinates and position
    const canvasWidth = repairedDesign.canvas.width || 1080;
    const canvasHeight = repairedDesign.canvas.height || 1080;
    if (typeof layer.left !== 'number' || typeof layer.top !== 'number') {
      errors.push(`Layer ${index} has invalid coordinates.`);
      layer.left = canvasWidth / 2;
      layer.top = canvasHeight / 2;
    } else if (layer.left < -100 || layer.left > canvasWidth + 100 || layer.top < -100 || layer.top > canvasHeight + 100) {
      errors.push(`Layer ${index} is positioned outside the canvas bounds.`);
      layer.left = Math.max(0, Math.min(canvasWidth, layer.left));
      layer.top = Math.max(0, Math.min(canvasHeight, layer.top));
    }

    // Enforce Brand Kit
    const brandKit = businessContext.brandKit || {};
    if (brandKit.primaryColor && layer.fill && layer.fill !== '#ffffff' && layer.fill !== '#000000') {
      layer.fill = brandKit.primaryColor;
    }
    if (brandKit.logoUrl && layer.src && layer.src.includes('[logo')) {
      layer.src = brandKit.logoUrl;
    }
  });

  if (!hasHeadline) {
    errors.push('Design is missing a clear headline (large text).');
  }

  // 4. Background Color Check
  if (!repairedDesign.canvas.backgroundColor) {
    errors.push('Canvas is missing a background color.');
    repairedDesign.canvas.backgroundColor = businessContext.brandKit?.secondaryColor || '#1a1a1a';
  }

  const valid = errors.length === 0;

  if (!valid) {
    console.log('AI DESIGN VALIDATION REPORT:', {
      errors,
      repairedDesign
    });
  }

  return { valid, repairedDesign, errors };
};