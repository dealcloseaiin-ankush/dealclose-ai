import React, { useState } from 'react';
import { Target, TrendingUp, Users, Zap, MessageCircle, DollarSign, Eye, ShoppingCart } from 'lucide-react';

export default function Campaigns() {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAd, setGeneratedAd] = useState(null);

  const handleGenerateAd = (e) => {
    e.preventDefault();
    if (!aiPrompt) return;
    setIsGenerating(true);
    
    // Mock AI Generation delay (Future: Connect to backend /api/ai/generate-ad)
    setTimeout(() => {
      setGeneratedAd({
        headline: "Upgrade Your Wardrobe this Summer! ☀️",
        primaryText: "Get the best premium cotton t-shirts at unbeatable prices. Limited stock available. Click to chat with us on WhatsApp and claim your 10% discount today!",
        audience: "Age 18-35, Metro Cities, Interests: Men's Fashion, Online Shopping",
        budget: "₹500/day estimated for best results",
        imageIdea: "A high-quality image of a model wearing a bright summer t-shirt outdoors."
      });
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-[calc(100vh-4rem)] text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
          AI Campaigns & Ads Manager
        </h1>
        <p className="text-gray-400">Launch highly targeted Meta Ads using AI and retarget your WhatsApp leads automatically.</p>
      </div>

      {/* True ROI Analytics Dashboard */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">📊 True ROI Analytics (Last 30 Days)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-lg">
            <p className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><DollarSign size={14} className="text-rose-400"/> Ad Spend</p>
            <p className="text-2xl font-black text-white">₹5,000</p>
          </div>
          <div className="bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-lg">
            <p className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Eye size={14} className="text-blue-400"/> Impressions</p>
            <p className="text-2xl font-black text-white">10,240</p>
          </div>
          <div className="bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-lg">
            <p className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><MessageCircle size={14} className="text-green-400"/> WhatsApp Leads</p>
            <p className="text-2xl font-black text-green-400">200</p>
            <p className="text-[10px] text-gray-500 mt-1">Cost Per Lead: ₹25</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-900/20 to-[#111] p-5 rounded-2xl border border-indigo-500/30 shadow-lg relative overflow-hidden">
            <p className="text-indigo-300 text-xs font-bold uppercase mb-1 flex items-center gap-1"><ShoppingCart size={14}/> Actual Sales</p>
            <p className="text-2xl font-black text-white">20</p>
            <p className="text-[10px] text-indigo-400 mt-1 font-semibold">Cost Per Sale: ₹250</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Ad Creator */}
        <div className="bg-[#111] border border-blue-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">✨ Create Campaign with AI</h2>
            <p className="text-gray-400 text-sm mb-6">Just tell the AI what you want to sell, and it will write the ad copy and target the best audience.</p>
            
            <form onSubmit={handleGenerateAd}>
              <textarea 
                rows="3" 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. I want to sell premium summer cotton t-shirts. My budget is ₹500 per day." 
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none mb-4"
                required
              ></textarea>
              <button 
                type="submit" 
                disabled={isGenerating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isGenerating ? 'AI is thinking...' : <><Zap size={18}/> Generate Ad Strategy</>}
              </button>
            </form>

            {generatedAd && (
              <div className="mt-6 p-5 bg-[#0a0a0a] border border-gray-700 rounded-xl">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded">AI Suggestion</span>
                  <span className="text-xs text-gray-500">Preview</span>
                </div>
                <h3 className="font-bold text-white mb-2">{generatedAd.headline}</h3>
                <p className="text-sm text-gray-300 mb-4">{generatedAd.primaryText}</p>
                <div className="border-t border-gray-800 pt-4 mt-4 space-y-2">
                  <p className="text-xs text-gray-400"><strong className="text-gray-300">🎯 Audience:</strong> {generatedAd.audience}</p>
                  <p className="text-xs text-gray-400"><strong className="text-gray-300">💰 Budget:</strong> {generatedAd.budget}</p>
                  <p className="text-xs text-gray-400"><strong className="text-gray-300">📸 Image Idea:</strong> {generatedAd.imageIdea}</p>
                </div>
                
                <button className="w-full mt-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/20">
                  Launch on Facebook & Instagram 🚀
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Retargeting & Audience Sync */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#111] border border-purple-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Target className="text-purple-400"/> Retargeting Sync</h2>
            <p className="text-gray-400 text-sm mb-6">Send your unconverted WhatsApp leads back to Meta to show them highly targeted reminder ads.</p>
            
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-5 flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">Warm Leads</h3>
                <p className="text-xs text-gray-500">People who messaged but didn't buy</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-purple-400">180</span>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Leads</p>
              </div>
            </div>
            
            <button className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20">
              Sync Audience to Meta Ads
            </button>
            <p className="text-xs text-center text-gray-500 mt-3">These numbers will be securely hashed (SHA256) before sending to Meta.</p>
          </div>

          <div className="bg-gradient-to-br from-green-900/10 to-[#111] border border-green-500/20 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-green-400 mb-2 flex items-center gap-2"><Users size={20}/> Lookalike Audiences</h2>
            <p className="text-gray-400 text-sm mb-4">Meta has received <b>20 Converted Sales</b> via the Conversions API. We can now tell Meta to find 1 Million new people who are exactly like these buyers.</p>
            <button className="w-full py-3 border border-green-500/50 hover:bg-green-500/10 text-green-400 font-bold rounded-xl transition-all">
              Generate Lookalike Audience
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}