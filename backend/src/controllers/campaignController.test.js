// File: c:/Users/Lenovo1/Desktop/ai-calling-agent/backend/src/controllers/campaignController.test.js

const { generateCampaign, publishCampaign, getIvrCampaigns, testIvrCampaign, bulkDialIvr, getCampaigns } = require('./campaignController');
const Campaign = require('../models/campaignModel');
const IvrCampaign = require('../models/ivrCampaignModel');
const User = require('../models/userModel');
const Lead = require('../models/leadModel');
const aiService = require('../services/aiService');
const twilio = require('twilio');

// Mock the dependencies
jest.mock('../models/campaignModel');
jest.mock('../models/ivrCampaignModel');
jest.mock('../models/leadModel');
jest.mock('../models/userModel');
jest.mock('../services/aiService');
// 🚀 Mock the entire twilio library
jest.mock('twilio', () => {
  const mTwilio = {
    calls: {
      create: jest.fn().mockResolvedValue({ sid: 'CA12345' }),
    },
  };
  return jest.fn(() => mTwilio);
});

describe('Campaign Controller', () => {

describe('generateCampaign', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { _id: 'mockUserId' },
      body: {
        prompt: 'A new brand of coffee',
        mode: 'automatic',
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should generate an AI ad campaign successfully', async () => {
    // Arrange: Mock the AI service to return a valid JSON string
    const mockAiResponse = {
      headline: '☕ Freshly Brewed Happiness!',
      primaryText: 'Start your day with our new premium coffee. Link in bio!',
      targetAudience: 'Age: 25-45 | Gender: All | Interests: Coffee, Starbucks, Cafe',
      budget: '₹500/day',
      imageIdea: 'A close-up shot of a steaming coffee cup.',
      aiExplanation: 'Targeting coffee lovers for maximum relevance.',
      refinementQuestions: ['Target only morning commuters?'],
    };
    aiService.generateAIResponse.mockResolvedValue(JSON.stringify(mockAiResponse));

    // Mock the database create function
    const mockSavedCampaign = { _id: 'campaign123', ...mockReq.body, generatedAd: mockAiResponse };
    Campaign.create.mockResolvedValue(mockSavedCampaign);

    // Act
    await generateCampaign(mockReq, mockRes);

    // Assert
    expect(aiService.generateAIResponse).toHaveBeenCalled();
    expect(Campaign.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'mockUserId',
      prompt: 'A new brand of coffee',
    }));
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      campaign: mockSavedCampaign,
    });
  });
});

describe('bulkDialIvr', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { _id: 'mockUserId' },
      params: { id: 'ivrCampaignId123' },
      headers: { host: 'test.com' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should bulk dial eligible leads successfully', async () => {
    // Arrange
    const mockUser = {
      _id: 'mockUserId',
      twilioConfig: {
        accountSid: 'AC-mock-sid',
        authToken: 'mock-auth-token',
        phoneNumber: '+15005550006',
      },
    };
    const mockLeads = [
      { _id: 'lead1', phoneNumber: '9876543210' }, // Eligible
      { _id: 'lead2', phoneNumber: '9876543211' }, // Eligible
      { _id: 'lead3', phoneNumber: '9876543212', status: 'converted' }, // Ineligible
    ];

    User.findById.mockResolvedValue(mockUser);
    IvrCampaign.findOne.mockResolvedValue({ _id: 'ivrCampaignId123', name: 'Bulk Dial Test' });
    Lead.find.mockReturnValue({
      limit: jest.fn().mockResolvedValue(mockLeads.filter(l => l.status !== 'converted')),
    });
    Lead.findByIdAndUpdate.mockResolvedValue(true);

    // Act
    await bulkDialIvr(mockReq, mockRes);

    // Assert
    expect(Lead.find).toHaveBeenCalledWith({
      userId: 'mockUserId',
      status: { $nin: ['converted', 'won', 'ignored'] },
      $or: [{ callCount: { $lt: 3 } }, { callCount: { $exists: false } }],
    });
    // Should only call the 2 eligible leads
    expect(twilio().calls.create).toHaveBeenCalledTimes(2);
    expect(twilio().calls.create).toHaveBeenCalledWith(expect.objectContaining({ to: '+919876543210' }));
    expect(twilio().calls.create).toHaveBeenCalledWith(expect.objectContaining({ to: '+919876543211' }));
    expect(Lead.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: 'Successfully queued 2 calls. Loop prevention active (Max 3 calls per lead).',
    });
  });
});

describe('testIvrCampaign', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { _id: 'mockUserId' },
      params: { id: 'ivrCampaignId123' },
      body: { testNumber: '+919876543210' },
      headers: { host: 'test.com' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should initiate a test call successfully if Twilio is configured', async () => {
    // Arrange
    const mockUser = {
      _id: 'mockUserId',
      twilioConfig: {
        accountSid: 'AC-mock-sid',
        authToken: 'mock-auth-token',
        phoneNumber: '+15005550006',
      },
    };
    User.findById.mockResolvedValue(mockUser);
    IvrCampaign.findOne.mockResolvedValue({ _id: 'ivrCampaignId123', name: 'Test IVR' });

    // Act
    await testIvrCampaign(mockReq, mockRes);

    // Assert
    expect(User.findById).toHaveBeenCalledWith('mockUserId');
    expect(IvrCampaign.findOne).toHaveBeenCalledWith({ _id: 'ivrCampaignId123', userId: 'mockUserId' });
    expect(twilio().calls.create).toHaveBeenCalledWith({
      url: 'https://test.com/api/webhooks/twilio/ivr?campaignId=ivrCampaignId123',
      to: '+919876543210',
      from: '+15005550006',
    });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, message: 'Test call initiated successfully! Your phone is ringing.' });
  });

  it('should return an error if Twilio is not configured', async () => {
    // Arrange: Mock a user WITHOUT Twilio config
    User.findById.mockResolvedValue({ _id: 'mockUserId', twilioConfig: {} });
    IvrCampaign.findOne.mockResolvedValue({ _id: 'ivrCampaignId123', name: 'Test IVR' });

    // Act
    await testIvrCampaign(mockReq, mockRes);

    // Assert
    expect(twilio().calls.create).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Twilio config missing. Please set up Twilio in settings first.' });
  });
});

describe('publishCampaign', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { _id: 'mockUserId' },
      body: {
        adData: {
          headline: 'Test Headline',
          primaryText: 'Test primary text.',
          imageIdea: 'http://example.com/image.png',
        },
        campaignMode: 'automatic',
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should successfully prepare a campaign for publishing', async () => {
    // Arrange: Mock a user with a connected Meta Ads account
    const mockUser = {
      _id: 'mockUserId',
      metaAdsConfig: {
        accessToken: 'mock-meta-token',
        adAccountId: 'act_12345',
      },
    };
    User.findById.mockResolvedValue(mockUser);

    // Act
    await publishCampaign(mockReq, mockRes);

    // Assert
    expect(User.findById).toHaveBeenCalledWith('mockUserId');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message: 'Campaign pushed to Meta Ads Manager successfully.',
    });
  });

  it('should return an error if the Meta Ads account is not connected', async () => {
    // Arrange: Mock a user WITHOUT a connected Meta Ads account
    User.findById.mockResolvedValue({ _id: 'mockUserId', metaAdsConfig: {} });

    // Act
    await publishCampaign(mockReq, mockRes);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Meta Ads Account not connected. Please go to Settings to connect.' });
  });
});

describe('getIvrCampaigns', () => {
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
  });

  it('should fetch all IVR campaigns for a user', async () => {
    // Arrange
    const mockIvrCampaigns = [
      { _id: 'ivr1', name: 'Welcome Campaign' },
      { _id: 'ivr2', name: 'Offer Campaign' },
    ];
    IvrCampaign.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockIvrCampaigns),
    });

    // Act
    await getIvrCampaigns(mockReq, mockRes);

    // Assert
    expect(IvrCampaign.find).toHaveBeenCalledWith({ userId: 'mockUserId' });
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      campaigns: mockIvrCampaigns,
    });
  });
});

describe('getCampaigns', () => {
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
    });

    it('should fetch all ad campaigns for a user', async () => {
      // Arrange
      const mockCampaigns = [
        { _id: 'ad1', name: 'Diwali Ad' },
        { _id: 'ad2', name: 'Summer Sale Ad' },
      ];
      Campaign.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockCampaigns),
      });

      // Act
      await getCampaigns(mockReq, mockRes);

      // Assert
      expect(Campaign.find).toHaveBeenCalledWith({ userId: 'mockUserId' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        campaigns: mockCampaigns,
      });
    });
  });

});