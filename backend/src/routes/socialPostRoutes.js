// const express = require('express');
// const router = express.Router();
// const { createPost, getPosts, getPostAnalytics } = require('../controllers/socialPostController');
// const { protect } = require('../middleware/authMiddleware');
// const { upload } = require('../middleware/uploadMiddleware');

// // @route   /api/posts

// // Create a new post (handles drafts, scheduling, and publish now)
// router.post('/', protect, upload.array('media'), createPost);

// // Get all posts (for calendar, history, etc.)
// router.get('/', protect, getPosts);

// // Get aggregated analytics for the dashboard
// router.get('/analytics', protect, getPostAnalytics);

// module.exports = router;
console.log("⚠️ [WARNING] socialPostRoutes.js is deprecated and should be removed from server.js. Use postRoutes.js instead.");
module.exports = require('express').Router(); // Return an empty router to prevent crashes