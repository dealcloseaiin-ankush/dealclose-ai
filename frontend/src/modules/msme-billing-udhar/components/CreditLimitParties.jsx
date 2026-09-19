import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldCheck, Plus, Search, RefreshCw, 
  Lock, CheckCircle2, AlertTriangle, FileText, ArrowRight, Wallet, History 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { billingUdharApi } from '../services/billingUdharApi';
import SanctionLimitDrawer from '../../msme-credit-mandate/components/SanctionLimitDrawer';
import PaymentKhataModal from '../../msme-credit-mandate/components/PaymentKhataModal';
import PartyLedgerModal from '../../msme-credit-mandate/components/PartyLedgerModal';

export default function CreditLimitParties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [selectedParty, setSelectedParty] = useState(null);
  const [showSanctionDrawer, setShowSanctionDrawer] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  useEffect(() => {
    loadParties();
  }, [statusFilter]);

  const loadParties = async () => {
    try {
      setLoading(true);
      const res = await billingUdharApi.getParties(searchQuery, statusFilter);
      if (res.success) {
        setParties(res.parties || []);
      }
    } catch (err) {
      console.error('Error fetching parties:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = parties.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              क्रेडिट लिमिट व पार्टी खाता डायरेक्टरी ({filteredParties.length})
            </h3>
            <p className="text-xs text-gray-500">
              प्रत्येक पार्टी की स्वीकृत लिमिट, वर्तमान बकाया, पेमेंट जमा और कानूनी एग्रीमेंट स्थिति
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
              {['ALL', 'ACTIVE', 'LOCKED', 'PENDING_OTP'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    statusFilter === s
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s === 'ALL' ? 'सभी' : s === 'ACTIVE' ? 'सक्रिय' : s === 'LOCKED' ? 'लॉक' : 'लंबित OTP'}
                </button>
              ))}
            </div>

            <button
              onClick={loadParties}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="पार्टी का नाम, मोबाइल नंबर या शहर खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Parties Grid */}
      {loading && parties.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-xs">पार्टियां लोड हो रही हैं...</p>
        </div>
      ) : filteredParties.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">कोई पार्टी नहीं मिली</p>
          <p className="text-xs text-gray-400 mt-1">काउंटर बिलिंग स्क्रीन से नई पार्टी जोड़ें।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParties.map((p) => {
            const limit = p.creditLimit || 0;
            const balance = p.currentOutstandingBalance || 0;
            const remaining = Math.max(0, limit - balance);
            const consumedPct = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : 0;
            const isLocked = p.creditLimitStatus === 'LOCKED';
            const isPendingOtp = p.creditLimitStatus === 'PENDING_OTP';
            const isActive = p.creditLimitStatus === 'ACTIVE';

            return (
              <div
                key={p._id}
                className="bg-white rounded-2xl p-5 border border-gray-200/80 hover:border-blue-400 transition-all shadow-sm hover:shadow-md space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">{p.name}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <span>📱 {p.phone}</span>
                        {p.city && <span>• 📍 {p.city}</span>}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : isLocked
                          ? 'bg-red-100 text-red-800'
                          : isPendingOtp
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isActive ? '🟢 सक्रिय (Active)' : isLocked ? '🛑 लॉक्ड (Locked)' : isPendingOtp ? '⏳ OTP लंबित' : 'निष्क्रिय'}
                    </span>
                  </div>

                  {/* Limit Consumption Progress */}
                  <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-600">स्वीकृत लिमिट:</span>
                      <span className="text-gray-900 font-mono">₹{limit.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          consumedPct > 90
                            ? 'bg-red-500'
                            : consumedPct > 70
                            ? 'bg-amber-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${consumedPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] pt-1">
                      <span className="text-red-600 font-medium">
                        बकाया: <strong>₹{balance.toLocaleString('en-IN')}</strong>
                      </span>
                      <span className="text-emerald-700 font-medium">
                        शेष: <strong>₹{remaining.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>

                  {p.hasPendingBillApproval && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-lg flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Gatekeeper Lock: पिछले बिल का OTP बाकी है!</span>
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setSelectedParty(p);
                      setShowPaymentModal(true);
                    }}
                    className="py-2 px-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    title="खाता में पेमेंट जमा करें (Auto-unlock)"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>जमा करें</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedParty(p);
                      setShowSanctionDrawer(true);
                    }}
                    className="py-2 px-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    title="क्रेडिट लिमिट स्वीकृत या अपडेट करें"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>लिमिट</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedParty(p);
                      setShowLedgerModal(true);
                    }}
                    className="py-2 px-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    title="पूरा खाता लेजर देखें"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>लेजर</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showSanctionDrawer && selectedParty && (
        <SanctionLimitDrawer
          isOpen={showSanctionDrawer}
          onClose={() => setShowSanctionDrawer(false)}
          party={selectedParty}
          onSuccess={() => {
            loadParties();
            setShowSanctionDrawer(false);
          }}
        />
      )}

      {showPaymentModal && selectedParty && (
        <PaymentKhataModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          party={selectedParty}
          onSuccess={() => {
            loadParties();
            setShowPaymentModal(false);
          }}
        />
      )}

      {showLedgerModal && selectedParty && (
        <PartyLedgerModal
          isOpen={showLedgerModal}
          onClose={() => setShowLedgerModal(false)}
          party={selectedParty}
        />
      )}
    </div>
  );
}
