const express = require('express');
const router = express.Router();
const { getLeads, createLead, exportLeads, getLeadAnalytics } = require('../controllers/leadController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Secures all lead routes below

router.get('/export', exportLeads);
router.get('/analytics', getLeadAnalytics);

router.route('/')
  .get(getLeads)
  .post(createLead);

module.exports = router;
