import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, ShoppingCart, Receipt, Plus, Search, 
  RefreshCw, Filter, Banknote, AlertTriangle, CheckCircle2, Lock, 
  Sparkles, ArrowRight, Zap, Send, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import { creditMandateApi } from './services/creditMandateApi';
import CreditLimitPartyTable from './components/CreditLimitPartyTable';
import SanctionLimitDrawer from './components/SanctionLimitDrawer';
import PaymentKhataModal from './components/PaymentKhataModal';
import PartyLedgerModal from './components/PartyLedgerModal';
import LoyaltyStampDrawer from './components/LoyaltyStampDrawer';
import FastPosBilling from './components/FastPosBilling';
import UdharOtpModal from './components/UdharOtpModal';
import CouponsManagerDrawer from './components/CouponsManagerDrawer';

export default function CreditMandateHub() {
  const [activeTab, setActiveTab] = useState('PARTIES'); // 'PARTIES' | 'POS' | 'BILLS'
  const [parties, setParties] = useState([]);
  const [stats, setStats] = useState({
    totalSanctionedLimit: 0,
    totalOutstanding: 0,
    totalRemainingLimit: 0,
    activePartiesCount: 0,
    pendingOtpCount: 0,
    lockedPartiesCount: 0,
    totalPartiesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Bills list state
  const [recentBills, setRecentBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // Selected party for modals
  const [selectedPartyForSanction, setSelectedPartyForSanction] = useState(null);
  const [selectedPartyForPayment, setSelectedPartyForPayment] = useState(null);
  const [selectedPartyForLedger, setSelectedPartyForLedger] = useState(null);
  const [selectedPartyForLoyalty, setSelectedPartyForLoyalty] = useState(null);

  // Bill OTP modal from bills tab
  const [selectedBillForOtp, setSelectedBillForOtp] = useState(null);

  // Coupons Manager Drawer state
  const [showCouponsDrawer, setShowCouponsDrawer] = useState(false);

  // Quick Add Party Modal state
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [newPartyData, setNewPartyData] = useState({
    name: '',
    phone: '',
    businessName: '',
    gstin: '',
    address: '',
    minBillAmountForStamp: 200,
    loyaltyTargetVisits: 5
  });
  const [addingParty, setAddingParty] = useState(false);

  // Fetch Parties & Stats
  const fetchParties = async () => {
    try {
      setLoading(true);
      const res = await creditMandateApi.getParties(search, statusFilter);
      if (res.success) {
        setParties(res.parties || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      toast.error('पार्टी डेटा लोड करने में विफल');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [search, statusFilter]);

  // Fetch Recent Bills
  const fetchRecentBills = async () => {
    try {
      setLoadingBills(true);
      const res = await creditMandateApi.getBills();
      if (res.success) {
        setRecentBills(res.bills || []);
      }
    } catch (err) {
      console.warn('Could not fetch bills:', err);
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'BILLS') {
      fetchRecentBills();
    }
  }, [activeTab]);

  // Quick Add Party Submission
  const handleCreateParty = async (e) => {
    e.preventDefault();
    if (!newPartyData.name || !newPartyData.phone) {
      toast.error('नाम और 10-अंकों का मोबाइल नंबर अनिवार्य हैं।');
      return;
    }

    try {
      setAddingParty(true);
      const res = await creditMandateApi.createParty(newPartyData);
      if (res.success) {
        toast.success(`ग्राहक "${res.party.name}" सफलतापूर्वक दर्ज हुआ!`);
        setShowAddPartyModal(false);
        setNewPartyData({
          name: '',
          phone: '',
          businessName: '',
          gstin: '',
          address: '',
          minBillAmountForStamp: 200,
          loyaltyTargetVisits: 5
        });
        fetchParties();
        // Immediately offer to sanction credit limit
        setSelectedPartyForSanction(res.party);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'ग्राहक जोड़ने में विफल');
    } finally {
      setAddingParty(false);
    }
  };

  // 1-Click Bypass Pending Bill for Party
  const handleBypassPendingBillForParty = async (party) => {
    if (!party.pendingApprovalBillId?._id && !party.pendingApprovalBillId) {
      toast.error('पेंडिंग बिल आईडी नहीं मिली');
      return;
    }
    const billId = party.pendingApprovalBillId._id || party.pendingApprovalBillId;
    try {
      const res = await creditMandateApi.bypassBill(billId, 'काम न रुके: व्यापारी द्वारा त्वरित बायपास');
      if (res.success) {
        toast.success(res.message);
        fetchParties();
      }
    } catch (err) {
      toast.error('बायपास करने में विफल');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 p-4 md:p-8 space-y-6">
      
      {/* 🛡️ TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900">
                MSME क्रेडिट लिमिट मैंडेट व उधार हैंडओवर प्रोटेक्शन
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Zero-Cost WhatsApp
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              कानूनी वचन-पत्र, 5-बिंदु दैनिक हिसाब, Gatekeeper लॉक, "काम न रुके" बायपास व लॉयल्टी स्टैम्प्स
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCouponsDrawer(true)}
            className="px-3.5 py-2.5 rounded-xl bg-purple-100/80 hover:bg-purple-200 text-purple-900 font-bold text-xs flex items-center gap-1.5 border border-purple-200 shadow-sm transition-all"
          >
            <Tag className="w-4 h-4 text-purple-700" />
            🎟️ कूपन व ऑफर्स
          </button>

          <button
            onClick={() => setShowAddPartyModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            + नया क्रेडिट ग्राहक जोड़ें
          </button>
        </div>
      </div>

      {/* 📊 SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        
        {/* Total Sanctioned */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            कुल स्वीकृत लिमिट
          </span>
          <div className="text-lg md:text-xl font-black text-slate-900">
            ₹{stats.totalSanctionedLimit?.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {stats.activePartiesCount} सक्रिय खाते
          </span>
        </div>

        {/* Total Outstanding */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
            कुल बाजार बकाया
          </span>
          <div className="text-lg md:text-xl font-black text-amber-900">
            ₹{stats.totalOutstanding?.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-amber-600 mt-1 block font-medium">
            बाजार में फंसा कुल उधार
          </span>
        </div>

        {/* Remaining Limit */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
            बची हुई सुरक्षित लिमिट
          </span>
          <div className="text-lg md:text-xl font-black text-emerald-800">
            ₹{stats.totalRemainingLimit?.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
            सुरक्षित उपलब्ध साख
          </span>
        </div>

        {/* Pending OTP */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            पेंडिंग OTP खाते
          </span>
          <div className="text-lg md:text-xl font-black text-slate-800">
            {stats.pendingOtpCount}
          </div>
          <span className="text-[10px] text-amber-600 mt-1 block font-medium">
            सहमति की प्रतीक्षा में
          </span>
        </div>

        {/* Locked Accounts */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block mb-1">
            लॉक / ओवरलिमिट खाते
          </span>
          <div className="text-lg md:text-xl font-black text-red-800">
            {stats.lockedPartiesCount}
          </div>
          <span className="text-[10px] text-red-500 mt-1 block font-medium">
            भुगतान पर स्वतः अनलॉक होंगे
          </span>
        </div>

      </div>

      {/* 🎛️ MAIN TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('PARTIES')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'PARTIES'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 क्रेडिट ग्राहक हब (Parties)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-white text-[10px]">
            {parties.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('POS')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'POS'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>🛒 फास्ट POS व बिलिंग (Multi-Bill & Alt+H)</span>
        </button>

        <button
          onClick={() => setActiveTab('BILLS')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
            activeTab === 'BILLS'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>🧾 हाल के उधार बिल (Gatekeeper Log)</span>
        </button>
      </div>

      {/* 👥 TAB 1: CREDIT PARTIES HUB */}
      {activeTab === 'PARTIES' && (
        <div className="space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ग्राहक का नाम, मोबाइल नंबर, या फर्म खोजें..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-700"
              >
                <option value="ALL">सभी स्थितियां (All Status)</option>
                <option value="ACTIVE">सक्रिय (ACTIVE)</option>
                <option value="PENDING_OTP">पेंडिंग OTP (PENDING)</option>
                <option value="LOCKED">लॉक / ओवरलिमिट (LOCKED)</option>
                <option value="INACTIVE">निष्क्रिय (INACTIVE)</option>
              </select>

              <button
                onClick={fetchParties}
                className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors"
                title="रिफ्रेश करें"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Parties Table */}
          <CreditLimitPartyTable
            parties={parties}
            onOpenSanction={(party) => setSelectedPartyForSanction(party)}
            onOpenPayment={(party) => setSelectedPartyForPayment(party)}
            onOpenLedger={(party) => setSelectedPartyForLedger(party)}
            onOpenLoyalty={(party) => setSelectedPartyForLoyalty(party)}
            onBypassPendingBill={handleBypassPendingBillForParty}
          />
        </div>
      )}

      {/* 🛒 TAB 2: FAST POS BILLING */}
      {activeTab === 'POS' && (
        <div className="h-[680px]">
          <FastPosBilling
            parties={parties}
            onBillCompleted={() => {
              fetchParties();
              fetchRecentBills();
            }}
            onRefreshParties={fetchParties}
          />
        </div>
      )}

      {/* 🧾 TAB 3: RECENT UDHAR BILLS & GATEKEEPER LOG */}
      {activeTab === 'BILLS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">हाल के उधार बिल व हैंडओवर स्थिति</h3>
              <p className="text-xs text-slate-500">Gatekeeper ट्रैकिंग व OTP सत्यापन लॉग</p>
            </div>
            <button
              onClick={fetchRecentBills}
              className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBills ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">बिल #</th>
                  <th className="py-3 px-4">ग्राहक</th>
                  <th className="py-3 px-4">बिल राशि</th>
                  <th className="py-3 px-4">नया कुल बकाया</th>
                  <th className="py-3 px-4">हैंडओवर स्थिति</th>
                  <th className="py-3 px-4">तारीख व समय</th>
                  <th className="py-3 px-4 text-right">कार्यवाही</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      कोई उधार बिल दर्ज नहीं हुआ है।
                    </td>
                  </tr>
                ) : (
                  recentBills.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{b.billNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{b.partyId?.name || 'अज्ञात'}</div>
                        <div className="text-[10px] text-slate-500">📞 {b.partyId?.phone}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        ₹{b.totalAmount?.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-800">
                        ₹{b.creditLineSnapshot?.newTotalBalance?.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        {b.handoverStatus === 'DELIVERED' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            ✅ DELIVERED (OTP सत्यापित)
                          </span>
                        )}
                        {b.handoverStatus === 'PENDING_OTP' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] flex items-center gap-1 w-max">
                            <Lock className="w-2.5 h-2.5 text-amber-700" />
                            PENDING OTP (Locked)
                          </span>
                        )}
                        {b.handoverStatus === 'BYPASSED' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px]">
                            ⚡ BYPASSED (काम न रुके)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(b.createdAt).toLocaleDateString('hi-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.handoverStatus === 'PENDING_OTP' && (
                          <button
                            onClick={() => setSelectedBillForOtp(b)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px]"
                          >
                            🔐 OTP सत्यापित करें
                          </button>
                        )}
                        {b.waLink && (
                          <a
                            href={b.waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-emerald-600 hover:text-emerald-800 font-bold text-[11px]"
                          >
                            WhatsApp
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ➕ QUICK ADD PARTY MODAL */}
      {showAddPartyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">नया क्रेडिट ग्राहक जोड़ें</h3>
              <button onClick={() => setShowAddPartyModal(false)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateParty} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ग्राहक का पूरा नाम *
                </label>
                <input
                  type="text"
                  value={newPartyData.name}
                  onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })}
                  placeholder="e.g. राजेश कुमार"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  WhatsApp मोबाइल नंबर *
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={newPartyData.phone}
                  onChange={(e) => setNewPartyData({ ...newPartyData, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-900 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  फर्म / दुकान का नाम (वैकल्पिक)
                </label>
                <input
                  type="text"
                  value={newPartyData.businessName}
                  onChange={(e) => setNewPartyData({ ...newPartyData, businessName: e.target.value })}
                  placeholder="e.g. राजेश हार्डवेयर & सेनेटरी"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    लॉयल्टी टारगेट विजिट्स
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={newPartyData.loyaltyTargetVisits}
                    onChange={(e) => setNewPartyData({ ...newPartyData, loyaltyTargetVisits: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    स्टैम्प हेतु न्यूनतम बिल ₹
                  </label>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={newPartyData.minBillAmountForStamp}
                    onChange={(e) => setNewPartyData({ ...newPartyData, minBillAmountForStamp: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={addingParty}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                >
                  {addingParty ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  ग्राहक जोड़ें व आगे बढ़ें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🛡️ SANCTION LIMIT DRAWER */}
      <SanctionLimitDrawer
        isOpen={Boolean(selectedPartyForSanction)}
        onClose={() => setSelectedPartyForSanction(null)}
        party={selectedPartyForSanction}
        onSanctionSuccess={() => {
          fetchParties();
          setSelectedPartyForSanction(null);
        }}
      />

      {/* 💵 PAYMENT KHATA MODAL */}
      <PaymentKhataModal
        isOpen={Boolean(selectedPartyForPayment)}
        onClose={() => setSelectedPartyForPayment(null)}
        party={selectedPartyForPayment}
        onPaymentSuccess={() => {
          fetchParties();
          setSelectedPartyForPayment(null);
        }}
      />

      {/* 📖 PARTY LEDGER MODAL */}
      <PartyLedgerModal
        isOpen={Boolean(selectedPartyForLedger)}
        onClose={() => setSelectedPartyForLedger(null)}
        party={selectedPartyForLedger}
      />

      {/* ⭐ LOYALTY STAMPS & UPI MANDATE */}
      <LoyaltyStampDrawer
        isOpen={Boolean(selectedPartyForLoyalty)}
        onClose={() => setSelectedPartyForLoyalty(null)}
        party={selectedPartyForLoyalty}
        onUpdateParty={() => {
          fetchParties();
        }}
      />

      {/* 🔐 UDHAR OTP MODAL FROM BILLS TAB */}
      <UdharOtpModal
        isOpen={Boolean(selectedBillForOtp)}
        onClose={() => setSelectedBillForOtp(null)}
        bill={selectedBillForOtp}
        onHandoverSuccess={() => {
          fetchParties();
          fetchRecentBills();
        }}
        onBypassSuccess={() => {
          fetchParties();
          fetchRecentBills();
        }}
      />

      {/* 🎟️ COUPONS & OFFERS MANAGER DRAWER */}
      <CouponsManagerDrawer
        isOpen={showCouponsDrawer}
        onClose={() => setShowCouponsDrawer(false)}
        onCouponCreated={() => {}}
      />

    </div>
  );
}
