import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image, Video, Music, LayoutTemplate, Play, Download, Loader2, Home, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth'; // Import Auth to show user info

export default function AIVideoDashboard() {
  const { user } = useAuth() || {}; // Get logged-in user
  const [activeTab, setActiveTab] = useState('image'); // image, video, audio, templates
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState(null);
  
  // States for AI Chat Widget
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: 'Hi! Need help writing a cool prompt for your video? Just ask me!' }]);

  const trendingPrompts = [
    { image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff', prompt: 'A pair of glowing red Nike sneakers floating in a dark cyberpunk alley, neon lights reflecting on water, cinematic 8k' },
    { image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', prompt: 'Sleek white smartwatch hovering over a minimalist concrete podium, soft sunlight, highly detailed product photography' },
    { image: 'https://images.unsplash.com/photo-1596462502278-27bf85033e5a', prompt: 'Luxury perfume bottle splashing into crystal clear water, slow motion, macro photography' }
  ];

  // Real API Call for Image Generation (Replicate API)
  const handleGenerateImage = async (e) => {
    e.preventDefault();
    if (!prompt) return toast.error("Please enter a prompt!");
    
    setLoading(true);
    try {
      const res = await api.post('/video/generate-image', { prompt });
      setGeneratedAsset({ type: 'image', url: res.data.url });
      toast.success("Image generated successfully!");
    } catch (error) {
      console.error("Image Generation Error:", error);
      toast.error("Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Custom Image Upload
  const handleCustomImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setGeneratedAsset({ type: 'image', url: imageUrl });
    toast.success("Custom image uploaded! You can now animate it.");
  };

  // Real API Call for Image to Video Animation
  const handleAnimateVideo = async (e) => {
    e.preventDefault();
    if (!generatedAsset || generatedAsset.type !== 'image') {
      return toast.error("Please generate or upload an image first!");
    }
    
    setLoading(true);
    try {
      const res = await api.post('/video/animate-image', { imageUrl: generatedAsset.url, prompt });
      setGeneratedAsset({ type: 'video', url: res.data.url });
      toast.success("Video animated successfully!");
    } catch (error) {
      console.error("Video Animation Error:", error);
      toast.error("Failed to animate video.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Trending Prompt Click
  const handleUseTrending = (item) => {
    setPrompt(item.prompt);
    setGeneratedAsset({ type: 'image', url: item.image });
    setActiveTab('video'); // Jump directly to Video Tab
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success("Trending prompt loaded! Click Animate to bring it to life.");
  };

  // Handle Web Chat Submission
  const handleWebChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const newMsgs = [...chatMessages, { role: 'user', text: chatInput }];
    setChatMessages(newMsgs);
    setChatInput('');
    
    try {
      const res = await api.post('/ai/webchat', { message: chatInput });
      setChatMessages([...newMsgs, { role: 'ai', text: res.data.reply }]);
    } catch (error) {
      console.error("Web Chat Error:", error);
      setChatMessages([...newMsgs, { role: 'ai', text: "Sorry, I am busy right now! Please try again." }]);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-pink-500/30">
      {/* Top Navbar */}
      <nav className="w-full bg-[#0a0a0a] border-b border-gray-800 py-4 px-6 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors" title="Home"><Home size={22}/></Link>
          <div className="flex items-center gap-2 text-xl font-bold tracking-tighter border-l border-gray-800 pl-4">
            <span className="text-pink-500 text-2xl">🎥</span> DealClose Studio
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <span className="text-sm font-semibold text-gray-300 hidden md:flex items-center gap-2"><User size={16}/> {user.fullName || 'User'}</span>
          ) : (
            <Link to="/login" className="text-sm font-semibold text-pink-400 hover:text-pink-300">Log In</Link>
          )}
          <span className="text-sm font-bold text-gray-400 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">
            Credits: 50 ⚡
          </span>
          <Link to="/dashboard" className="text-sm text-gray-300 hover:text-white transition-colors bg-gray-800 px-4 py-1.5 rounded-lg font-bold border border-gray-700">
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">Bring Images to Life <span className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-1 rounded uppercase tracking-wider">Max 10-15s</span></h2>
                  <p className="text-gray-400 text-sm">Select a generated image or upload your own, and our cinematic AI will animate it into a short video.</p>
                </div>
                <label className="shrink-0 cursor-pointer bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-gray-700 flex items-center gap-2">
                  📎 Upload Custom Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleCustomImageUpload} />
                </label>
              </div>
              
              <form onSubmit={handleAnimateVideo} className="mb-8">
                <textarea 
                  value={prompt} onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-[#111] border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none resize-none mb-4"
                  rows="2" placeholder="Optional: Describe the motion (e.g. Camera slowly pans forward, lights flashing)"
                ></textarea>
                <button type="submit" disabled={loading || !generatedAsset || generatedAsset.type !== 'image'} className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {loading ? <><Loader2 className="animate-spin" size={18} /> Animating Scene...</> : (!generatedAsset || generatedAsset.type !== 'image') ? '🔒 Generate an Image First' : '🎬 Animate Video'}
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

          {/* Trending Inspiration Section */}
          <div className="mt-16 pt-8 border-t border-gray-800">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">🔥 Trending Community Prompts</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trendingPrompts.map((item, idx) => (
                <div key={idx} onClick={() => handleUseTrending(item)} className="bg-[#111] rounded-2xl overflow-hidden border border-gray-800 hover:border-pink-500/50 cursor-pointer group transition-all">
                  <div className="aspect-video overflow-hidden relative">
                    <img src={item.image} alt="Trending" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-pink-600 text-white px-3 py-1.5 rounded-full font-bold text-sm">Remix</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-300 line-clamp-2">{item.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Floating AI Chat Widget */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
        {isChatOpen && (
          <div className="bg-[#111] border border-pink-500/30 rounded-2xl shadow-2xl w-80 sm:w-96 mb-4 overflow-hidden flex flex-col animate-slide-up origin-bottom-left">
            <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <div>
                  <h3 className="font-bold text-white leading-tight">Studio Assistant</h3>
                  <p className="text-xs text-pink-200">Online | Prompt Expert</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            
            <div className="h-80 p-4 overflow-y-auto flex flex-col gap-3 bg-[#0a0a0a]">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'ai' ? 'bg-[#1a1a1a] text-gray-200 self-start rounded-tl-sm border border-gray-800' : 'bg-pink-600 text-white self-end rounded-tr-sm'}`}>
                  {msg.text}
                </div>
              ))}
            </div>
            
            <form onSubmit={handleWebChat} className="p-3 bg-[#111] border-t border-gray-800 flex gap-2">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask for a prompt idea..." className="flex-1 bg-[#1a1a1a] border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:border-pink-500 outline-none" />
              <button type="submit" className="bg-pink-600 text-white p-2 rounded-xl hover:bg-pink-500 transition-colors">➤</button>
            </form>
          </div>
        )}

        <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-14 h-14 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:scale-110 transition-transform text-2xl relative">
          {isChatOpen ? '✕' : '✨'}
        </button>
      </div>

    </div>
  );
}