const rateLimit = require('express-rate-limit');

/**
 * Creates an Express rate limiter middleware.
 * @param {number} maxRequests - The maximum number of requests allowed in the window.
 * @param {number} windowMinutes - The time window in minutes.
 * @param {string} message - The message to send when the limit is exceeded.
 * @returns {Function} An express-rate-limit middleware instance.
 */
const createRateLimiter = (maxRequests, windowMinutes, message) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000, // Convert minutes to milliseconds
    max: maxRequests,
    message: {
      success: false,
      message: message || `Too many requests, please try again after ${windowMinutes} minutes.`,
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip, // Use X-Forwarded-For for proxies
  });
};

module.exports = createRateLimiter;