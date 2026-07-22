const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPosts, getPostById, createPost, deletePost } = require('../controllers/postController');
const multer = require('multer');

// Multer setup for handling file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.route('/')
  .get(protect, getPosts)
  .post(protect, upload.single('media'), createPost);

router.route('/:id')
  .get(protect, getPostById)
  .delete(protect, deletePost);

module.exports = router;