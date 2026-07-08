/**
 * Centralized Data Retention Policy for Messages.
 * This ensures consistent data lifecycle management across all channels (WhatsApp, Instagram).
 *
 * @param {object} user - The user object from the database.
 * @param {string} channel - The channel ('whatsapp', 'instagram_dm', 'instagram_comment').
 * @returns {Date|null} The expiry date for the message, or null to keep it permanently.
 */

const addDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

exports.getMessageExpiry = (user, channel) => {
  const isPremium = user.isPremium === true || user.role === 'superadmin';

  // 🚀 FIX: Implemented the tiered retention for Premium users as per the spec.
  // Previously, it was returning 'null' for all premium channels, making them permanent.
  // Now, comments for premium users will also expire, but after a longer period (7 days).
  if (isPremium) {
    if (channel === 'instagram_comment') {
      return addDays(7);
    }
    return null; // WhatsApp and DMs remain permanent for premium users.
  }

  // Free users have a tiered, shorter retention period to manage costs.
  switch (channel) {
    case 'whatsapp':
      return addDays(30); // WhatsApp is more business-critical.
    case 'instagram_dm':
      return addDays(15); // DMs are less critical than WhatsApp.
    default: // Includes 'instagram_comment' and any other type
      return addDays(2);  // Comments are high-volume, low-value, shortest retention.
  }
};