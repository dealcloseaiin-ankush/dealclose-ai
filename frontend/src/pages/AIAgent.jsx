import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom'; // 🚀 FIX: Import Link
import useWorkspaceStore from '../store/workspaceStore'; // 🚀 NEW: Import global workspace store

export default function AIAgent() {
  const [queries, setQueries] = useState([]);
  const [trainingText, setTrainingText] = useState("");
  const { activeWorkspaceId } = useWorkspaceStore(); // 🚀 NEW: Use global state
  const [mainRules, setMainRules] = useState('');
  const [mainBusinessName, setMainBusinessName] = useState('Main Business');
  const [aiName, setAiName] = useState('DealClose AI');
  const [aiCredits, setAiCredits] = useState(0);

  // 🚀 NEW: Trending queries state for 1-Click Auto Flow
  const [trendingQueries, setTrendingQueries] = useState([]);

  useEffect(() => {
    const fetchQueries = async () => {
      try {
        const { data } = await api.get('/ai/training-data');
        setQueries(Array.isArray(data.data) ? data.data : []);
        setMainRules(data.aiRules || '');
        setMainBusinessName(data.businessName || 'Main Business');
        setAiName(data.aiName || 'DealClose AI');
        setAiCredits(data.aiCredits || 0);
        
        // Page load hone par purana saved knowledge box me dikhana
        if (data.aiRules) {
          setTrainingText(data.aiRules);
        }
      } catch (error) {
        console.error("Failed to load AI queries", error);
      }
    };
    fetchQueries();
  }, []);

  const copyDataForChatGPT = () => {
    const prompt = `I run an Instagram store named @sneaker_head99. My recent stats: Total posts: 15. Reels get 2000 views on average, Image posts get 200. Bio: "Best sneakers in town". Please act as an expert Instagram Growth Manager and provide 3 actionable tips to improve my profile and increase sales.`;
    navigator.clipboard.writeText(prompt);
    alert("Profile Data Copied! You can now paste this into ChatGPT or Claude for a deep analysis.");
  };

  const handleProvideAnswer = async (id, e) => {
    e.preventDefault();
    const answer = e.target.answer.value;
    if (!answer) return;
    try {
      await api.put(`/ai/training-data/${id}/answer`, { answer });
      setQueries(queries.filter(q => q._id !== id && q.id !== id));
      toast.success("🧠 AI has learned this answer!");
    } catch (error) {
      console.error("Failed to save answer:", error);
      toast.error("Failed to save answer.");
    }
  };

  const handleSaveKnowledge = async (e) => {
    e.preventDefault();
    try {
      await api.post('/ai/train', { aiName, aiRules: trainingText, workspaceId: activeWorkspaceId });
      toast.success("Knowledge Base & AI Name updated! 🧠");
    } catch (error) {
      console.error("Failed to save knowledge:", error);
      toast.error("Failed to train AI. Please try again.");
    }
  };

  // 🚀 NEW: Handle saving query to Auto-Flow with 1-Click
  const handleAddAutoFlow = async (query) => {
    try {
      await api.post('/ai/train', { 
        type: 'auto_reply', 
        triggerWord: query.keyword, 
        replyMessage: query.aiReply 
      });
      toast.success(`"${query.keyword}" converted to Auto-Flow! AI bypassed for this question. 🚀`);
      setTrendingQueries(tq => tq.filter(q => q.id !== query.id));
    } catch (error) {
      console.error("Auto-Flow Error:", error);
      toast.error("Failed to add to Auto-Flow");
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              AI Master Agent ({aiName || 'DealClose AI'})
            </h1>
            <span className="bg-purple-600/20 text-purple-400 border border-purple-500/30 px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-purple-500/20">
              ⚡ AI Credits Left: {aiCredits}
            </span>
          </div>
          <p className="text-gray-400">View smart insights and train your AI to handle complex customer queries under your custom persona.</p>
        </div>
      </div>

      {/* Custom Knowledge Base (Manual Training) */}
      <div className="mb-10 bg-[#111] p-6 md:p-8 rounded-3xl border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">📚 Train AI (Knowledge Base & Identity)</h2>
          <p className="text-gray-400 text-sm mb-6">Configure your AI Agent's name and business knowledge. AI will introduce itself by this name when replying to customers and owner.</p>

          <form onSubmit={handleSaveKnowledge}>
            <div className="mb-4">
              <label className="block text-sm font-bold text-purple-300 mb-2 flex items-center justify-between">
                <span>🤖 AI Agent Name</span>
                <span className="text-xs text-gray-400 font-normal">Default fallback: DealClose AI</span>
              </label>
              <input 
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                placeholder="e.g. Maya, DealClose AI, Sarah"
                className="w-full bg-[#0a0a0a] border border-purple-800/60 rounded-xl p-3 text-purple-200 focus:border-purple-500 outline-none font-semibold text-sm"
              />
            </div>

            <label className="block text-sm font-bold text-gray-300 mb-2">Business Knowledge & Rules</label>
            <textarea 
              rows="4" 
              value={trainingText}
              onChange={(e) => setTrainingText(e.target.value)}
              placeholder="e.g. We do not provide cash on delivery for orders above ₹10,000. Shop opens at 9 AM..." 
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none mb-4"
            ></textarea>
            <div className="flex gap-3">
              <button type="button" disabled title="Coming Soon" className="px-6 py-2 bg-[#1a1a1a] border border-gray-700 rounded-xl font-bold transition-colors cursor-not-allowed opacity-50">📄 Upload PDF / Doc</button>
              <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-purple-500/20">Save & Train AI</button>
            </div>
          </form>
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

      {/* 🚀 NEW: Trending FAQs (1-Click Auto Flow) */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">⚡ 1-Click Auto-Flow (Save AI Cost)</h2>
        <p className="text-gray-400 text-sm mb-6">AI detected that these questions were asked 10+ times with the exact same reply. Add them to static Auto-Flow to save API tokens!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trendingQueries.map((tq) => (
            <div key={tq.id} className="bg-[#111] p-6 rounded-2xl border border-orange-500/30 shadow-lg relative overflow-hidden group hover:border-orange-500 transition-colors">
              <div className="absolute top-0 right-0 bg-orange-500/20 text-orange-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-b border-l border-orange-500/30">
                Asked {tq.count} times
              </div>
              <p className="text-gray-400 text-sm font-semibold mb-1 mt-2">Customer Question Pattern:</p>
              <p className="text-white font-bold mb-3">"{tq.question}"</p>
              
              <p className="text-gray-400 text-sm font-semibold mb-1">Standard AI Reply:</p>
              <p className="text-orange-200 text-sm italic mb-5">"{tq.aiReply}"</p>
              
              <button 
                onClick={() => handleAddAutoFlow(tq)}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white px-4 py-3 rounded-xl font-bold text-sm transition-colors flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                🚀 Convert to Auto-Flow
              </button>
            </div>
          ))}
          {trendingQueries.length === 0 && (
            <div className="col-span-2 bg-[#111] p-8 rounded-2xl border border-gray-800 text-center text-green-500 font-medium shadow-lg">
              <p className="text-3xl mb-2">✅</p>
              No highly repeated queries right now. Your Auto-Flows are perfectly optimized!
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: AI Insights */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">📊 Performance Insights</h2>
        <div className="grid grid-cols-1">
          <div className="bg-[#111] p-8 rounded-2xl border border-dashed border-gray-800 text-center text-gray-500">
            <p className="text-3xl mb-2">✨</p>
            <h3 className="text-lg font-bold text-gray-300">AI-generated insights are coming soon.</h3>
            <p className="text-sm mt-1">Check back after your AI has processed more customer conversations.</p>
          </div>
        </div>
      </div>

    </div>
  );
}