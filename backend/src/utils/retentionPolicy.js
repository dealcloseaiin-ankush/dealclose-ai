/**
 * Centralized Data Retention Policy for Messages (TTL Management).
 * 
 * Policy:
 * Free Tier:
 *  - Instagram Comments: 15 Days
 *  - Instagram DMs: 30 Days
 *  - WhatsApp Messages: 30 Days
 * 
 * Paid / Premium Tier (Double retention):
 *  - Instagram Comments: 30 Days (2x)
 *  - Instagram DMs: 60 Days (2x)
 *  - WhatsApp Messages: 60 Days (2x)
 */

const addDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

exports.getMessageExpiry = (user, channel) => {
  const isPremium = user?.isPremium === true || user?.role === 'superadmin' || user?.subscription?.plan !== 'free';

  if (isPremium) {
    switch (channel) {
      case 'instagram_comment':
        return addDays(30); // 30 days for Paid
      case 'instagram_dm':
        return addDays(60); // 60 days for Paid
      case 'whatsapp':
        return addDays(60); // 60 days for Paid
      default:
        return addDays(30);
    }
  }

  // Free Tier
  switch (channel) {
    case 'instagram_comment':
      return addDays(15); // 15 days for Free
    case 'instagram_dm':
      return addDays(30); // 30 days for Free
    case 'whatsapp':
      return addDays(30); // 30 days for Free
    default:
      return addDays(15);
  }
};