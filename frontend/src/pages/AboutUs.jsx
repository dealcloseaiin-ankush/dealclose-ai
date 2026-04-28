import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutUs() {
  return (
    <div className="p-8 md:p-16 bg-[#030303] text-gray-300 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto bg-[#111111] p-8 rounded-3xl border border-gray-800 shadow-2xl text-center md:text-left">
        <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm font-bold mb-6 inline-block">← Back to Home</Link>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-6">
          About DealClose AI
        </h1>
        
        <div className="space-y-6 text-lg leading-relaxed">
          <p>
            At <strong>DealClose AI</strong>, we believe that businesses shouldn't miss out on sales just because they are asleep or too busy. We are building the ultimate omnichannel AI workforce for modern enterprises and retail brands.
          </p>
          
          <p>
            Our platform integrates cutting-edge Generative AI with global communication channels like WhatsApp, Instagram, and Voice Networks. We empower businesses to deploy intelligent agents that can naturally converse with customers, answer complex queries, and autonomously recover abandoned carts.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">Our Mission</h3>
              <p className="text-sm text-gray-400">To democratize enterprise-grade AI sales automation for businesses of all sizes.</p>
            </div>
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">Our Tech</h3>
              <p className="text-sm text-gray-400">Powered by advanced LLMs, Meta Cloud APIs, and real-time voice infrastructure.</p>
            </div>
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">Compliance</h3>
              <p className="text-sm text-gray-400">Strict adherence to data privacy laws and Meta's official API guidelines.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}