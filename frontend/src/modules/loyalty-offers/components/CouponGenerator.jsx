import React, { useState, useEffect } from 'react';
import { 
  Ticket, Tag, Send, Plus, RefreshCw, Search, Phone, 
  MapPin, User, CheckCircle2, Calendar, Copy, Check, ExternalLink 
} from 'lucide-react';
import loyaltyOffersApi from '../services/loyaltyOffersApi';

export default function CouponGenerator() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountType, setDiscountType] = useState('FLAT_AMOUNT');
  const [discountValue, setDiscountValue] = useState('100');
  const [freeItemName, setFreeItemName] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [minBillAmount, setMinBillAmount] = useState('0');
  const [validDays, setValidDays] = useState('30');
  const [customCode, setCustomCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    loadCoupons();
  }, [statusFilter]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const res = await loyaltyOffersApi.getCoupons(statusFilter);
      if (res.success) {
        setCoupons(res.coupons || []);
      }
    } catch (err) {
      console.error('Error loading coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!customerPhone.trim()) {
      alert('कृपया ग्राहक का 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customerName: customerName.trim() || 'सम्मानित ग्राहक',
        customerCity: customerCity.trim(),
        customerPhone: customerPhone.trim(),
        code: customCode.trim() ? customCode.trim().toUpperCase() : undefined,
        title: customTitle.trim(),
        discountType,
        discountValue: Number(discountValue) || 50,
        freeItemName: freeItemName.trim(),
        minBillAmount: Number(minBillAmount) || 0,
        validDays: Number(validDays) || 30
      };

      const res = await loyaltyOffersApi.createUniqueCoupon(payload);
      if (res.success) {
        setGeneratedResult(res);
        loadCoupons();
        setCustomerName('');
        setCustomerPhone('');
        setCustomCode('');
        // Open WhatsApp automatically
        if (res.waLink) {
          window.open(res.waLink, '_blank');
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'कूपन बनाने में त्रुटि हुई।');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCoupons = coupons.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      (c.assignedPartyName && c.assignedPartyName.toLowerCase().includes(q)) ||
      (c.customerPhone && c.customerPhone.includes(q)) ||
      (c.customerCity && c.customerCity.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                🎟️ यूनिक कस्टमर कूपन इंजन
              </span>
              <span className="bg-blue-300 text-blue-950 px-2.5 py-0.5 rounded-full text-xs font-bold">
                Fraud-Proof Single-Use
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">यूनिक डिस्काउंट व ऑफर कूपन्स</h2>
            <p className="text-indigo-100 text-sm mt-1 max-w-xl">
              हर ग्राहक के लिए एक अलग, सिंगल-यूज़ कूपन कोड तैयार करें और सीधे उनके WhatsApp पर भेजें। फर्जीवाड़े से पूरी सुरक्षा!
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Generate Coupon (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              नया ग्राहक कूपन बनाएं (Issue New Coupon)
            </h3>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  ग्राहक का नाम (Customer Name)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="उदा. अमित कुमार"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    WhatsApp मोबाइल नंबर *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold tracking-wider focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    शहर / इलाका (City)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="उदा. कोटा"
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Offer Type Selection */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  ऑफर प्रकार (Discount Type)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'FLAT_AMOUNT', label: 'सीधी छूट (₹)' },
                    { id: 'PERCENTAGE', label: 'प्रतिशत (%)' },
                    { id: 'FREE_ITEM', label: 'फ्री वस्तु 🎁' }
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setDiscountType(t.id)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                        discountType === t.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic inputs according to offer type */}
              {discountType === 'FREE_ITEM' ? (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    मुफ़्त दी जाने वाली वस्तु (Free Item Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. 1 कोल्ड कॉफी या 1 डेज़र्ट"
                    value={freeItemName}
                    onChange={(e) => setFreeItemName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      {discountType === 'FLAT_AMOUNT' ? 'छूट राशि (₹)' : 'छूट प्रतिशत (%)'} *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder={discountType === 'FLAT_AMOUNT' ? '100' : '15'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      न्यूनतम बिल (₹ Min Bill)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={minBillAmount}
                      onChange={(e) => setMinBillAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    वैधता (Validity Days)
                  </label>
                  <select
                    value={validDays}
                    onChange={(e) => setValidDays(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white focus:border-indigo-500 outline-none font-medium"
                  >
                    <option value="7">7 दिन</option>
                    <option value="15">15 दिन</option>
                    <option value="30">30 दिन (1 महीना)</option>
                    <option value="60">60 दिन (2 महीने)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    कस्टम कोड (वैकल्पिक)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. FESTIVE50"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs uppercase font-mono font-bold focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {submitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Ticket className="w-5 h-5" />
                    <span>कूपन बनाएं और WhatsApp पर भेजें</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Generated Result Preview */}
          {generatedResult && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 bg-indigo-200/70 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-700" />
                  कूपन सफलतापूर्वक तैयार!
                </span>
                <span className="text-xs text-gray-500">सिंगल-यूज़</span>
              </div>

              <div className="bg-white rounded-xl p-4 border border-indigo-200 text-center space-y-2">
                <p className="text-xs text-gray-500 font-medium">{generatedResult.coupon?.title}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black font-mono tracking-widest text-indigo-700 bg-indigo-50 px-4 py-1.5 rounded-lg border border-indigo-200">
                    {generatedResult.coupon?.code}
                  </span>
                  <button
                    onClick={() => handleCopy(generatedResult.coupon?.code)}
                    className="p-2 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                    title="कोड कॉपी करें"
                  >
                    {copiedCode === generatedResult.coupon?.code ? (
                      <Check className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  ग्राहक: <strong>{generatedResult.coupon?.assignedPartyName}</strong> ({generatedResult.coupon?.customerPhone})
                </p>

                {generatedResult.waLink && (
                  <a
                    href={generatedResult.waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-sm"
                  >
                    <span>📱 WhatsApp पर कूपन भेजें</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Issued Coupons Directory (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  जारी किए गए कूपन्स ({filteredCoupons.length})
                </h3>
                <p className="text-xs text-gray-500">सभी कूपन कोड्स और उनकी रिडेम्पशन स्थिति</p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
                {['ALL', 'ACTIVE', 'REDEEMED', 'EXPIRED'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      statusFilter === s
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s === 'ALL' ? 'सभी' : s === 'ACTIVE' ? 'सक्रिय' : s === 'REDEEMED' ? 'रिडीम' : 'समाप्त'}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="कूपन कोड / ग्राहक नाम / मोबाइल खोजें..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Coupons List */}
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {loading && coupons.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-xs">कूपन लोड हो रहे हैं...</p>
                </div>
              ) : filteredCoupons.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-600">कोई कूपन नहीं मिला</p>
                  <p className="text-xs text-gray-400 mt-1">बाईं तरफ के फॉर्म से नया कूपन बनाएं।</p>
                </div>
              ) : (
                filteredCoupons.map((c) => {
                  const isRedeemed = c.status === 'REDEEMED';
                  const isExpired = c.status === 'EXPIRED' || (c.validUntil && new Date(c.validUntil) < new Date());

                  return (
                    <div
                      key={c._id}
                      className="p-4 rounded-xl border border-gray-200/80 hover:border-indigo-300 transition-all bg-white hover:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg text-sm border border-indigo-200">
                            {c.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isRedeemed
                                ? 'bg-blue-100 text-blue-800'
                                : isExpired
                                ? 'bg-red-100 text-red-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isRedeemed ? '✓ रिडीम हो चुका' : isExpired ? 'समाप्त' : 'सक्रिय (Active)'}
                          </span>
                        </div>

                        <div className="font-medium text-gray-800 text-xs truncate">
                          {c.title || 'विशेष छूट'}
                        </div>

                        <div className="text-[11px] text-gray-500 flex items-center gap-2">
                          <span>👤 {c.assignedPartyName || 'ग्राहक'}</span>
                          {c.customerCity && <span>({c.customerCity})</span>}
                          {c.customerPhone && <span>• 📱 {c.customerPhone}</span>}
                        </div>

                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>वैधता: {c.validUntil ? new Date(c.validUntil).toLocaleDateString('hi-IN') : 'असीमित'}</span>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCopy(c.code)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="कोड कॉपी करें"
                        >
                          {copiedCode === c.code ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {c.customerPhone && (
                          <a
                            href={`https://wa.me/91${c.customerPhone}?text=${encodeURIComponent(
                              `🎟️ नमस्ते ${c.assignedPartyName || 'ग्राहक'} जी! आपके लिए विशेष ऑफर: ${c.title}। आपका कूपन कोड है: *${c.code}*। दुकान पर दिखाकर लाभ उठाएं!`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2 rounded-xl border border-emerald-200 transition-colors"
                            title="WhatsApp पर भेजें"
                          >
                            <Send className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
