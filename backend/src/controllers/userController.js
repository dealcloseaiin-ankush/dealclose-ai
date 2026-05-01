const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const parser = require('../utils/parser');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/users/register
exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      res.status(201).json({
        _id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        token: generateToken(newUser._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: parser.parseMongooseError(error) || error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/users/login
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        fullName: user.fullName,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Integrations & API Settings
// @route   POST /api/users/settings
exports.updateSettings = async (req, res) => {
  try {
    const { whatsappToken, phoneNumberId, wabaId, ownerPhone, pinCode, businessDesc, businessUrls } = req.body;
    
    // Get the currently logged-in user securely using the ID from the Auth token
    let user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found. Please log in again." });
    }
    
    // Ensure whatsappConfig object exists before assigning to it, and merge properties
    user.whatsappConfig = user.whatsappConfig || {};
    if (whatsappToken) user.whatsappConfig.accessToken = whatsappToken;
    if (phoneNumberId) user.whatsappConfig.phoneNumberId = phoneNumberId;
    if (wabaId) user.whatsappConfig.wabaId = wabaId;

    if (ownerPhone) user.ownerPhone = ownerPhone;
    if (pinCode) user.servedPinCodes = [pinCode];
    if (businessDesc) user.businessDescription = businessDesc;
    if (businessUrls) user.businessUrls = businessUrls;

    await user.save();
    res.status(200).json({ message: "Settings saved successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};