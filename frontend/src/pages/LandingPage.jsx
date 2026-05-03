import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api'; // Axios instance for making backend calls

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  
  // New States for Smart Scanner Box
  const [scanPlatform, setScanPlatform] = useState('instagram'); // instagram, facebook, youtube
  const [scanCategory, setScanCategory] = useState('post'); // post, ad, profile
  const [inputMode, setInputMode] = useState('screenshot'); // screenshot, url
  const [urlInput, setUrlInput] = useState('');

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

  // Handle File Upload and start Polling
  const handleScreenshotUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsScanning(true);
    setScanResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', scanPlatform);
    formData.append('scanType', scanCategory);

    try {
      // 1. Send file to backend
      const res = await api.post('/scaniq/screenshot', formData);
      const scanId = res.data.scanId;

      // 2. Poll every 2.5 seconds to check if AI finished analyzing
      const interval = setInterval(async () => {
        const checkRes = await api.get(`/scaniq/${scanId}`);
        if (checkRes.data.status === 'completed') {
          clearInterval(interval);
          setScanResult(checkRes.data.analysis);
          setIsScanning(false);
        } else if (checkRes.data.status === 'failed') {
          clearInterval(interval);
          alert('AI Analysis failed: ' + checkRes.data.errorMessage);
          setIsScanning(false);
        }
      }, 2500);
    } catch (error) {
      alert(error.response?.data?.message || 'Something went wrong. Please try again.');
      setIsScanning(false);
    }
  };

  // Handle URL Submission (Profile / Video Link)
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput) return;
    
    setIsScanning(true);
    setScanResult(null);
    
    try {
      // API call to our modular backend
      const res = await api.post('/scaniq/url', { url: urlInput, platform: scanPlatform, scanType: scanCategory });
      // Currently returns 501 Coming Soon, but UI is ready!
      alert(res.data.message || "URL processing started!");
    } catch (error) {
      alert(error.response?.data?.message || 'Something went wrong.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-[#030303] text-white min-h-screen font-sans selection:bg-purple-500/30 overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#030303]/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold tracking-tighter">
            <span className="text-blue-500">⚡</span> DealClose AI
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#scaniq" className="hover:text-green-400 transition-colors">Free AI Scanner</a>
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

      {/* Free AI Scanner Tool Section (ScanIQ) */}
      <section id="scaniq" className="py-24 px-6 bg-[#080C10] border-y border-gray-800/50 relative overflow-hidden">
        {/* Decorative Green Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-sm font-bold text-green-400 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Free AI Tool
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-white">Spy on Competitors & Go Viral 🚀</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Upload a screenshot of a <b>Competitor's Ad</b> to see why it works, or paste your <b>Instagram Profile URL</b> for a complete AI audit. Get your Viral Score in 10 seconds.
            </p>
          </div>

          <div className="bg-[#0D1117] border border-gray-800 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(0,255,133,0.05)]">
            {!scanResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  
                  {/* Smart Selectors */}
                  <div className="p-4 bg-[#161B22] rounded-2xl border border-gray-800 space-y-4">
                    
                    {/* Platform Selector */}
                    <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-gray-700">
                      <button onClick={() => setScanPlatform('instagram')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${scanPlatform === 'instagram' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}>📸 Instagram</button>
                      <button onClick={() => setScanPlatform('facebook')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${scanPlatform === 'facebook' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>👍 Facebook</button>
                      <button onClick={() => setScanPlatform('youtube')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${scanPlatform === 'youtube' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>▶ YouTube</button>
                    </div>
                    
                    {/* Category Selector */}
                    <div className="flex gap-2">
                      <button onClick={() => setScanCategory('post')} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${scanCategory === 'post' ? 'bg-gray-800 border-gray-600 text-white' : 'bg-transparent border-gray-700 text-gray-500'}`}>Standard Post</button>
                      <button onClick={() => setScanCategory('ad')} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${scanCategory === 'ad' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-transparent border-gray-700 text-gray-500'}`}>Competitor Ad</button>
                      <button onClick={() => setScanCategory('profile')} className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${scanCategory === 'profile' ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'bg-transparent border-gray-700 text-gray-500'}`}>Full Profile Scan</button>
                    </div>

                    {/* Input Method Toggle */}
                    <div className="flex justify-center gap-4 pt-2 border-t border-gray-800">
                      <button onClick={() => setInputMode('screenshot')} className={`text-xs font-bold transition-all ${inputMode === 'screenshot' ? 'text-green-400 underline underline-offset-4' : 'text-gray-500 hover:text-gray-300'}`}>📎 Upload Screenshot</button>
                      <button onClick={() => setInputMode('url')} className={`text-xs font-bold transition-all ${inputMode === 'url' ? 'text-green-400 underline underline-offset-4' : 'text-gray-500 hover:text-gray-300'}`}>🔗 Paste Link (URL)</button>
                    </div>
                  </div>
                  
                  {/* Dynamic Input Box based on inputMode */}
                  {inputMode === 'screenshot' ? (
                    <div className="relative group cursor-pointer">
                      <div className={`absolute inset-0 bg-green-500/20 rounded-3xl blur-xl transition-all duration-500 ${isScanning ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover:opacity-100'}`}></div>
                      <label className={`relative flex flex-col items-center justify-center h-56 border-2 border-dashed rounded-3xl transition-colors cursor-pointer bg-[#0a0a0a] ${isScanning ? 'border-green-500' : 'border-gray-700 hover:border-green-500'}`}>
                        {isScanning ? (
                          <div className="text-center">
                            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-green-400 font-bold">AI is analyzing visually...</p>
                            <p className="text-sm text-gray-500 mt-2">Checking hook, colors, and text</p>
                          </div>
                        ) : (
                          <div className="text-center px-6">
                            <p className="text-5xl mb-4">🖼️</p>
                            <p className="text-white font-bold text-lg mb-2">Upload {scanCategory === 'ad' ? 'Ad Screenshot' : 'Screenshot'}</p>
                            <div className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-full text-sm font-bold inline-block hover:bg-gray-700 transition-colors">Browse File</div>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} disabled={isScanning} />
                      </label>
                    </div>
                  ) : (
                    <form onSubmit={handleUrlSubmit} className="relative group">
                      <div className={`absolute inset-0 bg-green-500/20 rounded-3xl blur-xl transition-all duration-500 ${isScanning ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover:opacity-100'}`}></div>
                      <div className={`relative flex flex-col justify-center p-6 h-56 border-2 border-solid rounded-3xl transition-colors bg-[#0a0a0a] ${isScanning ? 'border-green-500' : 'border-gray-800'}`}>
                        {isScanning ? (
                          <div className="text-center">
                            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-green-400 font-bold">Scraping data from URL...</p>
                            <p className="text-sm text-gray-500 mt-2">This usually takes 8-12 seconds</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <label className="text-white font-bold text-lg block">Paste {scanPlatform} Link</label>
                            <input 
                              type="url" 
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              placeholder={`https://${scanPlatform}.com/...`} 
                              className="w-full bg-[#161B22] border border-gray-700 rounded-xl p-4 text-white focus:border-green-500 outline-none"
                              required
                            />
                            <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all">
                              Scan URL
                            </button>
                          </div>
                        )}
                      </div>
                    </form>
                  )}

                  <p className="text-center text-sm text-gray-500">🔒 5 free scans available per month. No credit card required.</p>
                </div>
                
                {/* Dummy UI to show them what they will get */}
                <div className="opacity-50 pointer-events-none hidden md:block">
                  <h3 className="text-lg font-bold mb-4">You will receive:</h3>
                  <div className="space-y-4">
                    <div className="bg-[#161B22] p-4 rounded-xl border border-gray-800 flex items-center gap-4"><div className="w-12 h-12 rounded-full border-4 border-green-500 flex items-center justify-center text-green-500 font-bold">85</div> <span>Viral Potential Score</span></div>
                    <div className="bg-[#161B22] p-4 rounded-xl border border-gray-800"><p className="text-green-400 font-bold mb-1">✅ Strengths Detected</p><p className="text-sm text-gray-400">High contrast hook, good facial expression.</p></div>
                    <div className="bg-[#161B22] p-4 rounded-xl border border-gray-800"><p className="text-purple-400 font-bold mb-1">✍️ AI Caption Rewrite</p><p className="text-sm text-gray-400">"Stop making this 1 mistake..."</p></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-slide-up">
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-extrabold text-white mb-2">Analysis Complete!</h3>
                  <p className="text-gray-400">Here is your AI-generated report.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-32 h-32 rounded-full border-8 border-green-500 flex items-center justify-center mb-4">
                      <span className="text-4xl font-black text-white">{scanResult.viralScore}</span>
                    </div>
                    <h4 className="text-xl font-bold text-green-400">{scanResult.viralLabel} Potential</h4>
                    <p className="text-gray-400 text-sm mt-3">{scanResult.overallSummary}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-5"><h4 className="text-green-400 font-bold mb-2">✅ Strengths</h4><ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">{scanResult.strengths?.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                    <div className="bg-[#161B22] border border-gray-800 rounded-2xl p-5"><h4 className="text-rose-400 font-bold mb-2">❌ Weaknesses</h4><ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">{scanResult.weaknesses?.map((w,i) => <li key={i}>{w}</li>)}</ul></div>
                  </div>
                </div>
                <div className="mt-8 text-center"><button onClick={() => setScanResult(null)} className="text-gray-400 hover:text-white underline">Scan Another Post</button></div>
              </div>
            )}
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