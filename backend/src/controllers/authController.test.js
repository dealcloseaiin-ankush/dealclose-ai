// File: c:\Users\Lenovo1\Desktop\ai-calling-agent\backend\src\controllers\authController.test.js

// Sabse pehle, jin cheezon ko mock karna hai, unhe import karein
const User = require('../models/userModel');
const Flow = require('../models/flowModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { register, login } = require('./authController'); // Apne controller function ko import karein

// 'jest.mock()' ka istemaal karke hum models ko mock kar rahe hain
// Isse asli database calls nahi honge
jest.mock('../models/userModel');
jest.mock('../models/flowModel');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('Auth Controller - Register', () => {

  // Har test se pehle mocks ko reset karein
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user successfully', async () => {
    // 1. Test ke liye nakli data taiyaar karein
    const mockReq = {
      body: {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        businessName: 'Test Business',
        businessDescription: 'A test business for testing purposes.'
      }
    };

    // Mock response object banayein jismein status aur json functions hon
    const mockRes = {
      status: jest.fn().mockReturnThis(), // .status(201)
      json: jest.fn()                    // .json({ ... })
    };

    // 2. Apne models ke functions ko mock karein
    // Batayein ki jab User.findOne call ho, to null return kare (user exist nahi karta)
    User.findOne.mockResolvedValue(null);

    // Batayein ki jab User.create call ho, to ek naya user object return kare
    const mockUser = { _id: 'mockUserId', ...mockReq.body };
    User.create.mockResolvedValue(mockUser);

    // Batayein ki jab Flow.create call ho, to kuch bhi na kare (void function)
    Flow.create.mockResolvedValue({});

    // Batayein ki jab jwt.sign call ho, to ek nakli token return kare
    jwt.sign.mockReturnValue('mock-jwt-token');

    // 3. Apne controller function ko call karein
    await register(mockReq, mockRes);

    // 4. Check karein ki sab kuch sahi se call hua ya nahi
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
    expect(Flow.create).toHaveBeenCalled(); // Check karein ki Magic Onboarding chala
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        token: 'mock-jwt-token',
        user: mockUser
      })
    );
  });

  it('should return an error if the user already exists', async () => {
    const mockReq = {
      body: { email: 'existing@example.com', password: 'password123' }
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Is test mein, batayein ki User.findOne ek user object return karega
    User.findOne.mockResolvedValue({ email: 'existing@example.com' });

    await register(mockReq, mockRes);

    // Check karein ki "user already exists" wala error aaya
    expect(User.create).not.toHaveBeenCalled(); // User.create call nahi hona chahiye
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email is already registered. Please login.'
    });
  });
});

describe('Auth Controller - Login', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login a user successfully with a correct password', async () => {
    // 1. Test Data
    const mockReq = {
      body: { email: 'test@example.com', password: 'password123' }
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const mockUser = {
      _id: 'mockUserId',
      email: 'test@example.com',
      password: '$2a$hashedPassword123', // Use a bcrypt-like prefix
      role: 'owner',
      save: jest.fn().mockResolvedValue(this) // Mock the save function
    };

    // 2. Mocking dependencies
    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true); // Password match ho gaya
    jwt.sign.mockReturnValue('mock-jwt-token');
    Flow.findOne.mockResolvedValue(null); // Maan lo ki default flow nahi hai

    // 3. Call the function
    await login(mockReq, mockRes);

    // 4. Assertions
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(bcrypt.compare).toHaveBeenCalledWith('password123', '$2a$hashedPassword123');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      token: 'mock-jwt-token'
    }));
  });

  it('should return 404 if user is not found', async () => {
    const mockReq = {
      body: { email: 'nouser@example.com', password: 'password123' }
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    User.findOne.mockResolvedValue(null); // User nahi mila

    await login(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'User not found. Please register first.' });
  });

  it('should return 401 for an invalid password', async () => {
    const mockReq = {
      body: { email: 'test@example.com', password: 'wrongpassword' }
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const mockUser = {
      _id: 'mockUserId',
      email: 'test@example.com',
      password: '$2a$hashedPassword123', // Use a bcrypt-like prefix
      save: jest.fn().mockResolvedValue(this) // Mock the save function
    };

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false); // Password match nahi hua

    await login(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Invalid Password. Please try again.' }); // Corrected assertion
  });
});
