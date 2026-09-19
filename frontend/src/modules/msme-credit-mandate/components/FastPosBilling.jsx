import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, ShoppingCart, PauseCircle, PlayCircle, ShieldCheck, 
  AlertTriangle, Check, UserPlus, Phone, Search, Zap, Send, ArrowRight,
  CreditCard, Banknote, QrCode, Layers, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { creditMandateApi } from '../services/creditMandateApi';
import UdharOtpModal from './UdharOtpModal';

const MAX_CONCURRENT_TABS = 6;
const HELD_BILLS_STORAGE_KEY = 'msme_pos_held_bills_v1';

export default function FastPosBilling({ parties = [], onBillCompleted, onRefreshParties }) {
  // Multi-Bill Tabs state
  const [tabs, setTabs] = useState([
    { id: 1, name: 'बिल #1', customerId: '', items: [{ name: '', quantity: 1, rate: 0 }], paymentMode: 'CREDIT', bypassPending: false }
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [heldBills, setHeldBills] = useState([]);
  const [showHeldDrawer, setShowHeldDrawer] = useState(false);

  // Active Tab derived data
  const currentTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const selectedParty = parties.find(p => String(p._id) === String(currentTab.customerId));

  // Dynamic Statement Preview
  const [statementPreview, setStatementPreview] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Modals & Submissions
  const [submitting, setSubmitting] = useState(false);
  const [activeBillForOtp, setActiveBillForOtp] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);

  // Load held bills from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HELD_BILLS_STORAGE_KEY);
      if (saved) setHeldBills(JSON.parse(saved));
    } catch (e) {
      console.warn('Could not load held bills:', e);
    }
  }, []);

  // Save held bills to localStorage
  const saveHeldBills = (newHeld) => {
    setHeldBills(newHeld);
    try {
      localStorage.setItem(HELD_BILLS_STORAGE_KEY, JSON.stringify(newHeld));
    } catch (e) {
      console.warn('Could not save held bills:', e);
    }
  };

  // Keyboard shortcut listener: Alt+H (Hold Bill)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handleHoldCurrentBill();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTab, tabs]);

  // Update fields of current tab
  const updateCurrentTab = (updates) => {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...updates } : t));
  };

  // Cart total calculations
  const totalBillAmount = currentTab.items.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const r = Number(item.rate) || 0;
    return sum + (q * r);
  }, 0);

  // Real-time Statement Calculation on Customer or Amount Change
  useEffect(() => {
    if (!selectedParty || totalBillAmount <= 0 || currentTab.paymentMode !== 'CREDIT') {
      setStatementPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingStatement(true);
        const res = await creditMandateApi.calculateStatement(selectedParty._id, totalBillAmount);
        if (res.success) {
          setStatementPreview(res.statement);
        }
      } catch (err) {
        console.warn('Could not calculate real-time statement:', err);
      } finally {
        setLoadingStatement(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedParty, totalBillAmount, currentTab.paymentMode]);

  // Tab Switching & Management
  const addNewTab = () => {
    if (tabs.length >= MAX_CONCURRENT_TABS) {
      toast.error(`अधिकतम ${MAX_CONCURRENT_TABS} काउंटर टैब ही एक साथ खोले जा सकते हैं।`);
      return;
    }
    const nextId = Math.max(...tabs.map(t => t.id), 0) + 1;
    const newTab = {
      id: nextId,
      name: `बिल #${nextId}`,
      customerId: '',
      items: [{ name: '', quantity: 1, rate: 0 }],
      paymentMode: 'CREDIT',
      bypassPending: false
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(nextId);
  };

  const closeTab = (tabId, e) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      // Reset first tab instead of deleting
      updateCurrentTab({ customerId: '', items: [{ name: '', quantity: 1, rate: 0 }], bypassPending: false });
      return;
    }
    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  // 1-Click "Hold Bill" (Alt+H)
  const handleHoldCurrentBill = () => {
    if (totalBillAmount <= 0 && !currentTab.customerId) {
      toast.error('पार्क करने के लिए बिल में ग्राहक या सामान होना जरूरी है।');
      return;
    }

    const heldItem = {
      heldId: Date.now(),
      heldAt: new Date().toLocaleTimeString('hi-IN'),
      tabData: { ...currentTab, totalAmount: totalBillAmount },
      customerName: selectedParty ? selectedParty.name : 'सामान्य ग्राहक',
      customerPhone: selectedParty ? selectedParty.phone : ''
    };

    saveHeldBills([heldItem, ...heldBills]);
    toast.success(`बिल सुरक्षित पार्क (Hold) कर दिया गया! [Alt+H]`);

    // Reset current tab for next customer
    updateCurrentTab({
      customerId: '',
      items: [{ name: '', quantity: 1, rate: 0 }],
      paymentMode: 'CREDIT',
      bypassPending: false
    });
  };

  // Resume Parked Bill
  const handleResumeBill = (heldItem) => {
    updateCurrentTab({
      customerId: heldItem.tabData.customerId || '',
      items: heldItem.tabData.items || [{ name: '', quantity: 1, rate: 0 }],
      paymentMode: heldItem.tabData.paymentMode || 'CREDIT',
      bypassPending: heldItem.tabData.bypassPending || false
    });
    saveHeldBills(heldBills.filter(h => h.heldId !== heldItem.heldId));
    setShowHeldDrawer(false);
    toast.success('पार्क किया गया बिल काउंटर पर लोड हो गया!');
  };

  // Discard Parked Bill
  const handleDiscardHeld = (heldId) => {
    saveHeldBills(heldBills.filter(h => h.heldId !== heldId));
    toast('पार्क किया गया बिल हटा दिया गया।');
  };

  // Item List Handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...currentTab.items];
    updated[index][field] = value;
    updateCurrentTab({ items: updated });
  };

  const addItemRow = () => {
    updateCurrentTab({ items: [...currentTab.items, { name: '', quantity: 1, rate: 0 }] });
  };

  const removeItemRow = (index) => {
    if (currentTab.items.length === 1) {
      updateCurrentTab({ items: [{ name: '', quantity: 1, rate: 0 }] });
      return;
    }
    const updated = currentTab.items.filter((_, i) => i !== index);
    updateCurrentTab({ items: updated });
  };

  // Create Bill & Gatekeeper Submission
  const handleProcessBill = async (bypassLock = false) => {
    if (!currentTab.customerId) {
      toast.error('कृपया पहले क्रेडिट ग्राहक चुनें।');
      return;
    }

    if (totalBillAmount <= 0) {
      toast.error('बिल राशि ₹0 से अधिक होनी चाहिए।');
      return;
    }

    const cleanItems = currentTab.items.filter(i => i.name && i.name.trim() !== '');
    if (cleanItems.length === 0) {
      cleanItems.push({ name: 'विविध किराना/हार्डवेयर सामान', quantity: 1, rate: totalBillAmount });
    }

    const payload = {
      partyId: currentTab.customerId,
      items: cleanItems.map(i => ({
        name: i.name,
        quantity: Number(i.quantity) || 1,
        rate: Number(i.rate) || 0,
        amount: (Number(i.quantity) || 1) * (Number(i.rate) || 0)
      })),
      totalAmount: totalBillAmount,
      paymentMode: currentTab.paymentMode,
      bypassPendingLock: bypassLock || currentTab.bypassPending,
      bypassReason: bypassLock ? 'काउंटर पर ग्राहक व्यस्त होने के कारण 1-क्लिक बायपास' : ''
    };

    try {
      setSubmitting(true);
      const res = await creditMandateApi.createBill(payload);

      if (res.success) {
        toast.success(res.message);
        if (onRefreshParties) onRefreshParties();
        if (onBillCompleted) onBillCompleted(res.bill);

        // If it's an udhar bill that needs OTP handover
        if (currentTab.paymentMode === 'CREDIT' && !payload.bypassPendingLock) {
          setActiveBillForOtp(res.bill);
          setShowOtpModal(true);
        }

        // Auto-open WhatsApp if generated
        if (res.waLink) {
          window.open(res.waLink, '_blank');
        }

        // Clear this tab
        updateCurrentTab({
          customerId: '',
          items: [{ name: '', quantity: 1, rate: 0 }],
          bypassPending: false
        });
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.isPendingApprovalBlocked) {
        // Show Gatekeeper alert with 1-click bypass option
        toast((t) => (
          <div className="space-y-2">
            <div className="font-bold text-amber-900 text-xs flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Gatekeeper लॉक: पिछला बिल पेंडिंग है!
            </div>
            <p className="text-[11px] text-slate-700 leading-tight">
              ग्राहक का पिछला डिलीवरी OTP सत्यापित नहीं हुआ है।
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  handleProcessBill(true); // Bypass
                }}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              >
                ⚡ काम न रुके (बायपास करें)
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs"
              >
                रद्द करें
              </button>
            </div>
          </div>
        ), { duration: 8000 });
      } else {
        toast.error(data?.message || err.message || 'बिल बनाने में विफल');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      
      {/* 🏷️ MULTI-BILL TABS HEADER */}
      <div className="bg-slate-900 px-4 py-2.5 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
                activeTabId === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{tab.name}</span>
              {tabs.length > 1 && (
                <span 
                  onClick={(e) => closeTab(tab.id, e)} 
                  className="hover:text-red-300 rounded-full p-0.5"
                >
                  ×
                </span>
              )}
            </button>
          ))}

          {tabs.length < MAX_CONCURRENT_TABS && (
            <button
              onClick={addNewTab}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="नया काउंटर बिल टैब जोड़ें"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Buttons: Hold Bills & Parked Drawer */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleHoldCurrentBill}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="बिल पार्क करें (Alt+H)"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>होल्ड बिल</span>
            <span className="text-[10px] bg-amber-400/20 px-1 py-0.5 rounded font-mono">Alt+H</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHeldDrawer(true)}
            className="relative px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>पार्क किए बिल</span>
            {heldBills.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                {heldBills.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 👤 CUSTOMER SELECTOR & REAL-TIME CREDIT BANNER */}
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          {/* Customer Dropdown */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              क्रेडिट ग्राहक चुनें (Search by Name / Phone)
            </label>
            <div className="relative">
              <select
                value={currentTab.customerId}
                onChange={(e) => updateCurrentTab({ customerId: e.target.value })}
                className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">-- ग्राहक चुनें (Select Customer) --</option>
                {parties.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} - 📞 {p.phone} {p.businessName ? `(${p.businessName})` : ''} | लिमिट: ₹{p.creditLimit?.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              भुगतान प्रकार (Payment Mode)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateCurrentTab({ paymentMode: 'CREDIT' })}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                  currentTab.paymentMode === 'CREDIT'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                उधार (Credit)
              </button>
              <button
                type="button"
                onClick={() => updateCurrentTab({ paymentMode: 'CASH' })}
                className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                  currentTab.paymentMode === 'CASH'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                नकद (Cash)
              </button>
            </div>
          </div>
        </div>

        {/* 🛡️ REAL-TIME REMAINING LIMIT BANNER */}
        {selectedParty && currentTab.paymentMode === 'CREDIT' && (
          <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                selectedParty.creditLimitStatus === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
              }`} />
              <div>
                <span className="text-xs font-bold text-slate-900">{selectedParty.name}</span>
                <span className="text-xs text-slate-500 ml-2">स्थिति: <b>{selectedParty.creditLimitStatus}</b></span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div>
                <span className="text-slate-500">स्वीकृत लिमिट:</span>{' '}
                <span className="font-bold text-slate-800">₹{selectedParty.creditLimit?.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500">वर्तमान बकाया:</span>{' '}
                <span className="font-bold text-amber-700">₹{selectedParty.currentOutstandingBalance?.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
                उपलब्ध लिमिट: ₹{selectedParty.availableLimit?.toLocaleString('en-IN')}
              </div>
            </div>

            {selectedParty.hasPendingBillApproval && (
              <div className="w-full mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  पिछला बिल पेंडिंग है (Gatekeeper Locked)
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentTab.bypassPending}
                    onChange={(e) => updateCurrentTab({ bypassPending: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                  <span className="font-bold text-xs">⚡ काम न रुके (बायपास सक्रिय करें)</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 📦 CART ITEMS TABLE */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            सामान की सूची (Cart Items)
          </span>
          <button
            type="button"
            onClick={addItemRow}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            + लाइन जोड़ें
          </button>
        </div>

        <div className="space-y-2">
          {currentTab.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={item.name}
                onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                placeholder="सामान का नाम (Item description)"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                placeholder="मात्रा"
                className="w-16 px-2 py-2 text-xs rounded-xl border border-slate-300 text-center font-semibold text-slate-800"
              />
              <input
                type="number"
                min="0"
                value={item.rate}
                onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                placeholder="दर ₹"
                className="w-24 px-2 py-2 text-xs rounded-xl border border-slate-300 text-right font-semibold text-slate-800"
              />
              <div className="w-20 text-right font-bold text-xs text-slate-900 pr-1">
                ₹{((Number(item.quantity) || 0) * (Number(item.rate) || 0)).toLocaleString('en-IN')}
              </div>
              <button
                type="button"
                onClick={() => removeItemRow(idx)}
                className="text-slate-400 hover:text-red-500 p-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 💰 BILLING FOOTER & 5-POINT PREVIEW */}
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        
        {/* Dynamic Statement 5-Point Box if Credit */}
        {statementPreview && currentTab.paymentMode === 'CREDIT' && (
          <div className="mb-3 p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-1">
            <div className="font-bold text-indigo-950 flex items-center justify-between pb-1 border-b border-indigo-200/60">
              <span>📊 5-बिंदु दैनिक हिसाब प्रीव्यू:</span>
              {statementPreview.isOverLimit && (
                <span className="text-[10px] text-red-700 bg-red-100 px-2 py-0.5 rounded font-bold">
                  ⚠️ लिमिट से अधिक (Overlimit)
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 text-[11px]">
              <div>आज का बिल: <b>₹{statementPreview.billAmount?.toLocaleString('en-IN')}</b></div>
              <div>पिछला: <b>₹{statementPreview.previousBalance?.toLocaleString('en-IN')}</b></div>
              <div className="text-amber-800">नया कुल बकाया: <b>₹{statementPreview.newTotalBalance?.toLocaleString('en-IN')}</b></div>
              <div>स्वीकृत लिमिट: <b>₹{statementPreview.sanctionedLimit?.toLocaleString('en-IN')}</b></div>
              <div className="text-emerald-800">बची हुई लिमिट: <b>₹{statementPreview.remainingLimit?.toLocaleString('en-IN')}</b></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 font-medium">कुल देय राशि (Total Amount):</span>
            <div className="text-2xl font-black text-slate-900">
              ₹{totalBillAmount.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleHoldCurrentBill}
              className="px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
            >
              पार्क करें (Alt+H)
            </button>

            <button
              type="button"
              onClick={() => handleProcessBill(false)}
              disabled={submitting || totalBillAmount <= 0}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {currentTab.paymentMode === 'CREDIT' ? 'उधार बिल बनाएं व WhatsApp OTP भेजें' : 'नकद बिल दर्ज करें'}
            </button>
          </div>
        </div>
      </div>

      {/* 📦 HELD BILLS DRAWER MODAL */}
      {showHeldDrawer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col border-l border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">पार्क किए बिल (Held Bills)</h3>
              </div>
              <button onClick={() => setShowHeldDrawer(false)} className="text-slate-400 hover:text-slate-700">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {heldBills.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  कोई पार्क किया हुआ बिल नहीं है।<br />(फास्ट बिलिंग में 'Alt+H' दबाकर बिल होल्ड करें)
                </div>
              ) : (
                heldBills.map((h) => (
                  <div key={h.heldId} className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{h.customerName}</div>
                        <div className="text-[11px] text-slate-500">पार्क समय: {h.heldAt}</div>
                      </div>
                      <div className="font-bold text-sm text-emerald-800">
                        ₹{h.tabData?.totalAmount?.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 truncate mb-2">
                      {h.tabData?.items?.map(i => i.name).filter(Boolean).join(', ') || 'सामान्य सामान'}
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-slate-200">
                      <button
                        onClick={() => handleResumeBill(h)}
                        className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        काउंटर पर लाएं
                      </button>
                      <button
                        onClick={() => handleDiscardHeld(h.heldId)}
                        className="p-1 text-slate-400 hover:text-red-500"
                        title="हटाएं"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔐 UDHAR OTP MODAL */}
      <UdharOtpModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        bill={activeBillForOtp}
        onHandoverSuccess={(updatedBill) => {
          if (onBillCompleted) onBillCompleted(updatedBill);
          if (onRefreshParties) onRefreshParties();
        }}
        onBypassSuccess={(updatedBill) => {
          if (onBillCompleted) onBillCompleted(updatedBill);
          if (onRefreshParties) onRefreshParties();
        }}
      />

    </div>
  );
}
