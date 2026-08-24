const express = require('express');
const router = express.Router();
const {
  getCalls,
  initiateCall,
  getCallingBuckets,
  moveCallingBucket,
  batchAssignToday,
  logManualCall
} = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getCalls);
router.post('/dial', protect, initiateCall);

// 🚀 5-Bucket Telephony & Follow-up Queue Routes
router.get('/buckets', protect, getCallingBuckets);
router.put('/bucket-move', protect, moveCallingBucket);
router.post('/batch-assign-today', protect, batchAssignToday);
router.post('/log-manual', protect, logManualCall);

module.exports = router;
