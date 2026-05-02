import React, { useState } from 'react';

export default function AIAgent() {
  // Mock data for AI Training (Unanswered Queries)
  const [queries, setQueries] = useState([
    { id: 1, phone: '+919876543210', question: 'Do you offer cash on delivery for bulk orders?', status: 'unanswered' },
    { id: 2, phone: '+918765432109', question: 'What is the warranty period for the smartwatch?', status: 'unanswered' }
  ]);

  const copyDataForChatGPT = () => {
    const prompt = `I run an Instagram store named @sneaker_head99. My recent stats: Total posts: 15. Reels get 2000 views on average, Image posts get 200. Bio: "Best sneakers in town". Please act as an expert Instagram Growth Manager and provide 3 actionable tips to improve my profile and increase sales.`;
    navigator.clipboard.writeText(prompt);
    alert("Profile Data Copied! You can now paste this into ChatGPT or Claude for a deep analysis.");
  };

  const handleProvideAnswer = (id, e) => {
    e.preventDefault();
    const answer = e.target.answer.value;
    if (!answer) return;
    setQueries(queries.filter(q => q.id !== id));
    alert("🧠 AI has learned this answer! It will now reply automatically to similar questions.");
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-2">
            AI Master Agent
          </h1>
          <p className="text-gray-400">View smart insights and train your AI to handle complex customer queries.</p>
        </div>
      </div>

      {/* Top Section: AI Training (Urgent Actions) */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">🧠 Teach Your AI (Pending Questions)</h2>
        <div className="space-y-4 max-w-5xl">
          {queries.length === 0 ? (
            <div className="bg-[#111] p-8 rounded-2xl border border-gray-800 text-center text-green-500 font-medium shadow-lg">
              <p className="text-3xl mb-2">🎉</p>
              Your AI knows everything right now! No unanswered questions.
            </div>
          ) : (
            queries.map((q) => (
              <div key={q.id} className="bg-[#111] p-6 rounded-2xl border border-rose-500/30 shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-sm text-gray-400">Customer {q.phone} asked:</p>
                    <span className="bg-rose-500/10 text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Needs Answer</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">"{q.question}"</h3>
                </div>
                <form onSubmit={(e) => handleProvideAnswer(q.id, e)} className="flex w-full md:w-auto gap-3">
                  <input type="text" name="answer" placeholder="Type answer for AI..." className="flex-1 md:w-64 bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none text-sm" required />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap">Teach & Reply</button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Section: AI Insights */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">📊 Performance Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111] p-6 rounded-2xl border border-orange-500/30 shadow-lg">
            <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2">🔥 Trending Query</h3>
            <p className="text-white font-medium mb-4">"75% of users asked about 'Cash on Delivery' today."</p>
            <p className="text-sm text-gray-400">AI Advice: Consider adding a clear COD policy message to your welcome menu.</p>
          </div>

          <div className="bg-[#111] p-6 rounded-2xl border border-green-500/30 shadow-lg">
            <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">📈 High Intent Lead</h3>
            <p className="text-white font-medium mb-4">"The product 'Summer Collection Tshirt' is getting high attention."</p>
            <p className="text-sm text-gray-400">AI Advice: Run a promotional WhatsApp campaign for this item to close pending leads.</p>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a1120] to-[#111] p-6 rounded-2xl border border-pink-500/30 shadow-lg">
            <h3 className="text-pink-400 font-bold mb-2 flex items-center gap-2">📸 IG Growth Audit</h3>
            <p className="text-white font-medium mb-4">Your Instagram bio lacks a strong Call-To-Action (CTA).</p>
            <button onClick={copyDataForChatGPT} className="w-full bg-pink-600/20 border border-pink-500/50 hover:bg-pink-600 text-pink-300 hover:text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors mt-2">
              Export Deep Analysis
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}