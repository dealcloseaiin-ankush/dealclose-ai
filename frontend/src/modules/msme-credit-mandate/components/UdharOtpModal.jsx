import React, { useState } from 'react';
import { X, Send, ShieldCheck, CheckCircle2, RefreshCw, Zap, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { creditMandateApi } from '../services/creditMandateApi';

export default function UdharOtpModal({ 
  isOpen, 
  onClose, 
  bill, 
  onHandoverSuccess,
  onBypassSuccess 
}) {
  const [submittedOtp, setSubmittedOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [bypassing, setBypassing] = useState(false);
  const [waLink, setWaLink] = useState(bill?.waLink || '');

  if (!isOpen || !bill) return null;

  const snapshot = bill.creditLineSnapshot || {
    billAmount: bill.totalAmount || 0,
    previousBalance: 0,
    newTotalBalance: bill.totalAmount || 0,
    sanctionedLimit: 0,
    remainingLimit: 0
  };

  // Cashier enters 4-digit OTP from customer
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!submittedOtp || submittedOtp.trim().length !== 4) {
      toast.error('कृपया ग्राहक से प्राप्त 4-अंकों का OTP दर्ज करें।');
      return;
    }

    try {
      setVerifying(true);
      const res = await creditMandateApi.verifyBillOtp({
        billId: bill._id,
        submittedOtp: submittedOtp.trim()
      });

      if (res.success) {
        toast.success(res.message || 'माल हैंडओवर सफलतापूर्वक सत्यापित हुआ!');
        if (onHandoverSuccess) onHandoverSuccess(res.bill);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'गलत OTP');
    } finally {
      setVerifying(false);
    }
  };

  // 30-min Resend OTP
  const handleResend = async () => {
    try {
      setResending(true);
      const res = await creditMandateApi.resendBillOtp(bill._id);
      if (res.success) {
        setWaLink(res.waLink);
        toast.success(res.message || 'WhatsApp लिंक पुनः तैयार किया गया।');
        if (res.waLink) {
          window.open(res.waLink, '_blank');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'पुनः भेजने में विफल');
    } finally {
      setResending(false);
    }
  };

  // Merchant 1-Click "काम न रुके" Bypass
  const handleBypass = async () => {
    if (!window.confirm('क्या आप ग्राहक के OTP के बिना सीधे बिल हैंडओवर ("काम न रुके") करना चाहते हैं?')) {
      return;
    }

    try {
      setBypassing(true);
      const res = await creditMandateApi.bypassBill(bill._id, 'Merchant 1-click counter bypass');
      if (res.success) {
        toast.success(res.message || 'बायपास दर्ज हुआ! Gatekeeper अनलॉक हो गया है।');
        if (onBypassSuccess) onBypassSuccess(res.bill);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'बायपास विफल');
    } finally {
      setBypassing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">दैनिक उधार हैंडओवर प्रोटेक्शन</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                  #{bill.billNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300">5-बिंदु वित्तीय विवरण व सुरक्षित OTP सत्यापन</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          
          {/* 📊 DYNAMIC 5-POINT STATEMENT */}
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl p-4 border border-indigo-100 shadow-inner">
            <div className="flex items-center justify-between border-b border-indigo-100/80 pb-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                दैनिक 5-बिंदु वित्तीय स्थिति
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                क्रेडिट खाता
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                  📦 1. आज का बिल (Today's Bill):
                </span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹{Number(snapshot.billAmount).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                  📜 2. पिछला बकाया (Previous Balance):
                </span>
                <span className="font-semibold text-slate-800">
                  ₹{Number(snapshot.previousBalance).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 px-2.5 rounded-xl bg-amber-100/60 border border-amber-200/80">
                <span className="text-amber-950 flex items-center gap-1.5 font-bold">
                  💰 3. अब तक कुल बकाया (New Total):
                </span>
                <span className="font-black text-amber-900 text-base">
                  ₹{Number(snapshot.newTotalBalance).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                  🛡️ 4. कुल स्वीकृत लिमिट (Sanctioned Limit):
                </span>
                <span className="font-semibold text-slate-800">
                  ₹{Number(snapshot.sanctionedLimit).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 px-2.5 rounded-xl bg-emerald-100/60 border border-emerald-200/80">
                <span className="text-emerald-950 flex items-center gap-1.5 font-bold">
                  🟢 5. बची हुई उपलब्ध लिमिट (Remaining):
                </span>
                <span className="font-black text-emerald-800 text-sm">
                  ₹{Number(snapshot.remainingLimit).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* 📲 BIG GREEN WHATSAPP TRIGGER */}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all text-sm group"
            >
              <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              📲 ग्राहक के WhatsApp पर हिसाब व OTP भेजें
            </a>
          )}

          {/* 🔐 CASHIER-PROOF OTP INPUT */}
          <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                🔐 ग्राहक से पूछकर 4-अंकों का डिलीवरी OTP दर्ज करें:
              </label>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                पुनः भेजें
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                maxLength={4}
                value={submittedOtp}
                onChange={(e) => setSubmittedOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • •"
                className="w-full text-center tracking-[0.6em] text-2xl font-bold py-2.5 rounded-xl border-2 border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 text-slate-900 bg-indigo-50/20"
                autoFocus
                required
              />
              <div className="text-[10px] text-slate-400 text-center mt-1">
                (कैशियर-प्रूफ: OTP केवल ग्राहक के WhatsApp पर उपलब्ध है)
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* 1-Click Merchant Bypass */}
              <button
                type="button"
                onClick={handleBypass}
                disabled={bypassing}
                className="py-2.5 px-3 rounded-xl border-2 border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
                title="यदि ग्राहक फोन नहीं उठा रहा या दूर है तो काउंटर न रुकने दें"
              >
                <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                ⚡ काम न रुके (बायपास)
              </button>

              {/* Verify OTP */}
              <button
                type="submit"
                disabled={verifying || submittedOtp.length !== 4}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 transition-colors"
              >
                {verifying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                OTP हैंडओवर सत्यापित करें
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
