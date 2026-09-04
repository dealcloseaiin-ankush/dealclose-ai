import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Phone, MessageSquare, IndianRupee, TrendingUp, Users, 
  Link2, Eye, MousePointerClick, Sparkles, ExternalLink, 
  ShieldCheck, Crown, ArrowUpRight
} from 'lucide-react';

export default function TrackingAnalytics() {
  const [data, setData] = useState(null);
  const [linkData, setLinkData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resLead, resLink] = await Promise.allSettled([
          api.get('/leads/analytics'),
          api.get('/tracking/link-analytics')
        ]);
        
        if (resLead.status === 'fulfilled') {
          setData(resLead.value.data);
        }
        if (resLink.status === 'fulfilled') {
          setLinkData(resLink.value.data);
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error("Error fetching analytics", error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-center text-white">Loading Analytics & Link Tracking...</div>;

  // Safe destructure with defaults to prevent undefined crashes
  const stats = data?.stats || { totalLeads: 0, conversionRate: 0, costPerLead: 0 };
  const messageStats = data?.messageStats || { delivered: 0 };
  const graphData = data?.graphData || [];
  const dailyLeads = data?.dailyLeads || [];
  const advancedStats = data?.advancedStats || { replySources: { ai: 0, bot: 0, human: 0 } };
  const replySources = advancedStats.replySources || { ai: 0, bot: 0, human: 0 };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Link Tracking Stats
  const isPaid = linkData?.isPaid || false;
  const totalViews = linkData?.totalViews || 0;
  const totalClicks = linkData?.totalClicks || 0;
  const ctr = linkData?.ctr || '0.0';
  const customLinks = linkData?.links || [];
  const dailyClicks = linkData?.dailyClicks || [];
  const capturedLeadsCount = linkData?.capturedLeadsCount || 0;

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-200 space-y-10">
      
      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: SMART BIO LINK / LINKTREE HUB ANALYTICS
      ───────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Bio Link & Multi-Link Performance
              </h1>
              {isPaid ? (
                <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black rounded-full flex items-center gap-1 shadow-sm">
                  <Crown className="w-3.5 h-3.5" /> PRO TIER ACTIVE
                </span>
              ) : (
                <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 text-xs font-semibold rounded-full">
                  FREE PLAN (3 Links)
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">
              Live click counters, visitor impressions, and automatic CRM lead conversions from your universal link.
            </p>
          </div>

          <a
            href="/mobile"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-900/30 w-fit"
          >
            <Link2 className="w-4 h-4" /> Manage Links & Bio Hub
          </a>
        </div>

        {/* Bio Link KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-[#111] border border-gray-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
            <div className="bg-emerald-500/20 p-3.5 rounded-xl text-emerald-400"><Eye size={26} /></div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Hub Views</p>
              <h2 className="text-2xl font-bold text-white mt-0.5">{totalViews}</h2>
            </div>
          </div>

          <div className="bg-[#111] border border-gray-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
            <div className="bg-blue-500/20 p-3.5 rounded-xl text-blue-400"><MousePointerClick size={26} /></div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Link Clicks</p>
              <h2 className="text-2xl font-bold text-white mt-0.5">{totalClicks}</h2>
            </div>
          </div>

          <div className="bg-[#111] border border-gray-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
            <div className="bg-purple-500/20 p-3.5 rounded-xl text-purple-400"><TrendingUp size={26} /></div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Overall CTR</p>
              <h2 className="text-2xl font-bold text-white mt-0.5">{ctr}%</h2>
            </div>
          </div>

          <div className="bg-[#111] border border-gray-800 p-5 rounded-2xl shadow-lg flex items-center gap-4">
            <div className="bg-amber-500/20 p-3.5 rounded-xl text-amber-400"><Sparkles size={26} /></div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Auto-Captured Leads</p>
              <h2 className="text-2xl font-bold text-white mt-0.5">
                {isPaid ? capturedLeadsCount : 'Pro Feature'}
              </h2>
            </div>
          </div>
        </div>

        {/* Link-by-Link Breakdown & Daily Clicks Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-4">
          {/* Link Breakdown Table */}
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-purple-400" /> Link-by-Link Performance
                </h3>
                <span className="text-xs text-gray-400">
                  {customLinks.length} Links Active
                </span>
              </div>

              {customLinks.length === 0 ? (
                <div className="py-10 text-center text-gray-500 text-xs">
                  No custom links created yet. Add links from Mobile App or Digital Card settings.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {customLinks.map((link, idx) => {
                    const linkCtr = totalViews > 0 ? (((link.clicks || 0) / totalViews) * 100).toFixed(1) : '0.0';
                    return (
                      <div
                        key={link.id || idx}
                        className="p-3 bg-[#0a0a0d] border border-gray-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-white truncate flex items-center gap-1.5">
                            <span>{link.title}</span>
                            <a href={link.url} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-300">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <span className="text-[10px] text-gray-400 truncate block">{link.category || 'General'}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-emerald-400 text-sm">{link.clicks || 0} clicks</div>
                          <div className="text-[10px] text-gray-500">{linkCtr}% CTR</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!isPaid && (
              <div className="mt-4 p-3 bg-gradient-to-r from-amber-950/40 to-purple-950/40 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                <span className="text-amber-300 font-medium">⭐ Upgrade to Pro for Unlimited Links & Auto CRM Leads</span>
                <a href="/billing" className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg text-[11px]">Upgrade</a>
              </div>
            )}
          </div>

          {/* Daily Link Clicks Chart */}
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Daily Link Clicks (Last 7 Days)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyClicks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="date" stroke="#888" />
                  <YAxis stroke="#888" allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                  <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800/80 pt-8"></div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: CRM LEADS & AI CALL ANALYTICS (EXISTING)
      ───────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-500 mb-2">
          CRM Lead Pipeline & Calling Analytics
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Track your AI performance, messaging costs, and conversion metrics in real-time.
        </p>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg flex items-center gap-4">
            <div className="bg-blue-500/20 p-4 rounded-xl text-blue-500"><Users size={28} /></div>
            <div><p className="text-sm text-gray-400 font-medium">Total CRM Leads</p><h2 className="text-2xl font-bold text-white">{stats.totalLeads}</h2></div>
          </div>
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg flex items-center gap-4">
            <div className="bg-green-500/20 p-4 rounded-xl text-green-500"><TrendingUp size={28} /></div>
            <div><p className="text-sm text-gray-400 font-medium">Conversion Rate</p><h2 className="text-2xl font-bold text-white">{stats.conversionRate}%</h2></div>
          </div>
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg flex items-center gap-4">
            <div className="bg-purple-500/20 p-4 rounded-xl text-purple-500"><MessageSquare size={28} /></div>
            <div><p className="text-sm text-gray-400 font-medium">Messages Delivered</p><h2 className="text-2xl font-bold text-white">{messageStats.delivered}</h2></div>
          </div>
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg flex items-center gap-4">
            <div className="bg-orange-500/20 p-4 rounded-xl text-orange-500"><IndianRupee size={28} /></div>
            <div><p className="text-sm text-gray-400 font-medium">Est. Cost Per Lead</p><h2 className="text-2xl font-bold text-white">₹{stats.costPerLead}</h2></div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Lead Stages Pie Chart */}
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-lg font-bold text-white mb-6">Lead Pipeline Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={graphData} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                    {graphData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} itemStyle={{ color: '#fff' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Leads Line Chart */}
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg">
            <h3 className="text-lg font-bold text-white mb-6">New Leads Trend (Last 7 Days)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyLeads}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                  <Line type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Advanced AI Reply Stats */}
        <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">AI vs Human Workload</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-[#0a0a0a] rounded-xl border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Handled by AI</p><p className="text-2xl font-bold text-blue-400">{replySources.ai}</p>
            </div>
            <div className="p-4 bg-[#0a0a0a] rounded-xl border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Handled by Auto-Flow</p><p className="text-2xl font-bold text-green-400">{replySources.bot}</p>
            </div>
            <div className="p-4 bg-[#0a0a0a] rounded-xl border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Handled by Human (You)</p><p className="text-2xl font-bold text-pink-400">{replySources.human}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}