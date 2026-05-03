import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function CrmAnalytics({ contacts = [] }) {
  // Calculate real data from contacts prop
  const stageCounts = { new: 0, contacted: 0, interested: 0, negotiating: 0, converted: 0 };
  let totalValue = 0;

  contacts.forEach(contact => {
    const stage = contact.crmStage || 'new';
    if (stageCounts[stage] !== undefined) stageCounts[stage]++;
    totalValue += (contact.dealValue || 0);
  });

  const funnelData = [
    { name: 'New', value: stageCounts.new },
    { name: 'Contacted', value: stageCounts.contacted },
    { name: 'Interested', value: stageCounts.interested },
    { name: 'Negotiating', value: stageCounts.negotiating },
    { name: 'Converted', value: stageCounts.converted }
  ].filter(data => data.value > 0); // Hide empty stages in chart

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
          <p className="text-4xl font-extrabold text-sky-400">₹{totalValue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-center">
          <p className="text-gray-400 font-bold mb-2 uppercase text-sm tracking-wide">Avg Time to Close</p>
          <p className="text-4xl font-extrabold text-green-400">-- Days</p>
        </div>
      </div>
    </div>
  );
}