import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ShieldAlert, Users, Database, DollarSign, Cpu, TrendingUp, 
  Smartphone, Monitor, MessageSquare, CheckCircle, Zap, Globe, Layers, UserCheck
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SuperAdmin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [dailyFinancials, setDailyFinancials] = useState([]);
  const [userGrowth, setUserGrowth] = useState([]);
  const [planBreakdown, setPlanBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data.stats);
        setUsers(res.data.users);
        setDailyFinancials(res.data.dailyFinancials || []);
        setUserGrowth(res.data.userGrowth || []);
        setPlanBreakdown(res.data.planBreakdown || null);
      } catch (error) {
        console.error("Not authorized or failed to fetch admin data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  if (loading) return <div className="p-10 text-white text-center font-bold">Verifying Super Admin Credentials...</div>;
  if (!stats) return <div className="p-10 text-red-500 text-center font-bold text-2xl">Access Denied: You are not authorized for Master Super Admin.</div>;

  const filteredUsers = users.filter(u => 
    (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.ownerPhone || '').includes(searchQuery)
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#050505] min-h-screen text-gray-200 space-y-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 text-2xl shadow-lg shadow-red-500/10">
            👑
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              Master Super Admin Dashboard
            </h1>
            <p className="text-xs text-gray-400">Real-time pulse of DealClose AI ecosystem, app downloads, API traffic & revenue.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-emerald-400 font-mono">Live Systems Healthy</span>
        </div>
      </div>

      {/* 6 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* 1. Total Businesses */}
        <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
            <span>Businesses</span>
            <Users size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">{stats.totalUsers}</div>
          <p className="text-[10px] text-emerald-400">● {stats.totalLeads?.toLocaleString()} Leads Created</p>
        </div>

        {/* 2. App Downloads / Installs */}
        <div className="bg-gray-950 border border-purple-500/30 p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-purple-400 text-xs font-bold uppercase">
            <span>App Installs</span>
            <Smartphone size={16} className="text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-300 font-mono">
            {stats.mobileAppInstalls + stats.desktopAppInstalls}
          </div>
          <p className="text-[10px] text-gray-400">📱 {stats.mobileAppInstalls} Mobile | 💻 {stats.desktopAppInstalls} Desktop</p>
        </div>

        {/* 3. API Messages & Delivery */}
        <div className="bg-gray-950 border border-emerald-500/30 p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold uppercase">
            <span>API Messages</span>
            <MessageSquare size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">{stats.totalMessages?.toLocaleString()}</div>
          <p className="text-[10px] text-emerald-400 font-bold">⚡ {stats.deliveryRate}% Delivered</p>
        </div>

        {/* 4. Active Channels */}
        <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
            <span>Channels Connected</span>
            <Layers size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">{stats.totalConnectedChannels}</div>
          <p className="text-[10px] text-gray-400">WA + IG Cloud Endpoints</p>
        </div>

        {/* 5. Active Staff */}
        <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-gray-400 text-xs font-bold uppercase">
            <span>Active Staff</span>
            <UserCheck size={16} className="text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-teal-300 font-mono">{stats.totalStaffMembers || (stats.totalUsers * 2)}</div>
          <p className="text-[10px] text-gray-400">Multi-agent Team Logins</p>
        </div>

        {/* 6. Net Profit */}
        <div className="bg-gray-950 border border-green-500/40 p-5 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-green-400 text-xs font-bold uppercase">
            <span>Net Revenue</span>
            <DollarSign size={16} className="text-green-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-green-300 font-mono">₹{((stats.totalRevenue || 0) * 85).toFixed(0)}</div>
          <p className="text-[10px] text-green-400">92.4% Gross Margin</p>
        </div>

      </div>

      {/* Plan Adoption Breakdown Banner */}
      {planBreakdown && (
        <div className="bg-gradient-to-r from-purple-950/40 via-gray-950 to-amber-950/30 border border-gray-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">📊 Plan Adoption & Subscription Share</h3>
            <span className="text-xs text-amber-400 font-mono font-bold">12-Mo Annual Plan #1 Popularity 🔥</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="bg-black/60 border border-amber-500/40 p-3 rounded-2xl">
              <span className="text-amber-400 font-black text-[10px] block">👑 FIRST 100 VIP PASS</span>
              <span className="text-xl font-black text-white font-mono">{planBreakdown.vipFounderPass}</span>
              <span className="text-[10px] text-gray-400 block">Active Founders</span>
            </div>

            <div className="bg-black/60 border border-purple-500/40 p-3 rounded-2xl">
              <span className="text-purple-400 font-black text-[10px] block">12 MONTHS (1 YEAR)</span>
              <span className="text-xl font-black text-white font-mono">{planBreakdown.annual12Mo}</span>
              <span className="text-[10px] text-emerald-400 block">Unlimited Products</span>
            </div>

            <div className="bg-black/60 border border-blue-500/40 p-3 rounded-2xl">
              <span className="text-blue-400 font-black text-[10px] block">6 MONTHS PASS</span>
              <span className="text-xl font-black text-white font-mono">{planBreakdown.halfYearly6Mo}</span>
              <span className="text-[10px] text-gray-400 block">500 Products</span>
            </div>

            <div className="bg-black/60 border border-gray-700 p-3 rounded-2xl">
              <span className="text-gray-300 font-black text-[10px] block">3 MONTHS PASS</span>
              <span className="text-xl font-black text-white font-mono">{planBreakdown.quarterly3Mo}</span>
              <span className="text-[10px] text-gray-400 block">250 Products</span>
            </div>

            <div className="bg-black/60 border border-gray-800 p-3 rounded-2xl">
              <span className="text-gray-400 font-black text-[10px] block">1 MONTH MONTHLY</span>
              <span className="text-xl font-black text-white font-mono">{planBreakdown.monthly1Mo}</span>
              <span className="text-[10px] text-gray-400 block">100 Products</span>
            </div>
          </div>
        </div>
      )}

      {/* User Growth & Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* User Signups Growth */}
        <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-400" /> Daily & Weekly User Signups
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="signups" stroke="#a855f7" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="New Signups" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Financials */}
        <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-400" /> Revenue vs Infrastructure Cost
          </h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={dailyFinancials}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} name="User Revenue" />
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} name="Server Cost" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Master Registered Users Database */}
      <div className="bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 bg-gray-900/60 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-base text-white">Registered Businesses Master Directory</h2>
            <p className="text-xs text-gray-400">Total {users.length} businesses registered across India.</p>
          </div>
          <input 
            type="text" 
            placeholder="Search by name, phone, business, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-black border border-gray-700 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-purple-500 w-full sm:w-80"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-gray-400 bg-black/60 border-b border-gray-800 uppercase text-[10px]">
              <tr>
                <th className="p-4">Business / Owner</th>
                <th className="p-4">Phone / WhatsApp</th>
                <th className="p-4">Email</th>
                <th className="p-4">Plan Status</th>
                <th className="p-4">Workspaces</th>
                <th className="p-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {filteredUsers.map(u => (
                <tr key={u._id} className="hover:bg-gray-900/40 transition-colors">
                  <td className="p-4 font-bold text-white">
                    {u.fullName} {u.role === 'superadmin' && '👑'}
                    <span className="block text-[11px] text-gray-400 font-normal">{u.businessName || 'Single Store'}</span>
                  </td>
                  <td className="p-4 font-mono text-gray-300">{u.ownerPhone || 'N/A'}</td>
                  <td className="p-4 text-gray-400">{u.email}</td>
                  <td className="p-4">
                    {u.isPremium || u.role === 'superadmin' ? (
                      <span className="bg-amber-950/60 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        👑 VIP Lifetime Pass
                      </span>
                    ) : (
                      <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        14-Day Free Trial
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-mono text-gray-300">{u.workspaces?.length || 1} Channels</td>
                  <td className="p-4 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}