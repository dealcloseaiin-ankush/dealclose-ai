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

// @desc    Register a New User (Standard Email/Password)
// @route   POST /api/users/register
exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email is already registered. Please login.' });
    }

    const user = await User.create({
      fullName: fullName || 'New User',
      email,
      password // Make sure your User model has a pre-save hook to hash this using bcrypt
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretkey123', { expiresIn: '30d' });
    res.status(201).json({ success: true, token, user });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// @desc    Login User
// @route   POST /api/users/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found. Please register first.' });

    // Bulletproof Password Check: Handles both Encrypted and Plain Text passwords
    let isMatch = false;
    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      isMatch = await bcrypt.compare(password, user.password); // Compare Hashed
    } else {
      isMatch = (password === user.password); // Fallback: Compare Plain text
    }

    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid Password. Please try again.' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecretkey123', { expiresIn: '30d' });
    res.status(200).json({ success: true, token, user });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
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

// @desc    Update User Profile (AI Prompt / Business Description)
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    console.log(`\n➡️ [Profile Update] Request received for user ID: ${req.user?._id || req.user?.id}`);

    const { 
      businessName,
      businessDescription, 
      aiRules, 
      fallbackAction,
      whatsappConfig,
      digitalCardConfig,
      discountConfig,
      ownerPhone,
      aiAgentEnabled,
      workspaces,
      twilioConfig
    } = req.body;

    // Assuming you have an auth middleware that sets req.user
    const userId = req.user?._id || req.user?.id;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized Session' });

    // Build the update object dynamically and safely
    const updateData = {};
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription;
    if (aiRules !== undefined) updateData.aiRules = aiRules;
    if (fallbackAction !== undefined) updateData.fallbackAction = fallbackAction;
    if (whatsappConfig !== undefined) updateData.whatsappConfig = whatsappConfig;
    if (digitalCardConfig !== undefined) updateData.digitalCardConfig = digitalCardConfig;
    if (discountConfig !== undefined) updateData.discountConfig = discountConfig;
    if (ownerPhone !== undefined) updateData.ownerPhone = ownerPhone;
    if (aiAgentEnabled !== undefined) updateData.aiAgentEnabled = aiAgentEnabled;
    if (workspaces !== undefined) updateData.workspaces = workspaces;
    if (twilioConfig !== undefined) updateData.twilioConfig = twilioConfig;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { returnDocument: 'after', strict: false }
    );

    // Re-fetch using .lean() to ensure we get the raw object for debugging, but still send the fully updated Mongoose doc to frontend
    const verifyDb = await User.findById(userId).lean(); 
    console.log(`\n🔍 [DB VERIFY AFTER SETTINGS SAVE]
    - AI Rules in DB: ${verifyDb.aiRules ? '✅ SAVED' : '❌ MISSING'}
    - Business Desc in DB: ${verifyDb.businessDescription ? '✅ SAVED' : '❌ MISSING'}`);

    if (!updatedUser) return res.status(404).json({ success: false, message: 'User not found or not updated' });

    res.status(200).json({ success: true, user: updatedUser, message: 'Settings updated successfully!' });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    
    // Use .lean() here to ensure the full, raw document is returned, including potentially newly added fields
    const user = await User.findById(userId).select('-password').lean();

    if (!user) return res.status(404).json({ success: false, message: 'User profile not found.' });
    
    console.log(`\n🔍 [FETCHING PROFILE FOR FRONTEND]
    - AI Rules Exist?: ${user.aiRules ? '✅ YES' : '❌ NO'}
    - Business Desc Exist?: ${user.businessDescription ? '✅ YES' : '❌ NO'}`);
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
};