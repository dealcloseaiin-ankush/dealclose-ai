import React, { useState, useEffect } from 'react';

export default function AiAnalytics() {
  const [profile, setProfile] = useState({ aiCredits: 0 });
  const [leads, setLeads] = useState([]);

  // Mock Fetch (Aap inko apni actual API calls se replace karein)
  useEffect(() => {
    // Fetch Profile for Credits
    fetch('/api/users/profile', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => setProfile(data.user || {}));

    // Fetch Leads for AI Chat history
    fetch('/api/leads', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.json())
      .then(data => setLeads(data || []));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">AI Usage & Billing</h1>
      
      {/* Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h3 className="text-gray-500 font-medium">Available AI Credits</h3>
          <p className="text-4xl font-bold text-blue-600 mt-2">
            {profile.aiCredits > 0 ? profile.aiCredits : 0}
          </p>
          <p className="text-sm text-gray-400 mt-2">1 Credit = 1 AI Reply</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
          <h3 className="text-gray-500 font-medium">Pricing Plan</h3>
          <p className="text-2xl font-bold text-gray-800 mt-2">Pro AI Starter</p>
          <p className="text-sm text-gray-400 mt-2">1000 Credits for ₹499</p>
          <button className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm w-full hover:bg-emerald-700">
            Recharge Now
          </button>
        </div>
        
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-xl shadow text-white">
          <h3 className="font-medium opacity-90">Total AI ROI</h3>
          <p className="text-4xl font-bold mt-2">{leads.length} Leads</p>
          <p className="text-sm opacity-80 mt-2">Captured automatically by AI</p>
        </div>
      </div>

      {/* AI Conversations Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-700">Recent AI Conversations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-sm border-b">
                <th className="px-6 py-3 font-medium">Customer Name</th>
                <th className="px-6 py-3 font-medium">Phone Number</th>
                <th className="px-6 py-3 font-medium">Status / Result</th>
                <th className="px-6 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-800">{lead.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-gray-600">+{lead.phoneNumber}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      lead.status === 'converted' ? 'bg-green-100 text-green-700' :
                      lead.status === 'interested' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {lead.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {lead.source || 'WhatsApp'}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">No AI conversations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}