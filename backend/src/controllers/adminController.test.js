jest.mock('../models/userModel', () => ({
  findById: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn(),
}));
jest.mock('../models/leadModel', () => ({
  countDocuments: jest.fn(),
}));
jest.mock('../models/messageModel', () => ({
  countDocuments: jest.fn(),
}));
jest.mock('../models/aiUsageLogModel', () => ({
  aggregate: jest.fn(),
}));

const User = require('../models/userModel');
const Lead = require('../models/leadModel');
const Message = require('../models/messageModel');
const AiUsageLog = require('../models/aiUsageLogModel');
const { getSystemStats } = require('./adminController');

describe('Admin Controller - getSystemStats', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should return system stats for a superadmin user', async () => {
    // Arrange: Mock a superadmin user in the request
    mockReq = {
      user: { _id: 'superadminUserId' },
    };

    // Mock the database calls
    User.findById.mockResolvedValue({ _id: 'superadminUserId', role: 'superadmin' });
    User.countDocuments.mockResolvedValue(150);
    User.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ email: 'test@user.com' }]),
    });
    Lead.countDocuments.mockResolvedValue(500);
    Message.countDocuments.mockResolvedValue(2500);

    // Mock the aggregation results
    AiUsageLog.aggregate
      .mockResolvedValueOnce([
        { _id: null, totalPlatformCost: 10.5, totalRevenue: 84.0, totalTokens: 5000000 },
      ])
      .mockResolvedValueOnce([
        { date: '2024-07-04', revenue: 40.0, cost: 5.0 },
        { date: '2024-07-05', revenue: 44.0, cost: 5.5 },
      ]);

    // Act
    await getSystemStats(mockReq, mockRes);

    // Assert
    expect(User.findById).toHaveBeenCalledWith('superadminUserId');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      stats: expect.objectContaining({
        totalUsers: 150,
        totalLeads: 500,
        totalPlatformCost: 10.5,
        totalRevenue: 84.0,
        totalProfit: 73.5, // 84.0 - 10.5
      }),
      dailyFinancials: expect.any(Array),
    }));
    expect(mockRes.json.mock.calls[0][0].dailyFinancials.length).toBe(2);
  });

  it('should return a 403 Forbidden error for a non-superadmin user', async () => {
    // Arrange: Mock a regular user
    mockReq = {
      user: { _id: 'regularUserId' },
    };

    User.findById.mockResolvedValue({ _id: 'regularUserId', role: 'owner' });

    // Act
    await getSystemStats(mockReq, mockRes);

    // Assert
    expect(User.findById).toHaveBeenCalledWith('regularUserId');
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Forbidden. Super Admin access required.' });
    expect(User.countDocuments).not.toHaveBeenCalled(); // Ensure no stats were fetched
  });
});