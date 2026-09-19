import React, { useState, useEffect } from 'react';
import { X, BookOpen, ArrowDownLeft, ArrowUpRight, RefreshCw, Printer, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { creditMandateApi } from '../services/creditMandateApi';

export default function PartyLedgerModal({ isOpen, onClose, party }) {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !party) return;
    const fetchLedger = async () => {
      try {
        setLoading(true);
        const res = await creditMandateApi.getPartyLedger(party._id);
        if (res.success) {
          setLedger(res.ledger || []);
        }
      } catch (err) {
        toast.error('खाता लेजर लोड करने में विफल');
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [isOpen, party]);

  if (!isOpen || !party) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base">ग्राहक खाता लेजर (Ledger Statement)</h3>
              <p className="text-xs text-slate-400">{party.name} • 📞 {party.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs shrink-0">
          <div>
            <span className="text-slate-500">स्वीकृत क्रेडिट लिमिट:</span>{' '}
            <span className="font-bold text-slate-800">₹{party.creditLimit?.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-slate-500">कुल वर्तमान बकाया:</span>{' '}
            <span className="font-black text-amber-700 text-sm">₹{party.currentOutstandingBalance?.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
            {party.creditLimitStatus}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              लेजर लोड हो रहा है...
            </div>
          ) : ledger.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              इस ग्राहक का अभी तक कोई लेन-देन दर्ज नहीं हुआ है।
            </div>
          ) : (
            <div className="space-y-3">
              {ledger.map((item, idx) => {
                const isDebit = item.type === 'DEBIT_BILL';
                const dateStr = new Date(item.date).toLocaleDateString('hi-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={item.id || idx}
                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      isDebit 
                        ? 'bg-red-50/30 border-red-100 hover:bg-red-50/60' 
                        : 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isDebit ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isDebit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900">
                          {isDebit ? `उधार बिल #${item.billNumber}` : `भुगतान जमा (${item.paymentMode})`}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.details || item.note}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {dateStr}
                          {item.isOwnerBypassed && (
                            <span className="text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded text-[9px] font-bold">
                              बायपास
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-black text-sm ${isDebit ? 'text-red-700' : 'text-emerald-700'}`}>
                        {isDebit ? `+ ₹${item.amount?.toLocaleString('en-IN')}` : `- ₹${item.amount?.toLocaleString('en-IN')}`}
                      </div>
                      {item.status && (
                        <span className="text-[10px] text-slate-400 font-medium uppercase">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors"
          >
            बंद करें
          </button>
        </div>

      </div>
    </div>
  );
}
