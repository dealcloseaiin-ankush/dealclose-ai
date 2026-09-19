import React from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, Lock, 
  Send, Plus, BookOpen, Banknote, Sparkles, AlertCircle, ArrowUpRight, Zap
} from 'lucide-react';

export default function CreditLimitPartyTable({
  parties = [],
  onOpenSanction,
  onOpenPayment,
  onOpenLedger,
  onOpenLoyalty,
  onBypassPendingBill
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-4">ग्राहक (Party Details)</th>
              <th className="py-3.5 px-4">क्रेडिट स्थिति (Status)</th>
              <th className="py-3.5 px-4">स्वीकृत लिमिट</th>
              <th className="py-3.5 px-4">वर्तमान बकाया</th>
              <th className="py-3.5 px-4">लिमिट उपयोग (Consumption)</th>
              <th className="py-3.5 px-4">लॉयल्टी स्टैम्प्स</th>
              <th className="py-3.5 px-4 text-right">कार्यवाहियां (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {parties.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  कोई क्रेडिट ग्राहक नहीं मिला। '➕ नया ग्राहक जोड़ें' पर क्लिक करें।
                </td>
              </tr>
            ) : (
              parties.map((party) => {
                const limit = Number(party.creditLimit) || 0;
                const outstanding = Number(party.currentOutstandingBalance) || 0;
                const percentage = party.usedPercentage || 0;

                // Color-coded progress bar
                let barColor = 'bg-emerald-500';
                let textColor = 'text-emerald-700';
                if (percentage >= 90) {
                  barColor = 'bg-red-500';
                  textColor = 'text-red-700';
                } else if (percentage >= 70) {
                  barColor = 'bg-amber-500';
                  textColor = 'text-amber-700';
                }

                return (
                  <tr key={party._id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* 👤 Party Details */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{party.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>📞 {party.phone}</span>
                        {party.businessName && <span>• {party.businessName}</span>}
                      </div>
                      {party.hasPendingBillApproval && (
                        <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 text-[10px] font-bold">
                          <Lock className="w-3 h-3 text-amber-600" />
                          पिछला बिल पेंडिंग (Gatekeeper Lock)
                        </div>
                      )}
                    </td>

                    {/* 🛡️ Status Badge */}
                    <td className="py-3.5 px-4">
                      {party.creditLimitStatus === 'ACTIVE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ACTIVE
                        </span>
                      )}
                      {party.creditLimitStatus === 'PENDING_OTP' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                          <Clock className="w-3 h-3 text-amber-600" />
                          PENDING OTP
                        </span>
                      )}
                      {party.creditLimitStatus === 'LOCKED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[11px]">
                          <Lock className="w-3 h-3 text-red-600" />
                          LOCKED
                        </span>
                      )}
                      {party.creditLimitStatus === 'INACTIVE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                          INACTIVE
                        </span>
                      )}
                    </td>

                    {/* 🛡️ Sanctioned Limit */}
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      ₹{limit.toLocaleString('en-IN')}
                    </td>

                    {/* 💰 Current Outstanding */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        ₹{outstanding.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        शेष: ₹{party.availableLimit?.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* 📊 Visual Consumption Bar */}
                    <td className="py-3.5 px-4 w-40">
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className={textColor}>{percentage}% प्रयुक्त</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${barColor}`} 
                          style={{ width: `${Math.min(100, percentage)}%` }} 
                        />
                      </div>
                    </td>

                    {/* ⭐ Loyalty Stamps */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onOpenLoyalty(party)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{party.completedVisitsCount || 0}/{party.loyaltyTargetVisits || 5} विजिट्स</span>
                      </button>
                    </td>

                    {/* ⚙️ Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Record Payment (Khata Jama) */}
                        <button
                          onClick={() => onOpenPayment(party)}
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors"
                          title="भुगतान जमा दर्ज करें (Auto-Unlock)"
                        >
                          <Banknote className="w-4 h-4" />
                        </button>

                        {/* View Ledger */}
                        <button
                          onClick={() => onOpenLedger(party)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="खाता लेजर देखें"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>

                        {/* Sanction Limit */}
                        <button
                          onClick={() => onOpenSanction(party)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          {limit > 0 ? 'लिमिट बदलें' : 'लिमिट दें'}
                        </button>

                        {/* 1-Click Bypass if Pending */}
                        {party.hasPendingBillApproval && (
                          <button
                            onClick={() => onBypassPendingBill(party)}
                            className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                            title="काम न रुके: पिछला बिल तुरंत अनलॉक करें"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
