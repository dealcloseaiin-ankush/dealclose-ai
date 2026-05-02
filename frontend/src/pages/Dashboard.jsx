import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../hooks/useAuth';

function StatCard({ title, value, trend, trendUp, icon, color }) {
  return (
    <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-gray-700 transition-all duration-300">
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
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const COLORS = ['#10B981', '#3B82F6', '#EF4444']; // Green, Blue, Red
  const { user } = useAuth() || {};
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'owner';

  // Mock Admin Data
  const [clients] = useState([
    { id: 1, name: 'ElectroShop', platformId: 'WA_10023', platforms: 'WhatsApp', aiLeft: 15, aiCost: '₹1.70', plan: '30-Day Free Trial', mrr: '₹0', status: 'Active' },
    { id: 2, name: 'SneakerStore', platformId: 'IG_50089', platforms: 'Instagram', aiLeft: 1850, aiCost: '₹3.00', plan: 'AI Promo (₹299)', mrr: '₹299', status: 'Active' },
    { id: 3, name: 'Tech Gadgets', platformId: 'WA_105+IG_203', platforms: 'WA + IG', aiLeft: 4200, aiCost: '₹16.40', plan: 'Omni Pro (₹498)', mrr: '₹498', status: 'Active' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/leads/analytics');
        setData(response.data);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) return <div className="p-10 text-white flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#050505] text-gray-100 font-sans">
      
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
              Overview Dashboard
            </span>
          </h1>
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
        />
        <StatCard 
          title="Conversion Rate" 
          value={`${data.stats.conversionRate}%`} 
          trend="+22.4%" trendUp={true} icon="📞" color="from-green-500/20 to-green-500/5" 
        />
        <StatCard 
          title="Cost Per Lead" 
          value={`₹${data.stats.costPerLead}`} 
          trend="+8.2%" trendUp={true} icon="🔥" color="from-purple-500/20 to-purple-500/5" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lead Categorization Chart */}
        <div className="lg:col-span-2 bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl"></div>
          <h3 className="text-lg font-bold text-white mb-6">AI Lead Categorization</h3>
          
          <div className="h-64 w-full pt-4 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.graphData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {data.graphData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '10px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-6">Live AI Activity</h3>
          <div className="space-y-5">
            {[
              { action: `${data.stats.converted} leads successfully converted so far!`, time: "System Status", status: "text-green-400" },
              { action: `AI categorized ${data.stats.interested} leads as highly interested.`, time: "System Status", status: "text-purple-400" },
              { action: `Total Platform investment running at ₹${data.stats.totalInvestment}`, time: "Billing", status: "text-blue-400" },
            ].map((log, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className={`mt-1.5 w-2 h-2 rounded-full ${log.status} shadow-[0_0_8px_currentColor]`}></div>
                <div>
                  <p className="text-sm text-gray-300 font-medium">{log.action}</p>
                  <p className="text-xs text-gray-600 mt-1">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SUPER ADMIN SECTION (Only visible to owners) */}
      {isSuperAdmin && (
        <div className="mt-12 bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-800 bg-[#1a1a1a] flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="text-purple-500">👑</span> Super Admin / SaaS Clients</h2>
              <p className="text-sm text-gray-500">Manage active agencies and track AI usage costs.</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total MRR</p>
              <p className="text-2xl font-bold text-green-400">₹797</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-[#0a0a0a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
                  <th className="p-5 font-semibold">Client Name</th>
                  <th className="p-5 font-semibold">Plan & MRR</th>
                  <th className="p-5 font-semibold">AI Usage Left</th>
                  <th className="p-5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {clients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="p-5 font-bold text-gray-200">{client.name} <br/><span className="text-xs text-gray-500 font-normal">{client.platforms}</span></td>
                    <td className="p-5 text-blue-400 font-semibold">{client.plan} <br/><span className="text-xs text-gray-500">{client.mrr}/mo</span></td>
                    <td className="p-5"><span className="text-purple-400 font-bold">{client.aiLeft}</span> <br/><span className="text-xs text-rose-400">Cost: {client.aiCost}</span></td>
                    <td className="p-5"><span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-md text-xs font-bold">{client.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}