import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Phone, MessageSquare, IndianRupee, TrendingUp, Users } from 'lucide-react';

export default function TrackingAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/leads/analytics');
        setData(res.data);
      } catch (error) {
        console.error("Error fetching analytics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-center text-white">Loading Analytics...</div>;
  if (!data) return <div className="p-10 text-center text-white">No data available.</div>;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-200">
      <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-500 mb-2">Lead & Call Analytics</h1>
      <p className="text-gray-400 mb-8">Track your AI performance, messaging costs, and conversion metrics in real-time.</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="bg-blue-500/20 p-4 rounded-xl text-blue-500"><Users size={28} /></div>
          <div><p className="text-sm text-gray-400 font-medium">Total CRM Leads</p><h2 className="text-2xl font-bold text-white">{data.stats.totalLeads}</h2></div>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="bg-green-500/20 p-4 rounded-xl text-green-500"><TrendingUp size={28} /></div>
          <div><p className="text-sm text-gray-400 font-medium">Conversion Rate</p><h2 className="text-2xl font-bold text-white">{data.stats.conversionRate}%</h2></div>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="bg-purple-500/20 p-4 rounded-xl text-purple-500"><MessageSquare size={28} /></div>
          <div><p className="text-sm text-gray-400 font-medium">Messages Delivered</p><h2 className="text-2xl font-bold text-white">{data.messageStats.delivered}</h2></div>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="bg-orange-500/20 p-4 rounded-xl text-orange-500"><IndianRupee size={28} /></div>
          <div><p className="text-sm text-gray-400 font-medium">Est. Cost Per Lead</p><h2 className="text-2xl font-bold text-white">₹{data.stats.costPerLead}</h2></div>
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
                <Pie data={data.graphData} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                  {data.graphData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
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
              <LineChart data={data.dailyLeads}>
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
            <p className="text-gray-400 text-sm mb-1">Handled by AI</p><p className="text-2xl font-bold text-blue-400">{data.advancedStats.replySources.ai}</p>
          </div>
          <div className="p-4 bg-[#0a0a0a] rounded-xl border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Handled by Auto-Flow</p><p className="text-2xl font-bold text-green-400">{data.advancedStats.replySources.bot}</p>
          </div>
          <div className="p-4 bg-[#0a0a0a] rounded-xl border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Handled by Human (You)</p><p className="text-2xl font-bold text-pink-400">{data.advancedStats.replySources.human}</p>
          </div>
        </div>
      </div>
    </div>
  );
}