import React, { useState, useEffect } from 'react';
import { 
  Award, Star, Send, Plus, CheckCircle, RefreshCw, 
  Search, Phone, MapPin, User, Gift, Sparkles, ExternalLink 
} from 'lucide-react';
import loyaltyOffersApi from '../services/loyaltyOffersApi';

export default function StampCardManager() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Configurable Scheme Settings
  const [targetVisits, setTargetVisits] = useState(5);
  const [rewardType, setRewardType] = useState('FREE_ITEM');
  const [rewardDescription, setRewardDescription] = useState('1 मुफ़्त विशेष उपहार (Free Gift)');
  const [rewardValue, setRewardValue] = useState(100);

  // Customer Form
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await loyaltyOffersApi.getStampCustomers();
      if (res.success) {
        setCustomers(res.customers || []);
      }
    } catch (err) {
      console.error('Error fetching stamp customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePunchStamp = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('कृपया ग्राहक का नाम और 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        city: city.trim(),
        phone: phone.trim(),
        targetVisits: Number(targetVisits) || 5,
        rewardDescription: rewardDescription.trim(),
        rewardDiscountType: rewardType,
        rewardDiscountValue: Number(rewardValue) || 100
      };

      const res = await loyaltyOffersApi.punchStamp(payload);
      if (res.success) {
        setLastResult(res);
        loadCustomers();
        // Clear fields except city if repeat
        setName('');
        setPhone('');
        // Open WhatsApp automatically
        if (res.waLink) {
          window.open(res.waLink, '_blank');
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'स्टैम्प लगाने में त्रुटि हुई।');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAddVisit = async (cust) => {
    try {
      const payload = {
        name: cust.name,
        city: cust.city || '',
        phone: cust.phone,
        targetVisits: cust.loyaltyTargetVisits || targetVisits,
        rewardDescription: cust.rewardDescription || rewardDescription,
        rewardDiscountType: cust.rewardDiscountType || rewardType,
        rewardDiscountValue: cust.rewardDiscountValue || rewardValue
      };

      const res = await loyaltyOffersApi.punchStamp(payload);
      if (res.success) {
        setLastResult(res);
        loadCustomers();
        if (res.waLink) {
          window.open(res.waLink, '_blank');
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'विजिट जोड़ने में त्रुटि हुई।');
    }
  };

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.city && c.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Strategy Configuration */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                ⭐ कस्टम स्टैम्प कार्ड इंजन
              </span>
              <span className="bg-emerald-400 text-emerald-950 px-2.5 py-0.5 rounded-full text-xs font-bold">
                Zero Cost WhatsApp Pass
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">विजिट स्टैम्प कार्ड और रिवॉर्ड स्कीम</h2>
            <p className="text-amber-100 text-sm mt-1 max-w-xl">
              दुकान, कैफे, सैलून या रिटेल के लिए: ग्राहक जितनी बार आएंगे, स्टैम्प लगेगा। लक्ष्य पूरा होने पर अनलॉक होगा आपका तय किया हुआ इनाम!
            </p>
          </div>

          {/* Scheme Quick Config */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-xs space-y-3 min-w-[280px]">
            <div className="font-bold text-amber-100 flex items-center justify-between">
              <span>⚙️ अपनी स्टैम्प स्कीम सेट करें</span>
              <Sparkles className="w-4 h-4 text-amber-200" />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-amber-100 font-medium block mb-1">विजिट्स लक्ष्य:</label>
                <select 
                  value={targetVisits} 
                  onChange={(e) => setTargetVisits(Number(e.target.value))}
                  className="w-full bg-white text-gray-800 rounded-lg px-2.5 py-1.5 font-bold outline-none"
                >
                  <option value={3}>3 विजिट्स</option>
                  <option value={5}>5 विजिट्स (मानक)</option>
                  <option value={7}>7 विजिट्स</option>
                  <option value={10}>10 विजिट्स</option>
                </select>
              </div>

              <div>
                <label className="text-amber-100 font-medium block mb-1">रिवॉर्ड प्रकार:</label>
                <select 
                  value={rewardType} 
                  onChange={(e) => setRewardType(e.target.value)}
                  className="w-full bg-white text-gray-800 rounded-lg px-2.5 py-1.5 font-bold outline-none"
                >
                  <option value="FREE_ITEM">मुफ़्त वस्तु (Free Item)</option>
                  <option value="FLAT_AMOUNT">सीधी छूट (Flat ₹)</option>
                  <option value="PERCENTAGE">प्रतिशत छूट (% Off)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-amber-100 font-medium block mb-1">इनाम का विवरण (Reward Text):</label>
              <input 
                type="text" 
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                placeholder="उदा. 1 कप मसाला चाय फ्री या ₹100 छूट"
                className="w-full bg-white text-gray-800 rounded-lg px-2.5 py-1.5 font-medium outline-none text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Live Digital Stamp Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Punch Form */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-amber-500" />
              ग्राहक स्टैम्प पंच करें (New Stamp Punch)
            </h3>

            <form onSubmit={handlePunchStamp} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  ग्राहक का नाम (Customer Name) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input 
                    type="text" 
                    required
                    placeholder="उदा. राहुल शर्मा"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    मोबाइल नंबर (WhatsApp) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="tel" 
                      required
                      maxLength={10}
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold tracking-wider focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    शहर / इलाका (City / Area)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input 
                      type="text" 
                      placeholder="उदा. जयपुर / दिल्ली"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between border border-amber-200/60">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-600" />
                  <span>लक्ष्य: <strong>{targetVisits} विजिट्स</strong> ➔ <strong>{rewardDescription}</strong></span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                {submitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Star className="w-5 h-5 fill-white" />
                    <span>स्टैम्प लगाएं और WhatsApp भेजें</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Last Result / Stamp Card Preview */}
          {lastResult && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 bg-amber-200/70 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-700" />
                  {lastResult.rewardUnlocked ? '🎉 रिवॉर्ड अनलॉक!' : '⭐ स्टैम्प लग गया!'}
                </span>
                <span className="text-xs text-gray-500">अभी का स्टैम्प</span>
              </div>

              {/* Digital Pass Preview */}
              <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{lastResult.party?.name}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <span>📱 {lastResult.party?.phone}</span>
                      {lastResult.party?.city && <span>• 📍 {lastResult.party.city}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      {lastResult.completedVisits} / {lastResult.targetVisits} पूरी
                    </span>
                  </div>
                </div>

                {/* Stars Stamps Visualizer */}
                <div className="flex items-center justify-center gap-2 py-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  {Array.from({ length: lastResult.targetVisits || 5 }).map((_, idx) => {
                    const isFilled = idx < lastResult.completedVisits;
                    return (
                      <div 
                        key={idx} 
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isFilled 
                            ? 'bg-amber-500 text-white shadow-md scale-105 ring-2 ring-amber-300' 
                            : 'bg-gray-100 text-gray-400 border border-gray-200'
                        }`}
                      >
                        <Star className={`w-5 h-5 ${isFilled ? 'fill-white' : ''}`} />
                      </div>
                    );
                  })}
                </div>

                {lastResult.rewardUnlocked ? (
                  <div className="bg-emerald-500 text-white p-3 rounded-xl text-center space-y-1">
                    <div className="text-xs font-semibold">🎉 लक्ष्य पूरा! रिवॉर्ड कूपन:</div>
                    <div className="text-lg font-black tracking-widest">{lastResult.unlockedCouponCode}</div>
                    <div className="text-xs text-emerald-100 font-medium">इनाम: {lastResult.party?.rewardDescription}</div>
                  </div>
                ) : (
                  <div className="text-center text-xs text-amber-800 font-medium bg-amber-100/50 py-1.5 rounded-lg">
                    🎯 केवल {Math.max(0, lastResult.targetVisits - lastResult.completedVisits)} विजिट्स और ➔ {lastResult.party?.rewardDescription}!
                  </div>
                )}

                {lastResult.waLink && (
                  <a
                    href={lastResult.waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-sm"
                  >
                    <span>📱 WhatsApp पर डिजिटल पास दोबारा भेजें</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Customer Stamp Cards Directory (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  लॉयल्टी ग्राहक सूची ({filteredCustomers.length})
                </h3>
                <p className="text-xs text-gray-500">सभी स्टैम्प कार्ड धारकों की लाइव प्रोग्रेस और 1-क्लिक पंच</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="नाम / नंबर / शहर खोजें..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl w-44 sm:w-52 focus:border-amber-500 outline-none"
                  />
                </div>
                <button
                  onClick={loadCustomers}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                  title="रिफ्रेश करें"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Customers List */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {loading && customers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-xs">ग्राहक लोड हो रहे हैं...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-600">कोई स्टैम्प ग्राहक नहीं मिला</p>
                  <p className="text-xs text-gray-400 mt-1">बाईं तरफ के फॉर्म से नया ग्राहक दर्ज करके स्टैम्प लगाएं।</p>
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const target = cust.loyaltyTargetVisits || 5;
                  const completed = cust.completedVisitsCount || 0;
                  const pct = Math.min(100, Math.round((completed / target) * 100));

                  return (
                    <div 
                      key={cust._id}
                      className="p-4 rounded-xl border border-gray-200/80 hover:border-amber-400 transition-all bg-white hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm truncate">{cust.name}</span>
                          {cust.city && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              📍 {cust.city}
                            </span>
                          )}
                          {cust.rewardUnlocked && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              🎁 रिवॉर्ड उपलब्ध!
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>📱 {cust.phone}</span>
                          <span>•</span>
                          <span className="text-amber-700 font-medium truncate">
                            🎯 {cust.rewardDescription || 'विशेष उपहार'}
                          </span>
                        </div>

                        {/* Visual Stamps Progress Bar & Mini Stars */}
                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: target }).map((_, idx) => (
                              <Star 
                                key={idx} 
                                className={`w-3.5 h-3.5 ${
                                  idx < completed 
                                    ? 'text-amber-500 fill-amber-500' 
                                    : 'text-gray-200'
                                }`} 
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-gray-700">
                            {completed} / {target}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleQuickAddVisit(cust)}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                          title="+1 विजिट स्टैम्प जोड़ें और WhatsApp भेजें"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+1 स्टैम्प</span>
                        </button>

                        <a
                          href={`https://wa.me/91${cust.phone}?text=${encodeURIComponent(
                            `🌟 नमस्ते ${cust.name} जी! आपकी डिजिटल स्टैम्प पास प्रोग्रेस: ${completed}/${target} विजिट्स पूरी! 🎁 इनाम: ${cust.rewardDescription || 'स्पेशल गिफ्ट'}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2 rounded-xl border border-emerald-200 transition-colors"
                          title="WhatsApp चैट खोलें"
                        >
                          <Send className="w-4 h-4" />
                        </a>
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
