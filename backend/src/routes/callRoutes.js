const express = require('express');
const router = express.Router();
const {
  getCalls,
  initiateCall,
  getCallingBuckets,
  moveCallingBucket,
  batchAssignToday,
  logManualCall,
  getVoiceScripts,
  triggerAiVoiceCampaign,
  importAccountingBills,
  togglePaymentStatus
} = require('../controllers/callController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getCalls);
router.post('/dial', protect, initiateCall);

// 🎙️ AI Voice Calling Automation Routes
router.get('/voice-scripts', protect, getVoiceScripts);
router.post('/trigger-ai-campaign', protect, triggerAiVoiceCampaign);

// 🚀 5-Bucket Telephony & Follow-up Queue Routes
router.get('/buckets', protect, getCallingBuckets);
router.put('/bucket-move', protect, moveCallingBucket);
router.post('/batch-assign-today', protect, batchAssignToday);
router.post('/log-manual', protect, logManualCall);

// 💳 Accounting Dues Sync & 1-Click Settlement (Tally / Busy / Vyapar / Marg)
router.post('/import-accounting-bills', protect, importAccountingBills);
router.patch('/toggle-payment-status/:leadId', protect, togglePaymentStatus);

module.exports = router;
