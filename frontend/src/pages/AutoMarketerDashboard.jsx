import React, { useState, useEffect } from 'react';
import { Image, CheckCircle, XCircle, RefreshCw, Send, Loader2, Sparkles, Heart, MessageCircle, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight, Dot } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import DashboardAIAssistant from '../components/DashboardAIAssistant';
import { useAuth } from '../hooks/useAuth';

export default function AutoMarketerDashboard() {
  const { user } = useAuth() || {};
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  // 🚀 NEW: Carousel State for each post
  const [carouselIndexes, setCarouselIndexes] = useState({});

  const handleCarouselNav = (postId, direction) => {
    setCarouselIndexes(prev => {
      const post = posts.find(p => p._id === postId);
      if (!post || !post.media || post.media.length === 0) return prev;
      const currentIndex = prev[postId] || 0;
      const newIndex = direction === 'next' ? (currentIndex + 1) % post.media.length : (currentIndex - 1 + post.media.length) % post.media.length;
      return { ...prev, [postId]: newIndex };
    });
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // Note: You will need to create this simple GET route in your backend later
      // e.g., router.get('/automarketer/posts', getGeneratedPosts);
      const { data } = await api.get('/automarketer/posts');
      setPosts(data.posts || []);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      // Mock data for UI demonstration until backend route is ready
      setPosts([
        {
          _id: "65f1a2b3c4d5e6f7g8h9i0j1",
          caption: "Elevate your everyday style with our premium collection! ✨ Tap the link in bio to shop now. \n\n#Fashion #Style #Trending #DealClose",          
          media: [
            { type: 'image', url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80", textOverlay: "Our Best Seller!" },
            { type: 'image', url: "https://images.unsplash.com/photo-1525966222134-fcfa99b83778?w=800&q=80", textOverlay: "New Arrivals" }
          ],
          status: "pending_approval",
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 NEW: Generate custom post via AI
  const handleGeneratePost = async (e) => {
    e.preventDefault();
    if (!aiPrompt) return;
    setIsGenerating(true);
    toast.loading("AI is generating image and caption...", { id: 'genPost' });
    try {
      const { data } = await api.post('/automarketer/generate', { prompt: aiPrompt });
      toast.success("Post generated successfully!", { id: 'genPost' });
      setPosts([data.post, ...posts]);
      setAiPrompt('');
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate post", { id: 'genPost' });
    } finally { setIsGenerating(false); }
  };

  const handleApprove = async (postId) => {
    setPublishingId(postId);
    toast.loading("Publishing to Instagram...", { id: 'pub' });
    try {
      // Note: Backend route needed: router.post('/automarketer/posts/:id/approve')
      await api.post(`/automarketer/posts/${postId}/approve`);
      toast.success("Successfully published to Instagram!", { id: 'pub' });
      setPosts(posts.map(p => p._id === postId ? { ...p, status: 'posted' } : p));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish post.", { id: 'pub' });
    } finally {
      setPublishingId(null);
    }
  };

  const handleReject = async (postId) => {
    try {
      await api.post(`/automarketer/posts/${postId}/reject`);
      setPosts(posts.map(p => p._id === postId ? { ...p, status: 'rejected' } : p));
      toast.success("Post rejected.");
    } catch (err) {
      console.error("Rejection Error:", err);
      toast.error("Failed to reject post.");
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 mb-2">
          Auto-Pilot Marketer 🚀
        </h1>
        <p className="text-gray-400">
          AI generates daily posts for you. Review, approve, and auto-publish them to Instagram & Facebook instantly.
        </p>
      </div>

      {/* 🚀 NEW: Prompt Box to create posts on-demand */}
      <div className="bg-[#111] border border-pink-500/30 p-6 rounded-3xl shadow-xl mb-8">
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Sparkles className="text-pink-500" size={20}/> Draft a Custom Post</h2>
        <p className="text-gray-400 text-sm mb-4">Want to post about a special offer today? Tell the AI what to make.</p>
        <form onSubmit={handleGeneratePost} className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g. A Diwali discount post offering 20% off on all sneakers..." className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-pink-500 outline-none text-sm" disabled={isGenerating} />
          <button type="submit" disabled={isGenerating || !aiPrompt.trim()} className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg disabled:opacity-50 whitespace-nowrap">{isGenerating ? 'Generating...' : 'Generate Post'}</button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="animate-spin text-pink-500" size={48} />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-[#111] border border-gray-800 rounded-3xl p-10 text-center flex flex-col items-center">
          <div className="bg-pink-500/10 p-4 rounded-full mb-4">
            <Image className="text-pink-500" size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2">No AI Posts Yet</h2>
          <p className="text-gray-400 max-w-md">
            The AI will generate your first post automatically tomorrow morning. Make sure your Business Description is filled out in Settings!
          </p>
          <button onClick={fetchPosts} className="mt-6 px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-colors">
            <RefreshCw size={16} className="inline mr-2" /> Check Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {posts.map((post) => (
            <div key={post._id} className="bg-black border border-gray-800 rounded-[24px] overflow-hidden shadow-2xl flex flex-col group max-w-sm mx-auto w-full relative">
              
              {/* 🚀 IG MOCKUP HEADER */}
              <div className="flex items-center justify-between p-3 border-b border-gray-900 bg-black">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
                    <div className="w-full h-full bg-black rounded-full border-2 border-black overflow-hidden flex items-center justify-center text-[10px] font-bold">
                      {user?.businessName ? user.businessName.substring(0, 2).toUpperCase() : 'IG'}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{user?.businessName?.replace(/\s/g, '').toLowerCase() || 'yourbrand'}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">Sponsored</p>
                  </div>
                </div>
                <MoreHorizontal size={16} className="text-gray-500" />
              </div>

              {/* Image Content */}
              <div className="w-full aspect-square relative bg-[#111] overflow-hidden">
                {/* 🚀 UPGRADE: Carousel Image Display */}
                {post.media && post.media.length > 0 ? post.media.map((mediaItem, index) => (
                  <div key={index} className={`absolute inset-0 transition-opacity duration-500 ${ (carouselIndexes[post._id] || 0) === index ? 'opacity-100' : 'opacity-0' }`}>
                    <img src={mediaItem.url} alt={`AI Generated ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {mediaItem.textOverlay && <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white text-center p-2 rounded-lg text-sm font-bold backdrop-blur-sm">{mediaItem.textOverlay}</div>}
                  </div>
                )) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900"><Image className="text-gray-700" size={48}/></div>
                )}
                
                {post.status === 'posted' && (
                  <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center backdrop-blur-sm z-20">
                    <div className="bg-green-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-xl shadow-green-500/30">
                      <CheckCircle size={20} /> Published to Meta
                    </div>
                  </div>
                )}

                {/* 🚀 UPGRADE: Carousel Navigation */}
                {post.media && post.media.length > 1 && (
                  <>
                    <button onClick={() => handleCarouselNav(post._id, 'prev')} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full z-10 hover:bg-black/60"><ChevronLeft size={20}/></button>
                    <button onClick={() => handleCarouselNav(post._id, 'next')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full z-10 hover:bg-black/60"><ChevronRight size={20}/></button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                      {post.media.map((_, index) => (
                        <Dot key={index} className={`transition-colors ${(carouselIndexes[post._id] || 0) === index ? 'text-white' : 'text-white/40'}`} />
                      ))}
                    </div>
                  </>
                )}

                {/* 🚀 UPGRADE: Carousel Navigation */}
                {post.media.length > 1 && (
                  <>
                    <button onClick={() => handleCarouselNav(post._id, 'prev')} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full z-10 hover:bg-black/60"><ChevronLeft size={20}/></button>
                    <button onClick={() => handleCarouselNav(post._id, 'next')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full z-10 hover:bg-black/60"><ChevronRight size={20}/></button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                      {post.media.map((_, index) => (
                        <Dot key={index} className={`transition-colors ${(carouselIndexes[post._id] || 0) === index ? 'text-white' : 'text-white/40'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 🚀 IG MOCKUP ACTIONS */}
              <div className="p-4 pb-1 bg-black flex justify-between items-center">
                <div className="flex gap-4">
                  <Heart size={24} className="text-white hover:text-gray-400 cursor-pointer transition-colors" />
                  <MessageCircle size={24} className="text-white hover:text-gray-400 cursor-pointer transition-colors" />
                  <Send size={24} className="text-white hover:text-gray-400 cursor-pointer transition-colors" />
                </div>
                <Bookmark size={24} className="text-white hover:text-gray-400 cursor-pointer transition-colors" />
              </div>

              {/* Content Area / IG MOCKUP CAPTION */}
              <div className="px-4 pb-4 bg-black flex-1 flex flex-col">
                <p className="text-sm font-bold text-white mb-1">1,245 likes</p>
                <div className="flex-1">
                  <p className="text-gray-200 text-sm leading-relaxed mb-1 line-clamp-3 hover:line-clamp-none transition-all cursor-pointer">
                    <span className="font-bold text-white mr-2">{user?.businessName?.replace(/\s/g, '').toLowerCase() || 'yourbrand'}</span>
                    {post.caption}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Action Buttons */}
                {post.status === 'pending_approval' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-900">
                    <button 
                      onClick={() => handleReject(post._id)}
                      className="flex-1 py-2.5 bg-[#1a1a1a] hover:bg-gray-800 text-gray-400 font-bold rounded-lg transition-colors border border-gray-800 flex items-center justify-center gap-2 text-sm"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                    
                    <button 
                      onClick={() => handleApprove(post._id)}
                      disabled={publishingId === post._id}
                      className="flex-[2] py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-pink-600/20 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                    >
                      {publishingId === post._id ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                      {publishingId === post._id ? 'Publishing...' : 'Approve & Publish'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* AI Assistant Chatbot */}
      <DashboardAIAssistant />
    </div>
  );
}