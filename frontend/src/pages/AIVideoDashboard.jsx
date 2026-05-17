import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image, Video, Music, LayoutTemplate, Play, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIVideoDashboard() {
  const [activeTab, setActiveTab] = useState('image'); // image, video, audio, templates
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState(null);

  // Mock Process for Image Generation (No backend required)
  const handleGenerateImage = async (e) => {
    e.preventDefault();
    if (!prompt) return toast.error("Please enter a prompt!");
    
    setLoading(true);
    try {
      // Simulate AI Processing Delay for 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3000));
      // Provide a high-quality placeholder image for demo
      setGeneratedAsset({ type: 'image', url: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=1000&auto=format&fit=crop' });
      toast.success("Image generated successfully!");
    } catch (error) {
      console.error("Image Generation Error:", error);
      toast.error("Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  // Mock Process for Image to Video Animation
  const handleAnimateVideo = async (e) => {
    e.preventDefault();
    if (!generatedAsset || generatedAsset.type !== 'image') {
      return toast.error("Please generate or upload an image first!");
    }
    
    setLoading(true);
    try {
      // Simulate AI Processing Delay for 4 seconds
      await new Promise((resolve) => setTimeout(resolve, 4000));
      // Provide a placeholder demo video (free sample video)
      setGeneratedAsset({ type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4' });
      toast.success("Video animated successfully!");
    } catch (error) {
      console.error("Video Animation Error:", error);
      toast.error("Failed to animate video.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-pink-500/30">
      {/* Top Navbar */}
      <nav className="w-full bg-[#0a0a0a] border-b border-gray-800 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-2 text-xl font-bold tracking-tighter">
          <span className="text-pink-500 text-2xl">🎥</span> DealClose Studio
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-gray-400 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">
            Credits: 50 ⚡
          </span>
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
            Back to CRM
          </Link>
        </div>
      </nav>

      <div className="flex max-w-7xl mx-auto mt-8 px-4 gap-8">
        {/* Left Sidebar Tools */}
        <div className="w-64 flex flex-col gap-2">
          <button onClick={() => setActiveTab('image')} className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${activeTab === 'image' ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 text-pink-400 border border-pink-500/30' : 'bg-[#111] text-gray-400 hover:bg-gray-900 border border-gray-800'}`}>
            <Image size={20} /> Generate Image
          </button>
          <button onClick={() => setActiveTab('video')} className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${activeTab === 'video' ? 'bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-purple-400 border border-purple-500/30' : 'bg-[#111] text-gray-400 hover:bg-gray-900 border border-gray-800'}`}>
            <Video size={20} /> Image to Video
          </button>
          <button onClick={() => setActiveTab('audio')} className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${activeTab === 'audio' ? 'bg-gradient-to-r from-indigo-600/20 to-blue-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-[#111] text-gray-400 hover:bg-gray-900 border border-gray-800'}`}>
            <Music size={20} /> AI Audio & BGM
          </button>
          <button onClick={() => setActiveTab('templates')} className={`flex items-center gap-3 p-4 rounded-xl font-bold transition-all ${activeTab === 'templates' ? 'bg-gradient-to-r from-orange-600/20 to-red-600/20 text-orange-400 border border-orange-500/30' : 'bg-[#111] text-gray-400 hover:bg-gray-900 border border-gray-800'}`}>
            <LayoutTemplate size={20} /> Video Templates
          </button>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 bg-[#0a0a0a] border border-gray-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-pink-900/10">
          
          {activeTab === 'image' && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-2">Generate Base Image</h2>
              <p className="text-gray-400 text-sm mb-6">Describe the scene to generate an ultra-realistic starting frame for your video.</p>
              
              <form onSubmit={handleGenerateImage} className="mb-8">
                <textarea 
                  value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none resize-none mb-4"
                  rows="3" placeholder="e.g. A futuristic sports car driving through a neon-lit cyberpunk city at night, 8k resolution, cinematic lighting..."
                ></textarea>
                <button type="submit" disabled={loading} className="px-8 py-3 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl shadow-lg shadow-pink-600/20 transition-all disabled:opacity-50 flex items-center gap-2">
                  {loading ? <><Loader2 className="animate-spin" size={18} /> Generating...</> : '✨ Generate Image'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">Bring Images to Life <span className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-1 rounded uppercase tracking-wider">Max 10-15s</span></h2>
              <p className="text-gray-400 text-sm mb-6">Select a generated image or upload your own, and our cinematic AI will animate it into a short 10-15 second video.</p>
              
              <form onSubmit={handleAnimateVideo} className="mb-8">
                <textarea 
                  value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none resize-none mb-4"
                  rows="2" placeholder="Optional: Describe the motion (e.g. Camera slowly pans forward, lights flashing)"
                ></textarea>
                <button type="submit" disabled={loading || !generatedAsset} className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 flex items-center gap-2">
                  {loading ? <><Loader2 className="animate-spin" size={18} /> Animating Scene...</> : '🎬 Animate Video'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-2">Pre-built Video Templates</h2>
              <p className="text-gray-400 text-sm mb-6">Just upload your logo or product image into these trending templates to create instant marketing videos.</p>
              <div className="grid grid-cols-3 gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-[#111] border border-gray-800 rounded-xl aspect-video relative group cursor-pointer hover:border-orange-500 transition-colors">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                      <Play className="text-white/70 group-hover:text-white group-hover:scale-110 transition-transform" size={32} />
                    </div>
                    <span className="absolute bottom-2 left-2 text-xs font-bold bg-black/60 px-2 py-1 rounded">Promo Style {i}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Area (Output) */}
          <div className="mt-8 border-t border-gray-800 pt-8">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Output / Preview</h3>
            
            <div className="w-full aspect-video bg-[#050505] rounded-2xl border border-gray-800 flex items-center justify-center relative overflow-hidden group">
              {!generatedAsset && !loading && (
                <div className="text-center text-gray-600">
                  <Play size={48} className="mx-auto mb-2 opacity-20" />
                  <p>Your creation will appear here</p>
                </div>
              )}
              
              {loading && (
                <div className="text-center text-pink-500">
                  <Loader2 size={48} className="animate-spin mx-auto mb-4" />
                  <p className="font-bold animate-pulse">AI is rendering magic...</p>
                  <p className="text-xs text-gray-500 mt-2">This usually takes 15-30 seconds</p>
                </div>
              )}

              {generatedAsset && !loading && generatedAsset.type === 'image' && (
                <>
                  <img src={generatedAsset.url} alt="AI Generated" className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button className="bg-black/80 hover:bg-black p-2 rounded-lg border border-gray-700 text-white" title="Download"><Download size={18}/></button>
                  </div>
                </>
              )}

              {generatedAsset && !loading && generatedAsset.type === 'video' && (
                <>
                  <video src={generatedAsset.url} autoPlay loop muted controls className="w-full h-full object-cover" />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button className="bg-black/80 hover:bg-black p-2 rounded-lg border border-gray-700 text-white" title="Download"><Download size={18}/></button>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}