import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Check, X, Sparkles, ArrowRight, ShieldCheck, TrendingUp, Zap, HelpCircle, DollarSign, MessageSquare, Phone, Bot } from 'lucide-react';

const InstagramIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export default function ComparePage() {
  const { competitor } = useParams();
  const navigate = useNavigate();

  // Active competitor tab ('wati' | 'manychat' | 'gallabox' | 'interakt')
  const [activeCompetitor, setActiveCompetitor] = useState(competitor || 'wati');
  const [contactSize, setContactSize] = useState(5000); // 1000 to 50000

  useEffect(() => {
    if (competitor && ['wati', 'manychat', 'gallabox', 'interakt'].includes(competitor.toLowerCase())) {
      setActiveCompetitor(competitor.toLowerCase());
    }
  }, [competitor]);

  const handleTabChange = (key) => {
    setActiveCompetitor(key);
    navigate(`/compare/${key}`, { replace: true });
  };

  const competitorData = {
    wati: {
      name: 'WATI',
      logoText: 'WATI 💬',
      badge: 'WhatsApp Only Platform',
      basePrice: '₹2,900/mo',
      dealclosePrice: '₹499/mo',
      annualSavings: '₹28,812 / year',
      competitorCostFormula: (contacts) => 2900 + Math.round(contacts * 0.18),
      dealcloseCostFormula: (contacts) => 499 + Math.round(contacts * 0.00),
      summary: 'WATI charges heavy base monthly subscription plus markup fees on WhatsApp messages. DealClose AI delivers official WhatsApp API with 0% markup, plus built-in Instagram DM automation and AI Voice Calling at 1/5th the cost.',
      features: [
        { name: 'Base Monthly Starting Price', competitor: '₹2,900 / month', dealclose: '₹199 - ₹499 / month', better: true },
        { name: 'Meta WhatsApp Message Markup', competitor: '₹0.15 - ₹0.30 per msg added', dealclose: '0% Markup (Direct Meta Cost)', better: true },
        { name: 'Meta Green Tick Verification', competitor: '$100 (~₹8,300) Extra Fee', dealclose: 'Free Application Support', better: true },
        { name: 'Instagram Comment-to-DM Automation', competitor: '❌ Not Supported', dealclose: '✅ Built-in Instant AI Reply', better: true },
        { name: 'AI Voice Calling Agent (Inbound/Outbound)', competitor: '❌ No Voice AI', dealclose: '✅ Real-time Hindi/English Voice AI', better: true },
        { name: 'Visual Drag-and-Drop Flow Builder', competitor: '✅ Included', dealclose: '✅ Included', better: false },
        { name: 'Shared Multi-Agent Team Inbox', competitor: '✅ 5 Users Included', dealclose: '✅ Included with Smart Routing', better: false },
        { name: 'Local Google Search Demand Insights', competitor: '❌ Not Available', dealclose: '✅ Local Keyword Scanner', better: true },
      ]
    },
    manychat: {
      name: 'ManyChat',
      logoText: 'ManyChat 🤖',
      badge: 'Social Chatbot Tool',
      basePrice: '$25/mo (~₹2,100/mo)',
      dealclosePrice: '₹499/mo',
      annualSavings: '₹19,212 / year',
      competitorCostFormula: (contacts) => Math.round(2100 + (contacts > 5000 ? (contacts - 5000) * 0.25 : 0)),
      dealcloseCostFormula: (contacts) => 499,
      summary: 'ManyChat scales exponentially with contact list tiers and lacks seamless official Indian WhatsApp Cloud API broadcasting and local Indian payment / Voice AI integrations. DealClose AI is purpose-built for high-converting Indian businesses.',
      features: [
        { name: 'Pricing Model', competitor: 'Tiers scale aggressively per contact', dealclose: 'Flat, transparent & affordable', better: true },
        { name: 'Official WhatsApp Cloud API Engine', competitor: '⚠️ Complex 3rd party setup', dealclose: '✅ 1-Click Meta Cloud Connection', better: true },
        { name: 'Instagram Comment-to-DM & Live Automation', competitor: '✅ Supported', dealclose: '✅ Supported + Dual WA Bridge', better: false },
        { name: 'Inbound & Outbound AI Voice Agent', competitor: '❌ Not Supported', dealclose: '✅ Human-like Voice AI', better: true },
        { name: 'Shopify / WooCommerce COD Verification', competitor: '❌ Requires Zapier/Make', dealclose: '✅ Built-in Native 1-Click Sync', better: true },
        { name: 'Indian Payment Gateways (Razorpay/UPI)', competitor: '❌ Foreign Billing Only', dealclose: '✅ Native UPI, Netbanking & Cards', better: true },
        { name: 'Customer Support', competitor: 'Email only (US Timezones)', dealclose: '24/7 WhatsApp & Phone Support', better: true },
      ]
    },
    gallabox: {
      name: 'Gallabox',
      logoText: 'Gallabox 📦',
      badge: 'WhatsApp CRM Suite',
      basePrice: '₹2,500/mo',
      dealclosePrice: '₹499/mo',
      annualSavings: '₹24,012 / year',
      competitorCostFormula: (contacts) => 2500 + Math.round(contacts * 0.12),
      dealcloseCostFormula: (contacts) => 499,
      summary: 'Gallabox requires high upfront commitments and steep monthly plans for multi-channel automation. DealClose AI offers micro-business entry at ₹199/mo and full pro automation with Voice AI at ₹499/mo.',
      features: [
        { name: 'Starting Price Plan', competitor: '₹2,500 / month', dealclose: '₹199 / month (Micro Starter)', better: true },
        { name: 'Free Trial', competitor: '7 Days Restricted', dealclose: '14 Days Full Access Free Trial', better: true },
        { name: 'AI Voice Calling & Call Analytics', competitor: '❌ Not Supported', dealclose: '✅ Full Voice AI Suite', better: true },
        { name: 'Instagram Automated Funnels', competitor: 'Limited Add-on', dealclose: '✅ Fully Integrated', better: true },
        { name: 'Meta Ads Real-Time ROAS Tracker', competitor: '❌ Not Supported', dealclose: '✅ Built-in Meta Ads Manager', better: true },
        { name: 'Meta Green Tick Assistance', competitor: 'Paid Add-on', dealclose: '✅ Free Consultation Support', better: true },
      ]
    },
    interakt: {
      name: 'Interakt',
      logoText: 'Interakt ⚡',
      badge: 'WhatsApp Growth Tool',
      basePrice: '₹1,999/mo',
      dealclosePrice: '₹499/mo',
      annualSavings: '₹18,000 / year',
      competitorCostFormula: (contacts) => 1999 + Math.round(contacts * 0.10),
      dealcloseCostFormula: (contacts) => 499,
      summary: 'Interakt is well-known for WhatsApp e-commerce notifications, but charges steep plan upgrades for smart automations and offers no Voice AI or Instagram Comment conversion tools. DealClose AI provides an all-in-one revenue engine.',
      features: [
        { name: 'Monthly Base Price', competitor: '₹1,999 / month', dealclose: '₹199 - ₹499 / month', better: true },
        { name: 'Markup on WhatsApp Conversations', competitor: '₹0.10 - ₹0.20 per convo markup', dealclose: '0% Markup (Official Meta rates)', better: true },
        { name: 'AI Inbound Calling Agent', competitor: '❌ No Phone Support AI', dealclose: '✅ Instant Human-like Voice AI', better: true },
        { name: 'Instagram Post Comment-to-DM Bot', competitor: '❌ No Instagram Support', dealclose: '✅ Dedicated IG Auto-DM Funnels', better: true },
        { name: 'Local Business Demand Scanner', competitor: '❌ Not Available', dealclose: '✅ Local Search Demand Scanner', better: true },
        { name: 'Mobile App Experience', competitor: 'Basic Inbox', dealclose: '✅ PWA Installable Mobile App', better: true },
      ]
    }
  };

  const current = competitorData[activeCompetitor] || competitorData.wati;
  const competitorMonthlyCost = current.competitorCostFormula(contactSize);
  const dealcloseMonthlyCost = current.dealcloseCostFormula(contactSize);
  const monthlySaved = Math.max(0, competitorMonthlyCost - dealcloseMonthlyCost);
  const annualSaved = monthlySaved * 12;

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 selection:bg-purple-500/30">
      {/* Navigation */}
      <nav className="border-b border-gray-900/80 bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-purple-500/20 font-black text-black text-lg">
              ⚡
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">DealClose<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> AI</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="text-xs font-bold text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link to="/login" className="text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-all">Login</Link>
            <Link to="/register" className="text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2 rounded-lg shadow-md hover:opacity-95 transition-all">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <div className="max-w-6xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
          <TrendingUp size={13} /> Transparent Competitor Teardown
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
          DealClose AI vs <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-emerald-400">{current.name}</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-3xl mx-auto mb-8">
          {current.summary}
        </p>

        {/* Competitor Selector Tabs */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-12">
          {Object.entries(competitorData).map(([key, data]) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeCompetitor === key
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 scale-105'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              <span>{data.name}</span>
            </button>
          ))}
        </div>

        {/* Savings Calculator Widget */}
        <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto mb-16 text-left shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6 mb-6">
            <div>
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Live Cost Calculator</span>
              <h3 className="text-xl sm:text-2xl font-bold text-white mt-0.5">Calculate Your Estimated Savings</h3>
              <p className="text-xs text-gray-400 mt-1">Based on monthly contact volume and message automation requirements.</p>
            </div>
            <div className="bg-black/60 border border-gray-800 px-4 py-2 rounded-xl text-right">
              <span className="text-[10px] text-gray-500 uppercase font-black">Estimated Annual Savings</span>
              <div className="text-2xl font-black text-emerald-400">₹{annualSaved.toLocaleString()}</div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-gray-300">Monthly Active Contacts / Leads:</span>
                <span className="text-purple-400 text-sm font-black">{contactSize.toLocaleString()} Contacts</span>
              </div>
              <input
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={contactSize}
                onChange={(e) => setContactSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                <span>1,000</span>
                <span>10,000</span>
                <span>25,000</span>
                <span>50,000+</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-black/40 border border-gray-800/80 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-gray-500 uppercase">{current.name} Monthly Cost</span>
                <div className="text-xl font-black text-gray-300 mt-1">₹{competitorMonthlyCost.toLocaleString()} <span className="text-xs font-normal text-gray-500">/ mo</span></div>
                <p className="text-[10px] text-rose-400/80 mt-1">Includes base plan + per-message markups</p>
              </div>

              <div className="bg-purple-950/20 border border-purple-500/30 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-purple-300 uppercase">DealClose AI Monthly Cost</span>
                <div className="text-xl font-black text-emerald-400 mt-1">₹{dealcloseMonthlyCost.toLocaleString()} <span className="text-xs font-normal text-gray-400">/ mo</span></div>
                <p className="text-[10px] text-emerald-400/80 mt-1">Zero message markup + Full AI Voice & IG Tools</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Comparison Matrix */}
        <div className="bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden mb-16 shadow-2xl">
          <div className="p-6 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold text-white">Full Feature & Pricing Comparison</h3>
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">Updated for 2026</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-black/40 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-6">Capability / Feature</th>
                  <th className="py-4 px-6 text-rose-400">{current.name}</th>
                  <th className="py-4 px-6 text-emerald-400 bg-purple-950/10">DealClose AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {current.features.map((feat, i) => (
                  <tr key={i} className="hover:bg-gray-900/30 transition-colors">
                    <td className="py-4 px-6 text-white font-bold">{feat.name}</td>
                    <td className="py-4 px-6 text-gray-400">{feat.competitor}</td>
                    <td className="py-4 px-6 text-emerald-300 font-bold bg-purple-950/10">{feat.dealclose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3 Core Value Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-16">
          <div className="bg-gray-950 border border-gray-800 p-6 rounded-3xl">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4"><DollarSign size={20} /></div>
            <h4 className="font-bold text-base text-white mb-2">0% Markup on Meta Messages</h4>
            <p className="text-xs text-gray-400 leading-relaxed">Unlike other platforms that charge ₹0.15 to ₹0.30 extra per conversation, DealClose AI routes your traffic with direct Meta billing so you keep 100% of your savings.</p>
          </div>

          <div className="bg-gray-950 border border-gray-800 p-6 rounded-3xl">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-4"><InstagramIcon size={20} /></div>
            <h4 className="font-bold text-base text-white mb-2">True Omnichannel Growth</h4>
            <p className="text-xs text-gray-400 leading-relaxed">Don't settle for WhatsApp-only tools. Convert your Instagram viral comments into direct inbox sales, and follow up via WhatsApp and AI Voice Calling in one single place.</p>
          </div>

          <div className="bg-gray-950 border border-gray-800 p-6 rounded-3xl">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4"><Phone size={20} /></div>
            <h4 className="font-bold text-base text-white mb-2">Inbound Human Voice AI</h4>
            <p className="text-xs text-gray-400 leading-relaxed">Let an intelligent AI voice agent answer customer phone calls in natural Hindi/English, answer product questions, and book orders 24/7 without hiring extra call center staff.</p>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-emerald-500 rounded-3xl p-8 sm:p-12 text-center text-black shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-black mb-3">Ready to Upgrade Your Business Automation?</h2>
          <p className="text-xs sm:text-sm font-semibold max-w-xl mx-auto mb-6 text-black/80">
            Switch in less than 5 minutes. No credit card required. Get full access to all WhatsApp & Instagram AI features free for 14 days.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register" className="px-8 py-3.5 bg-black text-white font-black text-xs rounded-xl shadow-xl hover:bg-gray-900 transition-all flex items-center gap-2">
              Start 14-Day Free Trial <ArrowRight size={14} />
            </Link>
            <Link to="/pricing" className="px-6 py-3.5 bg-white/30 text-black font-black text-xs rounded-xl hover:bg-white/40 transition-all">
              View All Pricing Plans
            </Link>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 text-center text-xs text-gray-500">
        <p>© 2026 DealClose AI. All rights reserved. Made with ❤️ in India.</p>
      </footer>
    </div>
  );
}
