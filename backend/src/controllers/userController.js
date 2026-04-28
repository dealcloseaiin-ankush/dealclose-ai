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
    const { whatsappToken, phoneNumberId, wabaId } = req.body;
    
    // Temporary logic for MVP: We update the first user found in DB
    // (In production, we will use req.user.id from JWT token)
    let user = await User.findOne();
    if (!user) {
      user = new User({ fullName: "Test Admin", email: "admin@test.com", password: "123" });
    }

    user.whatsappConfig = {
      accessToken: whatsappToken,
      phoneNumberId: phoneNumberId,
      wabaId: wabaId
    };

    await user.save();
    res.status(200).json({ message: "Settings saved successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};