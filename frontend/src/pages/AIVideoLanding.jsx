import React from 'react';
import { Link } from 'react-router-dom';

export default function AIVideoLanding() {
  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans overflow-x-hidden selection:bg-pink-500/30">
      
      {/* Minimal Navbar */}
      <nav className="w-full z-50 bg-transparent py-6 px-8 flex justify-between items-center absolute top-0">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tighter">
          <span className="text-pink-500 text-3xl">🎥</span> DealClose Studio
        </div>
        <Link to="/register" className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-transform">
          Try for Free
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 max-w-6xl mx-auto text-center">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] bg-pink-600/20 blur-[150px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 text-sm font-bold text-pink-400 mb-8">
            ✨ Next-Gen AI Video Generator
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Turn Text & Images into <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400">
              Cinematic Videos.
            </span>
          </h1>
          
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            Create stunning AI animations, talking avatars, and marketing videos in seconds. No video editing skills required. Just type your prompt and watch the magic.
          </p>
          
          <div className="flex justify-center gap-4">
            <Link to="/ai-video/dashboard" className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-full shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all">
              Start Creating Now
            </Link>
          </div>
        </div>
      </section>

      {/* Video Features Grid */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl hover:border-pink-500/50 transition-colors">
            <div className="text-4xl mb-4">🖼️ ➔ 🎬</div>
            <h3 className="text-xl font-bold mb-2">Image to Video</h3>
            <p className="text-gray-400 text-sm">Upload any static image and let our AI breathe life into it with realistic motion and fluid dynamics.</p>
          </div>
          
          <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl hover:border-purple-500/50 transition-colors">
            <div className="text-4xl mb-4">✍️ ➔ 🎥</div>
            <h3 className="text-xl font-bold mb-2">Text to Video</h3>
            <p className="text-gray-400 text-sm">Describe the scene you want in plain English, and our cinematic engine will generate high-quality B-roll footage.</p>
          </div>
          
          <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl hover:border-indigo-500/50 transition-colors">
            <div className="text-4xl mb-4">🗣️ ➔ 👤</div>
            <h3 className="text-xl font-bold mb-2">Talking Avatars</h3>
            <p className="text-gray-400 text-sm">Upload a portrait, type a script, and instantly generate a photorealistic video of the person speaking with perfect lip-sync.</p>
          </div>
        </div>
      </section>

      {/* Back to main CRM */}
      <div className="text-center py-10 border-t border-gray-900 mt-10">
        <Link to="/" className="text-gray-500 hover:text-white text-sm">← Back to Main DealClose CRM</Link>
      </div>

    </div>
  );
}