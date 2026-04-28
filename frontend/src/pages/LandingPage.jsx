import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState(null);

  const faqs = [
    { q: 'How does the WhatsApp automation work?', a: 'We use the official Meta Cloud API. When a user abandons a cart on your Shopify or custom site, our AI waits 15 minutes and automatically sends a highly converting WhatsApp message.' },
    { q: 'Can the AI Agent actually talk on calls?', a: 'Yes! Our system uses advanced Text-to-Speech and LLMs to have real-time, human-like voice conversations with your customers.' },
    { q: 'Do I need coding skills to set this up?', a: 'Not at all. Just paste our universal tracking pixel into your website\'s <head> tag or connect via our 1-click Shopify integration.' },
    { q: 'Is there a free trial?', a: 'Yes, our Pro plan comes with a 14-day free trial so you can test the AI agent with real customers before paying.' },
  ];

  const toggleFaq = (index) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  // Dynamic Pricing Structure for Scalability
  const pricingPlans = [
    {
      name: "Basic Automation",
      badge: "30-Day Free Trial",
      price: "₹0",
      period: "for 1st month",
      features: ["100% Free Basic Chatbot", "WhatsApp OR Instagram", "Keyword-based replies", "Renews at ₹199/mo per platform"],
      cta: "Start Free Trial"
    },
    {
      name: "AI Starter Offer",
      badge: "1st Month Promo",
      price: "₹99",
      period: "/mo",
      features: ["Smart AI Chatbot (Limited)", "Handles custom customer queries", "Missed opportunity recovery", "Renews at ₹299/mo (AI Add-on)"],
      cta: "Claim ₹99 Offer",
      highlight: true
    },
    {
      name: "Omnichannel Pro",
      badge: "Standard",
      price: "₹498",
      period: "/mo",
      features: ["Base (₹199) + AI Pro (₹299)", "WhatsApp AND Instagram Engine", "Unlimited custom flows", "Priority AI Voice Calls"],
      cta: "Get Pro Plan"
    }
  ];

  return (
    <div className="bg-[#030303] text-white min-h-screen font-sans selection:bg-purple-500/30 overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#030303]/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold tracking-tighter">
            <span className="text-blue-500">⚡</span> DealClose AI
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="#about" className="hover:text-white transition-colors">About Us</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">Log in</Link>
            <Link to="/register" className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-transform hover:scale-105">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-purple-300 mb-8">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
          Omnichannel AI Engine is Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Automate Sales. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            Rescue Carts. Close Deals.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Deploy an intelligent AI agent that talks to your customers on WhatsApp, makes outbound voice calls, and recovers abandoned carts automatically.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-full shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all transform hover:-translate-y-1 text-lg w-full sm:w-auto">
            Start 14-Day Free Trial
          </Link>
          <a href="#features" className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-gray-800 text-white font-bold rounded-full transition-all text-lg w-full sm:w-auto">
            View Features
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-[#0a0a0a] border-y border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to scale</h2>
            <p className="text-gray-400">Replace your entire sales team with a 24/7 AI workforce.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl hover:border-purple-500/50 transition-colors group">
              <div className="w-14 h-14 bg-green-500/10 text-green-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">💬</div>
              <h3 className="text-xl font-bold mb-3">WhatsApp AI CRM</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Let AI talk to your leads naturally on WhatsApp, answer FAQs, and push them towards checkout automatically.</p>
            </div>
            {/* Feature 2 */}
            <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl hover:border-blue-500/50 transition-colors group">
              <div className="w-14 h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">🛒</div>
              <h3 className="text-xl font-bold mb-3">Abandoned Cart Rescue</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Universal tracking pixel detects when users drop off and sends them an automated WhatsApp Meta Template after 15 mins.</p>
            </div>
            {/* Feature 3 */}
            <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl hover:border-orange-500/50 transition-colors group">
              <div className="w-14 h-14 bg-orange-500/10 text-orange-400 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">📞</div>
              <h3 className="text-xl font-bold mb-3">AI Voice Calling</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Initiate human-like phone calls to high-ticket leads. Our AI can negotiate, qualify, and book appointments for you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-400">Start for free, upgrade when you need more power.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <div key={index} className={`border p-8 rounded-3xl relative ${plan.highlight ? 'bg-gradient-to-b from-[#1a1325] to-[#0a0a0a] border-purple-500/50 transform md:-translate-y-4 shadow-2xl shadow-purple-900/20' : 'bg-[#0a0a0a] border-gray-800'}`}>
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{plan.badge}</div>
              )}
              <h3 className={`text-xl font-medium mb-2 ${plan.highlight ? 'text-purple-400' : 'text-gray-400'}`}>{plan.name}</h3>
              <div className="text-4xl font-bold mb-6 text-white">{plan.price}<span className="text-lg text-gray-400 font-normal">{plan.period}</span></div>
              <ul className="space-y-4 mb-8 text-sm text-gray-200">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className={plan.highlight ? "text-purple-400" : "text-gray-400"}>✓</span> {feature}
                  </li>
                ))}
              </ul>
              <Link to="/register" className={`block w-full py-3 text-center rounded-xl font-bold transition-colors ${plan.highlight ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25' : 'border border-gray-700 hover:bg-gray-800 text-white'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 bg-[#0a0a0a] border-t border-gray-800/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-800 rounded-2xl overflow-hidden bg-[#111]">
                <button 
                  onClick={() => toggleFaq(index)} 
                  className="w-full px-6 py-4 text-left flex justify-between items-center font-semibold text-lg hover:bg-gray-800/50 transition-colors"
                >
                  {faq.q}
                  <span className="text-gray-500 text-2xl">{faqOpen === index ? '−' : '+'}</span>
                </button>
                {faqOpen === index && (
                  <div className="px-6 pb-4 text-gray-400 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer id="about" className="py-12 px-6 border-t border-gray-800 bg-[#030303]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tighter">
            <span className="text-blue-500">⚡</span> DealClose AI
          </div>
          <div className="text-sm text-gray-500">
            © 2024 DealClose AI Inc. Built for the future of automation.
          </div>
          <div className="flex gap-6 text-sm font-medium text-gray-400">
            <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-white">Terms & Conditions</Link>
            <Link to="/faq" className="hover:text-white">FAQ</Link>
            <Link to="/help" className="hover:text-white">Help</Link>
            <Link to="/about" className="hover:text-white">About Us</Link>
            <Link to="/delete-data" className="hover:text-white">Data Deletion</Link>
          </div>
        </div>
      </footer>
      
    </div>
  );
}