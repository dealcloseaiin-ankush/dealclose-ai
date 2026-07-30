import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function MonthlyReport() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLeads: 0, contacted: 0, positive: 0, dropped: 0 });
  const [leadSources, setLeadSources] = useState([]);
  
  // Dynamic month dropdown
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    // Generate last 6 months for dropdown
    const monthOptions = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthOptions.push({ label: `${monthStr} ${year}`, value });
    }
    setMonths(monthOptions);
    setSelectedMonth(monthOptions[0].value);
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!selectedMonth) return;
      setLoading(true);
      try {
        const { data } = await api.get('/leads/analytics', {
          params: { workspaceId: activeWorkspace, month: selectedMonth }
        });
        setStats({
          totalLeads: data.stats?.totalLeads || 0,
          contacted: data.stats?.totalLeads - (data.smartCrmData?.new || 0), // Approximation
          positive: data.smartCrmData?.converted || 0,
          dropped: data.smartCrmData?.lost || 0,
        });
        const sources = data.leadsBySource || [];
        const total = sources.reduce((acc, s) => acc + s.leads, 0);
        setLeadSources(sources.map(s => ({ ...s, percentage: total > 0 ? ((s.leads / total) * 100).toFixed(0) : 0 })));
      } catch (error) {
        console.error("Failed to fetch report data", error);
        toast.error("Could not load report data.");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [activeWorkspace, selectedMonth]);

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-white">Monthly Performance & Retargeting</h1>
            <select 
              value={activeWorkspace} 
              onChange={(e) => setActiveWorkspace(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-400">Analyze your leads, sources, and plan retargeting strategies for dropped customers.</p>
        </div>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-[#111] border border-gray-800 text-white px-4 py-2 rounded-lg font-bold">
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Top Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-[#111] border border-gray-800 p-6 rounded-2xl h-24 animate-pulse"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl">
            <p className="text-gray-400 text-sm font-bold mb-1">Total Leads Received</p>
            <p className="text-3xl font-black text-white">{stats.totalLeads}</p>
          </div>
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl">
            <p className="text-gray-400 text-sm font-bold mb-1">Successfully Contacted</p>
            <p className="text-3xl font-black text-blue-400">{stats.contacted}</p>
          </div>
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl">
            <p className="text-gray-400 text-sm font-bold mb-1">Positive Response</p>
            <p className="text-3xl font-black text-green-400">{stats.positive}</p>
          </div>
          <div className="bg-[#111] border border-rose-900/30 p-6 rounded-2xl">
            <p className="text-rose-400 text-sm font-bold mb-1">Dropped / Ignored</p>
            <p className="text-3xl font-black text-rose-500">{stats.dropped}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lead Sources */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">Lead Sources</h2>
          {loading ? <div className="h-48 animate-pulse bg-gray-800 rounded-lg"></div> : (
            <div className="space-y-4">
              {leadSources.map((source, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{source.name}</span>
                    <span className="font-bold text-white">{source.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${source.percentage}%` }}></div>
                  </div>
                </div>
              ))}
              {leadSources.length === 0 && <p className="text-gray-500 text-center">No lead source data for this period.</p>}
            </div>
          )}
        </div>

        {/* AI Retargeting Planner */}
        <div className="lg:col-span-2 bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-2">🎯 AI Retargeting Planner</h2>
          <p className="text-gray-400 text-sm mb-6">AI has grouped your dropped leads. Plan a different approach for next week/month.</p>
          <div className="bg-[#1a1a1a] p-8 rounded-xl border border-dashed border-gray-700 text-center text-gray-500">
            <p className="text-3xl mb-2">✨</p>
            <h3 className="text-lg font-bold text-gray-300">Coming Soon</h3>
            <p className="text-sm mt-1">This feature will automatically group your lost leads and suggest retargeting campaigns.</p>
          </div>
        </div>
      </div>
    </div>
  );
}