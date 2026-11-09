const express = require('express');
const router = express.Router();
const {
  generatePairingCode,
  registerDevice,
  deviceHeartbeat,
  getUserDevices,
  dispatchRemoteCall,
  getCallingRoles,
  saveCallingRole,
  getCallingContacts,
  importCallingContacts,
  triggerSchedulerEvaluation,
  submitCallResult
} = require('../controllers/gatewayController');
const { protect } = require('../middleware/authMiddleware');

// 📱 Android SIM Gateway Device Pairing & Heartbeat
router.post('/generate-code', protect, generatePairingCode);
router.post('/register', registerDevice); // Called by phone APK with pairing code
router.post('/heartbeat', deviceHeartbeat); // Called by phone APK every 30s
router.get('/devices', protect, getUserDevices);
router.post('/remote-dial', protect, dispatchRemoteCall);

// 🎭 Role-based Calling Brain Routes
router.get('/roles', protect, getCallingRoles);
router.post('/roles', protect, saveCallingRole);

// 👥 Contacts & Queue Management
router.get('/contacts', protect, getCallingContacts);
router.post('/contacts/import', protect, importCallingContacts);
router.post('/evaluate-queue', protect, triggerSchedulerEvaluation);
router.post('/submit-result', protect, submitCallResult);

module.exports = router;
