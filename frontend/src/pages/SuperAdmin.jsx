import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ShieldAlert, Users, Database } from 'lucide-react';

export default function SuperAdmin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data.stats);
        setUsers(res.data.users);
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
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-200">
      <h1 className="text-3xl font-extrabold flex items-center gap-3 text-red-500 mb-8">
        <ShieldAlert size={32} /> Master Super Admin
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 text-center">
          <p className="text-gray-400 mb-2">Total SaaS Users</p><p className="text-4xl font-bold text-white">{stats.totalUsers}</p>
        </div>
        <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 text-center">
          <p className="text-gray-400 mb-2">Total Leads Generated</p><p className="text-4xl font-bold text-blue-400">{stats.totalLeads}</p>
        </div>
        <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 text-center">
          <p className="text-gray-400 mb-2">Total API Messages</p><p className="text-4xl font-bold text-green-400">{stats.totalMessages}</p>
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