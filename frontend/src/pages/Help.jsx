import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Help() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="p-8 md:p-16 bg-[#030303] text-gray-300 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm font-bold mb-6 inline-block">← Back to Home</Link>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h1 className="text-4xl font-extrabold text-white mb-4">Help & Support</h1>
            <p className="text-gray-400 mb-8">Need assistance with your AI agent or Meta integration? We are here to help.</p>
            
            <div className="space-y-6">
              <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
                <h3 className="text-xl font-bold text-white mb-2">📧 Email Us</h3>
                <p className="text-gray-400 mb-2">For general queries and technical support.</p>
                <a href="mailto:dealcloseai.in@gmail.com" className="text-purple-400 font-bold hover:underline">dealcloseai.in@gmail.com</a>
              </div>
              
              <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
                <h3 className="text-xl font-bold text-white mb-2">📞 Call Us</h3>
                <p className="text-gray-400 mb-2">Available Mon-Fri, 9 AM - 6 PM (IST).</p>
                <p className="text-purple-400 font-bold">+91-98765XXXXX</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111] p-8 rounded-3xl border border-gray-800 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Open a Support Ticket</h2>
            {submitted ? (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-6 rounded-xl text-center font-bold">Thank you! Your ticket has been submitted. Our team will contact you shortly.</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Your Name" required className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none" />
                <input type="email" placeholder="Your Email" required className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none" />
                <textarea rows="4" placeholder="Describe your issue..." required className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none"></textarea>
                <button type="submit" className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/30">Submit Ticket</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}