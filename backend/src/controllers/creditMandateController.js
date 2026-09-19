const CreditParty = require('../models/CreditPartyModel');
const UdharBill = require('../models/UdharBillModel');
const CreditPayment = require('../models/CreditPaymentModel');
const User = require('../models/userModel');
const creditService = require('../services/creditMandateService');

// @desc    Get all credit parties with summary stats for the merchant
// @route   GET /api/credit-mandate/parties
exports.getParties = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { search, status } = req.query;

    let query = { userId };
    if (status && status !== 'ALL') {
      query.creditLimitStatus = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    const parties = await CreditParty.find(query)
      .populate('pendingApprovalBillId', 'billNumber totalAmount createdAt handoverStatus')
      .sort({ updatedAt: -1 })
      .lean();

    // Summary Statistics
    let totalSanctionedLimit = 0;
    let totalOutstanding = 0;
    let activePartiesCount = 0;
    let pendingOtpCount = 0;
    let lockedPartiesCount = 0;

    const formattedParties = parties.map(party => {
      const limit = Number(party.creditLimit) || 0;
      const outstanding = Number(party.currentOutstandingBalance) || 0;
      const available = Math.max(0, limit - outstanding);
      const usedPercentage = limit > 0 ? Math.min(100, Math.round((outstanding / limit) * 100)) : 0;

      totalSanctionedLimit += limit;
      totalOutstanding += outstanding;
      if (party.creditLimitStatus === 'ACTIVE') activePartiesCount++;
      if (party.creditLimitStatus === 'PENDING_OTP') pendingOtpCount++;
      if (party.creditLimitStatus === 'LOCKED') lockedPartiesCount++;

      return {
        ...party,
        availableLimit: available,
        usedPercentage
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        totalSanctionedLimit,
        totalOutstanding,
        totalRemainingLimit: Math.max(0, totalSanctionedLimit - totalOutstanding),
        activePartiesCount,
        pendingOtpCount,
        lockedPartiesCount,
        totalPartiesCount: parties.length
      },
      parties: formattedParties
    });
  } catch (error) {
    console.error("Error in getParties:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or onboard a new Party
// @route   POST /api/credit-mandate/parties
exports.createParty = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { name, phone, businessName, gstin, address, minBillAmountForStamp, loyaltyTargetVisits } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'नाम और मोबाइल नंबर अनिवार्य हैं।' });
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    const existing = await CreditParty.findOne({ userId, phone: cleanPhone });
    if (existing) {
      return res.status(400).json({ success: false, message: 'इस मोबाइल नंबर से ग्राहक पहले से दर्ज है।' });
    }

    const party = await CreditParty.create({
      userId,
      name: name.trim(),
      phone: cleanPhone,
      businessName: businessName?.trim() || '',
      gstin: gstin?.trim() || '',
      address: address?.trim() || '',
      minBillAmountForStamp: Number(minBillAmountForStamp) || 200,
      loyaltyTargetVisits: Number(loyaltyTargetVisits) || 5
    });

    res.status(201).json({ success: true, party });
  } catch (error) {
    console.error("Error in createParty:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sanction Credit Limit with Hindi Promissory Mandate & 4-digit OTP
// @route   POST /api/credit-mandate/sanction
exports.sanctionLimit = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { partyId, sanctionedLimit, validityDays } = req.body;

    if (!partyId || !sanctionedLimit || Number(sanctionedLimit) <= 0) {
      return res.status(400).json({ success: false, message: 'कृपया वैध क्रेडिट लिमिट दर्ज करें।' });
    }

    const party = await CreditParty.findOne({ _id: partyId, userId });
    if (!party) {
      return res.status(404).json({ success: false, message: 'ग्राहक नहीं मिला।' });
    }

    const user = await User.findById(userId).lean();
    const shopName = user?.businessName || user?.fullName || 'हमारा प्रतिष्ठान';

    // Generate 4-digit OTP and 30-minute validity
    const otp = creditService.generateOtp();
    const expiry = new Date(Date.now() + 30 * 60 * 1000);
    const limitNum = Number(sanctionedLimit);
    const daysNum = Number(validityDays) || 365;

    const { text, waLink } = creditService.buildPromissoryMandate(
      shopName,
      party.name,
      party.phone,
      limitNum,
      daysNum,
      otp
    );

    party.creditLimit = limitNum;
    party.creditLimitValidityDays = daysNum;
    party.creditLimitOtp = otp;
    party.creditLimitOtpExpiresAt = expiry;
    party.creditLimitAgreementText = text;
    party.creditLimitStatus = 'PENDING_OTP';
    party.isCreditLimitActive = false;

    await party.save();

    res.status(200).json({
      success: true,
      message: 'क्रेडिट लिमिट मैंडेट तैयार है। ग्राहक के WhatsApp पर OTP भेजें।',
      party,
      promissoryText: text,
      waLink
    });
  } catch (error) {
    console.error("Error in sanctionLimit:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify 4-digit OTP for Credit Limit Sanction (Activates Credit Line)
// @route   POST /api/credit-mandate/verify-sanction
exports.verifySanctionOtp = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { partyId, submittedOtp } = req.body;

    if (!partyId || !submittedOtp) {
      return res.status(400).json({ success: false, message: 'OTP दर्ज करना अनिवार्य है।' });
    }

    const party = await CreditParty.findOne({ _id: partyId, userId });
    if (!party) {
      return res.status(404).json({ success: false, message: 'ग्राहक नहीं मिला।' });
    }

    if (!party.creditLimitOtp || !party.creditLimitOtpExpiresAt) {
      return res.status(400).json({ success: false, message: 'कोई सक्रिय OTP अनुरोध नहीं मिला। कृपया पुनः OTP भेजें।' });
    }

    if (new Date() > new Date(party.creditLimitOtpExpiresAt)) {
      return res.status(400).json({ success: false, message: 'यह OTP समाप्त (Expired) हो चुका है। कृपया "पुनः OTP भेजें" पर क्लिक करें।' });
    }

    if (String(party.creditLimitOtp).trim() !== String(submittedOtp).trim()) {
      return res.status(400).json({ success: false, message: 'गलत OTP! कृपया ग्राहक के WhatsApp पर प्राप्त सही 4-अंकों का OTP दर्ज करें।' });
    }

    // OTP Verified -> Activate Credit Line
    party.isCreditLimitActive = true;
    party.creditLimitStatus = 'ACTIVE';
    party.creditLimitSanctionedAt = new Date();
    party.creditLimitOtp = null;
    party.creditLimitOtpExpiresAt = null;

    await party.save();

    res.status(200).json({
      success: true,
      message: `बधाई हो! ${party.name} की ₹${party.creditLimit.toLocaleString('en-IN')} की क्रेडिट लिमिट सफलतापूर्वक सक्रिय हो गई है।`,
      party
    });
  } catch (error) {
    console.error("Error in verifySanctionOtp:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resend Sanction OTP (30-Minute Reuse Window)
// @route   POST /api/credit-mandate/resend-sanction-otp
exports.resendSanctionOtp = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { partyId } = req.body;

    const party = await CreditParty.findOne({ _id: partyId, userId });
    if (!party) return res.status(404).json({ success: false, message: 'ग्राहक नहीं मिला।' });

    const user = await User.findById(userId).lean();
    const shopName = user?.businessName || user?.fullName || 'हमारा प्रतिष्ठान';

    // 30-min OTP reuse logic
    const { otp, expiresAt, isReused } = creditService.getOrReuseOtp(
      party.creditLimitOtp,
      party.creditLimitOtpExpiresAt
    );

    party.creditLimitOtp = otp;
    party.creditLimitOtpExpiresAt = expiresAt;

    const { text, waLink } = creditService.buildPromissoryMandate(
      shopName,
      party.name,
      party.phone,
      party.creditLimit,
      party.creditLimitValidityDays,
      otp
    );
    party.creditLimitAgreementText = text;
    await party.save();

    res.status(200).json({
      success: true,
      message: isReused 
        ? 'मौजूदा OTP के साथ WhatsApp लिंक पुनः तैयार किया गया (30-मिनट विंडो)।'
        : 'नया OTP जनरेट कर WhatsApp लिंक तैयार किया गया।',
      waLink,
      isReused
    });
  } catch (error) {
    console.error("Error in resendSanctionOtp:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Calculate Dynamic 5-Point Statement in Real-time for POS
// @route   POST /api/credit-mandate/calculate-statement
exports.calculateStatement = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { partyId, billAmount } = req.body;

    const party = await CreditParty.findOne({ _id: partyId, userId }).lean();
    if (!party) return res.status(404).json({ success: false, message: 'ग्राहक नहीं मिला।' });

    const amount = Math.max(0, Number(billAmount) || 0);
    const prevBal = Number(party.currentOutstandingBalance) || 0;
    const newBal = prevBal + amount;
    const limit = Number(party.creditLimit) || 0;
    const remaining = Math.max(0, limit - newBal);
    const isOverLimit = newBal > limit;

    res.status(200).json({
      success: true,
      party,
      statement: {
        billAmount: amount,
        previousBalance: prevBal,
        newTotalBalance: newBal,
        sanctionedLimit: limit,
        remainingLimit: remaining,
        isOverLimit,
        hasPendingBillApproval: party.hasPendingBillApproval,
        isCreditActive: party.creditLimitStatus === 'ACTIVE'
      }
    });
  } catch (error) {
    console.error("Error in calculateStatement:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Udhar Bill with Gatekeeper Protection & 5-Point Statement
// @route   POST /api/credit-mandate/bills
exports.createBill = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { 
      partyId, 
      items, 
      totalAmount, 
      paymentMode, 
      bypassPendingLock, 
      bypassReason,
      appliedCouponCode
    } = req.body;

    if (!partyId || !totalAmount || Number(totalAmount) <= 0) {
      return res.status(400).json({ success: false, message: 'कृपया वैध बिल विवरण दर्ज करें।' });
    }

    const party = await CreditParty.findOne({ _id: partyId, userId });
    if (!party) return res.status(404).json({ success: false, message: 'ग्राहक नहीं मिला।' });

    const user = await User.findById(userId).lean();
    const shopName = user?.businessName || user?.fullName || 'हमारा प्रतिष्ठान';

    const isCredit = paymentMode === 'CREDIT' || !paymentMode;

    // 🛡️ GATEKEEPER CHECK:
    if (isCredit) {
      if (party.creditLimitStatus !== 'ACTIVE' && party.creditLimitStatus !== 'LOCKED') {
        return res.status(400).json({
          success: false,
          message: `इस ग्राहक का क्रेडिट खाता सक्रिय नहीं है (वर्तमान स्थिति: ${party.creditLimitStatus})। कृपया पहले क्रेडिट लिमिट स्वीकृत करें।`
        });
      }

      // Check if previous bill is still locked
      if (party.hasPendingBillApproval && !bypassPendingLock) {
        return res.status(400).json({
          success: false,
          isPendingApprovalBlocked: true,
          message: '🛑 पिछला बिल अभी तक पेंडिंग है! ग्राहक से डिलीवरी पुष्टि OTP प्राप्त करें, या यदि ग्राहक दूर है तो "काम न रुके (बायपास)" का चयन करें।'
        });
      }
    }

    const billAmount = Number(totalAmount);
    const prevBal = Number(party.currentOutstandingBalance) || 0;
    const newBal = isCredit ? prevBal + billAmount : prevBal;
    const limit = Number(party.creditLimit) || 0;
    const remaining = Math.max(0, limit - newBal);

    const snapshot = {
      previousBalance: prevBal,
      billAmount,
      newTotalBalance: newBal,
      sanctionedLimit: limit,
      remainingLimit: remaining
    };

    const billNumber = `UB-${Date.now().toString().slice(-6)}`;
    const otp = creditService.generateOtp();
    const expiry = new Date(Date.now() + 30 * 60 * 1000);

    // Build 5-Point Statement message & wa.me link
    const { waLink } = creditService.build5PointDailyStatement(
      shopName,
      party.name,
      party.phone,
      billNumber,
      snapshot,
      otp
    );

    const isBypassed = Boolean(bypassPendingLock);

    const bill = await UdharBill.create({
      userId,
      partyId: party._id,
      billNumber,
      items: Array.isArray(items) && items.length > 0 ? items : [{ name: 'विविध सामान (General Goods)', quantity: 1, rate: billAmount, amount: billAmount }],
      totalAmount: billAmount,
      paymentMode: paymentMode || 'CREDIT',
      creditLineSnapshot: snapshot,
      isCreditLineBill: isCredit,
      isUdharProtected: isCredit,
      otpCode: otp,
      otpExpiresAt: expiry,
      handoverStatus: isBypassed ? 'BYPASSED' : 'PENDING_OTP',
      isOwnerBypassed: isBypassed,
      ownerBypassedAt: isBypassed ? new Date() : null,
      bypassReason: bypassReason || (isBypassed ? 'Merchant 1-click bypass' : ''),
      waLink,
      rewardCouponApplied: appliedCouponCode || null
    });

    // Update Party state
    if (isCredit) {
      party.currentOutstandingBalance = newBal;
      if (isBypassed) {
        party.hasPendingBillApproval = false;
        party.pendingApprovalBillId = null;
      } else {
        party.hasPendingBillApproval = true;
        party.pendingApprovalBillId = bill._id;
      }

      // Check if overlimit
      if (newBal > limit && limit > 0) {
        party.creditLimitStatus = 'LOCKED';
        party.creditLimitLockedReason = `कुल बकाया ₹${newBal.toLocaleString('en-IN')} स्वीकृत लिमिट ₹${limit.toLocaleString('en-IN')} से अधिक हो गया है।`;
      }
    }

    // 🎁 Loyalty & Stamp Card Milestones
    let loyaltyUpdate = null;
    if (billAmount >= (party.minBillAmountForStamp || 200)) {
      party.completedVisitsCount = (party.completedVisitsCount || 0) + 1;
      bill.loyaltyStampAwarded = true;

      // Check if target milestone reached
      const target = party.loyaltyTargetVisits || 5;
      if (party.completedVisitsCount >= target) {
        party.rewardUnlocked = true;
        party.activeRewardCoupon = `VIP-GIFT-${party.phone.slice(-4)}-${Date.now().toString().slice(-4)}`;
        // reset stamp count for next cycle
        party.completedVisitsCount = 0;
      }

      const loyaltyMsg = creditService.buildLoyaltyStampMessage(
        shopName,
        party.name,
        party.phone,
        party.completedVisitsCount,
        target,
        party.rewardUnlocked,
        party.activeRewardCoupon
      );

      loyaltyUpdate = {
        completedVisits: party.completedVisitsCount,
        targetVisits: target,
        rewardUnlocked: party.rewardUnlocked,
        activeRewardCoupon: party.activeRewardCoupon,
        loyaltyWaLink: loyaltyMsg.waLink
      };
    }

    await party.save();
    await bill.save();

    res.status(201).json({
      success: true,
      message: isBypassed 
        ? 'बिल बायपास मोड ("काम न रुके") में तुरंत दर्ज हो गया है।' 
        : 'उधार बिल जनरेट हुआ। ग्राहक के WhatsApp पर 5-बिंदु हिसाब व OTP भेजा गया है।',
      bill,
      party,
      waLink,
      loyaltyUpdate
    });
  } catch (error) {
    console.error("Error in createBill:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Bill Delivery OTP (Cashier-proof Handover Unlock)
// @route   POST /api/credit-mandate/verify-bill-otp
exports.verifyBillOtp = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { billId, submittedOtp } = req.body;

    if (!billId || !submittedOtp) {
      return res.status(400).json({ success: false, message: 'OTP दर्ज करना अनिवार्य है।' });
    }

    const bill = await UdharBill.findOne({ _id: billId, userId });
    if (!bill) return res.status(404).json({ success: false, message: 'बिल नहीं मिला।' });

    if (bill.handoverStatus === 'DELIVERED') {
      return res.status(200).json({ success: true, message: 'यह बिल पहले से डिलीवर व सत्यापित है।' });
    }

    if (!bill.otpCode || !bill.otpExpiresAt) {
      return res.status(400).json({ success: false, message: 'इस बिल का कोई सक्रिय OTP नहीं मिला।' });
    }

    if (new Date() > new Date(bill.otpExpiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP समाप्त हो चुका है। कृपया "पुनः OTP भेजें" दबाएं।' });
    }

    if (String(bill.otpCode).trim() !== String(submittedOtp).trim()) {
      return res.status(400).json({ success: false, message: 'गलत OTP! ग्राहक के WhatsApp पर आया सही 4-अंकों का OTP दर्ज करें।' });
    }

    // OTP Verified
    bill.handoverStatus = 'DELIVERED';
    await bill.save();

    // Release party Gatekeeper lock
    const party = await CreditParty.findById(bill.partyId);
    if (party) {
      if (String(party.pendingApprovalBillId) === String(bill._id)) {
        party.hasPendingBillApproval = false;
        party.pendingApprovalBillId = null;
        await party.save();
      }
    }

    res.status(200).json({
      success: true,
      message: '✅ माल हैंडओवर सफलतापूर्वक सत्यापित हुआ! Gatekeeper अनलॉक हो गया है।',
      bill,
      party
    });
  } catch (error) {
    console.error("Error in verifyBillOtp:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resend Bill OTP (30-Minute Reuse Window)
// @route   POST /api/credit-mandate/resend-bill-otp
exports.resendBillOtp = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { billId } = req.body;

    const bill = await UdharBill.findOne({ _id: billId, userId }).populate('partyId');
    if (!bill) return res.status(404).json({ success: false, message: 'बिल नहीं मिला।' });

    const user = await User.findById(userId).lean();
    const shopName = user?.businessName || user?.fullName || 'हमारा प्रतिष्ठान';

    const { otp, expiresAt, isReused } = creditService.getOrReuseOtp(
      bill.otpCode,
      bill.otpExpiresAt
    );

    bill.otpCode = otp;
    bill.otpExpiresAt = expiresAt;

    const { waLink } = creditService.build5PointDailyStatement(
      shopName,
      bill.partyId.name,
      bill.partyId.phone,
      bill.billNumber,
      bill.creditLineSnapshot,
      otp
    );
    bill.waLink = waLink;
    await bill.save();

    res.status(200).json({
      success: true,
      message: isReused 
        ? 'मौजूदा OTP के साथ 5-बिंदु हिसाब WhatsApp लिंक पुनः तैयार किया गया।' 
        : 'नया OTP जनरेट कर WhatsApp लिंक तैयार किया गया।',
      waLink,
      isReused
    });
  } catch (error) {
    console.error("Error in resendBillOtp:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Merchant 1-Click "काम न रुके" Manual Bypass
// @route   POST /api/credit-mandate/bypass-bill
exports.bypassBill = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { billId, reason } = req.body;

    const bill = await UdharBill.findOne({ _id: billId, userId });
    if (!bill) return res.status(404).json({ success: false, message: 'बिल नहीं मिला।' });

    bill.handoverStatus = 'BYPASSED';
    bill.isOwnerBypassed = true;
    bill.ownerBypassedAt = new Date();
    bill.bypassReason = reason || 'काउंटर सुचारू रखने के लिए व्यापारी द्वारा बायपास';
    await bill.save();

    // Release Gatekeeper lock
    const party = await CreditParty.findById(bill.partyId);
    if (party) {
      if (String(party.pendingApprovalBillId) === String(bill._id)) {
        party.hasPendingBillApproval = false;
        party.pendingApprovalBillId = null;
        await party.save();
      }
    }

    res.status(200).json({
      success: true,
      message: '⚡ "काम न रुके": बिल तुरंत बायपास कर दिया गया और Gatekeeper अनलॉक हो गया।',
      bill,
      party
    });
  } catch (error) {
    console.error("Error in bypassBill:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record Payment Received & Auto-Unlock Credit Limit if within bounds
// @route   POST /api/credit-mandate/payments
exports.recordPayment = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { partyId, amount, paymentMode, referenceNote } = req.body;

    if (!partyId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'कृपया वैध भुगतान राशि दर्ज करें।' });
    }

    const party = await CreditParty.findOne({ _id: partyId, userId });
    if (!party) return res.status(404).json({ success: false, message: 'ग्राहक नहीं मिला।' });

    const user = await User.findById(userId).lean();
    const shopName = user?.businessName || user?.fullName || 'हमारा प्रतिष्ठान';

    const payAmount = Number(amount);
    const prevBal = Number(party.currentOutstandingBalance) || 0;
    const newBal = Math.max(0, prevBal - payAmount);

    party.currentOutstandingBalance = newBal;

    // 🔓 AUTOMATIC LIMIT RESTORATION & UNLOCK:
    // If balance falls within sanctioned limit, unlock LOCKED party to ACTIVE!
    let autoUnlocked = false;
    if (party.creditLimitStatus === 'LOCKED' && newBal <= party.creditLimit) {
      party.creditLimitStatus = 'ACTIVE';
      party.creditLimitLockedReason = '';
      autoUnlocked = true;
    }

    await party.save();

    // Generate WhatsApp Payment Receipt
    const { waLink } = creditService.buildPaymentReceipt(
      shopName,
      party.name,
      party.phone,
      payAmount,
      paymentMode || 'CASH',
      prevBal,
      newBal,
      party.creditLimit
    );

    const payment = await CreditPayment.create({
      userId,
      partyId: party._id,
      amount: payAmount,
      paymentType: 'received',
      paymentMode: paymentMode || 'CASH',
      referenceNote: referenceNote?.trim() || '',
      previousBalance: prevBal,
      newBalance: newBal,
      waReceiptLink: waLink
    });

    res.status(201).json({
      success: true,
      message: autoUnlocked 
        ? `₹${payAmount.toLocaleString('en-IN')} की जमा प्रविष्टि हो गई। बैलेंस सीमा में आने पर खाता स्वतः "ACTIVE" अनलॉक हो गया है!`
        : `₹${payAmount.toLocaleString('en-IN')} की जमा प्रविष्टि दर्ज हो गई।`,
      payment,
      party,
      waReceiptLink: waLink,
      autoUnlocked
    });
  } catch (error) {
    console.error("Error in recordPayment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Bills List
// @route   GET /api/credit-mandate/bills
exports.getBills = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { partyId, status, limit = 50 } = req.query;

    let query = { userId };
    if (partyId) query.partyId = partyId;
    if (status && status !== 'ALL') query.handoverStatus = status;

    const bills = await UdharBill.find(query)
      .populate('partyId', 'name phone businessName creditLimit currentOutstandingBalance creditLimitStatus')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.status(200).json({ success: true, count: bills.length, bills });
  } catch (error) {
    console.error("Error in getBills:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Party Ledger History (Bills + Payments chronological)
// @route   GET /api/credit-mandate/party/:partyId/ledger
exports.getPartyLedger = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { partyId } = req.params;

    const party = await CreditParty.findOne({ _id: partyId, userId }).lean();
    if (!party) return res.status(404).json({ success: false, message: 'ग्राहक नहीं मिला।' });

    const bills = await UdharBill.find({ userId, partyId }).sort({ createdAt: -1 }).lean();
    const payments = await CreditPayment.find({ userId, partyId }).sort({ createdAt: -1 }).lean();

    // Merge & sort chronologically
    const ledger = [
      ...bills.map(b => ({
        type: 'DEBIT_BILL',
        id: b._id,
        date: b.createdAt,
        billNumber: b.billNumber,
        amount: b.totalAmount,
        status: b.handoverStatus,
        isOwnerBypassed: b.isOwnerBypassed,
        details: b.items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'उधार माल'
      })),
      ...payments.map(p => ({
        type: 'CREDIT_PAYMENT',
        id: p._id,
        date: p.createdAt,
        amount: p.amount,
        paymentMode: p.paymentMode,
        note: p.referenceNote || 'खाते में जमा',
        prevBalance: p.previousBalance,
        newBalance: p.newBalance
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      party,
      ledger
    });
  } catch (error) {
    console.error("Error in getPartyLedger:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate UPI Mandate URI for party
// @route   POST /api/credit-mandate/generate-upi-mandate
exports.generateUpiMandate = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { partyId, vpa, cycle = 'MONTHLY', maxAmount } = req.body;

    const party = await CreditParty.findOne({ _id: partyId, userId });
    if (!party) return res.status(404).json({ success: false, message: 'ग्राहक नहीं मिला।' });

    const user = await User.findById(userId).lean();
    const merchantName = user?.businessName || user?.fullName || 'DealClose Merchant';

    const mandateUri = creditService.buildUpiMandateUri(
      vpa || party.upiMandateVpa,
      merchantName,
      maxAmount || party.creditLimit || 10000,
      cycle
    );

    if (vpa) {
      party.upiMandateVpa = vpa;
      party.mandateCycle = cycle;
      party.mandateMaxAmount = Number(maxAmount) || party.creditLimit || 10000;
      party.hasActiveUpiMandate = true;
      await party.save();
    }

    res.status(200).json({
      success: true,
      mandateUri,
      party
    });
  } catch (error) {
    console.error("Error in generateUpiMandate:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
