import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import DashboardAIAssistant from '../components/DashboardAIAssistant'; // Import the AI Chat Assistant

function StatCard({ title, value, trend, trendUp, icon, color, linkTo, subtitle }) {
  const cardContent = (
    <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-gray-700 transition-all duration-300 h-full">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
          <h4 className="text-3xl font-extrabold text-white mb-2">{value}</h4>
          {trend && (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${trendUp ? 'bg-green-500/10 text-green-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {trend}
              </span>
              <span className="text-xs text-gray-500">vs last week</span>
            </div>
          )}
          {subtitle && <p className="text-[10px] text-gray-500 mt-3 font-semibold">{subtitle}</p>}
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
    </div>
  );
  return linkTo ? <Link to={linkTo} className="block h-full">{cardContent}</Link> : cardContent;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']; // Blue, Green, Amber, Red
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [clients, setClients] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [messageStats, setMessageStats] = useState({ sent: 0, delivered: 0, read: 0 });
  const [workspaces, setWorkspaces] = useState([]);
  const [activeBusinessId, setActiveBusinessId] = useState('main');
  const [platformFilter, setPlatformFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get('/leads/analytics', { params: { workspaceId: activeBusinessId, platform: platformFilter } });
        setData(response.data);
        if (response.data.messageStats) {
          setMessageStats(response.data.messageStats);
        }
        
        // Fetch Real WhatsApp Message Stats from User Profile
        const userRes = await api.get('/users/profile').catch(() => null);
        const userData = userRes?.data?.user || userRes?.data;
        
        let adminCheck = false; // Define local variable to avoid useEffect dependency warnings
        if (userData) {
          // 🚀 REAL-TIME ADMIN CHECK: Check from the actual Database object instead of local cache
          adminCheck = userData.role === 'superadmin' || userData.email === 'ankush.bani@gmail.com';
          setIsSuperAdmin(adminCheck);

          if (adminCheck) {
             const adminRes = await api.get('/admin/stats').catch(() => ({ data: { stats: {}, users: [] } }));
             setAdminStats(adminRes.data?.stats);
             setClients(adminRes.data?.users || []);
          }

          // Set the dropdown options
        const mainBusiness = { _id: 'main', name: userData.businessName || 'Main Business' };
          const otherWorkspaces = userData.workspaces || [];
          setWorkspaces([mainBusiness, ...otherWorkspaces]);
        }
        
        // Check if AI is active but missing training data
        const hasCredits = userData?.aiCredits > 0 || adminCheck;
        const hasNoTraining = !userData?.businessDescription || userData.businessDescription.trim().length < 10;
        console.log(`🔍 [Dashboard Popup Logic] hasCredits: ${hasCredits}, hasNoTraining: ${hasNoTraining}, AI_Prompt_Length: ${userData?.businessDescription?.length || 0}`);
        console.log(`📊 [Dashboard Graph Data from API] => `, response.data.graphData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeBusinessId, platformFilter]);

  if (loading || !data) return <div className="p-10 text-white flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#050505] text-gray-100 font-sans relative">
      
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Overview Dashboard
            </span>
            </h1>
            <select value={activeBusinessId} onChange={(e) => setActiveBusinessId(e.target.value)} className="bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-purple-500 cursor-pointer">
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
            <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-purple-500 cursor-pointer">
              <option value="all">🌍 All Platforms</option>
              <option value="whatsapp">🟩 WhatsApp</option>
              <option value="instagram">🟪 Instagram</option>
            </select>
          </div>
          <p className="text-gray-400 text-lg">Welcome back. Here is how your AI Agent is performing today.</p>
        </div>
        <Link to="/automations" className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/30 transition-all text-center">
          View Automations
        </Link>
      </div>
      
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <StatCard 
          title="Total Leads CRM" 
          value={data.stats.totalLeads} 
          trend="+14.5%" trendUp={true} icon="👥" color="from-blue-500/20 to-blue-500/5" 
          linkTo="/crm"
          subtitle="Click to view all leads in CRM"
        />
        <StatCard 
          title="Conversion Rate" 
          value={`${data.stats.conversionRate}%`} 
          trend="+22.4%" trendUp={true} icon="📞" color="from-green-500/20 to-green-500/5" 
          linkTo="/crm"
          subtitle="Linked to Kanban 'Converted' stage"
        />
        <StatCard 
          title="Cost Per Lead" 
          value={`₹${data.stats.costPerLead}`} 
          trend="+8.2%" trendUp={true} icon="🔥" color="from-purple-500/20 to-purple-500/5" 
          linkTo="/analytics"
          subtitle="Calculated: ₹0.80 per WA message sent"
        />
      </div>

      {/* Smart CRM Classification Panel */}
      <div className="mb-10 bg-gradient-to-r from-[#111111] to-[#1a1a1a] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-yellow-500">🧠</span> Smart AI Lead Classification
          </h3>
          <Link to="/crm" className="text-sm text-blue-400 hover:text-blue-300 font-semibold">View CRM Board →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
          <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-700/40 transition">
            <p className="text-2xl font-black text-blue-400">{data.smartCrmData?.new || 0}</p><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1">New Leads</p>
          </div>
          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <p className="text-2xl font-black text-red-500">{data.smartCrmData?.hot || 0}</p><p className="text-[10px] text-red-400 font-bold uppercase tracking-wide mt-1">Hot 🔥</p>
          </div>
          <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/20 hover:bg-orange-500/20 transition">
            <p className="text-2xl font-black text-orange-400">{data.smartCrmData?.warm || 0}</p><p className="text-[10px] text-orange-400 font-bold uppercase tracking-wide mt-1">Warm 🌟</p>
          </div>
          <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition">
            <p className="text-2xl font-black text-blue-300">{data.smartCrmData?.cold || 0}</p><p className="text-[10px] text-blue-300 font-bold uppercase tracking-wide mt-1">Cold ❄️</p>
          </div>
          <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 hover:bg-green-500/20 transition">
            <p className="text-2xl font-black text-green-400">{data.smartCrmData?.existing || 0}</p><p className="text-[10px] text-green-400 font-bold uppercase tracking-wide mt-1">Existing 💼</p>
          </div>
          <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 hover:bg-purple-500/20 transition">
            <p className="text-2xl font-black text-purple-400">{data.smartCrmData?.vip || 0}</p><p className="text-[10px] text-purple-400 font-bold uppercase tracking-wide mt-1">VIP 👑</p>
          </div>
          <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-700/40 transition">
            <p className="text-2xl font-black text-gray-400">{data.smartCrmData?.lost || 0}</p><p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mt-1">Lost 💔</p>
          </div>
          <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 hover:bg-yellow-500/20 transition relative">
            {data.smartCrmData?.followUpsToday > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{data.smartCrmData.followUpsToday} Due</span>}
            <p className="text-2xl font-black text-yellow-400">{data.smartCrmData?.followUpsToday || 0}</p><p className="text-[10px] text-yellow-400 font-bold uppercase tracking-wide mt-1">Follow-ups</p>
          </div>
        </div>
      </div>

      {/* Real-time WhatsApp Delivery Stats */}
      {platformFilter !== 'instagram' && (
      <Link to="/chats" className="block mb-10 bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-xl hover:border-gray-700 transition-all duration-300 group cursor-pointer relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <h3 className="text-lg font-bold text-white mb-6 flex items-center justify-between relative z-10">
          <span className="flex items-center gap-2"><span className="text-green-500">📱</span> WhatsApp API Delivery Report</span>
          <span className="text-sm text-blue-400 group-hover:text-blue-300 font-semibold transition-colors">View Chat Logs →</span>
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center divide-x divide-gray-800 relative z-10">
          <div>
            <p className="text-3xl font-bold text-blue-400">{messageStats.sent}</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1 font-bold">Total Sent</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-purple-400">{messageStats.delivered}</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1 font-bold">Delivered (Double Tick)</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-400">{messageStats.read}</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest mt-1 font-bold">Read (Blue Tick)</p>
          </div>
        </div>
      </Link>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* Lead Categorization Chart */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>
          <h3 className="text-lg font-bold text-white mb-6">AI Lead Categorization</h3>
          
          <div className="w-full pt-4 relative z-10">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.graphData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" labelLine={false}>
                  {data.graphData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', color: '#fff' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Lead Trend Chart */}
        <div className="lg:col-span-2 bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
          <h3 className="text-lg font-bold text-white mb-6">New Leads (Last 7 Days)</h3>
          <div className="w-full pt-4 relative z-10">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.dailyLeads} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#888" fontSize={12} tickFormatter={(str) => str.substring(5)} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '10px' }} />
                <Area type="monotone" dataKey="leads" name="New Leads" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Source Breakdown */}
        <div className="lg:col-span-2 bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl"></div>
          <h3 className="text-lg font-bold text-white mb-6">Lead Sources Breakdown</h3>
          <div className="w-full pt-4 relative z-10">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.leadsBySource} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '10px' }} cursor={{fill: '#1a1a1a'}} />
                <Bar dataKey="leads" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">AI Learnings & Feedback</h3>
            <span className="text-xs bg-green-500/10 text-green-400 font-bold px-2 py-1 rounded border border-green-500/20">Live</span>
          </div>
          
          <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
            {data.recentActivity && data.recentActivity.length > 0 ? (
              data.recentActivity.map((log, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                  <div className="text-2xl mt-1 opacity-90">{log.status === 'converted' ? '🏆' : log.status === 'interested' ? '🔥' : log.status === 'lost' ? '💔' : '👤'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                       <p className="text-sm font-bold text-white truncate">{log.name}</p>
                       {log.aiFeedbackScore && <span className="text-[10px] whitespace-nowrap bg-yellow-500/10 text-yellow-400 font-black px-2 py-0.5 rounded-full border border-yellow-500/20 shadow-sm">{log.aiFeedbackScore} ⭐</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">{log.status} • {log.source}</p>
                    {/* AI Learning Notes (Shows the last captured requirement or action) */}
                    {log.notes && log.notes.length > 0 && (
                       <div className="text-xs text-blue-300 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 leading-snug">
                          <span className="font-bold mr-1">🤖 AI Log:</span>
                          {Array.isArray(log.notes) ? log.notes[log.notes.length - 1] : log.notes}
                       </div>
                    )}
                  </div>
                </div>
              ))
            ) : (<p className="text-sm text-gray-500 text-center py-6">Waiting for AI to interact with customers...</p>)}
          </div>
        </div>

      </div>

      {/* SUPER ADMIN SECTION (Only visible to owners) */}
      {isSuperAdmin && (
        <div className="mt-12 space-y-8">
          <div className="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-purple-500/30 rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><span className="text-purple-500">👑</span> Super Admin Overview</h2>
                <p className="text-sm text-gray-500">Track user onboarding, revenue, and real AI costs across the platform.</p>
              </div>
            </div>

            {/* Super Admin Top Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Total Users Onboarded</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-black text-white">{adminStats?.totalUsers || 0}</p>
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded font-bold">Real-time</span>
                </div>
              </div>
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Total Leads Processed</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-black text-blue-400">{adminStats?.totalLeads || 0}</p>
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded font-bold">Across all accounts</span>
                </div>
              </div>
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Total API Messages</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-black text-rose-400">{adminStats?.totalMessages || 0}</p>
                  <span className="text-xs text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded font-bold">In & Out</span>
                </div>
              </div>
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Avg Messages / User</p>
                <p className="text-2xl font-black text-purple-400">{adminStats?.totalUsers ? Math.round(adminStats.totalMessages / adminStats.totalUsers) : 0}</p>
                <p className="text-[10px] text-gray-500 mt-1">Calculated Average</p>
              </div>
            </div>

            {/* Super Admin Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 relative">
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl backdrop-blur-[1px] pointer-events-none">
                   <span className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded font-bold uppercase tracking-widest border border-gray-600 shadow-xl">Awaiting Live Data</span>
                </div>
                <h3 className="text-sm font-bold text-gray-400 mb-4 opacity-50">Revenue & User Growth (Sample)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={[
                    { name: 'W1', revenue: 25000, users: 95 },
                    { name: 'W2', revenue: 32000, users: 105 },
                    { name: 'W3', revenue: 38500, users: 116 },
                    { name: 'W4', revenue: 45290, users: 128 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#888" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#10b981" strokeWidth={3} />
                    <Line yAxisId="right" type="monotone" dataKey="users" name="Total Users" stroke="#8b5cf6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 relative">
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl backdrop-blur-[1px] pointer-events-none">
                   <span className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded font-bold uppercase tracking-widest border border-gray-600 shadow-xl">Awaiting Live Data</span>
                </div>
                <h3 className="text-sm font-bold text-gray-400 mb-4 opacity-50">Feature Adoption (Sample)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { name: 'WA Pro', count: 85 },
                    { name: 'IG Auto', count: 62 },
                    { name: 'Lead Ext.', count: 40 },
                    { name: 'AI Calls', count: 18 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} cursor={{fill: '#222'}} />
                    <Bar dataKey="count" name="Subscribed Users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Clients Table */}
            <h3 className="text-lg font-bold text-white mb-4">Detailed Client Usage</h3>
            <div className="overflow-x-auto bg-[#1a1a1a] rounded-xl border border-gray-800">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0a0a0a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
                    <th className="p-4 font-semibold">Client Name</th>
                    <th className="p-4 font-semibold">Plan & MRR</th>
                    <th className="p-4 font-semibold">Active Features</th>
                    <th className="p-4 font-semibold">AI Usage (Tokens/Cost)</th>
                    <th className="p-4 font-semibold">Status / Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-sm">
                  {clients.map(client => (
                    <tr key={client._id} className="hover:bg-gray-900/50 transition-colors">
                      <td className="p-4 font-bold text-gray-200">{client.businessName || client.fullName || 'No Name'} <br/><span className="text-xs text-gray-500 font-normal">{client.email}</span></td>
                      <td className="p-4 text-blue-400 font-semibold">{client.isPremium ? 'Premium' : 'Free Trial'} <br/><span className="text-xs text-gray-500 uppercase">{client.role}</span></td>
                      <td className="p-4 text-gray-300 text-xs">
                        <div className="flex gap-1 flex-wrap w-32">
                          <span className="bg-gray-800 px-2 py-0.5 rounded border border-gray-700">Account Active</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-purple-400 font-bold">{client.aiCredits || 0} credits left</span> <br/>
                        <span className="text-xs text-gray-500">AI Tokens</span>
                      </td>
                      <td className="p-4">
                        {client.aiCredits > 0 ? (
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-md text-xs font-bold">Healthy ✅</span>
                        ) : (
                          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-md text-xs font-bold">Limit Reached ⚠️</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr className="opacity-40 grayscale pointer-events-none">
                      <td className="p-4 text-gray-200">
                        Demo User Store <span className="ml-2 bg-gray-800 text-[10px] px-2 py-0.5 rounded text-gray-400">Sample Data</span>
                      </td>
                      <td className="p-4 text-blue-400 font-semibold">Pro AI <br/><span className="text-xs text-gray-500">₹499/mo (Demo)</span></td>
                      <td className="p-4 text-gray-300 text-xs"><span className="bg-gray-800 px-2 py-0.5 rounded">WA</span></td>
                      <td className="p-4"><span className="text-purple-400 font-bold">950 credits left</span> <br/><span className="text-xs text-rose-400">Real Cost: ₹1.25</span></td>
                      <td className="p-4"><span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 px-3 py-1 rounded-md text-xs font-bold">Demo Mode</span></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Assistant - Replaces the old popup */}
      <DashboardAIAssistant />

    </div>
  );
}