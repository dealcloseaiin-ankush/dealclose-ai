import React, { useState, useEffect } from 'react';
import { 
  X, Tag, Plus, Copy, Check, RefreshCw, Sparkles, 
  Gift, Calendar, Percent, Banknote, ShieldAlert, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { creditMandateApi } from '../services/creditMandateApi';

export default function CouponsManagerDrawer({ isOpen, onClose, onCouponCreated }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Coupon Form state
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    title: '',
    discountType: 'FLAT_AMOUNT',
    discountValue: 50,
    freeItemName: '',
    minBillAmount: 200,
    maxDiscountAmount: 500,
    usageLimit: 1,
    validDays: 30
  });
  const [creating, setCreating] = useState(false);

  // Fetch Coupons
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await creditMandateApi.getCoupons(statusFilter);
      if (res.success) {
        setCoupons(res.coupons || []);
      }
    } catch (err) {
      toast.error('कूपन सूची लोड करने में विफल');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCoupons();
    }
  }, [isOpen, statusFilter]);

  // Handle Create Coupon
  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discountValue) {
      toast.error('कृपया कूपन कोड और डिस्काउंट राशि दर्ज करें।');
      return;
    }

    try {
      setCreating(true);
      const res = await creditMandateApi.createCoupon(newCoupon);
      if (res.success) {
        toast.success(res.message);
        setShowCreateModal(false);
        setNewCoupon({
          code: '',
          title: '',
          discountType: 'FLAT_AMOUNT',
          discountValue: 50,
          freeItemName: '',
          minBillAmount: 200,
          maxDiscountAmount: 500,
          usageLimit: 1,
          validDays: 30
        });
        fetchCoupons();
        if (onCouponCreated) onCouponCreated(res.coupon);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'कूपन बनाने में विफल');
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(`कूपन कोड "${code}" कॉपी हो गया!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Tag className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">कूपन व डिस्काउंट ऑफर्स हब</h3>
              <p className="text-xs text-purple-200">प्रमोशनल डिस्काउंट, फ्री गिफ्ट्स व लॉयल्टी कूपन प्रबंधन</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              + नया कूपन बनाएं
            </button>
            <button onClick={onClose} className="text-white/80 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            {['ALL', 'ACTIVE', 'REDEEMED', 'EXPIRED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === s
                    ? 'bg-purple-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {s === 'ALL' ? 'सभी' : (s === 'ACTIVE' ? 'सक्रिय (Active)' : (s === 'REDEEMED' ? 'उपयुक्त (Redeemed)' : 'समाप्त'))}
              </button>
            ))}
          </div>

          <button onClick={fetchCoupons} className="text-slate-500 hover:text-slate-800 p-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Coupons List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              कूपन लोड हो रहे हैं...
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              कोई कूपन नहीं मिला। '+ नया कूपन बनाएं' पर क्लिक करके ग्राहकों के लिए डिस्काउंट जारी करें।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {coupons.map((c) => {
                const isRedeemed = c.status === 'REDEEMED';
                const isExpired = c.status === 'EXPIRED';
                const isActive = c.status === 'ACTIVE';

                return (
                  <div
                    key={c._id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isActive 
                        ? 'bg-gradient-to-br from-white to-purple-50/40 border-purple-200 shadow-sm hover:border-purple-300' 
                        : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-emerald-100 text-emerald-800' : (isRedeemed ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-800')
                        }`}>
                          {c.status}
                        </span>

                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(c.validUntil).toLocaleDateString('hi-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>

                      {/* Coupon Code Strip */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-purple-100/60 border border-purple-200/80 mb-2">
                        <span className="font-mono font-black text-sm text-purple-950 tracking-wider">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyCode(c.code)}
                          className="text-purple-700 hover:text-purple-900 p-1"
                          title="कोड कॉपी करें"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 truncate">{c.title}</h4>

                      <div className="text-xs text-emerald-800 font-bold mt-1">
                        {c.discountType === 'FLAT_AMOUNT' && `₹${c.discountValue} फ्लैट छूट`}
                        {c.discountType === 'PERCENTAGE' && `${c.discountValue}% छूट (अधिकतम ₹${c.maxDiscountAmount || 1000})`}
                        {c.discountType === 'FREE_ITEM' && `मुफ्त उपहार: ${c.freeItemName || '1 डिश/आइटम'}`}
                      </div>

                      {c.minBillAmount > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          न्यूनतम बिल: ₹{c.minBillAmount}
                        </div>
                      )}

                      {c.assignedPartyName && (
                        <div className="text-[10px] text-indigo-700 mt-1 font-semibold">
                          👤 केवल {c.assignedPartyName} के लिए
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 mt-3 flex justify-between items-center text-[10px] text-slate-400">
                      <span>उपयोग: {c.timesUsed || 0}/{c.usageLimit || 1}</span>
                      <span className="font-medium text-slate-500">
                        {c.usageLimit === 1 ? 'सिंगल-यूज़' : 'मल्टी-यूज़'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors"
          >
            बंद करें
          </button>
        </div>

      </div>

      {/* ➕ CREATE COUPON MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">नया डिस्काउंट कूपन बनाएं</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  कूपन कोड (Coupon Code) *
                </label>
                <input
                  type="text"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  placeholder="e.g. FESTIVAL50, WELCOME100, DIWALI20"
                  className="w-full px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  शीर्षक / विवरण (Title)
                </label>
                <input
                  type="text"
                  value={newCoupon.title}
                  onChange={(e) => setNewCoupon({ ...newCoupon, title: e.target.value })}
                  placeholder="e.g. दीवाली महा धमाका ₹50 की छूट"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    छूट का प्रकार
                  </label>
                  <select
                    value={newCoupon.discountType}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="FLAT_AMOUNT">फ्लैट नकद छूट (₹)</option>
                    <option value="PERCENTAGE">प्रतिशत छूट (%)</option>
                    <option value="FREE_ITEM">मुफ्त उपहार / डिश</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {newCoupon.discountType === 'PERCENTAGE' ? 'छूट %' : (newCoupon.discountType === 'FREE_ITEM' ? 'उपहार का नाम' : 'छूट राशि ₹ *')}
                  </label>
                  {newCoupon.discountType === 'FREE_ITEM' ? (
                    <input
                      type="text"
                      value={newCoupon.freeItemName}
                      onChange={(e) => setNewCoupon({ ...newCoupon, freeItemName: e.target.value })}
                      placeholder="e.g. 1 कोल्ड ड्रिंक या मिठाई"
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300"
                    />
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={newCoupon.discountValue}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 font-bold text-slate-900"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    न्यूनतम बिल राशि ₹
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newCoupon.minBillAmount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, minBillAmount: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    वैधता अवधि (दिन)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCoupon.validDays}
                    onChange={(e) => setNewCoupon({ ...newCoupon, validDays: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 px-3 rounded-xl bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  कूपन बनाएं
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
