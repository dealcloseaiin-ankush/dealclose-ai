const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditMandateController');
const { protect } = require('../middleware/authMiddleware');

// Party management
router.get('/parties', protect, creditController.getParties);
router.post('/parties', protect, creditController.createParty);

// Credit Limit Sanction & OTP activation
router.post('/sanction', protect, creditController.sanctionLimit);
router.post('/verify-sanction', protect, creditController.verifySanctionOtp);
router.post('/resend-sanction-otp', protect, creditController.resendSanctionOtp);

// Dynamic 5-Point Statement Real-time calculation
router.post('/calculate-statement', protect, creditController.calculateStatement);

// Udhar Bill & Gatekeeper Handover Protection
router.get('/bills', protect, creditController.getBills);
router.post('/bills', protect, creditController.createBill);
router.post('/verify-bill-otp', protect, creditController.verifyBillOtp);
router.post('/resend-bill-otp', protect, creditController.resendBillOtp);
router.post('/bypass-bill', protect, creditController.bypassBill);

// Ledger, Khata & Payments (Auto-unlock)
router.post('/payments', protect, creditController.recordPayment);
router.get('/party/:partyId/ledger', protect, creditController.getPartyLedger);

// UPI Mandate URI Generation
router.post('/generate-upi-mandate', protect, creditController.generateUpiMandate);

// 🎟️ Coupons & Offers Engine
router.get('/coupons', protect, creditController.getCoupons);
router.post('/coupons', protect, creditController.createCoupon);
router.post('/coupons/create-unique', protect, creditController.createUniqueCoupon);
router.get('/coupons/lookup', protect, creditController.lookupCoupon);
router.post('/coupons/redeem', protect, creditController.redeemCoupon);
router.post('/coupons/validate', protect, creditController.validateCoupon);

// ⭐ Loyalty Stamps System (Standalone & Integrated)
router.post('/stamps/punch', protect, creditController.punchStamp);
router.get('/stamps/customers', protect, creditController.getStampCustomers);
router.get('/stamps/registrations', protect, creditController.getRegisteredLoyaltyCustomers);
router.post('/stamps/mark-pass-sent', protect, creditController.markPassSent);

// 🌐 Public Endpoints (Walk-in Counter QR registration & Customer Digital Pass View)
router.get('/public/pass/:phone', creditController.getPublicCustomerPass);
router.post('/public/register-walkin', creditController.publicRegisterWalkin);

module.exports = router;
