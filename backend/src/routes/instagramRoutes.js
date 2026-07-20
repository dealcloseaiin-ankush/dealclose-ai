const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware'); // Assuming this middleware exists

// --- Dashboard Routes (Called by Frontend React) ---
router.get('/dashboard', protect, instagramController.getDashboardData);
router.get('/business/insights', protect, instagramController.getBusinessInsights); // NEW INSIGHTS ROUTE
router.get('/posts', protect, instagramController.getRecentPosts);
router.get('/automations', protect, instagramController.getPostAutomations);
router.post('/automations', protect, instagramController.savePostAutomation);
router.patch('/comment-ai/config', protect, instagramController.updateCommentAiConfig);
router.patch('/comment-ai/thread', protect, instagramController.updateCommentAiThreadState);
router.delete('/automations/:postId', protect, instagramController.deletePostAutomation);
router.post('/icebreakers', protect, instagramController.setIceBreakers);
router.post('/broadcast', protect, instagramController.sendBroadcast);
router.post('/publish-media', protect, instagramController.publishMedia);
router.patch('/comment-ai/post-toggle', protect, instagramController.updateCommentAiPostSetting);
router.get('/posts/:id/insights', protect, instagramController.getPostInsights); // Naya route
router.post('/posts/:id/analyze', protect, instagramController.analyzePostPerformance); // AI Analysis route

// --- NEW CONTENT PUBLISH ROUTE ---
router.post('/publish', protect, upload.single('image'), instagramController.publishPost);

module.exports = router;