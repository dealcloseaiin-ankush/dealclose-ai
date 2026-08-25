const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPosts, getPostById, createPost, deletePost, importInstagramPosts, getPostAnalytics, getPostInsights, publishPostNow } = require('../controllers/postController'); // 🚀 NEW: Import getPostInsights & publishPostNow
const multer = require('multer');

// ✅ FIX: The designJson field can exceed the default 1MB limit for multipart form fields.
// Increased the fieldSize limit to 50MB to prevent 'MulterError: Field value too long'
// when saving or publishing complex designs from the AI Post Designer.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fieldSize: 50 * 1024 * 1024, fileSize: 50 * 1024 * 1024 }
});

router.route('/')
  .get(protect, getPosts)
  // Use memoryStorage for direct buffer access in the controller
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