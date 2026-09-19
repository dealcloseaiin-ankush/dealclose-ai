import React, { useState } from 'react';
import { X, Sparkles, Gift, Send, QrCode, ShieldCheck, CheckCircle2, RefreshCw, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { creditMandateApi } from '../services/creditMandateApi';

export default function LoyaltyStampDrawer({ isOpen, onClose, party, onUpdateParty }) {
  const [activeTab, setActiveTab] = useState('LOYALTY'); // 'LOYALTY' | 'UPI_MANDATE'
  const [vpa, setVpa] = useState(party?.upiMandateVpa || '');
  const [cycle, setCycle] = useState(party?.mandateCycle || 'MONTHLY');
  const [maxAmount, setMaxAmount] = useState(party?.mandateMaxAmount || party?.creditLimit || 10000);
  const [generating, setGenerating] = useState(false);
  const [generatedUri, setGeneratedUri] = useState('');

  if (!isOpen || !party) return null;

  const targetVisits = party.loyaltyTargetVisits || 5;
  const completed = party.completedVisitsCount || 0;
  const isUnlocked = party.rewardUnlocked;
  const coupon = party.activeRewardCoupon;

  // Generate UPI Mandate URI
  const handleGenerateUpiMandate = async (e) => {
    e.preventDefault();
    if (!vpa || !vpa.includes('@')) {
      toast.error('कृपया मान्य UPI ID (VPA) दर्ज करें, जैसे: customer@upi');
      return;
    }

    try {
      setGenerating(true);
      const res = await creditMandateApi.generateUpiMandate({
        partyId: party._id,
        vpa: vpa.trim(),
        cycle,
        maxAmount: Number(maxAmount)
      });

      if (res.success) {
        setGeneratedUri(res.mandateUri);
        toast.success('UPI e-Mandate लिंक सफलतापूर्वक जनरेट हुआ!');
        if (onUpdateParty) onUpdateParty(res.party);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'UPI मैंडेट तैयार करने में विफल');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('क्लिपबोर्ड पर कॉपी हो गया!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">लॉयल्टी स्टैम्प्स व UPI मैंडेट</h3>
              <p className="text-xs text-indigo-200">{party.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => setActiveTab('LOYALTY')}
            className={`flex-1 py-3 text-center border-b-2 transition-all ${
              activeTab === 'LOYALTY'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            🎁 5-विजिट स्टैम्प कार्ड
          </button>
          <button
            onClick={() => setActiveTab('UPI_MANDATE')}
            className={`flex-1 py-3 text-center border-b-2 transition-all ${
              activeTab === 'UPI_MANDATE'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            💳 UPI e-मैंडेट ऑटोपे
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'LOYALTY' ? (
            <div className="space-y-4">
              
              {/* Visual Stamp Card */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-200">
                      Digital Loyalty Pass
                    </span>
                    <h4 className="font-bold text-lg">{party.name}</h4>
                  </div>
                  <Gift className="w-6 h-6 text-amber-300 animate-bounce" />
                </div>

                {/* Stars Stamps Grid */}
                <div className="flex items-center justify-between gap-2 py-4 px-2 bg-black/20 rounded-xl my-2 backdrop-blur-sm">
                  {Array.from({ length: targetVisits }).map((_, i) => {
                    const isFilled = i < completed;
                    return (
                      <div
                        key={i}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                          isFilled 
                            ? 'bg-amber-400 text-slate-950 shadow-md scale-105' 
                            : 'bg-white/10 text-white/40 border border-white/20'
                        }`}
                      >
                        {isFilled ? '⭐' : `${i + 1}`}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-xs mt-2 text-indigo-100 font-medium">
                  <span>प्रोग्रेस: <b>{completed} / {targetVisits} पूरी</b></span>
                  <span>न्यूनतम बिल: ₹{party.minBillAmountForStamp || 200}</span>
                </div>
              </div>

              {/* Reward Unlocked Alert */}
              {isUnlocked && coupon && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <div className="font-bold flex items-center justify-between mb-1">
                    <span>🎉 माइलस्टोन रिवॉर्ड अनलॉक हो गया!</span>
                    <button 
                      onClick={() => copyToClipboard(coupon)} 
                      className="text-amber-700 hover:text-amber-900 flex items-center gap-1 font-mono"
                    >
                      <Copy className="w-3 h-3" />
                      कॉपी करें
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-amber-300 font-mono font-bold text-center text-sm tracking-wider text-amber-800">
                    {coupon}
                  </div>
                  <p className="text-[11px] text-amber-700 mt-1">
                    अगले बिल पर यह कूपन कोड दर्ज करके स्पेशल छूट / फ्री डिश प्रदान करें।
                  </p>
                </div>
              )}

              {/* Info text */}
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                💡 <b>नियम:</b> हर ₹{party.minBillAmountForStamp || 200}+ के बिल पर 1 स्टैम्प स्वतः जुड़ता है। {targetVisits} विजिट्स पूरी होने पर ग्राहक को स्पेशल रिवॉर्ड कूपन स्वतः मिलता है।
              </div>

            </div>
          ) : (
            <form onSubmit={handleGenerateUpiMandate} className="space-y-4">
              <div className="text-xs text-slate-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
                प्रति माह या प्रति सप्ताह निश्चित खाते के सेटलमेंट के लिए NPCI UPI AutoPay मैंडेट लिंक जनरेट करें।
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ग्राहक का UPI ID (VPA) *
                </label>
                <input
                  type="text"
                  value={vpa}
                  onChange={(e) => setVpa(e.target.value)}
                  placeholder="name@okhdfcbank या 9876543210@paytm"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    साइकिल (Cycle)
                  </label>
                  <select
                    value={cycle}
                    onChange={(e) => setCycle(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="WEEKLY">साप्ताहिक (Weekly)</option>
                    <option value="MONTHLY">मासिक (Monthly)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    अधिकतम मैंडेट सीमा (₹)
                  </label>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md disabled:opacity-50"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                UPI e-मैंडेट लिंक तैयार करें
              </button>

              {generatedUri && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 flex justify-between items-center">
                    <span>UPI Mandate URI:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedUri)}
                      className="text-indigo-600 hover:underline flex items-center gap-1 text-[10px]"
                    >
                      <Copy className="w-3 h-3" /> कॉपी
                    </button>
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 break-all p-2 bg-white rounded border border-slate-200">
                    {generatedUri}
                  </div>
                  <a
                    href={generatedUri}
                    className="block text-center text-xs py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    📲 UPI ऐप में मैंडेट खोलें
                  </a>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors"
          >
            बंद करें
          </button>
        </div>

      </div>
    </div>
  );
}
