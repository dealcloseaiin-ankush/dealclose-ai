import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      description: "Perfect for small businesses starting with automation.",
      priceMonthly: "₹999",
      priceAnnual: "₹799",
      features: [
        "Choose 1: WhatsApp OR Instagram",
        "Keyword-based Auto Replies (No AI)",
        "Manual Unified Inbox",
        "1 Admin + 1 Staff Member",
        "Basic Analytics"
      ],
      missingFeatures: [
        "AI Smart Replies",
        "Automated Lead Extraction",
        "Advanced Multi-Staff Routing"
      ],
      buttonText: "Start Free Trial",
      popular: false
    },
    {
      name: "Pro AI",
      description: "Supercharge your sales with AI intelligence.",
      priceMonthly: "₹2,499",
      priceAnnual: "₹1,999",
      features: [
        "Choose 1: WhatsApp + AI OR Insta + AI",
        "ChatGPT-4 Powered Smart Replies",
        "Auto Lead & Order Extraction",
        "Fallback to Human (Smart Handoff)",
        "1 Admin + 3 Staff Members",
        "Upload PDF/Docs for AI Training"
      ],
      missingFeatures: [
        "Omnichannel (WhatsApp + Insta together)",
        "Custom Staff Add-ons"
      ],
      buttonText: "Upgrade to Pro",
      popular: true
    },
    {
      name: "Advanced Omnichannel",
      description: "The ultimate AI CRM for growing teams.",
      priceMonthly: "₹4,999",
      priceAnnual: "₹3,999",
      features: [
        "WhatsApp + Instagram + AI (All in One)",
        "Advanced AI (Learns from past chats)",
        "Multi-Staff Routing (Sales vs Support)",
        "1 Admin + 5 Staff Members Included",
        "Unlimited Staff Add-ons (₹499/user)",
        "Dedicated Account Manager"
      ],
      missingFeatures: [],
      buttonText: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Scale your business with AI. No hidden fees.
          </p>
          
          {/* Monthly/Yearly Toggle */}
          <div className="mt-8 flex justify-center items-center gap-3">
            <span className={`text-sm ${!isAnnual ? 'font-bold text-blue-600' : 'text-gray-500'}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm flex items-center gap-2 ${isAnnual ? 'font-bold text-blue-600' : 'text-gray-500'}`}>
              Annually <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Save 20%</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div key={index} className={`bg-white rounded-2xl shadow-xl overflow-hidden border ${plan.popular ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-200'} flex flex-col`}>
              {plan.popular && (
                <div className="bg-blue-500 text-white text-center py-2 text-sm font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              <div className="p-8 flex-1">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-500 min-h-[48px]">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {isAnnual ? plan.priceAnnual : plan.priceMonthly}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>
                {isAnnual && <p className="text-sm text-green-600 mt-1">Billed annually</p>}
                
                <button className={`mt-8 w-full py-3 px-4 rounded-xl font-bold transition-all ${plan.popular ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                  {plan.buttonText}
                </button>

                <div className="mt-8 space-y-4">
                  {/* Included Features */}
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                  
                  {/* Missing Features */}
                  {plan.missingFeatures.map((feature, i) => (
                    <div key={`missing-${i}`} className="flex items-start gap-3 opacity-50">
                      <X className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="text-gray-500 line-through">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingSection;