const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server will not start without it.');
}
const JWT_SECRET = process.env.JWT_SECRET;

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Header se token nikalna: "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Token verify karna
      const decoded = jwt.verify(token, JWT_SECRET);

      // Logged-in User ko request object me daalna (Password hata kar)
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        console.log('❌ [Auth Middleware] Token is valid but user not found in DB.');
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }
      
      next();
    } catch (error) {
      console.error('❌ [Auth Middleware] Token verification failed:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
