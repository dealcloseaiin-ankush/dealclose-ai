--- /dev/null
const express = require('express');
const router = express.Router();
const automarketerController = require('../controllers/automarketerController');
const { protect } = require('../middleware/authMiddleware');

router.get('/posts', protect, automarketerController.getGeneratedPosts);
router.post('/posts/:id/approve', protect, automarketerController.approvePost);
router.post('/posts/:id/reject', protect, automarketerController.rejectPost);

module.exports = router;
