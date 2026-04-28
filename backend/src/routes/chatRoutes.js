const express = require('express');
const router = express.Router();
const { getChats, sendManualMessage, updateChatStatus } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware'); 

router.use(protect); // Yeh line ab is file ke saare routes ko secure kar degi!

router.get('/', getChats);
router.post('/send', sendManualMessage);
router.patch('/:customerPhone/status', updateChatStatus); // API to update tags & resolve status

module.exports = router;