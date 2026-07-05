// File: c:/Users/Lenovo1/Desktop/ai-calling-agent/backend/src/controllers/leadController.test.js

const mongoose = require('mongoose');
const Lead = require('../models/leadModel');
const Message = require('../models/messageModel');
const { createLead, updateLeadStatus, deleteLead } = require('./leadController');

// Mock the Lead model
jest.mock('../models/leadModel');
jest.mock('../models/messageModel');

describe('Lead Controller - createLead', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock request object with a user
    mockReq = {
      user: { _id: 'mockUserId' },
      body: {
        name: 'New Lead',
        phoneNumber: '9876543210',
        email: 'newlead@example.com',
        status: 'new',
        source: 'Manual',
      },
    };

    // Mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should create a new lead successfully if it does not exist', async () => {
    // Arrange: No existing lead found
    Lead.findOne.mockResolvedValue(null);
    Lead.create.mockResolvedValue({ _id: 'newLeadId', ...mockReq.body });

    // Act: Call the controller function
    await createLead(mockReq, mockRes);

    // Assert: Check if the correct functions were called with correct values
    expect(Lead.findOne).toHaveBeenCalled();
    expect(Lead.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'mockUserId',
      name: 'New Lead',
      phoneNumber: '9876543210',
    }));
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'newLeadId' }));
  });

  it('should return a 400 error if the lead already exists and is not deleted', async () => {
    // Arrange: An active lead is found
    const existingLead = {
      name: 'Existing Lead',
      phoneNumber: '9876543210',
      status: 'interested',
      updatedAt: new Date().toISOString(),
    };
    Lead.findOne.mockResolvedValue(existingLead);

    // Act
    await createLead(mockReq, mockRes);

    // Assert
    expect(Lead.create).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Customer already exists in CRM!'),
    }));
  });

  it('should restore a soft-deleted lead if it exists with status "deleted"', async () => {
    // Arrange: A deleted lead is found
    const deletedLead = {
      name: 'Old Deleted Lead',
      phoneNumber: '9876543210',
      status: 'deleted',
      timeline: [],
      save: jest.fn().mockResolvedValue(this), // Mock the .save() method
    };
    Lead.findOne.mockResolvedValue(deletedLead);

    // Act
    await createLead(mockReq, mockRes);

    // Assert
    expect(Lead.create).not.toHaveBeenCalled(); // Should not create a new one
    expect(deletedLead.save).toHaveBeenCalled(); // Should call save on the existing one
    expect(deletedLead.status).toBe('new'); // Status should be updated
    expect(deletedLead.name).toBe('New Lead'); // Name should be updated
    expect(deletedLead.isArchived).toBe(false); // Should be un-archived
    expect(deletedLead.timeline.length).toBe(1);
    expect(deletedLead.timeline[0].eventType).toBe('Lead Restored');
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(deletedLead);
  });

  it('should return 400 if name or phoneNumber is missing', async () => {
    // Arrange
    mockReq.body.phoneNumber = ''; // Missing phone number

    // Act
    await createLead(mockReq, mockRes);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Name and Phone Number are required' });
  });
});

describe('Lead Controller - updateLeadStatus', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { _id: 'mockUserId' },
      params: { id: 'mockLeadId' },
      body: { status: 'hot' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should update a lead status successfully and return the updated lead', async () => {
    // Arrange
    const updatedLeadData = { _id: 'mockLeadId', status: 'hot', name: 'Test Lead' };
    Lead.findOneAndUpdate.mockResolvedValue(updatedLeadData);

    // Act
    await updateLeadStatus(mockReq, mockRes);

    // Assert
    expect(Lead.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'mockLeadId', userId: 'mockUserId' },
      {
        $set: { status: 'hot' },
        $push: { timeline: expect.any(Object) },
      },
      { new: true }
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, lead: updatedLeadData });
  });
});

describe('Lead Controller - deleteLead', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { _id: new mongoose.Types.ObjectId().toString(), fullName: 'Test User' },
      params: { id: 'mockLeadId' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should soft-delete a lead successfully', async () => {
    // Arrange
    const mockLead = {
      _id: 'mockLeadId',
      name: 'Lead to be Deleted',
      phoneNumber: '1234567890',
      status: 'new',
      save: jest.fn().mockResolvedValue(true), // Mock the save method
    };
    // Controller tries to find by _id first, which will fail for a string ID.
    // Then it tries by phoneNumber. We need to mock both calls in sequence.
    Lead.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(mockLead);
    Message.deleteMany.mockResolvedValue({ deletedCount: 5 });

    // Act
    await deleteLead(mockReq, mockRes);

    // Assert
    // The test should now correctly assert that the second call was made with phoneNumber.
    expect(Lead.findOne).toHaveBeenCalledWith({ phoneNumber: 'mockLeadId', userId: mockReq.user._id });
    expect(mockLead.save).toHaveBeenCalled();
    expect(mockLead.status).toBe('deleted');
    expect(mockLead.isArchived).toBe(true);
    expect(mockLead.deletedBy).toBe('Test User');
    expect(Message.deleteMany).toHaveBeenCalledWith({ customerPhone: '1234567890', userId: mockReq.user._id });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Deleted successfully' });
  });
});