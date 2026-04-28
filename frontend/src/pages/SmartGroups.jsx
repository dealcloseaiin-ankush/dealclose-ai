import { useState } from 'react';

export default function SmartGroups() {
  // Mock data representing groups created automatically by AI
  const [groups] = useState([
    { id: 1, name: 'High Intent Electronics', count: 24, reason: 'Asked for prices but did not buy' },
    { id: 2, name: 'Window Shoppers', count: 89, reason: 'Just browsed the catalog' },
    { id: 3, name: 'Ready to Buy (Real Estate)', count: 12, reason: 'Requested site visits' }
  ]);

  const [sending, setSending] = useState(false);

  const handleBulkSend = (groupName) => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      alert(`✅ Bulk template successfully sent to all users in "${groupName}"!`);
    }, 2000);
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-2">AI Smart Groups & Bulk Send</h1>
        <p className="text-gray-400">AI automatically segments your customers based on their chat behavior. Send targeted bulk WhatsApp templates here.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => (
          <div key={group.id} className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white leading-tight">{group.name}</h3>
              <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg font-black">{group.count} Users</span>
            </div>
            <p className="text-sm text-gray-400 mb-6"><strong>AI Reason:</strong> {group.reason}</p>
            
            <div className="space-y-3">
              <select className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-blue-500">
                <option value="">Select Meta Template...</option>
                <option value="discount_offer">Diwali Discount Offer</option>
                <option value="follow_up">Site Visit Follow-up</option>
                <option value="new_product">New Product Launch</option>
              </select>
              
              <button onClick={() => handleBulkSend(group.name)} disabled={sending} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                {sending ? 'Sending...' : 'Send Bulk Template 🚀'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}