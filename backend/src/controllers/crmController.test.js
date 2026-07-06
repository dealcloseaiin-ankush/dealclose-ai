// File: c:/Users/Lenovo1/Desktop/ai-calling-agent/backend/src/controllers/crmController.test.js

const Lead = require('../models/leadModel');
const Contact = require('../models/contactModel');
const Message = require('../models/messageModel');
const CrmActivity = require('../models/CrmActivitymodel');
const User = require('../models/userModel');
const metaAdsService = require('../services/metaAdsService');
const { getPipeline, updateStage } = require('./crmController'); // This controller imports the worker

jest.mock('../models/leadModel');
jest.mock('../models/contactModel');
jest.mock('../models/messageModel');
jest.mock('../models/CrmActivitymodel');
jest.mock('../models/userModel');
jest.mock('../services/metaAdsService');

// 🚀 FIX: Mock the automation worker to prevent it from trying to connect to Redis during tests.
// We also provide a mock implementation to satisfy the `automationQueue` import.
jest.mock('../workers/automationWorker', () => ({
  automationQueue: {
    add: jest.fn(),
  },
}));

describe('CRM Controller - getPipeline', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { _id: 'mockUserId' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Mock the database calls inside getPipeline
    // 🚀 FIX: Mock the entire Mongoose query chain (.select().lean() and .sort().lean())
    Message.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });
    Lead.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'lead1', name: 'Hot Lead', status: 'hot', phoneNumber: '111' },
        { _id: 'lead2', name: 'New Lead', status: 'new', phoneNumber: '222' },
      ]),
    });
    Contact.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'contact1', name: 'Converted Contact', crmStage: 'converted', phone: '333' },
      ]),
    });
    Lead.countDocuments.mockResolvedValue(2);
  });

  it('should fetch and structure the pipeline data correctly', async () => {
    // Act
    await getPipeline(mockReq, mockRes);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        new: expect.any(Array),
        hot: expect.any(Array),
        converted: expect.any(Array),
      }),
    }));

    const responseData = mockRes.json.mock.calls[0][0].data;
    expect(responseData.new.length).toBe(1);
    expect(responseData.hot.length).toBe(1);
    expect(responseData.converted.length).toBe(1);
  });
});

describe('CRM Controller - updateStage', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { _id: 'mockUserId', fullName: 'Test User' },
      params: { id: 'mockLeadId' },
      body: { newStage: 'converted' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should update a Lead stage successfully and trigger automations on conversion', async () => {
    // Arrange
    const mockLead = {
      _id: 'mockLeadId',
      status: 'hot',
      crmStage: 'hot',
      crmStageHistory: [],
      timeline: [],
      phoneNumber: '1234567890', // 🚀 FIX: Add phone number to the mock lead
      save: jest.fn().mockResolvedValue(this),
    };
    Lead.findOne.mockResolvedValue(mockLead);
    Contact.findOne.mockResolvedValue(null); // Ensure it finds a Lead, not a Contact
    // 🚀 FIX: Mock the chained .lean() method to prevent a TypeError
    User.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        metaConfig: { pixelId: 'mockPixelId', accessToken: 'mockMetaToken' }
      })
    });
    const { automationQueue } = require('../workers/automationWorker');

    // Act
    await updateStage(mockReq, mockRes);

    // Assert
    expect(mockLead.save).toHaveBeenCalled();
    expect(mockLead.crmStage).toBe('converted');
    expect(mockLead.timeline.length).toBe(2); // Status Changed + Lead Won
    expect(CrmActivity.create).toHaveBeenCalled();
    expect(automationQueue.add).toHaveBeenCalledWith('campaign_followup', expect.any(Object), expect.any(Object));
    expect(metaAdsService.sendConversionEvent).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });
});