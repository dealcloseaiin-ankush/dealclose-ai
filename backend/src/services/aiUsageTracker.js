const AiUsageLog = require('../models/aiUsageLogModel');
const { calculateCosts } = require('../utils/costCalculator');

/**
 * Tracks AI API usage by parsing response metadata and logging it to the database.
 * This centralized function ensures all AI calls are monitored from a single point.
 *
 * @param {object} params - The parameters for tracking.
 * @param {string} params.userId - The ID of the user who triggered the AI call.
 * @param {string} params.feature - A descriptive name for the feature using the AI (e.g., 'whatsapp-reply', 'dashboard-assistant').
 * @param {string} params.provider - The AI provider ('gemini' or 'openai').
 * @param {string} params.model - The specific model name used (e.g., 'gemini-1.5-flash', 'gpt-4o-mini').
 * @param {object} params.usage - The usage object from the AI API response (e.g., response.usageMetadata for Gemini, response.usage for OpenAI).
 */
exports.trackUsage = async ({ userId, feature, provider, model, usage }) => {
  if (!userId || !feature || !provider || !model) {
    console.error('[AI Usage Tracker] Missing required parameters for tracking.');
    return;
  }

  let usageData = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    internalCost: 0,
    userCost: 0,
    isEstimated: true, // Default to estimated
  };

  try {
    if (provider === 'gemini' && usage) {
      usageData.promptTokens = usage.promptTokenCount || 0;
      usageData.completionTokens = usage.candidatesTokenCount || 0;
      usageData.totalTokens = usage.totalTokenCount || (usageData.promptTokens + usageData.completionTokens);
      usageData.isEstimated = !usage.totalTokenCount;
    } else if (provider === 'openai' && usage) {
      usageData.promptTokens = usage.prompt_tokens || 0;
      usageData.completionTokens = usage.completion_tokens || 0;
      usageData.totalTokens = usage.total_tokens || (usageData.promptTokens + usageData.completionTokens);
      usageData.isEstimated = !usage.total_tokens;
    } else {
      // Fallback for unknown structure or missing usage data
      usageData.totalTokens = 100; // Log a default estimated value
      console.warn(`[AI Usage Tracker] Usage metadata not found for ${provider}. Logging estimated usage.`);
    }

    // Calculate costs based on token usage
    const { internalCost, userCost } = calculateCosts({
      provider,
      model,
      promptTokens: usageData.promptTokens,
      completionTokens: usageData.completionTokens,
    });
    usageData.internalCost = internalCost;
    usageData.userCost = userCost;

    await AiUsageLog.create({
      userId,
      feature,
      provider,
      model,
      ...usageData,
    });

  } catch (error) {
    console.error('❌ [AI Usage Tracker] Failed to log AI usage:', error.message);
  }
};