// This is a placeholder for your billing logic.
// In a real application, you would integrate with a payment gateway like Stripe.
const User = require('../models/userModel');

const CALL_RATE_PER_MINUTE = 3.0; // Example rate: ₹3 per minute as per prompt
const WHATSAPP_RATE_PER_MESSAGE = 0.05; // Example rate: $0.05 per message

const RATES = {
  OPENAI_GPT_3_5: 0.002, // Cents per 1k tokens
  OPENAI_GPT_4: 0.03,
  TWILIO_VOICE: 0.015, // Per minute
};

/**
 * Calculates the cost of a phone call based on its duration.
 * @param {number} durationInSeconds - The duration of the call in seconds.
 * @returns {number} The calculated cost of the call.
 */
exports.calculateCallCost = (durationInSeconds) => {
  if (durationInSeconds <= 0) {
    return 0;
  }
  const durationInMinutes = durationInSeconds / 60;
  const cost = durationInMinutes * CALL_RATE_PER_MINUTE;
  return parseFloat(cost.toFixed(4)); // Return cost with 4 decimal places
};

/**
 * A placeholder function to deduct credits from a user's account.
 * @param {string} userId - The ID of the user.
 * @param {number} amountToDeduct - The amount to deduct from the user's balance.
 * @returns {Promise<{success: boolean, newBalance: number}>}
 */
exports.deductCredits = async (userId, amountToDeduct) => {
  // In a real app, you would fetch the user, check their balance,
  // deduct the amount, and save the user.
  console.log(`Deducting ${amountToDeduct} credits from user ${userId}.`);

  return { success: true, newBalance: 100 - amountToDeduct }; // Mock response
};

exports.deductAICost = async (userId, serviceType, usageAmount) => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    const cost = RATES[serviceType] * usageAmount;
    user.totalAiCost += cost;
    user.walletBalance -= cost; // Paisa kat gaya

    await user.save();
    return true; 
  } catch (error) {
    console.error('Billing Error:', error);
    return false;
  }
};

/**
 * Calculates the cost for sending a WhatsApp message.
 * @returns {number} The cost of one message.
 */
exports.getWhatsAppMessageCost = () => {
  return WHATSAPP_RATE_PER_MESSAGE;
};