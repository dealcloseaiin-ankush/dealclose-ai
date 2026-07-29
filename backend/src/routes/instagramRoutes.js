const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/instagramController');
const { protect } = require('../middleware/authMiddleware');

// ✅ FIX: The designJson field can exceed the default 1MB limit for multipart form fields.
// Increased the fieldSize limit to 25MB to prevent 'MulterError: Field value too long'
// when saving drafts from the AI Post Designer.
const { upload } = require('../middleware/uploadMiddleware'); // This now correctly imports the middleware with limits

// --- Dashboard Routes (Called by Frontend React) ---
router.get('/dashboard', protect, instagramController.getDashboardData);
router.get('/business/insights', protect, instagramController.getBusinessInsights); // NEW INSIGHTS ROUTE
router.get('/business/insights/history', protect, instagramController.getBusinessInsightsHistory);
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

// --- NEW COMMENT MANAGEMENT ROUTES ---
router.get('/posts/:id/comments', protect, instagramController.getCommentsForPost);
router.post('/comments/:id/reply', protect, instagramController.replyToComment);
router.delete('/comments/:id', protect, instagramController.deleteComment);

// --- NEW HUMAN AGENT DM ROUTE ---
router.post('/dm/reply', protect, instagramController.sendDirectMessage);

// --- NEW CONTENT PUBLISH ROUTE ---
router.post('/publish', protect, upload.single('image'), instagramController.publishPost);

// --- NEW AI CONTENT GENERATION ROUTE ---
router.post('/ai-generate-post', protect, instagramController.generateAiPost);

// --- NEW DRAFT SYSTEM ROUTES ---
router.get('/drafts', protect, instagramController.getDrafts);
router.post('/drafts', protect, upload.single('image'), instagramController.saveDraft);
router.delete('/drafts/:id', protect, instagramController.deleteDraft);

module.exports = router;
