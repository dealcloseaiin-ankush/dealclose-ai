// All prices are in USD per 1 Million tokens.
const MODEL_PRICING = {
  gemini: {
    'gemini-3.5-flash-lite': { input: 0.10, output: 0.40 }, // Latest ultra-cost-effective 3.5 lite
    'gemini-3.5-flash': { input: 0.15, output: 0.60 },      // Latest 3.5 flash
    'gemini-3.1-flash-lite': { input: 0.10, output: 0.40 }, // 3.1 flash lite
    'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 }, // 2.5 flash lite
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },     // 1.5 flash
  },
  openai: {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },          // OpenAI cheapest flagship mini
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },        // Legacy turbo
  },
};

const INTERNAL_COST_MULTIPLIER = 1.5; // Includes GST and adjustments
const USER_COST_MULTIPLIER = 8;       // User-facing price markup (5-8x)

/**
 * Calculates the internal and user-facing cost for an AI API call.
 * @param {object} params - The parameters for cost calculation.
 * @param {string} params.provider - The AI provider ('gemini' or 'openai').
 * @param {string} params.model - The specific model name.
 * @param {number} params.promptTokens - Number of tokens in the prompt.
 * @param {number} params.completionTokens - Number of tokens in the completion.
 * @returns {{internalCost: number, userCost: number}} - The calculated costs in USD.
 */
exports.calculateCosts = ({ provider, model, promptTokens, completionTokens }) => {
  const prices = MODEL_PRICING[provider]?.[model];

  if (!prices) {
    console.warn(`[Cost Calculator] Pricing not found for model ${provider}/${model}. Returning zero cost.`);
    return { internalCost: 0, userCost: 0 };
  }

  const inputCost = (promptTokens / 1_000_000) * prices.input;
  const outputCost = (completionTokens / 1_000_000) * prices.output;

  const baseCost = inputCost + outputCost;

  // Calculate internal cost (your cost + GST/adjustments)
  const internalCost = baseCost * INTERNAL_COST_MULTIPLIER;

  // Calculate user-facing cost (what you charge the customer)
  const userCost = internalCost * USER_COST_MULTIPLIER;

  return {
    // Returning costs in USD, you can convert to INR on the frontend if needed.
    internalCost,
    userCost,
  };
};