const Post = require('../models/postModel');
const SocialPost = require('../models/SocialPostModel');
const User = require('../models/userModel');
const instagramService = require('../services/instagramService');
const { uploadToCloudinary } = require('../services/cloudinaryService');
const { automationQueue } = require('../workers/automationWorker');

const { getPosts } = require('./postController');

jest.mock('../models/postModel');
jest.mock('../models/SocialPostModel');
jest.mock('../models/userModel');
jest.mock('../services/instagramService');
jest.mock('../services/cloudinaryService');
jest.mock('../workers/automationWorker', () => ({
  automationQueue: { add: jest.fn() },
}));

describe('postController.getPosts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('excludes soft-deleted posts from the publisher dashboard query', async () => {
    const activePost = {
      _id: 'active-post-id',
      userId: 'user-id',
      workspaceId: 'main',
      status: 'published',
      isImported: false,
      mediaUrls: [{ url: 'https://example.com/image.jpg', type: 'image' }],
      publishedAt: new Date(),
    };

    SocialPost.find = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    Post.exists = jest.fn().mockResolvedValue(false);
    Post.find = jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([activePost]),
      }),
    });
    User.findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({}),
    });

    const req = {
      user: { _id: 'user-id' },
      query: {},
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getPosts(req, res);

    expect(Post.find).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        workspaceId: 'main',
        isDeleted: { $ne: true },
      })
    );
  });
});
