const express = require('express');
const router = express.Router();
const {
  generatePairingCode,
  registerDevice,
  deviceHeartbeat,
  getUserDevices,
  dispatchRemoteCall,
  toggleDeviceActive,
  disconnectGatewayDevice,
  getCallingRoles,
  saveCallingRole,
  getCallingContacts,
  importCallingContacts,
  updateCallingContact,
  recordContactPurchase,
  getCallingAnalytics,
  triggerSchedulerEvaluation,
  submitCallResult,
  parseDiaryNotes,
  updateShopCallingProfile
} = require('../controllers/gatewayController');
const { protect } = require('../middleware/authMiddleware');

// 📱 Android SIM Gateway Device Pairing & Heartbeat
router.post('/generate-code', protect, generatePairingCode);
router.post('/register', registerDevice); // Called by phone APK with pairing code
router.post('/heartbeat', deviceHeartbeat); // Called by phone APK every 30s
router.get('/devices', protect, getUserDevices);
router.post('/remote-dial', protect, dispatchRemoteCall);
router.post('/devices/:deviceId/toggle', protect, toggleDeviceActive); // Pause/Resume remote calling
router.delete('/devices/:deviceId', protect, disconnectGatewayDevice); // Disconnect / Revoke permissions

// 🎭 Role-based Calling Brain Routes
router.get('/roles', protect, getCallingRoles);
router.post('/roles', protect, saveCallingRole);

// 👥 Contacts, Notes & Purchase Billing
router.get('/contacts', protect, getCallingContacts);
router.post('/contacts/import', protect, importCallingContacts);
router.put('/contacts/:contactId', protect, updateCallingContact); // Update Nature Note, Tatkal Note, Balance
router.post('/contacts/:contactId/purchase', protect, recordContactPurchase); // Record Material Billing after call
router.get('/analytics', protect, getCallingAnalytics); // ROI & Business Growth Stats
router.post('/evaluate-queue', protect, triggerSchedulerEvaluation);
router.post('/submit-result', protect, submitCallResult);

// 📝 Smart AI Diary / WhatsApp Note Parser & Shop Profile
router.post('/parse-diary', protect, parseDiaryNotes);
router.post('/shop-profile', protect, updateShopCallingProfile);

module.exports = router;
