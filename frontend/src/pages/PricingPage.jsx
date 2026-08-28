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
      id: 'starter',
      name: 'Micro Starter',
      tagline: 'Best for local shops, boutiques & solo founders',
      priceMonthly: 199,
      priceAnnual: 149,
      badge: '14-Day Free Trial',
      highlight: false,
      features: [
        'Official WhatsApp Cloud API Access',
        '1 Business WhatsApp & Instagram Account',
        'Instagram Comment-to-DM Auto-replies',
        'Quick Keyword Broadcast Engine',
        'Direct WhatsApp Catalog & PDF Sharing',
        '1 Team Agent Access',
        'Zero Markup on Meta Conversations',
        'Community & WhatsApp Support',
      ],
      cta: 'Start 14-Day Free Trial',
      ctaLink: '/register',
    },
    {
      id: 'growth',
      name: 'Business Pro',
      tagline: 'For growing retail, real estate & e-commerce brands',
      priceMonthly: 499,
      priceAnnual: 399,
      badge: 'Most Popular ⭐',
      highlight: true,
      features: [
        'Everything in Micro Starter +',
        'Visual Drag & Drop Flow & Bot Builder',
        'Multi-Agent Shared Team Inbox (Up to 3 Users)',
        'Automated Abandoned Cart & COD Verification',
        'Smart AI Intent Recovery for Comments',
        'Google Business & Local Demand Search Insights',
        'Webhook & Shopify / WooCommerce Sync',
        'Priority 24/7 WhatsApp & Call Support',
      ],
      cta: 'Start 14-Day Free Trial',
      ctaLink: '/register',
    },
    {
      id: 'omnichannel',
      name: 'Omnichannel AI',
      tagline: 'Complete automation with Human-like Inbound Voice AI',
      priceMonthly: 999,
      priceAnnual: 799,
      badge: 'Full Automation Suite',
      highlight: false,
      features: [
        'Everything in Business Pro +',
        'AI Voice Calling Agent (Inbound & Outbound)',
        'Meta Ads Automation & Real-time ROAS Tracker',
        'Multi-Workspace & Branch Management (5 Users)',
        'Custom CRM Integrations & Webhooks',
        'Dedicated Account Onboarding Specialist',
        'Free Official Meta Green Tick Application Support',
      ],
      cta: 'Get Full Access',
      ctaLink: '/register',
    }
  ];

  const addOns = [
    { icon: <Users className="text-blue-400" size={20} />, title: 'Extra Team Agent', desc: 'Add more agents to your shared inbox', price: '₹99 / agent / mo' },
    { icon: <InstagramIcon className="text-pink-400" size={20} />, title: 'Extra Social Channel', desc: 'Connect additional Instagram / FB Page', price: '₹199 / channel / mo' },
    { icon: <Phone className="text-green-400" size={20} />, title: 'AI Calling Minutes Pack', desc: 'High-quality Indian accent voice bot', price: '₹1.50 / minute' },
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

        {/* Monthly vs Annual Toggle */}
        <div className="inline-flex items-center bg-gray-900 border border-gray-800 p-1 rounded-xl shadow-inner mb-10">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === 'annual' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            Annual Billing <span className="bg-emerald-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">Save 25%</span>
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-16">
          {plans.map((plan) => {
            const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-purple-950/40 via-gray-950 to-black border-2 border-purple-500/60 shadow-2xl shadow-purple-500/10 -translate-y-1'
                    : 'bg-gray-950 border border-gray-800 hover:border-gray-700'
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${plan.highlight ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>
                    {plan.badge}
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-gray-400 mb-6 min-h-[32px]">{plan.tagline}</p>

                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-black text-white">₹{price}</span>
                    <span className="text-xs text-gray-400">/ month</span>
                  </div>

                  <Link
                    to={plan.ctaLink}
                    className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all mb-8 shadow-lg ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-400 text-black hover:opacity-95'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {plan.cta} <ArrowRight size={14} />
                  </Link>

                  <div className="border-t border-gray-800/80 pt-6 space-y-3">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">What's Included:</p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                        <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-900/60 text-[10px] text-gray-500 text-center">
                  14 days free trial • Cancel anytime
                </div>
              </div>
            );
          })}
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
