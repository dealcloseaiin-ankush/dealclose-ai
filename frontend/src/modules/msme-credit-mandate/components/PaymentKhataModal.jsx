import React, { useState } from 'react';
import { X, Banknote, Send, CheckCircle2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { creditMandateApi } from '../services/creditMandateApi';

export default function PaymentKhataModal({ isOpen, onClose, party, onPaymentSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNote, setReferenceNote] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !party) return null;

  const prevBal = Number(party.currentOutstandingBalance) || 0;
  const payAmt = Number(amount) || 0;
  const newBal = Math.max(0, prevBal - payAmt);
  const willAutoUnlock = party.creditLimitStatus === 'LOCKED' && newBal <= (party.creditLimit || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!payAmt || payAmt <= 0) {
      toast.error('कृपया मान्य भुगतान राशि दर्ज करें।');
      return;
    }

    try {
      setLoading(true);
      const res = await creditMandateApi.recordPayment({
        partyId: party._id,
        amount: payAmt,
        paymentMode,
        referenceNote
      });

      if (res.success) {
        toast.success(res.message);
        if (res.waReceiptLink) {
          window.open(res.waReceiptLink, '_blank');
        }
        if (onPaymentSuccess) onPaymentSuccess(res.party);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'भुगतान दर्ज करने में विफल');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Banknote className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base">भुगतान जमा प्रविष्टि (Khata Entry)</h3>
              <p className="text-xs text-emerald-100">{party.name} (बकाया: ₹{prevBal.toLocaleString('en-IN')})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Amount input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              प्राप्त जमा राशि (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-900 font-black text-xl"
                autoFocus
                required
              />
            </div>
            {prevBal > 0 && (
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setAmount(prevBal)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-200"
                >
                  पूरा हिसाब चुकता करें (₹{prevBal.toLocaleString('en-IN')})
                </button>
              </div>
            )}
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              भुगतान माध्यम (Payment Mode)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['CASH', 'UPI', 'BANK_TRANSFER'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                    paymentMode === mode
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {mode === 'CASH' ? '💵 नकद' : (mode === 'UPI' ? '📱 UPI' : '🏦 बैंक')}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              विवरण / रसीद नोट (वैकल्पिक)
            </label>
            <input
              type="text"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              placeholder="e.g. GPay ref no., चेक नंबर, या नकद रसीद"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          {/* Balance Calculation Box */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>पिछला कुल बकाया:</span>
              <span className="font-semibold">₹{prevBal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>जमा होने वाली राशि:</span>
              <span className="font-bold">-₹{payAmt.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5 text-sm">
              <span>नया शेष बकाया:</span>
              <span className="text-emerald-800">₹{newBal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* 🔓 AUTO UNLOCK HIGHLIGHT */}
          {willAutoUnlock && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <b>स्वतः अनलॉक:</b> बकाया लिमिट के अंदर आते ही खाता तुरंत <b>"ACTIVE"</b> हो जाएगा!
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              disabled={loading || payAmt <= 0}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              जमा करें व WhatsApp रसीद भेजें
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
