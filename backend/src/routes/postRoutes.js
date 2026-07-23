const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPosts, getPostById, createPost, deletePost, importInstagramPosts, getPostAnalytics, getPostInsights } = require('../controllers/postController'); // 🚀 NEW: Import getPostInsights
const multer = require('multer');

// Multer setup for handling file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.route('/')
  .get(protect, getPosts)
  .post(protect, upload.single('media'), createPost);

router.route('/analytics')
  .get(protect, getPostAnalytics);

router.route('/import-instagram')
  .post(protect, importInstagramPosts);

// 🚀 NEW: Route to get live insights for a single post
router.route('/:platformPostId/insights').get(protect, getPostInsights);

router.route('/:id')
  .get(protect, getPostById)
  .delete(protect, deletePost);

module.exports = router;