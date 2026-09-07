// Official API rates in USD per 1 Million tokens (1M tokens)
const MODEL_PRICING = {
  gemini: {
    'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 }, // Ultra-cost-effective ($0.075/1M in, $0.30/1M out)
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },      // Standard Flash ($0.10/1M in, $0.40/1M out)
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },     // 1.5 Flash ($0.075/1M in, $0.30/1M out)
    'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 }, // Mini 8B Flash ($0.0375/1M in, $0.15/1M out)
    'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 }, 
  },
  openai: {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },          // OpenAI mini ($0.15/1M in, $0.60/1M out)
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },        // Legacy turbo
  },
};

const USD_TO_INR = 87;                // Current USD to INR conversion rate
const INTERNAL_COST_MULTIPLIER = 1.0; // Raw Google / OpenAI cost
const USER_COST_MULTIPLIER = 10.0;    // 10x markup charged to user/customer

/**
 * Calculates the internal API cost and 10x user-facing billable cost for an AI API call.
 * @param {object} params
 * @param {string} params.provider - 'gemini' | 'openai'
 * @param {string} params.model - Model name
 * @param {number} params.promptTokens - Number of input prompt tokens
 * @param {number} params.completionTokens - Number of output completion tokens
 * @returns {{internalCost: number, userCost: number, internalCostInr: number, userCostInr: number}}
 */
exports.calculateCosts = ({ provider, model, promptTokens = 0, completionTokens = 0 }) => {
  const normalizedModel = String(model || '').toLowerCase();
  const providerKey = String(provider || 'gemini').toLowerCase();
  
  let prices = MODEL_PRICING[providerKey]?.[normalizedModel];
  if (!prices) {
    // Default fallback pricing (gemini-2.0-flash-lite)
    prices = { input: 0.075, output: 0.30 };
  }

  const pTokens = Math.max(0, Number(promptTokens) || 0);
  const cTokens = Math.max(0, Number(completionTokens) || 0);

  const inputCostUsd = (pTokens / 1_000_000) * prices.input;
  const outputCostUsd = (cTokens / 1_000_000) * prices.output;
  const baseCostUsd = inputCostUsd + outputCostUsd;

  // Internal API Cost in USD & INR
  const internalCostUsd = baseCostUsd * INTERNAL_COST_MULTIPLIER;
  const internalCostInr = internalCostUsd * USD_TO_INR;

  // 10x Customer Billable Cost in INR & USD
  const userCostInr = internalCostInr * USER_COST_MULTIPLIER;
  const userCostUsd = internalCostUsd * USER_COST_MULTIPLIER;

  return {
    internalCost: internalCostInr, // Primary cost in INR
    userCost: userCostInr,         // Primary user cost in INR (10x)
    internalCostInr,
    userCostInr,
    internalCostUsd,
    userCostUsd,
  };
};