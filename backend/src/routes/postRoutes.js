const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPosts, getPostById, createPost, deletePost, importInstagramPosts, getPostAnalytics, getPostInsights, publishPostNow, getReadymadeTemplates, publishInstantCreative } = require('../controllers/postController');
const multer = require('multer');

// ✅ FIX: The designJson field can exceed the default 1MB limit for multipart form fields.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fieldSize: 50 * 1024 * 1024, fileSize: 50 * 1024 * 1024 }
});

// 🎨 Readymade & Instant Social Publisher Routes
router.route('/readymade-templates').get(protect, getReadymadeTemplates);
router.route('/publish-instant').post(protect, publishInstantCreative);

router.route('/')
  .get(protect, getPosts)
  .post(protect, upload.any(), createPost);

router.route('/analytics')
  .get(protect, getPostAnalytics);

router.route('/import-instagram')
  .post(protect, importInstagramPosts);

// 🚀 NEW: Route to get live insights for a single post
router.route('/:platformPostId/insights').get(protect, getPostInsights);

// 🚀 NEW: Route to immediately publish an existing draft or scheduled post
router.route('/:id/publish-now').post(protect, publishPostNow);

router.route('/:id')
  .get(protect, getPostById)
  .delete(protect, deletePost);

module.exports = router;