import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, Cpu, Clock, AlertTriangle, Sliders, CheckCircle, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BillingPage = () => {
  const [summary, setSummary] = useState({ totalTokens: 0, totalUserCost: 0 });
  const [logs, setLogs] = useState([]); // This will hold AI usage logs
  const [loading, setLoading] = useState(true);
  const [metaAnalytics, setMetaAnalytics] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/billing/summary');
        if (data.success) {
          setSummary(data.summary);
          setLogs(data.logs);
        }

        // Fetch Meta Analytics
        setLoadingMeta(true);
        const today = new Date();
        const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
        const metaRes = await api.get('/settings/meta-analytics', { params: { startDate: thirtyDaysAgo.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] }});
        if (metaRes.data.success) setMetaAnalytics(metaRes.data.data);
        setLoadingMeta(false);

      } catch (error) {
        console.error("Failed to fetch billing data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  // Function to format cost to a readable string (e.g., $0.001234)
  const formatCost = (cost) => {
    if (cost === 0) return '₹0.00';
    // Assuming cost is in INR
    return `₹${cost.toFixed(4)}`;
  };

  if (loading) {
    return <div className="p-8 text-center text-white">Loading Billing Data...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#050505] min-h-screen text-gray-200">
      <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-6">
        AI Usage & Billing
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-[#111] border border-gray-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2.5 rounded-xl"><Cpu className="h-5 w-5 text-blue-400" /></div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Total Tokens Used</p>
              <p className="text-xl font-bold text-white font-mono">{(summary.totalTokens || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-emerald-500/30 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl"><CheckCircle className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Free Tokens Remaining</p>
              <p className="text-xl font-bold text-emerald-400 font-mono">{(summary.freeAiTokensRemaining || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-purple-500/30 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/10 p-2.5 rounded-xl"><DollarSign className="h-5 w-5 text-purple-400" /></div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Total AI Billed (10x)</p>
              <p className="text-xl font-bold text-purple-300 font-mono">{formatCost(summary.totalUserCost || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-gray-800 p-5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2.5 rounded-xl"><Sliders className="h-5 w-5 text-amber-400" /></div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Wallet Balance</p>
              <p className="text-xl font-bold text-amber-400 font-mono">₹{(summary.walletBalance || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mb-8 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
        <p className="text-xs text-rose-300">
          This dashboard shows your real-time <strong>AI Model token consumption</strong> (Smart WhatsApp/IG Replies, Auto-Marketer, CRM Actions). Initial 50,000 tokens are 100% free; post-free quota is billed automatically from wallet with official 10x API pricing.
        </p>
      </div>

      {/* Detailed Logs Table */}
      <div className="bg-[#111] border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Live AI Token & Billing Activity</h2>
          <span className="text-xs text-gray-400 font-mono">Last 100 API Calls</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#1a1a1a] text-xs uppercase text-gray-400 tracking-wider">
              <tr>
                <th className="px-5 py-3 font-semibold text-left">Date & Time</th>
                <th className="px-5 py-3 font-semibold text-left">Feature / Action</th>
                <th className="px-5 py-3 font-semibold text-left">AI Model</th>
                <th className="px-5 py-3 font-semibold text-right">Prompt / Reply Tokens</th>
                <th className="px-5 py-3 font-semibold text-right">Total Tokens</th>
                <th className="px-5 py-3 font-semibold text-right">Status / Charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-xs">
              {logs.map(log => (
                <tr key={log._id} className="hover:bg-gray-900/50">
                  <td className="px-5 py-3.5 whitespace-nowrap text-gray-400 font-mono">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-medium text-white">{log.feature}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-gray-400 font-mono">{log.model}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right text-gray-400 font-mono">
                    {log.promptTokens || 0} in / {log.completionTokens || 0} out
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right text-purple-400 font-bold font-mono">{log.totalTokens}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right font-semibold">
                    {log.chargedTo === 'free_quota' || log.userCost === 0 ? (
                      <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[11px] border border-emerald-500/20">
                        🎁 Free Quota
                      </span>
                    ) : (
                      <span className="text-purple-300 font-mono">
                        {formatCost(log.userCost)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-500 text-xs">No AI activity recorded yet. Incoming chats will appear here live.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta Conversation Billing Section */}
      <div className="mt-10 bg-[#111] border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <h2 className="text-lg font-bold text-white p-5 border-b border-gray-800 flex items-center gap-2">
          <BarChart3 className="text-green-400" /> Meta Conversation Billing (Last 30 Days)
        </h2>
        {loadingMeta ? <p className="p-5 text-gray-500">Loading Meta billing data...</p> : (
          <div className="p-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metaAnalytics.map(d => ({ date: new Date(d.start).toLocaleDateString('en-IN', {day:'2-digit', month:'short'}), cost: parseFloat(d.cost) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `₹${value.toFixed(2)}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }}
                  labelStyle={{ color: '#f9fafb' }}
                  formatter={(value) => `₹${value.toFixed(2)}`}
                />
                <Legend wrapperStyle={{ color: '#d1d5db' }} />
                <Bar dataKey="cost" fill="#22c55e" name="Daily Cost (INR)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
};

export default BillingPage;