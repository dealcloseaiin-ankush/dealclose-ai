const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');
const { protect } = require('../middleware/authMiddleware');

// --- Dashboard Routes (Called by Frontend React) ---
router.get('/dashboard', protect, instagramController.getDashboardData);
router.get('/posts', protect, instagramController.getRecentPosts);
router.get('/automations', protect, instagramController.getPostAutomations);
router.post('/automations', protect, instagramController.savePostAutomation);
router.delete('/automations/:postId', protect, instagramController.deletePostAutomation);
router.post('/icebreakers', protect, instagramController.setIceBreakers);
router.post('/broadcast', protect, instagramController.sendBroadcast);
router.post('/publish-media', protect, instagramController.publishMedia);

module.exports = router;