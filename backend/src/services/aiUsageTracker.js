const AiUsageLog = require('../models/aiUsageLogModel');
const User = require('../models/userModel');
const { calculateCosts } = require('../utils/costCalculator');

/**
 * Tracks AI API usage by parsing actual provider response metadata,
 * calculates exact API cost & 10x customer billable cost,
 * and updates user free tokens quota or wallet balance.
 *
 * @param {object} params
 * @param {string} params.userId - The ID of the user who triggered the AI call.
 * @param {string} params.feature - Descriptive feature name (e.g., 'whatsapp-reply', 'instagram-reply', 'dashboard-assistant').
 * @param {string} params.provider - 'gemini' | 'openai'
 * @param {string} params.model - Specific model name (e.g., 'gemini-2.0-flash-lite', 'gpt-4o-mini').
 * @param {object} params.usage - The usage object from API response.
 */
exports.trackUsage = async ({ userId, feature, provider, model, usage }) => {
  if (!userId || !feature || !provider || !model) {
    console.warn('[AI Usage Tracker] Missing required parameters for tracking.');
    return;
  }

  let usageData = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    internalCost: 0,
    userCost: 0,
    internalCostUsd: 0,
    userCostUsd: 0,
    chargedTo: 'billable',
    isEstimated: false,
  };

  try {
    if (provider === 'gemini' && usage) {
      usageData.promptTokens = Number(usage.promptTokenCount || 0);
      usageData.completionTokens = Number(usage.candidatesTokenCount || 0);
      usageData.totalTokens = Number(usage.totalTokenCount || (usageData.promptTokens + usageData.completionTokens));
      usageData.isEstimated = !usage.totalTokenCount && !usage.promptTokenCount;
    } else if (provider === 'openai' && usage) {
      usageData.promptTokens = Number(usage.prompt_tokens || 0);
      usageData.completionTokens = Number(usage.completion_tokens || 0);
      usageData.totalTokens = Number(usage.total_tokens || (usageData.promptTokens + usageData.completionTokens));
      usageData.isEstimated = !usage.total_tokens;
    } else {
      // Fallback estimate for 1 short message (~120 tokens)
      usageData.promptTokens = 90;
      usageData.completionTokens = 30;
      usageData.totalTokens = 120;
      usageData.isEstimated = true;
    }

    // Calculate costs based on real token usage (in INR and USD with 10x customer markup)
    const costResult = calculateCosts({
      provider,
      model,
      promptTokens: usageData.promptTokens,
      completionTokens: usageData.completionTokens,
    });

    usageData.internalCost = costResult.internalCostInr;
    usageData.userCost = costResult.userCostInr;
    usageData.internalCostUsd = costResult.internalCostUsd;
    usageData.userCostUsd = costResult.userCostUsd;

    // Deduct from User free token quota or wallet
    const user = await User.findById(userId);
    if (user) {
      const freeTokensRemaining = user.freeAiTokens !== undefined ? user.freeAiTokens : 50000;
      
      if (freeTokensRemaining > 0) {
        // User has free tokens remaining!
        const deducted = Math.min(freeTokensRemaining, usageData.totalTokens);
        user.freeAiTokens = Math.max(0, freeTokensRemaining - deducted);
        usageData.chargedTo = 'free_quota';
        usageData.userCost = 0; // Free for user
      } else {
        // Free quota exhausted -> 10x billable charge applied to user
        usageData.chargedTo = 'billable';
        user.totalAiCost = (user.totalAiCost || 0) + usageData.userCost;
        if (user.walletBalance > 0) {
          user.walletBalance = Math.max(0, user.walletBalance - usageData.userCost);
        }
      }

      user.totalAiTokensUsed = (user.totalAiTokensUsed || 0) + usageData.totalTokens;
      await user.save();
    }

    await AiUsageLog.create({
      userId,
      feature,
      provider,
      model,
      ...usageData,
    });

    console.log(`[AI Usage Tracker] Logged: ${feature} (${model}) - Tokens: ${usageData.totalTokens} (In: ${usageData.promptTokens}, Out: ${usageData.completionTokens}) | Internal Cost: ₹${usageData.internalCost.toFixed(4)} | Charged: ₹${usageData.userCost.toFixed(4)} [${usageData.chargedTo}]`);

  } catch (error) {
    console.error('❌ [AI Usage Tracker] Failed to log AI usage:', error.message);
  }
};