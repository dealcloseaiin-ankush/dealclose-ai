import React, { useState } from 'react';
import { X, ShieldCheck, Send, CheckCircle2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { creditMandateApi } from '../services/creditMandateApi';

export default function SanctionLimitDrawer({ isOpen, onClose, party, onSanctionSuccess }) {
  const [limit, setLimit] = useState(party?.creditLimit || 10000);
  const [validityDays, setValidityDays] = useState(party?.creditLimitValidityDays || 365);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('FORM'); // 'FORM' | 'OTP_WAIT'
  const [promissoryText, setPromissoryText] = useState('');
  const [waLink, setWaLink] = useState('');
  const [submittedOtp, setSubmittedOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  if (!isOpen || !party) return null;

  // Step 1: Generate Promissory Note & WhatsApp Link
  const handleGenerateMandate = async (e) => {
    e.preventDefault();
    if (!limit || Number(limit) <= 0) {
      toast.error('कृपया मान्य क्रेडिट लिमिट राशि दर्ज करें।');
      return;
    }

    try {
      setLoading(true);
      const res = await creditMandateApi.sanctionLimit({
        partyId: party._id,
        sanctionedLimit: Number(limit),
        validityDays: Number(validityDays)
      });

      if (res.success) {
        setPromissoryText(res.promissoryText);
        setWaLink(res.waLink);
        setStep('OTP_WAIT');
        toast.success(res.message || 'वचन-पत्र तैयार है! WhatsApp पर भेजें।');
        // Auto-open WhatsApp
        if (res.waLink) {
          window.open(res.waLink, '_blank');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'मैंडेट तैयार करने में विफल');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 4-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!submittedOtp || submittedOtp.trim().length !== 4) {
      toast.error('कृपया ग्राहक के WhatsApp पर आया 4-अंकों का OTP दर्ज करें।');
      return;
    }

    try {
      setVerifying(true);
      const res = await creditMandateApi.verifySanctionOtp({
        partyId: party._id,
        submittedOtp: submittedOtp.trim()
      });

      if (res.success) {
        toast.success(res.message || 'क्रेडिट लिमिट सक्रिय हो गई है!');
        if (onSanctionSuccess) onSanctionSuccess(res.party);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'गलत OTP');
    } finally {
      setVerifying(false);
    }
  };

  // Resend OTP (30-Minute reuse window)
  const handleResendOtp = async () => {
    try {
      setResending(true);
      const res = await creditMandateApi.resendSanctionOtp(party._id);
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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <ShieldCheck className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg">क्रेडिट लिमिट मैंडेट स्वीकृति</h3>
              <p className="text-xs text-emerald-100">{party.name} ({party.phone})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'FORM' ? (
            <form onSubmit={handleGenerateMandate} className="space-y-4">
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  इस प्रक्रिया से ग्राहक के WhatsApp पर हिंदी में कानूनी वचन-पत्र (Promissory Mandate) व 4-अंकों का गुप्त OTP जाएगा। OTP वेरीफाई होते ही क्रेडिट लाइन सुरक्षित सक्रिय होगी।
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  स्वीकृत क्रेडिट लिमिट (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 font-bold text-lg"
                    placeholder="10000"
                    required
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[5000, 10000, 25000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setLimit(amt)}
                      className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 font-medium text-slate-600 transition-colors"
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  मैंडेट वैधता अवधि (दिन)
                </label>
                <select
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-800"
                >
                  <option value={90}>3 महीने (90 दिन)</option>
                  <option value={180}>6 महीने (180 दिन)</option>
                  <option value={365}>1 साल (365 दिन) - अनुशंसित</option>
                  <option value={730}>2 साल (730 दिन)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      मैंडेट तैयार हो रहा है...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      वचन-पत्र बनाएं व WhatsApp OTP भेजें
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Promissory Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 max-h-40 overflow-y-auto">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  वचन-पत्र प्रीव्यू (WhatsApp पर भेजा गया)
                </div>
                <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {promissoryText}
                </pre>
              </div>

              {/* WhatsApp Trigger Button */}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  📲 ग्राहक का WhatsApp चैट पुनः खोलें
                </a>
              )}

              {/* OTP Form */}
              <form onSubmit={handleVerifyOtp} className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  🔐 ग्राहक के WhatsApp पर प्राप्त 4-अंकों का OTP दर्ज करें *
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    maxLength={4}
                    value={submittedOtp}
                    onChange={(e) => setSubmittedOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="1 2 3 4"
                    className="w-full text-center tracking-[0.5em] text-2xl font-bold py-2.5 rounded-xl border-2 border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 text-slate-900 bg-emerald-50/30"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    OTP 30 मिनट तक मान्य है
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                    पुनः OTP भेजें
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('FORM')}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    रद्द / संशोधन
                  </button>
                  <button
                    type="submit"
                    disabled={verifying || submittedOtp.length !== 4}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
                  >
                    {verifying ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    क्रेडिट लाइन सक्रिय करें
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
