import React, { useState, useEffect } from 'react';
import { 
  Receipt, ShieldCheck, RefreshCw, AlertTriangle, 
  CheckCircle2, Send, Zap, Clock, ExternalLink 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { billingUdharApi } from '../services/billingUdharApi';
import UdharOtpModal from '../../msme-credit-mandate/components/UdharOtpModal';

export default function UdharBillsHistory() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeBill, setActiveBill] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      setLoading(true);
      const res = await billingUdharApi.getBills();
      if (res.success) {
        setBills(res.bills || []);
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBypass = async (billId) => {
    const reason = window.prompt('काम न रुके (Bypass) का कारण लिखें (उदा. ग्राहक साइट पर है / फोन व्यस्त है):');
    if (reason === null) return;

    try {
      const res = await billingUdharApi.bypassBill(billId, reason);
      if (res.success) {
        toast.success('बिल सफलतापूर्वक बाईपास हुआ!');
        loadBills();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'बाईपास करने में त्रुटि हुई।');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              उधार बिल्स व डिलीवरी हैंडओवर रिकॉर्ड ({bills.length})
            </h3>
            <p className="text-xs text-gray-500">
              प्रत्येक बिल का 5-पॉइंट स्नैपशॉट, WhatsApp डिलीवरी OTP सत्यापन और बाईपास हिस्ट्री
            </p>
          </div>

          <button
            onClick={loadBills}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Bills Table */}
        {loading && bills.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-xs">बिल्स लोड हो रहे हैं...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-600">कोई उधार बिल नहीं मिला</p>
            <p className="text-xs text-gray-400 mt-1">काउंटर बिलिंग से नया उधार बिल बनाएं।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">बिल / तारीख</th>
                  <th className="py-3 px-4">ग्राहक (Party)</th>
                  <th className="py-3 px-4">बिल राशि</th>
                  <th className="py-3 px-4">नया कुल बकाया</th>
                  <th className="py-3 px-4">हैंडओवर स्थिति</th>
                  <th className="py-3 px-4 text-right">कार्रवाई (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bills.map((b) => {
                  const isPending = b.deliveryStatus === 'PENDING_DELIVERY_OTP';
                  const isVerified = b.deliveryStatus === 'VERIFIED';
                  const isBypassed = b.deliveryStatus === 'BYPASSED';

                  return (
                    <tr key={b._id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        <div>{b.billNumber}</div>
                        <div className="text-[10px] text-gray-400 font-normal">
                          {new Date(b.createdAt).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-800">{b.party?.name || 'ग्राहक'}</div>
                        <div className="text-[10px] text-gray-400">📱 {b.party?.phone}</div>
                      </td>

                      <td className="py-3 px-4 font-black font-mono text-gray-900">
                        ₹{b.totalAmount?.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4 font-bold font-mono text-red-600">
                        ₹{b.creditLineSnapshot?.newTotalBalance?.toLocaleString('en-IN') || b.totalAmount?.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {isVerified && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {isBypassed && <Zap className="w-3 h-3" />}
                          <span>
                            {isVerified ? 'सत्यापित (Verified)' : isPending ? 'लंबित OTP' : 'काम न रुके (Bypassed)'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right space-x-2">
                        {isPending && (
                          <>
                            <button
                              onClick={() => {
                                setActiveBill(b);
                                setShowOtpModal(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shadow-sm"
                            >
                              OTP डालें
                            </button>

                            <button
                              onClick={() => handleBypass(b._id)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-2 py-1 rounded-lg text-xs font-bold transition-colors border border-amber-200"
                              title="काम न रुके बाईपास"
                            >
                              बाईपास
                            </button>
                          </>
                        )}

                        {b.waLink && (
                          <a
                            href={b.waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded-lg border border-emerald-200 transition-colors align-middle"
                            title="WhatsApp पर विवरण भेजें"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OTP Modal */}
      {showOtpModal && activeBill && (
        <UdharOtpModal
          isOpen={showOtpModal}
          onClose={() => {
            setShowOtpModal(false);
            setActiveBill(null);
          }}
          bill={activeBill}
          onHandoverSuccess={() => {
            toast.success('माल हैंडओवर सत्यापित हुआ!');
            loadBills();
          }}
          onBypassSuccess={() => {
            toast.success('बिल बाईपास हुआ!');
            loadBills();
          }}
        />
      )}
    </div>
  );
}
