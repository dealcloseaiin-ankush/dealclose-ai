import React, { useState } from 'react';
import { 
  CheckCircle, Search, AlertCircle, Phone, User, 
  MapPin, Gift, Clock, RefreshCw, Send, ShieldCheck, Ticket, Camera 
} from 'lucide-react';
import loyaltyOffersApi from '../services/loyaltyOffersApi';
import QrCameraModal from '../../../components/common/QrCameraModal';

export default function CouponRedeemDesk() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchedCoupons, setSearchedCoupons] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);

  const lookupCodeDirectly = async (searchStr) => {
    if (!searchStr) return;
    try {
      setLoading(true);
      setErrorMsg('');
      setRedeemSuccess(null);
      const res = await loyaltyOffersApi.lookupCoupon(searchStr);
      if (res.success && res.coupons?.length > 0) {
        setSearchedCoupons(res.coupons);
      } else {
        setSearchedCoupons([]);
        setErrorMsg('कोई कूपन नहीं मिला। कृपया कोड या मोबाइल नंबर जांचें।');
      }
    } catch (err) {
      setSearchedCoupons([]);
      setErrorMsg(err.response?.data?.message || 'कूपन ढूंढने में विफल।');
    } finally {
      setLoading(false);
    }
  };

  const handleQrScanSuccess = (decodedText) => {
    let cleanCode = decodedText.trim();
    if (cleanCode.includes('dealclose-coupon:')) {
      cleanCode = cleanCode.split('dealclose-coupon:')[1];
    } else if (cleanCode.includes('dealclose-stamp:')) {
      cleanCode = cleanCode.split('dealclose-stamp:')[1];
    }
    setQuery(cleanCode);
    lookupCodeDirectly(cleanCode);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    lookupCodeDirectly(query.trim());
  };

  const handleRedeem = async (code) => {
    if (!window.confirm(`क्या आप कूपन "${code}" को अभी रिडीम करना चाहते हैं? रिडीम के बाद यह कोड दोबारा उपयोग नहीं किया जा सकेगा।`)) {
      return;
    }

    try {
      setRedeeming(true);
      setErrorMsg('');
      const res = await loyaltyOffersApi.redeemCoupon(code);
      if (res.success) {
        setRedeemSuccess(res.coupon);
        // Refresh searched coupons
        handleSearch();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'कूपन रिडीम करने में त्रुटि हुई।');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                🛡️ फ्रॉड-प्रूफ रिडीम काउंटर
              </span>
              <span className="bg-emerald-300 text-emerald-950 px-2.5 py-0.5 rounded-full text-xs font-bold">
                Single-Use Enforcement
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">कूपन रिडीम डेस्क (Redeem Counter)</h2>
            <p className="text-emerald-100 text-sm mt-1">
              ग्राहक का कूपन कोड या 10 अंकों का मोबाइल नंबर दर्ज करके तुरंत जांचें और रिडीम करें। डुप्लीकेट रिडेम्पशन 100% ब्लॉक!
            </p>
          </div>
          <ShieldCheck className="w-12 h-12 text-emerald-200 hidden sm:block opacity-80" />
        </div>
      </div>

      {/* Search Box Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              placeholder="कूपन कोड (उदा. SAVE-100) या 10 अंकों का मोबाइल नंबर दर्ज करें..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-base font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none uppercase"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsQrScannerOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0 text-sm cursor-pointer"
            title="कूपन QR कोड स्कैन करें"
          >
            <Camera className="w-5 h-5 text-purple-200" />
            <span>📷 QR स्कैन करें</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors shrink-0 text-sm cursor-pointer"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            <span>जांचें (Verify Coupon)</span>
          </button>
        </form>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Success Banner */}
      {redeemSuccess && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-5 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-bold">🎉 कूपन "{redeemSuccess.code}" सफलतापूर्वक रिडीम हुआ!</h4>
              <p className="text-emerald-100 text-xs mt-0.5">
                ग्राहक: <strong>{redeemSuccess.assignedPartyName || 'ग्राहक'}</strong> • छूट: {redeemSuccess.title}
              </p>
            </div>
          </div>

          {redeemSuccess.customerPhone && (
            <a
              href={`https://wa.me/91${redeemSuccess.customerPhone}?text=${encodeURIComponent(
                `✅ नमस्ते ${redeemSuccess.assignedPartyName || 'ग्राहक'} जी! आपका कूपन "${redeemSuccess.code}" सफलतापूर्वक रिडीम हो गया है। हमारी दुकान में खरीदारी के लिए धन्यवाद!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0"
            >
              <span>📱 WhatsApp रसीद भेजें</span>
              <Send className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Results List */}
      {searchedCoupons && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-600" />
            मिले हुए कूपन परिणाम ({searchedCoupons.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {searchedCoupons.map((coupon) => {
              const isRedeemed = coupon.status === 'REDEEMED' || coupon.timesUsed >= (coupon.usageLimit || 1);
              const isExpired = coupon.status === 'EXPIRED' || (coupon.validUntil && new Date(coupon.validUntil) < new Date());
              const isReady = !isRedeemed && !isExpired;

              return (
                <div
                  key={coupon._id}
                  className={`bg-white rounded-2xl p-5 border-2 transition-all shadow-sm space-y-4 ${
                    isReady
                      ? 'border-emerald-400 ring-2 ring-emerald-100'
                      : isRedeemed
                      ? 'border-gray-200 bg-gray-50/70'
                      : 'border-red-200 bg-red-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-black text-xl text-gray-900 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
                        {coupon.code}
                      </span>
                      <h4 className="font-bold text-gray-800 text-sm mt-2">
                        {coupon.title || 'विशेष डिस्काउंट'}
                      </h4>
                    </div>

                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        isReady
                          ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                          : isRedeemed
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isReady ? '🟢 वैध (Ready)' : isRedeemed ? '✓ रिडीम हो चुका' : 'समाप्त (Expired)'}
                    </span>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1 text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>ग्राहक: <strong>{coupon.assignedPartyName || 'ग्राहक'}</strong></span>
                      {coupon.customerCity && <span className="text-gray-400">({coupon.customerCity})</span>}
                    </div>
                    {coupon.customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>मोबाइल: <strong>{coupon.customerPhone}</strong></span>
                      </div>
                    )}
                    {coupon.redeemedAt && (
                      <div className="flex items-center gap-2 text-blue-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>रिडीम समय: {new Date(coupon.redeemedAt).toLocaleString('hi-IN')}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {isReady ? (
                    <button
                      onClick={() => handleRedeem(coupon.code)}
                      disabled={redeeming}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg transition-all"
                    >
                      {redeeming ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>✅ कूपन रिडीम करें (Redeem Now)</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-center py-2 text-xs font-semibold text-gray-500 bg-gray-100 rounded-xl">
                      {isRedeemed ? '⚠️ यह कूपन पहले ही रिडीम हो चुका है।' : '⚠️ यह कूपन समाप्त हो चुका है।'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 📷 Merchant Camera QR Scanner Modal for Coupons */}
      <QrCameraModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanSuccess={handleQrScanSuccess}
        title="कूपन QR कोड स्कैन करें"
        subtitle="ग्राहक के मोबाइल या वाउचर पर दिया गया कूपन QR कोड कैमरे के सामने लाएं।"
      />
    </div>
  );
}

