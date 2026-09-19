import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, User, Phone, MapPin, ShieldCheck, 
  AlertTriangle, CheckCircle, RefreshCw, Zap, Tag, 
  X, ChevronRight, ArrowRight, Clock, FileText 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { billingUdharApi } from '../services/billingUdharApi';
import UdharOtpModal from '../../msme-credit-mandate/components/UdharOtpModal';
import SanctionLimitDrawer from '../../msme-credit-mandate/components/SanctionLimitDrawer';

export default function MobileBillingCounter({ onBillCreated }) {
  // Parties
  const [parties, setParties] = useState([]);
  const [loadingParties, setLoadingParties] = useState(false);
  const [selectedParty, setSelectedParty] = useState(null);
  const [showNewPartyModal, setShowNewPartyModal] = useState(false);

  // New Party Form
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyCity, setNewPartyCity] = useState('');
  const [newPartyLimit, setNewPartyLimit] = useState('10000');
  const [creatingParty, setCreatingParty] = useState(false);

  // Billing Mode: 'QUICK' or 'ITEMS'
  const [billingMode, setBillingMode] = useState('QUICK');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickNote, setQuickNote] = useState('');

  // Itemized List
  const [items, setItems] = useState([
    { name: '', quantity: 1, unitPrice: '' }
  ]);

  // Payment Mode: 'CASH', 'UPI', 'UDHAR'
  const [paymentMode, setPaymentMode] = useState('UDHAR');

  // Coupon Code
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [activeUdharBill, setActiveUdharBill] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showSanctionDrawer, setShowSanctionDrawer] = useState(false);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    try {
      setLoadingParties(true);
      const res = await billingUdharApi.getParties();
      if (res.success) {
        setParties(res.parties || []);
      }
    } catch (err) {
      console.error('Error fetching parties:', err);
    } finally {
      setLoadingParties(false);
    }
  };

  const handleCreateParty = async (e) => {
    e.preventDefault();
    if (!newPartyName.trim() || !newPartyPhone.trim()) {
      toast.error('नाम और 10 अंकों का मोबाइल नंबर अनिवार्य है।');
      return;
    }

    try {
      setCreatingParty(true);
      const res = await billingUdharApi.createParty({
        name: newPartyName.trim(),
        phone: newPartyPhone.trim(),
        city: newPartyCity.trim(),
        creditLimit: Number(newPartyLimit) || 0
      });

      if (res.success) {
        toast.success(`पार्टी "${res.party.name}" सफलतापूर्वक जोड़ी गई!`);
        await loadParties();
        setSelectedParty(res.party);
        setShowNewPartyModal(false);
        setNewPartyName('');
        setNewPartyPhone('');
        setNewPartyCity('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'पार्टी जोड़ने में विफल।');
    } finally {
      setCreatingParty(false);
    }
  };

  // Calculations
  const calculateGrossTotal = () => {
    if (billingMode === 'QUICK') {
      return Number(quickAmount) || 0;
    }
    return items.reduce((sum, item) => {
      const q = Number(item.quantity) || 0;
      const r = Number(item.unitPrice) || 0;
      return sum + (q * r);
    }, 0);
  };

  const grossTotal = calculateGrossTotal();
  const discountAmount = appliedCoupon ? (appliedCoupon.discountAmount || 0) : 0;
  const netPayable = Math.max(0, grossTotal - discountAmount);

  // 5-Point Statement Calculation for Selected Party
  const previousBalance = selectedParty ? (selectedParty.currentOutstandingBalance || 0) : 0;
  const newTotalBalance = previousBalance + (paymentMode === 'UDHAR' ? netPayable : 0);
  const sanctionedLimit = selectedParty ? (selectedParty.creditLimit || 0) : 0;
  const remainingLimit = Math.max(0, sanctionedLimit - newTotalBalance);
  const isLimitExceeded = paymentMode === 'UDHAR' && selectedParty && sanctionedLimit > 0 && newTotalBalance > sanctionedLimit;

  // Coupon Validate
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setValidatingCoupon(true);
      const res = await billingUdharApi.validateCoupon({
        code: couponCode.trim(),
        billAmount: grossTotal,
        partyId: selectedParty?._id
      });
      if (res.success && res.valid) {
        setAppliedCoupon(res);
        toast.success(res.message || 'कूपन लागू हुआ!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'अमान्य कूपन कोड।');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  // Item list handlers
  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1, unitPrice: '' }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  // Create Bill
  const handleCreateBill = async () => {
    if (!selectedParty) {
      toast.error('कृपया ग्राहक/पार्टी का चयन करें।');
      return;
    }

    if (netPayable <= 0) {
      toast.error('बिल राशि ₹0 से अधिक होनी चाहिए।');
      return;
    }

    // Gatekeeper check for Udhar
    if (paymentMode === 'UDHAR') {
      if (selectedParty.creditLimitStatus === 'INACTIVE' || selectedParty.creditLimitStatus === 'PENDING_OTP') {
        toast.error('इस ग्राहक की क्रेडिट लिमिट सक्रिय नहीं है! पहले लिमिट स्वीकृत करें।');
        setShowSanctionDrawer(true);
        return;
      }

      if (selectedParty.hasPendingBillApproval) {
        toast.error('Gatekeeper Lock: पिछले बिल का OTP लंबित है!');
        return;
      }
    }

    try {
      setSubmitting(true);
      const finalItems = billingMode === 'ITEMS' ? items : [
        {
          name: quickNote.trim() || 'काउंटर बिल (Counter Sale)',
          quantity: 1,
          unitPrice: netPayable,
          totalPrice: netPayable
        }
      ];

      const payload = {
        partyId: selectedParty._id,
        items: finalItems,
        totalAmount: netPayable,
        paymentMode,
        couponCode: appliedCoupon?.coupon?.code,
        notes: quickNote.trim()
      };

      const res = await billingUdharApi.createBill(payload);

      if (res.success) {
        toast.success(res.message || 'बिल सफलतापूर्वक तैयार!');
        
        // Refresh parties to reflect new outstanding balance
        await loadParties();
        
        if (onBillCreated) onBillCreated(res.bill);

        if (paymentMode === 'UDHAR') {
          // Open Udhar OTP modal
          setActiveUdharBill({
            ...res.bill,
            party: selectedParty,
            creditLineSnapshot: res.creditLineSnapshot,
            waLink: res.waLink
          });
          setShowOtpModal(true);
        } else {
          // Cash or UPI success
          resetForm();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'बिल बनाने में त्रुटि हुई।');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuickAmount('');
    setQuickNote('');
    setItems([{ name: '', quantity: 1, unitPrice: '' }]);
    setAppliedCoupon(null);
    setCouponCode('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                📱 मोबाइल बिलिंग व उधार काउंटर
              </span>
              <span className="bg-emerald-400 text-emerald-950 px-2.5 py-0.5 rounded-full text-xs font-bold">
                Touch-Friendly POS
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">स्मार्ट मोबाइल बिलिंग व खाता सूट</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-xl">
              काउंटर पर सुपर-फास्ट बिलिंग: नकद, UPI या 5-पॉइंट स्टेटमेंट व Gatekeeper OTP प्रोटेक्शन के साथ सुरक्षित उधार!
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Billing Details (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Customer Selection Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>ग्राहक / पार्टी चुनें (Select Party) *</span>
              </label>

              <button
                type="button"
                onClick={() => setShowNewPartyModal(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ नया ग्राहक जोड़ें</span>
              </button>
            </div>

            {/* Dropdown Selector */}
            <select
              value={selectedParty?._id || ''}
              onChange={(e) => {
                const found = parties.find(p => p._id === e.target.value);
                setSelectedParty(found || null);
              }}
              className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-800 bg-white focus:border-blue-500 outline-none"
            >
              <option value="">-- ग्राहक चुनें (Select Customer) --</option>
              {parties.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.phone}) {p.city ? `• ${p.city}` : ''} - [बकाया: ₹{p.currentOutstandingBalance || 0}]
                </option>
              ))}
            </select>

            {/* Selected Party Summary Pill */}
            {selectedParty && (
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-bold text-blue-950 flex items-center gap-2">
                    <span>{selectedParty.name}</span>
                    <span className="text-blue-700 font-normal">📱 {selectedParty.phone}</span>
                    {selectedParty.city && <span className="text-gray-500">📍 {selectedParty.city}</span>}
                  </div>
                  <div className="text-gray-600 mt-0.5">
                    स्वीकृत लिमिट: <strong>₹{(selectedParty.creditLimit || 0).toLocaleString('en-IN')}</strong> | 
                    पिछला बकाया: <strong className="text-red-600">₹{(selectedParty.currentOutstandingBalance || 0).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      selectedParty.creditLimitStatus === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedParty.creditLimitStatus === 'LOCKED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedParty.creditLimitStatus}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Billing Mode & Amount / Items Input */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>बिल विवरण (Bill Details)</span>
              </label>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setBillingMode('QUICK')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    billingMode === 'QUICK'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ⚡ क्विक राशि
                </button>
                <button
                  type="button"
                  onClick={() => setBillingMode('ITEMS')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    billingMode === 'ITEMS'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📋 आइटम वाइज
                </button>
              </div>
            </div>

            {/* Quick Amount Mode */}
            {billingMode === 'QUICK' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    कुल बिल राशि (₹ Quick Total Amount) *
                  </label>
                  <div className="relative">
                    <span className="text-lg font-bold text-gray-400 absolute left-3.5 top-2.5">₹</span>
                    <input
                      type="number"
                      autoFocus
                      required
                      placeholder="0.00"
                      value={quickAmount}
                      onChange={(e) => setQuickAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-xl font-black text-gray-900 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    विवरण / रिमार्क (Optional Note)
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. किराना सामान, हार्डवेयर पार्ट्स आदि"
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Itemized Mode */
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="आइटम का नाम"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-blue-500 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="मात्रा"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-16 px-2 py-2 border border-gray-200 rounded-xl text-xs text-center focus:border-blue-500 outline-none"
                    />
                    <input
                      type="number"
                      placeholder="दर (₹)"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-200 rounded-xl text-xs text-right focus:border-blue-500 outline-none font-bold"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ दूसरा आइटम जोड़ें</span>
                </button>
              </div>
            )}

            {/* Optional Coupon Code Apply */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="कूपन कोड दर्ज करें (उदा. SAVE-100)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs uppercase font-mono font-bold focus:border-blue-500 outline-none"
                  />
                </div>
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-red-600 font-bold px-3 py-1.5 bg-red-50 rounded-xl hover:bg-red-100"
                  >
                    हटाएं
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="text-xs text-blue-600 font-bold px-3 py-1.5 bg-blue-50 rounded-xl hover:bg-blue-100 disabled:opacity-50"
                  >
                    {validatingCoupon ? 'जांच रहे हैं...' : 'लागू करें'}
                  </button>
                )}
              </div>

              {appliedCoupon && (
                <div className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>कूपन लागू! ₹{appliedCoupon.discountAmount} की छूट मिलेगी।</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Payment Selector & 5-Point Statement (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Payment Mode Selector */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
              भुगतान का माध्यम (Payment Mode)
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CASH', label: '💵 नकद (Cash)' },
                { id: 'UPI', label: '📱 UPI' },
                { id: 'UDHAR', label: '🛡️ उधार (Udhar)' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMode(m.id)}
                  className={`py-3 px-2 rounded-xl text-xs font-black border transition-all text-center ${
                    paymentMode === m.id
                      ? m.id === 'UDHAR'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                        : 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Dynamic 5-Point Statement (Shown when UDHAR is selected) */}
            {paymentMode === 'UDHAR' && selectedParty && (
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-4.5 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-blue-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    5-Point Real-time Statement
                  </span>
                  <span className="text-[10px] bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full font-mono">
                    Live
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-blue-100">
                    <span>1. 📦 आज का बिल राशि:</span>
                    <strong className="text-white font-mono">₹{netPayable.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="flex justify-between text-blue-100">
                    <span>2. 📜 पिछला बकाया:</span>
                    <strong className="text-white font-mono">₹{previousBalance.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="flex justify-between text-amber-300 font-bold border-t border-white/10 pt-1.5">
                    <span>3. 💰 कुल नया बकाया:</span>
                    <strong className="font-mono text-sm">₹{newTotalBalance.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="flex justify-between text-blue-100">
                    <span>4. 🛡️ स्वीकृत लिमिट:</span>
                    <strong className="text-white font-mono">₹{sanctionedLimit.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="flex justify-between text-emerald-300 font-bold border-t border-white/10 pt-1.5">
                    <span>5. 🟢 शेष उपलब्ध लिमिट:</span>
                    <strong className="font-mono text-sm">₹{remainingLimit.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Gatekeeper Limit Warnings */}
                {selectedParty.hasPendingBillApproval && (
                  <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-2.5 text-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Gatekeeper Alert: पिछले बिल का OTP पेंडिंग है!</span>
                  </div>
                )}

                {isLimitExceeded && (
                  <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-2.5 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>चेतावनी: यह बिल स्वीकृत लिमिट (₹{sanctionedLimit}) को पार कर रहा है!</span>
                  </div>
                )}
              </div>
            )}

            {/* Bill Summary Amount Card */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>कुल राशि (Gross Total):</span>
                <span className="font-mono font-bold">₹{grossTotal.toLocaleString('en-IN')}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>कूपन छूट (Discount):</span>
                  <span className="font-mono font-bold">- ₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-900 font-black text-base border-t border-gray-200 pt-2">
                <span>कुल देय राशि (Payable):</span>
                <span className="font-mono text-blue-700">₹{netPayable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Action Submit Button */}
            <button
              type="button"
              onClick={handleCreateBill}
              disabled={submitting || !selectedParty || netPayable <= 0}
              className={`w-full font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md hover:shadow-lg transition-all text-white ${
                paymentMode === 'UDHAR'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800'
              } disabled:opacity-50`}
            >
              {submitting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>
                    {paymentMode === 'UDHAR' 
                      ? 'उधार बिल बनाएं और OTP भेजें' 
                      : 'बिल बनाएं और रसीद दें'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* New Party Modal */}
      {showNewPartyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                नया ग्राहक / पार्टी जोड़ें
              </h3>
              <button onClick={() => setShowNewPartyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParty} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">ग्राहक का नाम *</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. विकास हार्डवेयर"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">WhatsApp मोबाइल *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={newPartyPhone}
                    onChange={(e) => setNewPartyPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">शहर / इलाका</label>
                  <input
                    type="text"
                    placeholder="उदा. जयपुर"
                    value={newPartyCity}
                    onChange={(e) => setNewPartyCity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">प्रारंभिक स्वीकृत क्रेडिट लिमिट (₹)</label>
                <input
                  type="number"
                  placeholder="10000"
                  value={newPartyLimit}
                  onChange={(e) => setNewPartyLimit(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:border-blue-500 outline-none font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={creatingParty}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 mt-3"
              >
                {creatingParty ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>सहेजें और चुनें</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Udhar Delivery OTP Modal */}
      {showOtpModal && activeUdharBill && (
        <UdharOtpModal
          isOpen={showOtpModal}
          onClose={() => {
            setShowOtpModal(false);
            resetForm();
          }}
          bill={activeUdharBill}
          onHandoverSuccess={() => {
            toast.success('माल हैंडओवर सत्यापित! खाता अपडेट हुआ।');
            loadParties();
          }}
          onBypassSuccess={() => {
            toast.success('काम न रुके: बिल बाईपास हुआ!');
            loadParties();
          }}
        />
      )}

      {/* Sanction Limit Drawer */}
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
    </div>
  );
}
