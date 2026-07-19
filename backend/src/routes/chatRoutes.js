const express = require('express');
const router = express.Router();
const { getChats, sendManualMessage, updateChatStatus, deleteMessage, deleteConversation, toggleAiForChat } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware'); 

router.use(protect); // Yeh line ab is file ke saare routes ko secure kar degi!

router.get('/', getChats);
router.post('/send', sendManualMessage);
router.post('/toggle-ai', toggleAiForChat); // Route to toggle AI for a chat

router.delete('/conversation/:customerPhone', deleteConversation); // 🚀 NEW: Route to delete a whole conversation

router.delete('/:messageId', deleteMessage); // Route to delete a single message
router.patch('/:customerPhone/status', updateChatStatus); // API to update tags & resolve status

module.exports = router;