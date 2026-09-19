import { creditMandateApi } from '../../msme-credit-mandate/services/creditMandateApi';

export const loyaltyOffersApi = {
  // Stamps
  punchStamp: (data) => creditMandateApi.punchStamp(data),
  getStampCustomers: () => creditMandateApi.getStampCustomers(),
  
  // Coupons
  getCoupons: (status) => creditMandateApi.getCoupons(status),
  createUniqueCoupon: (data) => creditMandateApi.createUniqueCoupon(data),
  lookupCoupon: (query) => creditMandateApi.lookupCoupon(query),
  redeemCoupon: (code) => creditMandateApi.redeemCoupon(code),
  validateCoupon: (data) => creditMandateApi.validateCoupon(data),
};

export default loyaltyOffersApi;
