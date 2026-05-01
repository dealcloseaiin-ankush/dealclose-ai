const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

// @desc    Sync Supabase User with MongoDB
// @route   POST /api/users/supabase-auth
exports.supabaseAuth = async (req, res) => {
  const { email, supabaseId, name } = req.body;

  try {
    // Check agar user pehle se MongoDB me hai
    let user = await User.findOne({ email });

    if (!user) {
      // Agar naya user hai, toh create kar do. 
      // Agar model me password required hai toh ye dummy password usko bypass kar dega.
      user = await User.create({ 
        email, 
        supabaseId, 
        name,
        password: supabaseId || 'google-oauth-dummy-pass' 
      });
    }

    // Humara apna Backend JWT token generate karke frontend ko wapas bhejenge
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretkey123', { expiresIn: '30d' });
    res.status(200).json({ success: true, token, user });
  } catch (error) {
    console.error('Supabase Sync Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};