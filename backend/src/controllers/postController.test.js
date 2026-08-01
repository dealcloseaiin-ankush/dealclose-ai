const Post = require('../models/postModel');
const SocialPost = require('../models/SocialPostModel');
const User = require('../models/userModel');
const instagramService = require('../services/instagramService');
const { uploadToCloudinary } = require('../services/cloudinaryService');
const { automationQueue } = require('../workers/automationWorker');

const { getPosts, getPostAnalytics, deletePost } = require('./postController');
const aiController = require('./aiController');

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

describe('postController.deletePost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes an app-published Instagram post from Meta and soft-deletes it from the dashboard', async () => {
    const post = {
      _id: 'post-id',
      userId: 'user-id',
      workspaceId: 'main',
      isImported: false,
      legacySocialPostId: 'legacy-social-post-id',
      platformPostIds: { instagram: 'ig-123' },
    };

    Post.findOne = jest.fn().mockResolvedValue(post);
    User.findById = jest.fn().mockResolvedValue({
      instagramConfig: {
        accessToken: 'ig-token',
        loginType: 'instagram_business_login',
      },
    });
    instagramService.deleteMedia = jest.fn().mockResolvedValue({});
    Post.updateOne = jest.fn().mockResolvedValue({});
    SocialPost.findByIdAndDelete = jest.fn().mockResolvedValue({});

    const req = {
      user: { _id: 'user-id' },
      params: { id: 'post-id' },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await deletePost(req, res);

    expect(instagramService.deleteMedia).toHaveBeenCalledWith('ig-123', 'ig-token', 'instagram_business_login');
    expect(Post.updateOne).toHaveBeenCalledWith(
      { _id: 'post-id' },
      { $set: { status: 'archived', isDeleted: true, failureReason: 'User deleted' } }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: expect.stringContaining('Instagram'),
    }));
  });
});

describe('aiController.generateContentPlanSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates queued scheduled posts from an AI content plan', async () => {
    const req = {
      user: { _id: 'user-id' },
      body: {
        plannerPrompt: 'Create a 4-week Instagram content plan with 3 posts per week.',
        plannerResponse: 'Week 1\nMon: Launch offer\nWed: Story CTA\nFri: Product demo',
        workspaceId: 'main',
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    Post.create = jest.fn().mockResolvedValue({ _id: 'queued-post-id' });
    Post.findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'existing-post-id',
          mediaUrls: [{ url: 'https://example.com/post.jpg', type: 'image' }],
        }),
      }),
    });
    User.findById = jest.fn().mockResolvedValue({ _id: 'user-id' });
    automationQueue.add = jest.fn().mockResolvedValue({});

    await aiController.generateContentPlanSchedule(req, res);

    expect(Post.create).toHaveBeenCalled();
    expect(automationQueue.add).toHaveBeenCalledWith(
      'publish_scheduled_post',
      expect.objectContaining({ postId: expect.anything() }),
      expect.objectContaining({ delay: expect.any(Number) })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      scheduledPosts: expect.any(Number),
    }));
  });
});

describe('postController.getPostAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('refreshes live instagram insights and returns aggregated analytics totals', async () => {
    const post = {
      _id: 'post-id',
      userId: 'user-id',
      workspaceId: 'main',
      status: 'published',
      caption: 'Test caption',
      platformPostIds: { instagram: 'ig-123' },
      mediaUrls: [{ url: 'https://example.com/post.jpg', type: 'image' }],
      analytics: { likes: 1, comments: 1, reach: 1, saves: 1, shares: 1 },
      publishedAt: new Date('2026-07-01T10:00:00.000Z'),
    };

    Post.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([post]),
      }),
    });
    User.findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        instagramConfig: {
          accessToken: 'ig-token',
          loginType: 'facebook_business',
        },
      }),
    });
    instagramService.getPostInsights = jest.fn().mockResolvedValue({
      likes: 10,
      comments: 2,
      reach: 100,
      impressions: 150,
      saved: 4,
      shares: 3,
      profile_visits: 5,
      video_views: 7,
    });

    const req = {
      user: { _id: 'user-id' },
      query: { workspaceId: 'main' },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await getPostAnalytics(req, res);

    expect(instagramService.getPostInsights).toHaveBeenCalledWith('ig-123', 'ig-token', 'facebook_business');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      analytics: expect.objectContaining({
        totalReach: 100,
        totalLikes: 10,
        totalComments: 2,
        totalShares: 3,
        totalSaves: 4,
        totalProfileVisits: 5,
      }),
    }));
  });
});
