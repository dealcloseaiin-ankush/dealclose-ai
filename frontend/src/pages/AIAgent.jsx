import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom'; // 🚀 FIX: Import Link
import useWorkspaceStore from '../store/workspaceStore'; // 🚀 NEW: Import global workspace store
import { Shield, MessageCircle, Camera, MessageSquare, Power, Check, X } from 'lucide-react';

export default function AIAgent() {
  const [queries, setQueries] = useState([]);
  const [trainingText, setTrainingText] = useState("");
  const { activeWorkspaceId } = useWorkspaceStore(); // 🚀 NEW: Use global state
  const [mainRules, setMainRules] = useState('');
  const [mainBusinessName, setMainBusinessName] = useState('Main Business');
  const [aiName, setAiName] = useState('DealClose AI');
  const [aiCredits, setAiCredits] = useState(0);

  // 🛡️ Granular AI Channel Kill Switches
  const [channelToggles, setChannelToggles] = useState({
    comment: false, // Strictly OFF by default
    instagram_dm: true,
    whatsapp: true,
    master: true
  });
  const [isUpdatingToggle, setIsUpdatingToggle] = useState(false);

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

        // Sync channel toggles from database
        setChannelToggles({
          comment: data.commentAiReplyEnabled === true,
          instagram_dm: data.instagramDmAiEnabled !== false,
          whatsapp: data.whatsappAiReplyEnabled !== false,
          master: data.aiAgentEnabled !== false
        });
      } catch (error) {
        console.error("Failed to load AI queries", error);
      }
    };
    fetchQueries();
  }, []);

  const handleToggleChannel = async (channel, nextVal) => {
    setIsUpdatingToggle(true);
    setChannelToggles(prev => ({ ...prev, [channel]: nextVal }));
    try {
      await api.post('/ai/toggle-channel', {
        channel,
        enabled: nextVal,
        workspaceId: activeWorkspaceId
      });
      const labels = {
        comment: 'Instagram Comments AI',
        instagram_dm: 'Instagram Direct (DM) AI',
        whatsapp: 'WhatsApp AI Assistant',
        master: 'Master AI Agent'
      };
      if (nextVal) {
        toast.success(`✅ ${labels[channel]} Activated!`);
      } else {
        toast.error(`⛔ ${labels[channel]} Disabled & Blocked!`);
      }
    } catch (err) {
      console.error('Failed to toggle AI channel:', err);
      toast.error('Failed to update toggle setting.');
      setChannelToggles(prev => ({ ...prev, [channel]: !nextVal }));
    } finally {
      setIsUpdatingToggle(false);
    }
  };

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

      {/* 🛡️ AI Channel Permissions & Kill Switches (Granular Manual Restrictions) */}
      <div className="mb-10 bg-[#0c0c0e] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-gray-800/80">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Shield className="text-purple-400" size={22} />
              <span>AI Channel Permissions & Kill Switches (नियंत्रण केंद्र)</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
              यहाँ से आप तय कर सकते हैं कि आपका AI किन चैनल्स पर अपने आप रिप्लाई करेगा। किसी भी चैनल को बंद (OFF) करने पर AI उस चैनल पर 100% ब्लॉक रहेगा।
            </p>
          </div>
          
          {/* Master Kill Switch */}
          <div className="flex items-center gap-3 bg-[#16161a] border border-gray-800 px-4 py-2.5 rounded-2xl shrink-0 shadow-inner">
            <span className="text-xs font-bold text-gray-300">Master AI:</span>
            <button
              type="button"
              disabled={isUpdatingToggle}
              onClick={() => handleToggleChannel('master', !channelToggles.master)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                channelToggles.master 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20' 
                  : 'bg-rose-900/80 hover:bg-rose-900 text-rose-200 border border-rose-600/60'
              }`}
            >
              {channelToggles.master ? 'ACTIVE ✅' : 'PAUSED ⛔'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* 1. Instagram Comments AI Switch */}
          <div className={`p-5 rounded-2xl border transition-all relative ${
            channelToggles.comment 
              ? 'bg-gradient-to-b from-pink-950/20 to-transparent border-pink-500/40 shadow-lg shadow-pink-500/5' 
              : 'bg-[#111114] border-gray-800/80 opacity-90'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                  <MessageCircle size={16} />
                </div>
                <span className="text-sm font-bold text-white">Instagram Comments</span>
              </div>
              <button
                type="button"
                disabled={isUpdatingToggle}
                onClick={() => handleToggleChannel('comment', !channelToggles.comment)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  channelToggles.comment 
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' 
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {channelToggles.comment ? 'ON ✅' : 'OFF (Blocked)'}
              </button>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              {channelToggles.comment 
                ? '✅ AI आपके Instagram Reels/Posts के कमैंट्स पर ऑटो रिप्लाई कर रहा है।' 
                : '⛔ सुरक्षित (Default): Instagram कमैंट्स पर AI रिप्लाई पूरी तरह बंद है। जब तक आप इसे खुद ON नहीं करेंगे, AI शांत रहेगा।'}
            </p>
            <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-pink-400/90">Restricted by default</span>
              <span className="text-gray-500 font-mono">{channelToggles.comment ? 'Public Replies Active' : 'Zero Token Usage'}</span>
            </div>
          </div>

          {/* 2. Instagram Direct Messages (DM) AI Switch */}
          <div className={`p-5 rounded-2xl border transition-all relative ${
            channelToggles.instagram_dm 
              ? 'bg-gradient-to-b from-purple-950/20 to-transparent border-purple-500/40 shadow-lg shadow-purple-500/5' 
              : 'bg-[#111114] border-gray-800/80 opacity-90'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Camera size={16} />
                </div>
                <span className="text-sm font-bold text-white">Instagram Direct (DMs)</span>
              </div>
              <button
                type="button"
                disabled={isUpdatingToggle}
                onClick={() => handleToggleChannel('instagram_dm', !channelToggles.instagram_dm)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  channelToggles.instagram_dm 
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' 
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {channelToggles.instagram_dm ? 'ON ✅' : 'OFF (Blocked)'}
              </button>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              {channelToggles.instagram_dm 
                ? '✅ Instagram Inbox में कस्टमर्स के सवालों पर AI अपने आप चैट रिप्लाई करता है।' 
                : '⛔ Instagram DMs में AI रिप्लाई बंद है। कस्टमर्स के संदेश आने पर कोई टोकन नहीं कटेगा।'}
            </p>
            <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-purple-400/90">Private Chat Protection</span>
              <span className="text-gray-500 font-mono">{channelToggles.instagram_dm ? 'AI Smart Reply' : 'Manual Staff Only'}</span>
            </div>
          </div>

          {/* 3. WhatsApp Assistant Switch */}
          <div className={`p-5 rounded-2xl border transition-all relative ${
            channelToggles.whatsapp 
              ? 'bg-gradient-to-b from-emerald-950/20 to-transparent border-emerald-500/40 shadow-lg shadow-emerald-500/5' 
              : 'bg-[#111114] border-gray-800/80 opacity-90'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageSquare size={16} />
                </div>
                <span className="text-sm font-bold text-white">WhatsApp Assistant</span>
              </div>
              <button
                type="button"
                disabled={isUpdatingToggle}
                onClick={() => handleToggleChannel('whatsapp', !channelToggles.whatsapp)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  channelToggles.whatsapp 
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20' 
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {channelToggles.whatsapp ? 'ON ✅' : 'OFF (Blocked)'}
              </button>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              {channelToggles.whatsapp 
                ? '✅ WhatsApp पर आने वाले ग्राहकों को 24/7 AI ऑटो सेल्स रिप्लाई और कैटलॉग भेजता है।' 
                : '⛔ WhatsApp पर AI रिप्लाई बंद है। केवल डिफ़ॉल्ट ह्यूमन मैसेज या ऑटो-रूल्स चलेंगे।'}
            </p>
            <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px]">
              <span className="font-semibold text-emerald-400/90">Direct WhatsApp Bot</span>
              <span className="text-gray-500 font-mono">{channelToggles.whatsapp ? '24/7 AI Sales' : 'AI Paused'}</span>
            </div>
          </div>

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