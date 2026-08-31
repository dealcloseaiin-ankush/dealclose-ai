import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Sparkles, ArrowRight, Phone, HelpCircle, Layers, Users, Globe } from 'lucide-react';

const InstagramIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      id: 'essential',
      name: 'Essential Growth',
      tagline: 'WhatsApp Cloud API + Instagram Comment-to-DM + Prebuilt Niche Posts',
      originalPrice: 999,
      priceMonthly: 499,
      priceAnnual: 399,
      badge: '14-Day Free Trial',
      highlight: false,
      features: [
        'Official WhatsApp Cloud API Access',
        'Instagram Reel Comment-to-DM Automation',
        'Prebuilt Niche Industry Social Media Posts',
        'Visual Drag & Drop Flow & Bot Builder',
        'Direct Product Catalog & PDF Brochure Sharing',
        '1 Team Staff Access Included',
        '0% Markup on Meta Conversation Rates',
        'Priority WhatsApp & Community Support',
      ],
      cta: 'Start 14-Day Free Trial (₹0)',
      ctaLink: '/register',
    },
    {
      id: 'omnichannel',
      name: 'Omnichannel Pro Automation',
      tagline: 'WhatsApp + Instagram + Google 1-Tap Review Booster + Full CRM',
      originalPrice: 1499,
      priceMonthly: 749,
      priceAnnual: 599,
      badge: 'Most Popular ⭐ Recommended',
      highlight: true,
      features: [
        'Everything in Essential Growth +',
        '1-Tap 5-Star Google Review Booster Engine',
        'Multi-Agent Shared Team Inbox (3 Staff Included)',
        'Automated CRM Lead Stages & Distribution',
        'Meta Approved Bulk Template Broadcaster',
        '1-Click Social Media Batch Publisher',
        'Google Demand Search Insights',
        'Free Meta Official Green Tick Support',
      ],
      cta: 'Start 14-Day Free Trial (₹0)',
      ctaLink: '/register',
    }
  ];

  const addOns = [
    { icon: <InstagramIcon className="text-pink-400" size={20} />, title: 'Extra Social / WA Channel', desc: 'Connect additional WhatsApp numbers or FB pages', price: '₹249 / channel / mo' },
    { icon: <Users className="text-blue-400" size={20} />, title: 'Extra Staff Login Seat', desc: 'Add staff logins with lead isolation', price: '₹99 / staff / mo' },
    { icon: <Phone className="text-green-400" size={20} />, title: 'AI Response & Voice Wallet', desc: 'Conversational Hinglish AI chat & calling bot', price: 'Min. ₹499 recharge' },
    { icon: <Layers className="text-purple-400" size={20} />, title: 'Extra Workspace', desc: 'Separate brand or multi-branch workspace', price: '₹249 / workspace / mo' },
  ];

  const faqs = [
    {
      q: 'Do you charge any markup fee on WhatsApp messages?',
      a: 'No! Unlike competitors who add ₹0.15 to ₹0.30 markup per message, DealClose AI provides 0% markup. You only pay standard Meta API charges directly at actual cost.'
    },
    {
      q: 'Can I cancel or change my plan anytime?',
      a: 'Yes, you can upgrade, downgrade, or cancel your subscription anytime with 1-click from your dashboard.'
    },
    {
      q: 'Do I need a credit card to start the trial?',
      a: 'No credit card is required. You can sign up and immediately start automating your Instagram comments and WhatsApp flows.'
    },
    {
      q: 'How does the free Green Tick verification work?',
      a: 'If you are on the Business Pro or Omnichannel plan, our team assists you in submitting the official Meta Business verification application for the green badge at zero extra consultation cost.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 selection:bg-purple-500/30">
      {/* Header / Nav */}
      <nav className="border-b border-gray-900/80 bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-purple-500/20 font-black text-black text-lg">
              ⚡
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">DealClose<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> AI</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/compare" className="text-xs font-bold text-gray-400 hover:text-white transition-colors">Compare vs Others</Link>
            <Link to="/login" className="text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-all">Login</Link>
            <Link to="/register" className="text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2 rounded-lg shadow-md hover:opacity-95 transition-all">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles size={13} /> Transparent, Zero-Markup Pricing
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
          Powerful AI Automation, <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-emerald-400">Priced for Every Business Size</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto mb-8">
          No hidden fees, no markup on Meta messages, and no enterprise lock-ins. Start free for 14 days and scale as you grow.
        </p>

        {/* 1 Month vs 3 Months vs 6 Months vs 12 Months Duration Switcher */}
        <div className="inline-flex items-center bg-gray-900 border border-gray-800 p-1 rounded-2xl shadow-inner mb-10 flex-wrap justify-center gap-1">
          <button
            onClick={() => setBillingCycle('1mo')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${billingCycle === '1mo' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            1 Month
          </button>
          <button
            onClick={() => setBillingCycle('3mo')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === '3mo' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            3 Months <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black px-1.5 py-0.5 rounded-full">New ⚡</span>
          </button>
          <button
            onClick={() => setBillingCycle('6mo')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === '6mo' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            6 Months <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] font-black px-1.5 py-0.5 rounded-full">Popular</span>
          </button>
          <button
            onClick={() => setBillingCycle('12mo')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === '12mo' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            12 Months (1 Year) <span className="bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">Unlimited Products 🔥</span>
          </button>
        </div>

        {/* 🏆 SPECIAL VIP EARLY ADOPTER OFFER (FIRST 100 CUSTOMERS ONLY) */}
        <div className="bg-gradient-to-r from-amber-950/60 via-[#181206] to-amber-950/60 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden mb-12 text-left">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-black font-black text-[10px] sm:text-xs px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider shadow-md">
            🔥 First 100 Customers Special (Limited Time)
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                  Early Adopter VIP Founder Access
                </h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Get complete access to <strong>WhatsApp API + Instagram Auto-Replies + Google 1-Tap Review Booster + Pre-built Industry Posts & Flow Automations</strong> at an unbeatable founder rate!
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-200/90 pt-1">
                <span className="bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">✓ WhatsApp Official Cloud API</span>
                <span className="bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">✓ Instagram Reel DMs</span>
                <span className="bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">✓ Google Review Booster</span>
                <span className="bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">✓ All Pre-Built Templates</span>
              </div>
              <p className="text-[10px] text-gray-400 italic">
                *Note: Conversational AI Replies & AI Voice Calling separate via minimum recharge wallet (₹499).
              </p>
            </div>

            {/* 2 VIP Pricing Cards */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-black/70 border border-amber-500/50 p-4 rounded-2xl text-center space-y-2 hover:border-amber-400 transition-all">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">3 Months Pass</span>
                <div className="text-gray-500 line-through text-xs">₹2,999</div>
                <div className="text-2xl font-black text-white font-mono">₹599</div>
                <span className="text-[10px] text-emerald-400 font-bold block">(Just ₹199 / mo)</span>
                <Link
                  to="/register"
                  className="w-full py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-xs rounded-xl block hover:opacity-90 shadow-md transition-all"
                >
                  Claim 3-Mo Pass ⚡
                </Link>
              </div>

              <div className="bg-black/90 border-2 border-amber-400 p-4 rounded-2xl text-center space-y-2 shadow-lg shadow-amber-500/20 relative">
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block">12 Months (1 Year)</span>
                <div className="text-gray-500 line-through text-xs">₹8,999</div>
                <div className="text-2xl font-black text-amber-300 font-mono">₹2,499</div>
                <span className="text-[10px] text-emerald-400 font-bold block">(Only ₹208 / mo)</span>
                <Link
                  to="/register"
                  className="w-full py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-xs rounded-xl block hover:opacity-90 shadow-md transition-all"
                >
                  Claim 1-Year Pass 🚀
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-16 max-w-4xl mx-auto">
          
          {/* Plan 1: Essential Growth */}
          <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-gray-700 transition-all space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Essential Growth</span>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                  14 Days Free Trial
                </span>
              </div>
              
              <div>
                {billingCycle === '1mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹999 / month</div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-baseline gap-2">
                      <span>₹649</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">/ 1 month (100 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '3mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹2,997 (₹999/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-baseline gap-2">
                      <span>₹1,749</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">for 3 months (~₹583/mo • 250 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '6mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹5,994 (₹999/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-baseline gap-2">
                      <span>₹3,399</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">for 6 months (~₹566/mo • 500 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '12mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹11,988 (₹999/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-baseline gap-2">
                      <span>₹5,999</span>
                      <span className="text-xs text-emerald-400 font-bold font-sans">/ 1 Year (₹499/mo • 🌟 UNLIMITED Products)</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">WhatsApp API + Instagram Comment-to-DM + Prebuilt Niche Posts</p>

              <div className="space-y-2.5 text-xs text-gray-300 border-t border-gray-800/80 pt-4">
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Official WhatsApp Cloud API Access</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Instagram Reel Comment-to-DM Automation</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Prebuilt Niche Industry Social Media Posts</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Visual Drag & Drop Flow & Bot Builder</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Direct Product Catalog & PDF Brochure Sharing</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> 1 Team Staff Access Included</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> 0% Markup on Meta Conversation Rates</div>
              </div>
            </div>

            <Link
              to="/register"
              className="w-full py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-black text-xs text-center transition-all border border-gray-700"
            >
              Start 14-Day Free Trial (₹0) ⚡
            </Link>
          </div>

          {/* Plan 2: Omnichannel Pro */}
          <div className="bg-gradient-to-b from-purple-950/40 via-gray-950 to-black border-2 border-purple-500/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-purple-500/10 space-y-6 relative">
            <div className="absolute -top-3 left-8 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
              Most Popular ⭐ Recommended
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider">Omnichannel Pro Automation</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  14 Days Free Trial
                </span>
              </div>
              
              <div>
                {billingCycle === '1mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹1,499 / month</div>
                    <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-mono flex items-baseline gap-2">
                      <span>₹899</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">/ 1 month (100 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '3mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹4,497 (₹1,499/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-mono flex items-baseline gap-2">
                      <span>₹2,499</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">for 3 months (~₹833/mo • 250 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '6mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹8,994 (₹1,499/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-mono flex items-baseline gap-2">
                      <span>₹4,699</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">for 6 months (~₹783/mo • 500 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '12mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹17,988 (₹1,499/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 font-mono flex items-baseline gap-2">
                      <span>₹8,999</span>
                      <span className="text-xs text-emerald-400 font-bold font-sans">/ 1 Year (₹749/mo • 🌟 UNLIMITED Products)</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">WhatsApp + Instagram + Google 1-Tap Review Booster + Full CRM</p>

              <div className="space-y-2.5 text-xs text-gray-300 border-t border-gray-800/80 pt-4">
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> <strong>Everything in Essential Growth +</strong></div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> <strong>1-Tap 5-Star Google Review Booster Engine</strong></div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Multi-Agent Shared Team Inbox (3 Staff Included)</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Automated CRM Lead Stages & Distribution</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Meta Approved Bulk Template Broadcaster</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> 1-Click Social Media Batch Publisher</div>
              </div>
            </div>

            <Link
              to="/register"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-black font-black text-xs text-center transition-all shadow-lg hover:opacity-95"
            >
              Start 14-Day Free Trial (₹0) 🚀
            </Link>
          </div>

        </div>

        {/* Modular Add-ons Section */}
        <div className="bg-gray-950/80 border border-gray-800 rounded-3xl p-6 sm:p-10 text-left mb-16">
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-black text-purple-400 uppercase tracking-wider">Modular Freedom</span>
            <h3 className="text-2xl font-bold text-white mt-1">Flexible Micro Add-Ons</h3>
            <p className="text-xs text-gray-400 mt-1">Only pay for extra resources when your business actually needs them.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {addOns.map((add, i) => (
              <div key={i} className="bg-black/60 border border-gray-800/80 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="p-2.5 rounded-xl bg-gray-900 inline-block mb-3">{add.icon}</div>
                  <h4 className="font-bold text-sm text-white mb-1">{add.title}</h4>
                  <p className="text-[11px] text-gray-400 mb-4">{add.desc}</p>
                </div>
                <div className="text-xs font-black text-emerald-400 pt-2 border-t border-gray-800">{add.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Banner */}
        <div className="bg-gradient-to-r from-purple-900/30 via-pink-950/20 to-emerald-950/20 border border-purple-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-left mb-16">
          <div>
            <span className="text-[10px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Zero Markup Promise</span>
            <h4 className="text-xl sm:text-2xl font-black text-white mt-2">How do we compare against WATI & ManyChat?</h4>
            <p className="text-xs text-gray-300 mt-1 max-w-xl">See why over 1,200+ Indian businesses save up to 70% monthly by switching to DealClose AI.</p>
          </div>
          <Link to="/compare" className="shrink-0 px-6 py-3 bg-white text-black font-bold text-xs rounded-xl shadow-lg hover:bg-gray-100 transition-all">
            View Full Comparison →
          </Link>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto text-left">
          <h3 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-gray-950 border border-gray-800 rounded-2xl p-5">
                <h4 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                  <HelpCircle size={15} className="text-purple-400 shrink-0" /> {faq.q}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
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
