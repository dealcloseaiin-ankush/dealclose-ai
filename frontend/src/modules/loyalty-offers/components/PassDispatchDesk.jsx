import React, { useState, useEffect } from 'react';
import { 
  Send, Smartphone, Calendar, CheckCircle2, Clock, 
  Search, RefreshCw, Star, User, MapPin, ExternalLink, 
  Sparkles, Filter, ShieldCheck, Plus, CheckCircle 
} from 'lucide-react';
import loyaltyOffersApi from '../services/loyaltyOffersApi';
import { useAuthStore } from '../../../store/authStore';

export default function PassDispatchDesk() {
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    todayCount: 0,
    weeklyCount: 0,
    monthlyCount: 0,
    allCount: 0,
    pendingSendCount: 0
  });
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('today'); // 'today' | 'week' | 'month' | 'all'
  const [passStatus, setPassStatus] = useState('ALL'); // 'ALL' | 'PENDING' | 'SENT'
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingId, setSendingId] = useState(null);
  const [punchingId, setPunchingId] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, [period, passStatus]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await loyaltyOffersApi.getRegisteredCustomers({
        period,
        status: passStatus,
        search: searchQuery.trim()
      });
      if (res.success) {
        setCustomers(res.customers || []);
        setStats(res.stats || {
          todayCount: 0,
          weeklyCount: 0,
          monthlyCount: 0,
          allCount: 0,
          pendingSendCount: 0
        });
      }
    } catch (err) {
      console.error('Error fetching registered customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCustomers();
  };

  const handleSendPass = async (cust) => {
    try {
      setSendingId(cust._id);
      const res = await loyaltyOffersApi.markPassSent({ partyId: cust._id });
      if (res.success) {
        // Open WhatsApp link immediately
        if (res.waLink) {
          window.open(res.waLink, '_blank');
        }

        // Update row state locally
        setCustomers(prev => prev.map(c => {
          if (c._id === cust._id) {
            return {
              ...c,
              passSentOnWhatsApp: true,
              passSentAt: new Date().toISOString()
            };
          }
          return c;
        }));

        setStats(prev => ({
          ...prev,
          pendingSendCount: Math.max(0, prev.pendingSendCount - 1)
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'WhatsApp पास भेजने में त्रुटि हुई।');
    } finally {
      setSendingId(null);
    }
  };

  const handleQuickPunch = async (cust) => {
    try {
      setPunchingId(cust._id);
      const res = await loyaltyOffersApi.punchStamp({
        phone: cust.phone,
        targetVisits: cust.loyaltyTargetVisits || 5
      });
      if (res.success) {
        setCustomers(prev => prev.map(c => {
          if (c._id === cust._id) {
            return {
              ...c,
              completedVisitsCount: res.completedVisits || (c.completedVisitsCount + 1),
              rewardUnlocked: res.rewardUnlocked
            };
          }
          return c;
        }));
        if (res.waLink) {
          window.open(res.waLink, '_blank');
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'स्टैम्प लगाने में त्रुटि हुई।');
    } finally {
      setPunchingId(null);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    if (isToday) {
      return `आज ${timeStr}`;
    }
    return `${date.toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                📲 1-क्लिक पास डिस्पैच काउंटर
              </span>
              <span className="bg-emerald-300 text-emerald-950 px-2.5 py-0.5 rounded-full text-xs font-bold">
                Direct WhatsApp Dispatch
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">नये ग्राहक पास डिस्पैच डेस्क</h2>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
              काउंटर QR स्कैन करके रजिस्टर हुए ग्राहकों को एक क्लिक में WhatsApp पर उनका डिजिटल पास भेजें। ड्रॉपडाउन से आज, हफ्ते या महीने के अनुसार ग्राहक देखें।
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={loadCustomers}
              disabled={loading}
              className="bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/20 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>रिफ्रेश करें</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Today */}
        <div 
          onClick={() => setPeriod('today')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            period === 'today' 
              ? 'bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20' 
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>📅 आज के ग्राहक</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Today</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{stats.todayCount}</span>
            <span className="text-xs text-gray-500 font-medium">रजिस्ट्रेशन</span>
          </div>
        </div>

        {/* Weekly */}
        <div 
          onClick={() => setPeriod('week')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            period === 'week' 
              ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-500/20' 
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>🗓️ इस हफ्ते</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">Weekly</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{stats.weeklyCount}</span>
            <span className="text-xs text-gray-500 font-medium">रजिस्ट्रेशन</span>
          </div>
        </div>

        {/* Monthly */}
        <div 
          onClick={() => setPeriod('month')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            period === 'month' 
              ? 'bg-purple-50 border-purple-500 shadow-md ring-2 ring-purple-500/20' 
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>📆 इस महीने</span>
            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">Monthly</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{stats.monthlyCount}</span>
            <span className="text-xs text-gray-500 font-medium">रजिस्ट्रेशन</span>
          </div>
        </div>

        {/* Pending Send Alert */}
        <div 
          onClick={() => { setPeriod('all'); setPassStatus('PENDING'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            passStatus === 'PENDING' 
              ? 'bg-amber-50 border-amber-500 shadow-md ring-2 ring-amber-500/20' 
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-700 font-bold">
            <span>⏳ पास भेजना बाकी</span>
            {stats.pendingSendCount > 0 && (
              <span className="animate-pulse w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{stats.pendingSendCount}</span>
            <span className="text-xs text-amber-700 font-medium">ग्राहक पेंडिंग</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Period Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-gray-800 font-bold outline-none cursor-pointer"
            >
              <option value="today">📅 आज (Today)</option>
              <option value="week">🗓️ इस हफ्ते (This Week)</option>
              <option value="month">📆 इस महीने (This Month)</option>
              <option value="all">🌐 सभी समय (All Time)</option>
            </select>
          </div>

          {/* Pass Status Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={passStatus}
              onChange={(e) => setPassStatus(e.target.value)}
              className="bg-transparent text-gray-800 font-bold outline-none cursor-pointer"
            >
              <option value="ALL">सभी पास स्थिति</option>
              <option value="PENDING">⏳ पास भेजना बाकी (Pending)</option>
              <option value="SENT">✅ पास भेजा जा चुका (Sent)</option>
            </select>
          </div>
        </div>

        {/* Live Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="नाम या मोबाइल नंबर खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-800 focus:bg-white focus:border-emerald-500 focus:outline-none"
          />
        </form>
      </div>

      {/* Customer Registration List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <span>रजिस्टर ग्राहक सूची</span>
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">
              {customers.length} ग्राहक मिले
            </span>
          </h3>
          <span className="text-[11px] text-gray-500">
            {period === 'today' ? 'आज पंजीकृत' : period === 'week' ? 'इस हफ्ते पंजीकृत' : period === 'month' ? 'इस महीने पंजीकृत' : 'सभी रिकॉर्ड'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold">ग्राहक डेटा लोड हो रहा है...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <User className="w-12 h-12 mx-auto text-gray-300 stroke-1" />
            <p className="text-sm font-semibold text-gray-700">इस समय अंतराल में कोई रजिस्ट्रेशन नहीं मिला</p>
            <p className="text-xs text-gray-500">
              काउंटर पर स्टैंडी QR लगाने से ग्राहक स्वयं रजिस्टर होकर यहाँ दिखाई देंगे।
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {customers.map((c) => {
              const target = c.loyaltyTargetVisits || 5;
              const completed = c.completedVisitsCount || 0;
              const isSent = !!c.passSentOnWhatsApp;

              return (
                <div 
                  key={c._id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors"
                >
                  {/* Left: Customer Info */}
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm shrink-0 ${
                      isSent 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                    }`}>
                      {c.name ? c.name[0].toUpperCase() : 'G'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-black text-gray-900">{c.name}</h4>
                        {c.city && (
                          <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span>{c.city}</span>
                          </span>
                        )}
                        {c.registeredVia === 'COUNTER_QR' && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                            📱 काउंटर QR
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span className="font-mono font-medium text-gray-700">+91 {c.phone}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span>रजिस्ट्रेशन: {formatDateTime(c.createdAt)}</span>
                        </span>
                      </div>

                      {/* Current Stamps Progress */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: target }).map((_, idx) => (
                            <Star 
                              key={idx}
                              className={`w-3 h-3 ${
                                idx < completed 
                                  ? 'text-amber-500 fill-amber-500' 
                                  : 'text-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-gray-700">
                          {completed}/{target} स्टैम्प
                        </span>
                        {c.rewardUnlocked && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.2 rounded-full font-bold">
                            🎁 उपहार तैयार!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Pass Status & Action Buttons */}
                  <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
                    {/* Status Badge */}
                    {isSent ? (
                      <div className="text-right mr-2 hidden sm:block">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>पास भेजा गया</span>
                        </span>
                        {c.passSentAt && (
                          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            {formatDateTime(c.passSentAt)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-right mr-2 hidden sm:block">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>पास भेजना बाकी</span>
                        </span>
                      </div>
                    )}

                    {/* Main WhatsApp Send Button */}
                    <button
                      onClick={() => handleSendPass(c)}
                      disabled={sendingId === c._id}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-sm transition-all transform active:scale-95 cursor-pointer ${
                        isSent
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                      }`}
                      title="ग्राहक के WhatsApp पर डिजिटल पास लिंक भेजें"
                    >
                      {sendingId === c._id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>{isSent ? 'पुनः पास भेजें' : '📲 WhatsApp पर पास भेजें'}</span>
                    </button>

                    {/* Quick +1 Stamp Punch Button */}
                    <button
                      onClick={() => handleQuickPunch(c)}
                      disabled={punchingId === c._id}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                      title="काउंटर पर खड़े ग्राहक का +1 स्टैम्प लगाएं"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+1 स्टैम्प</span>
                    </button>

                    {/* View Pass Link */}
                    <a
                      href={`/pass/${c.phone}?merchantId=${user?._id || ''}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
                      title="डिजिटल पास का प्रीव्यू देखें"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
