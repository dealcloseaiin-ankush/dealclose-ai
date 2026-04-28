import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    { q: "What is DealClose AI?", a: "DealClose AI is an omnichannel automation platform that lets businesses deploy AI agents to handle customer chats on WhatsApp, Instagram, and even make phone calls autonomously." },
    { q: "Is DealClose an official Tech Provider?", a: "Yes, we integrate using the official Meta Cloud API for WhatsApp and Instagram to ensure your business account is completely safe and compliant." },
    { q: "Can the AI Agent talk on voice calls?", a: "Absolutely! Our system uses advanced Text-to-Speech and LLMs to have real-time, human-like voice conversations to qualify leads and close deals." },
    { q: "How does Cart Recovery work?", a: "Once integrated with your website (e.g., Shopify), our system tracks abandoned carts. If a customer leaves without buying, our AI waits 15 minutes and automatically sends a personalized WhatsApp reminder." },
    { q: "Is my customers' data safe?", a: "Yes. We use industry-standard encryption. We only process messages to generate AI responses and do not sell your data to any third party." },
    { q: "Do I need coding knowledge?", a: "No! Our platform is designed to be plug-and-play. You can set up your AI agent, connect WhatsApp, and upload your products directly from our intuitive dashboard." }
  ];

  return (
    <div className="p-8 md:p-16 bg-[#030303] text-gray-300 min-h-screen font-sans">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm font-bold mb-6 inline-block">← Back to Home</Link>
        
        <h1 className="text-4xl font-extrabold text-white mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-400 mb-10">Everything you need to know about the product and billing.</p>
        
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-800 rounded-2xl overflow-hidden bg-[#111]">
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)} 
                className="w-full px-6 py-4 text-left flex justify-between items-center font-semibold text-lg text-white hover:bg-gray-800/50 transition-colors"
              >
                {faq.q}
                <span className="text-purple-500 text-2xl">{openIndex === index ? '−' : '+'}</span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 text-gray-400 leading-relaxed border-t border-gray-800 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center bg-purple-900/10 border border-purple-500/20 p-8 rounded-3xl">
          <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
          <p className="text-gray-400 mb-4">Our support team is here to help you 24/7.</p>
          <Link to="/help" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors">Contact Support</Link>
        </div>
      </div>
    </div>
  );
}