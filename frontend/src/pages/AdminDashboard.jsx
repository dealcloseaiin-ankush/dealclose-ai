import React, { useState } from 'react';

export default function AdminDashboard() {
  // Mock Clients Data
  const [clients] = useState([
    { id: 1, name: 'ElectroShop', platformId: 'WA_10023', platforms: 'WhatsApp', aiLeft: 15, aiCost: '₹1.70', plan: '30-Day Free Trial', mrr: '₹0', status: 'Active' },
    { id: 2, name: 'SneakerStore', platformId: 'IG_50089', platforms: 'Instagram', aiLeft: 1850, aiCost: '₹3.00', plan: 'AI Promo (₹299)', mrr: '₹299', status: 'Active' },
    { id: 3, name: 'Tech Gadgets', platformId: 'WA_105+IG_203', platforms: 'WA + IG', aiLeft: 4200, aiCost: '₹16.40', plan: 'Omni Pro (₹498)', mrr: '₹498', status: 'Active' },
  ]);

  // Mock Marketplace Demands (Silently collected from failed deals across all SaaS users)
  const [marketDemands] = useState([
    { id: 1, pincode: '400001', product: '1000 Ltr Sintex Water Tank', customerPhone: '+91987XXXXXXX', originalSeller: 'Hardware Store A', status: 'Lost (Price too high)' },
    { id: 2, pincode: '110020', product: '2BHK Flat on Rent', customerPhone: '+91888XXXXXXX', originalSeller: 'Broker B', status: 'Lost (Not interested)' }
  ]);

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#020202] text-gray-100 font-sans">
      
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white">
            ⚡ Super Admin
          </h1>
          <p className="text-gray-400">Manage SaaS users, global revenue, and platform health.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Total MRR</p>
          <p className="text-3xl font-bold text-green-400">$1,240</p>
        </div>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-[#1a1a1a] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Registered Clients / Agencies</h2>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold">Invite Client</button>
        </div>
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#0a0a0a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
              <th className="p-5 font-semibold">Client Name</th>
              <th className="p-5 font-semibold">Platform(s) & ID</th>
              <th className="p-5 font-semibold">Plan & MRR</th>
              <th className="p-5 font-semibold">AI Usage & Cost</th>
              <th className="p-5 font-semibold">Status</th>
              <th className="p-5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {clients.map(client => (
              <tr key={client.id} className="hover:bg-gray-900/50 transition-colors">
                <td className="p-5 font-medium text-gray-200">{client.name}</td>
                <td className="p-5">
                  <div className="text-gray-300 font-bold">{client.platforms}</div>
                  <div className="text-xs text-gray-500">{client.platformId}</div>
                </td>
                <td className="p-5 text-blue-400 font-semibold">{client.plan} <br/><span className="text-xs text-gray-500">{client.mrr}/mo</span></td>
                <td className="p-5">
                  <span className="text-purple-400 font-bold">{client.aiLeft} Left</span><br/>
                  <span className="text-xs text-rose-400">Our Cost: {client.aiCost}</span>
                </td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide ${client.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {client.status}
                  </span>
                </td>
                <td className="p-5 text-right space-x-3">
                  <button className="text-sm text-gray-400 hover:text-white">Edit</button>
                  <button className={`text-sm ${client.status === 'Active' ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}>{client.status === 'Active' ? 'Block' : 'Unblock'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Future Hyper-Local Marketplace Data (Silent Collection) */}
      <div className="mt-10 bg-[#111111] border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-[#1a1a1a]">
          <h2 className="text-lg font-semibold text-purple-400">🔥 Aggregated Market Demands (Future AI Bidding)</h2>
          <p className="text-sm text-gray-500">Leads lost by our SaaS clients. In the future, our Master AI will bid these to the lowest local seller.</p>
        </div>
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#0a0a0a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
              <th className="p-5 font-semibold">Pincode Area</th>
              <th className="p-5 font-semibold">Product/Requirement</th>
              <th className="p-5 font-semibold">Lost From</th>
              <th className="p-5 font-semibold">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {marketDemands.map(demand => (
              <tr key={demand.id} className="hover:bg-gray-900/50 transition-colors">
                <td className="p-5 font-bold text-white">{demand.pincode}</td>
                <td className="p-5 text-blue-400 font-medium">{demand.product}</td>
                <td className="p-5 text-gray-500">{demand.originalSeller}</td>
                <td className="p-5 text-rose-400">{demand.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}