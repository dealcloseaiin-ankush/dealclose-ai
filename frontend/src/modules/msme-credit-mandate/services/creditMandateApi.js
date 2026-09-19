import api from '../../../services/api';

export const creditMandateApi = {
  // Parties
  getParties: async (search = '', status = 'ALL') => {
    const res = await api.get('/credit-mandate/parties', { params: { search, status } });
    return res.data;
  },

  createParty: async (data) => {
    const res = await api.post('/credit-mandate/parties', data);
    return res.data;
  },

  // Sanction & OTP
  sanctionLimit: async (data) => {
    const res = await api.post('/credit-mandate/sanction', data);
    return res.data;
  },

  verifySanctionOtp: async (data) => {
    const res = await api.post('/credit-mandate/verify-sanction', data);
    return res.data;
  },

  resendSanctionOtp: async (partyId) => {
    const res = await api.post('/credit-mandate/resend-sanction-otp', { partyId });
    return res.data;
  },

  // 5-Point Statement
  calculateStatement: async (partyId, billAmount) => {
    const res = await api.post('/credit-mandate/calculate-statement', { partyId, billAmount });
    return res.data;
  },

  // Bills & Gatekeeper
  getBills: async (params = {}) => {
    const res = await api.get('/credit-mandate/bills', { params });
    return res.data;
  },

  createBill: async (data) => {
    const res = await api.post('/credit-mandate/bills', data);
    return res.data;
  },

  verifyBillOtp: async (data) => {
    const res = await api.post('/credit-mandate/verify-bill-otp', data);
    return res.data;
  },

  resendBillOtp: async (billId) => {
    const res = await api.post('/credit-mandate/resend-bill-otp', { billId });
    return res.data;
  },

  bypassBill: async (billId, reason = '') => {
    const res = await api.post('/credit-mandate/bypass-bill', { billId, reason });
    return res.data;
  },

  // Payments & Ledger
  recordPayment: async (data) => {
    const res = await api.post('/credit-mandate/payments', data);
    return res.data;
  },

  getPartyLedger: async (partyId) => {
    const res = await api.get(`/credit-mandate/party/${partyId}/ledger`);
    return res.data;
  },

  // UPI Mandate
  generateUpiMandate: async (data) => {
    const res = await api.post('/credit-mandate/generate-upi-mandate', data);
    return res.data;
  },

  // 🎟️ Coupons & Offers
  getCoupons: async (status = 'ALL') => {
    const res = await api.get('/credit-mandate/coupons', { params: { status } });
    return res.data;
  },

  createCoupon: async (data) => {
    const res = await api.post('/credit-mandate/coupons', data);
    return res.data;
  },

  validateCoupon: async (data) => {
    const res = await api.post('/credit-mandate/coupons/validate', data);
    return res.data;
  }
};
