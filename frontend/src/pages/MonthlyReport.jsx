import { useState } from 'react';

export default function MonthlyReport() {
  const [month] = useState('October 2023');

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Monthly Performance & Retargeting</h1>
          <p className="text-gray-400">Analyze your leads, sources, and plan retargeting strategies for dropped customers.</p>
        </div>
        <select className="bg-[#111] border border-gray-800 text-white px-4 py-2 rounded-lg font-bold">
          <option>{month}</option>
          <option>September 2023</option>
        </select>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl">
          <p className="text-gray-400 text-sm font-bold mb-1">Total Leads Received</p>
          <p className="text-3xl font-black text-white">1,245</p>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl">
          <p className="text-gray-400 text-sm font-bold mb-1">Successfully Contacted</p>
          <p className="text-3xl font-black text-blue-400">1,180</p>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl">
          <p className="text-gray-400 text-sm font-bold mb-1">Positive Response</p>
          <p className="text-3xl font-black text-green-400">420</p>
        </div>
        <div className="bg-[#111] border border-rose-900/30 p-6 rounded-2xl">
          <p className="text-rose-400 text-sm font-bold mb-1">Dropped / Ignored</p>
          <p className="text-3xl font-black text-rose-500">760</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lead Sources */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">Lead Sources</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">Website Forms</span><span className="font-bold text-white">45%</span></div>
              <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{ width: '45%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">Meta Ads (WhatsApp)</span><span className="font-bold text-white">35%</span></div>
              <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: '35%' }}></div></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">Direct Calls / Scans</span><span className="font-bold text-white">20%</span></div>
              <div className="w-full bg-gray-800 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: '20%' }}></div></div>
            </div>
          </div>
        </div>

        {/* AI Retargeting Planner */}
        <div className="lg:col-span-2 bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-2">🎯 AI Retargeting Planner</h2>
          <p className="text-gray-400 text-sm mb-6">AI has grouped your dropped leads. Plan a different approach for next week/month.</p>
          
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-lg">Group: Price Too High (310 users)</h4>
                <p className="text-gray-400 text-sm">Users stopped replying after seeing the quotation.</p>
              </div>
              <button className="bg-purple-600/20 text-purple-400 border border-purple-500/30 px-4 py-2 rounded-lg font-bold hover:bg-purple-600 hover:text-white transition-colors">Target with 10% Discount Template</button>
            </div>
            
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-white text-lg">Group: Unanswered Calls (450 users)</h4>
                <p className="text-gray-400 text-sm">Users did not pick up the AI Voice Call.</p>
              </div>
              <button className="bg-green-600/20 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg font-bold hover:bg-green-600 hover:text-white transition-colors">Send Gentle WhatsApp Reminder</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}