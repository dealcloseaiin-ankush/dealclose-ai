import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function CrmAnalytics() {
  // Mock data for Funnel Chart
  const funnelData = [
    { name: 'New', value: 45 },
    { name: 'Contacted', value: 30 },
    { name: 'Interested', value: 15 },
    { name: 'Negotiating', value: 8 },
    { name: 'Converted', value: 5 }
  ];
  const COLORS = ['#3b82f6', '#eab308', '#a855f7', '#f97316', '#22c55e'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
      {/* Funnel Chart */}
      <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-xl h-96">
        <h3 className="text-lg font-bold text-white mb-4">Pipeline Funnel</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={funnelData} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
              {funnelData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px', color: '#fff' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
          <p className="text-gray-400 font-bold mb-2 uppercase text-sm tracking-wide">Total Value in Pipeline</p>
          <p className="text-4xl font-extrabold text-sky-400">₹8,45,000</p>
        </div>
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
          <p className="text-gray-400 font-bold mb-2 uppercase text-sm tracking-wide">Avg Time to Close</p>
          <p className="text-4xl font-extrabold text-green-400">4.2 Days</p>
        </div>
      </div>
    </div>
  );
}