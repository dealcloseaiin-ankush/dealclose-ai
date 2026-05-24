import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Plus, PhoneCall, BrainCircuit, ScanSearch, Instagram, MessageCircle, Video, Database } from 'lucide-react';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#030303] text-gray-100 font-sans selection:bg-purple-500/30 overflow-x-hidden p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm font-bold mb-8 inline-block">← Back to Home</Link>
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-6">
            Build Your AI Workforce
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Don't pay for what you don't use. Start with our Free CRM Foundation and add powerful AI modules specifically designed for your business type.
          </p>
        </div>

        {/* Step 1: The Foundation */}
        <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 mb-12 flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gray-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 md:w-2/3">
            <span className="bg-gray-800 text-gray-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-block">Step 1: The Foundation</span>
            <h2 className="text-3xl font-bold text-white mb-2">Core CRM (Always Free)</h2>
            <p className="text-gray-400 mb-6">Everyone starts here. Get full access to our manual CRM platform at absolutely zero cost. (Future API limits may apply, but it's free today!)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-gray-500"/> Kanban & List View CRM</div>
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-gray-500"/> Digital Business Card & QR</div>
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-gray-500"/> Manual WhatsApp/IG Chats</div>
              <div className="flex items-center gap-2"><CheckCircle size={16} className="text-gray-500"/> Basic Staff Management</div>
            </div>
          </div>
          <div className="relative z-10 mt-8 md:mt-0 text-center md:text-right">
            <div className="text-5xl font-black text-white mb-4">₹0<span className="text-lg text-gray-500 font-normal">/mo</span></div>
            <Link to="/register" className="px-8 py-3 bg-gray-100 hover:bg-white text-black font-bold rounded-xl transition-colors inline-block">Create Free Account</Link>
          </div>
        </div>

        {/* Step 2: Choose Your Channel */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8 text-center"><span className="text-purple-500">Step 2:</span> Choose Your Primary Channel (14-Day Free Trial)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* WhatsApp Team (Multi-Staff) */}
            <div className="bg-gradient-to-b from-[#0a1a10] to-[#111] border border-green-500/30 rounded-3xl p-8 shadow-xl relative group hover:border-green-500/60 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/20 text-green-400 rounded-xl"><MessageCircle size={24} /></div>
                  <h3 className="text-2xl font-bold text-white">WhatsApp Team</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">₹499<span className="text-sm text-gray-500 font-normal">/mo</span></div>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-6 h-10">Best for businesses with multiple sales or support team members.</p>
              <ul className="space-y-4 text-sm text-gray-300 mb-8">
                <li className="flex items-start gap-3"><CheckCircle size={18} className="text-green-500 shrink-0"/> Multi-Staff Shared Inbox</li>
                <li className="flex items-start gap-3"><CheckCircle size={18} className="text-green-500 shrink-0"/> Drag & Drop Flow Builder (Automated Menus)</li>
                <li className="flex items-start gap-3"><CheckCircle size={18} className="text-green-500 shrink-0"/> Bulk Order Dispatch (Excel Upload)</li>
                <li className="flex items-start gap-3"><CheckCircle size={18} className="text-green-500 shrink-0"/> Website Tracking Pixel</li>
              </ul>
              <Link to="/register" className="block w-full py-3 text-center bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white font-bold rounded-xl border border-green-500/50 transition-colors">Start Team Trial</Link>
            </div>

            {/* WhatsApp Multi-Brand */}
            <div className="bg-gradient-to-b from-[#1a0a10] to-[#111] border border-pink-500/30 rounded-3xl p-8 shadow-xl relative group hover:border-pink-500/60 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-pink-500/20 text-pink-400 rounded-xl"><Database size={24} /></div>
                  <h3 className="text-2xl font-bold text-white">Multi-Brand Agency</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-pink-400">₹999<span className="text-sm text-gray-500 font-normal">/mo</span></div>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-6 h-10">Run multiple businesses with your entire team inside a single WhatsApp Number.</p>
              <ul className="space-y-4 text-sm text-gray-300 mb-8">
                <li className="flex items-start gap-3"><CheckCircle size={18} className="text-pink-500 shrink-0"/> <strong className="text-white">Multi-Staff & Sub-Businesses</strong></li>
                <li className="flex items-start gap-3"><CheckCircle size={18} className="text-pink-500 shrink-0"/> <strong className="text-white">Interactive Branch Menus</strong></li>
                <li className="flex items-start gap-3"><CheckCircle size={18} className="text-pink-500 shrink-0"/> <strong className="text-white">Per-Branch AI Rules</strong></li>
                <li className="flex items-start gap-3"><CheckCircle size={18} className="text-pink-500 shrink-0"/> <strong className="text-white">Custom Digital Cards</strong></li>
              </ul>
              <Link to="/register" className="block w-full py-3 text-center bg-pink-600/20 hover:bg-pink-600 text-pink-400 hover:text-white font-bold rounded-xl border border-pink-500/50 transition-colors">Start Agency Trial</Link>
            </div>

          </div>
        </div>

        {/* Step 3: Add-on Power-Ups */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-8 text-center"><span className="text-blue-500">Step 3:</span> Add AI Power-Ups (Pay as you grow)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            
            {/* B2B Lead Extractor */}
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/50 transition-colors flex flex-col">
              <div className="flex items-center gap-3 mb-3"><Database className="text-emerald-400" size={20}/><h4 className="font-bold text-white text-lg">B2B Lead Extractor</h4></div>
              <p className="text-xs text-gray-400 mb-4 flex-1">Extract high-quality business leads (shops, clinics, B2B) directly from Google Maps.</p>
              <div className="text-xl font-bold text-white mb-4">₹10<span className="text-xs text-gray-500">/Page</span></div>
              <ul className="text-xs text-gray-300 space-y-2 mb-4 pb-4 border-b border-gray-800">
                <li className="flex items-start gap-1"><span className="bg-gray-800 text-xs px-2 py-0.5 rounded font-bold text-emerald-400">Coming Soon</span></li>
                <li className="flex items-start gap-1"><CheckCircle size={14} className="text-gray-500 mt-0.5 shrink-0"/> ₹10 per search (up to 20 leads)</li>
                <li className="flex items-start gap-1"><CheckCircle size={14} className="text-gray-500 mt-0.5 shrink-0"/> Direct CRM Import</li>
                <li className="flex items-start gap-1"><CheckCircle size={14} className="text-rose-500 mt-0.5 shrink-0"/> Min. Wallet Recharge: ₹500</li>
              </ul>
              <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors"><Plus size={14} className="inline mr-1"/> Add to Plan</button>
            </div>

            {/* Omnichannel Master Agent */}
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 hover:border-purple-500/50 transition-colors flex flex-col">
              <div className="flex items-center gap-3 mb-3"><BrainCircuit className="text-purple-400" size={20}/><h4 className="font-bold text-white text-lg">AI Master Agent</h4></div>
              <p className="text-xs text-gray-400 mb-4 flex-1">Omnichannel NLP Agent that handles spelling mistakes, answers complex queries, and negotiates contextually.</p>
              <div className="text-xl font-bold text-white mb-4">₹499<span className="text-xs text-gray-500">/mo</span></div>
              <ul className="text-xs text-gray-300 space-y-2 mb-4 pb-4 border-b border-gray-800">
                <li><span className="bg-gray-800 text-xs px-2 py-0.5 rounded font-bold text-purple-400">Coming Soon</span></li>
              </ul>
              <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors"><Plus size={14} className="inline mr-1"/> Add to Plan</button>
            </div>

            {/* AI Voice Calling */}
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 hover:border-orange-500/50 transition-colors flex flex-col">
              <div className="flex items-center gap-3 mb-3"><PhoneCall className="text-orange-400" size={20}/><h4 className="font-bold text-white text-lg">AI Voice Calling</h4></div>
              <p className="text-xs text-gray-400 mb-4 flex-1">Outbound AI calls (Exotel/Twilio) to negotiate and qualify high-ticket leads automatically.</p>
              <div className="text-xl font-bold text-white mb-4">From ₹99<span className="text-xs text-gray-500">/mo</span></div>
              <ul className="text-xs text-gray-300 space-y-2 mb-4 pb-4 border-b border-gray-800">
                <li><span className="bg-gray-800 text-xs px-2 py-0.5 rounded font-bold text-orange-400">Coming Soon</span></li>
              </ul>
              <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors"><Plus size={14} className="inline mr-1"/> Add to Plan</button>
            </div>

            {/* Post-Campaign Brand ROI */}
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition-colors flex flex-col">
              <div className="flex items-center gap-3 mb-3"><ScanSearch className="text-blue-400" size={20}/><h4 className="font-bold text-white text-lg">Brand Post-Campaign ROI</h4></div>
              <p className="text-xs text-gray-400 mb-4 flex-1">Auto-track post views, analyze comments, extract leads for the brand, and pitch repeat ads.</p>
              <div className="text-xl font-bold text-white mb-4">₹100<span className="text-xs text-gray-500">/Brand</span></div>
              <ul className="text-xs text-gray-300 space-y-2 mb-4 pb-4 border-b border-gray-800">
                <li><span className="bg-gray-800 text-xs px-2 py-0.5 rounded font-bold text-blue-400">Coming Soon</span></li>
              </ul>
              <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors"><Plus size={14} className="inline mr-1"/> Add to Plan</button>
            </div>

            {/* AI Video Studio */}
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 hover:border-pink-500/50 transition-colors flex flex-col">
              <div className="flex items-center gap-3 mb-3"><Video className="text-pink-400" size={20}/><h4 className="font-bold text-white text-lg">AI Video Studio</h4></div>
              <p className="text-xs text-gray-400 mb-4 flex-1">Turn text/images into cinematic ads or create talking AI avatars for marketing.</p>
              <div className="text-xl font-bold text-white mb-4">From ₹499<span className="text-xs text-gray-500">/mo</span></div>
              <ul className="text-xs text-gray-300 space-y-2 mb-4 pb-4 border-b border-gray-800">
                <li><span className="bg-gray-800 text-xs px-2 py-0.5 rounded font-bold text-pink-400">Coming Soon</span></li>
              </ul>
              <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors"><Plus size={14} className="inline mr-1"/> Notify Me</button>
            </div>

          </div>
        </div>
      
      </div>
    </div>
  );
}