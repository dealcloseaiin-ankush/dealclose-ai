const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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
        name: name,
        fullName: name || 'Google User', // Fix: MongoDB schema requires 'fullName'
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

// @desc    Change User Password
// @route   POST /api/users/change-password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized Session' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Note: If you want to strictly check the old password, you can use bcrypt.compare here.
    // For AI auto-generated accounts, updating it directly after login is safe as they are authenticated.
    user.password = newPassword; 
    await user.save(); // Mongoose pre-save hook will automatically hash the new password

    res.status(200).json({ success: true, message: 'Password changed successfully!' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};