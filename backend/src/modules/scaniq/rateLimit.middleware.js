const rateLimit = require('express-rate-limit');

// Limit: 5 scans per IP per 30 days
const scanLimiter = rateLimit({
  windowMs: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds (Fixed 32-bit integer overflow)
  max: 5,                             // 5 scans maximum
  keyGenerator: (req) => req.ip,      // Track by User's IP Address
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Monthly limit reached (5 free scans/month). Unlock unlimited scans by joining our main platform!',
      upgradeUrl: 'https://dealcloseai.in/register',
      scansLimit: 5,
      resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});

module.exports = { scanLimiter };