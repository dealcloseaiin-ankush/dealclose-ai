import React, { useState } from 'react';
import { Sparkles, BrainCircuit, Rocket, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function SolutionRecommender() {
  const [formData, setFormData] = useState({ name: '', industry: '', challenge: '' });
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const prompt = `Business Name: ${formData.name}\nIndustry: ${formData.industry}\nChallenge: ${formData.challenge}\n\nAct as the DealClose AI Strategy Consultant. Give me a 3-step action plan using ONLY DealClose AI features (WhatsApp Automation, AI Voice Calls, Meta Ads Sync, ScanIQ, IVR Blasting) to solve my challenge. Use formatting, emojis, and bullet points. End by telling me to sign up for the free trial.`;
      
      const res = await api.post('/ai/webchat', { message: prompt });
      setStrategy(res.data.reply);
    } catch {
      alert("Failed to generate strategy. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white p-6 font-sans selection:bg-purple-500/30">
      {/* Header */}
      <nav className="max-w-6xl mx-auto flex justify-between items-center py-6 mb-8 border-b border-gray-800/50">
        <Link to="/" className="text-2xl font-bold flex items-center gap-2 hover:opacity-80 transition-opacity"><span className="text-blue-500">⚡</span> DealClose AI</Link>
        <Link to="/register" className="px-5 py-2.5 bg-white hover:bg-gray-200 transition-colors text-black font-bold rounded-full">Get Started</Link>
      </nav>

      <div className="max-w-4xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500 leading-tight">
          Discover Your Perfect AI Setup
        </h1>
        <p className="text-gray-400 text-lg">Not sure how DealClose AI fits into your business? Tell us what you do, and our AI will instantly generate a custom automation roadmap for you.</p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Form */}
        <div className="bg-[#111] p-8 md:p-10 rounded-3xl border border-gray-800 shadow-2xl h-fit">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><BrainCircuit className="text-blue-400" /> Tell us about you</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Business Name</label>
              <input type="text" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 outline-none focus:border-blue-500 text-white shadow-inner" placeholder="e.g. Sharma Real Estate" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Industry / Niche</label>
              <input type="text" required value={formData.industry} onChange={e=>setFormData({...formData, industry: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 outline-none focus:border-blue-500 text-white shadow-inner" placeholder="e.g. Real Estate, E-commerce, Gym" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-2">Biggest Challenge Right Now</label>
              <textarea required rows="3" value={formData.challenge} onChange={e=>setFormData({...formData, challenge: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 outline-none focus:border-blue-500 text-white shadow-inner resize-none" placeholder="e.g. I get too many WhatsApp queries and miss replies..."></textarea>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50">
              {loading ? <span className="animate-pulse">Analyzing Business...</span> : <><Sparkles size={20} /> Generate AI Blueprint</>}
            </button>
          </form>
        </div>

        {/* Result */}
        <div className="bg-[#111] p-8 md:p-10 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col min-h-[500px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 relative z-10"><Rocket className="text-purple-400" /> Your AI Strategy</h2>
          
          {!strategy && !loading && <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center"><span className="text-6xl mb-4 opacity-50">🗺️</span><p>Fill out the form to get your customized AI automation roadmap.</p></div>}
          {loading && <div className="flex-1 flex flex-col items-center justify-center text-blue-400"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div><p className="font-bold animate-pulse">Building your custom roadmap...</p></div>}
          {strategy && !loading && <div className="animate-fade-in flex flex-col flex-1 relative z-10"><div className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-gray-200 leading-relaxed space-y-4 whitespace-pre-wrap">{strategy}</div><div className="mt-8 pt-6 border-t border-gray-800"><Link to="/register" className="w-full bg-white text-black font-bold py-4 rounded-xl flex justify-center items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg">Start Implementation for Free <ArrowRight size={20} /></Link></div></div>}
        </div>
      </div>
    </div>
  );
}