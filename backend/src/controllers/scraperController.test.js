// File: c:/Users/Lenovo1/Desktop/ai-calling-agent/backend/src/controllers/scraperController.test.js

const { searchBusinesses } = require('./scraperController');

// Mock the global fetch function before all tests
global.fetch = jest.fn();

describe('Scraper Controller - searchBusinesses', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    mockReq = {
      body: {
        industry: 'Restaurants',
        city: 'New York',
        maxResults: 20,
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should fetch and return leads successfully from SerpApi', async () => {
    // Arrange: Mock a successful API response from SerpApi
    const mockSerpApiResponse = {
      local_results: [
        { title: 'Restaurant A', phone: '111-222-3333', address: '123 Main St', website: 'http://rest-a.com', rating: 4.5, reviews: 100, type: 'Restaurant' },
        { title: 'Restaurant B', phone: null, address: '456 Oak Ave', website: 'http://rest-b.com', rating: 4.2, reviews: 50, type: 'Restaurant' },
      ],
    };
    // 🚀 FIX: Simulate pagination by returning results on the first call and an empty array on the second.
    fetch
      .mockResolvedValueOnce({ json: () => Promise.resolve(mockSerpApiResponse) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ local_results: [] }) });

    // Act
    await searchBusinesses(mockReq, mockRes);

    // Assert
    expect(fetch).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      totalFound: 2,
      withPhoneCount: 1,
    }));
    // Check if the sorting logic works (leads with phone numbers come first)
    const responseData = mockRes.json.mock.calls[0][0].data;
    expect(responseData[0].hasPhone).toBe(true);
    expect(responseData[1].hasPhone).toBe(false);
  });

  it('should handle cases where no results are found', async () => {
    // Arrange: Mock an empty response
    fetch.mockResolvedValue({
      json: () => Promise.resolve({ local_results: [] }),
    });

    // Act
    await searchBusinesses(mockReq, mockRes);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      totalFound: 0,
      withPhoneCount: 0,
    }));
  });

  it('should handle errors from the SerpApi', async () => {
    // Arrange: Mock an error response
    fetch.mockResolvedValue({
      json: () => Promise.resolve({ error: 'Your API key is invalid.' }),
    });

    // Act
    await searchBusinesses(mockReq, mockRes);

    // Assert
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Your API key is invalid.',
    });
  });

  it('should return a 400 error for an empty query', async () => {
    // Arrange
    mockReq.body = {}; // Empty body

    // Act
    await searchBusinesses(mockReq, mockRes);

    // Assert
    expect(fetch).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Please provide a search query, or both city and industry.',
    });
  });
});