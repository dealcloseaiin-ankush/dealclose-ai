import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldAlert, Users, Database, DollarSign, Cpu, TrendingUp, LineChart as LineChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SuperAdmin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [dailyFinancials, setDailyFinancials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data.stats);
        setUsers(res.data.users);
        setDailyFinancials(res.data.dailyFinancials);
      } catch (error) {
        console.error("Not authorized or failed to fetch admin data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  if (loading) return <div className="p-10 text-white text-center">Verifying Admin Access...</div>;
  if (!stats) return <div className="p-10 text-red-500 text-center font-bold text-2xl">Access Denied: You are not a Super Admin.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#050505] min-h-screen text-gray-200">
      <h1 className="text-3xl font-extrabold flex items-center gap-3 text-red-500 mb-8">
        <ShieldAlert size={32} /> Master Super Admin
      </h1>

      {/* Financial & Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
          <div className="flex items-center"><Users className="text-blue-400 mr-3" size={24} /><h3 className="font-bold text-lg">User & Platform Stats</h3></div>
          <p className="text-3xl font-bold text-white mt-2">{stats.totalUsers} <span className="text-base font-normal text-gray-400">Total Users</span></p>
          <p className="text-lg font-semibold text-gray-300 mt-1">{stats.totalLeads?.toLocaleString()} <span className="text-sm font-normal text-gray-500">Leads Generated</span></p>
          <p className="text-lg font-semibold text-gray-300">{stats.totalMessages?.toLocaleString()} <span className="text-sm font-normal text-gray-500">API Messages</span></p>
        </div>
        <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
          <div className="flex items-center"><Cpu className="text-purple-400 mr-3" size={24} /><h3 className="font-bold text-lg">AI Usage & Costs</h3></div>
          <p className="text-3xl font-bold text-white mt-2">{stats.totalTokens?.toLocaleString() || 0} <span className="text-base font-normal text-gray-400">Tokens Used</span></p>
          <p className="text-lg font-semibold text-red-400 mt-1">${(stats.totalPlatformCost || 0).toFixed(4)} <span className="text-sm font-normal text-gray-500">Total Platform Cost</span></p>
          <p className="text-lg font-semibold text-green-400">${(stats.totalRevenue || 0).toFixed(4)} <span className="text-sm font-normal text-gray-500">Total Revenue</span></p>
        </div>
        <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
          <div className="flex items-center"><TrendingUp className="text-green-400 mr-3" size={24} /><h3 className="font-bold text-lg">Business Health</h3></div>
          <p className="text-3xl font-bold text-green-400 mt-2">${(stats.totalProfit || 0).toFixed(4)} <span className="text-base font-normal text-gray-400">Total Profit</span></p>
          <p className="text-lg font-semibold text-gray-300 mt-1">
            {stats.totalPlatformCost > 0 ? ((stats.totalProfit / stats.totalPlatformCost) * 100).toFixed(2) : '0.00'}% 
            <span className="text-sm font-normal text-gray-500"> Profit Margin</span>
          </p>
        </div>
      </div>

      {/* Daily Revenue & Cost Chart */}
      <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 mb-10">
        <h2 className="font-bold text-lg mb-4 flex items-center"><LineChartIcon className="text-cyan-400 mr-3" size={24} />Daily Revenue vs Cost</h2>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={dailyFinancials} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `$${value.toFixed(4)}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#e5e7eb' }}
                labelStyle={{ color: '#f9fafb' }}
                formatter={(value) => `$${value.toFixed(6)}`}
              />
              <Legend wrapperStyle={{ color: '#d1d5db' }} />
              <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} name="Total Revenue (User Cost)" dot={{ r: 4 }} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} name="Platform Cost (Internal)" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-5 bg-gray-900 border-b border-gray-800"><h2 className="font-bold text-lg">Registered Users Database</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-gray-400 text-sm bg-[#0a0a0a]">
              <tr><th className="p-4">Name</th><th className="p-4">Business</th><th className="p-4">Email</th><th className="p-4">AI Credits Left</th><th className="p-4">Joined Date</th></tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-800">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="p-4 font-bold text-white">{u.fullName} {u.role==='superadmin' && '👑'}</td><td className="p-4">{u.businessName || 'N/A'}</td><td className="p-4 text-gray-400">{u.email}</td><td className="p-4 text-purple-400 font-bold">{u.aiCredits}</td><td className="p-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}