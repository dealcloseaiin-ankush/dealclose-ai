/**
 * A utility to extract a standardized error message from a Mongoose validation error.
 * @param {Error} error - The error object, typically from a catch block.
 * @returns {string} A user-friendly error message.
 */
exports.parseMongooseError = (error) => {
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return messages.join(', ');
  }
  if (error.code === 11000) {
    // Handle duplicate key error
    const field = Object.keys(error.keyValue)[0];
    return `An account with that ${field} already exists.`;
  }
  return 'An unexpected error occurred.';
};

/**
 * A simple utility to sanitize string inputs to prevent XSS.
 * @param {string} input - The string to sanitize.
 * @returns {string} The sanitized string.
 */
exports.sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};