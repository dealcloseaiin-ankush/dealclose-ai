import React, { useState, useEffect } from 'react';
import { Image, CheckCircle, XCircle, RefreshCw, Send, Loader2, Sparkles } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import DashboardAIAssistant from '../components/DashboardAIAssistant';

export default function AutoMarketerDashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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
          imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
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
            <div key={post._id} className="bg-[#111] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col group">
              {/* Image Header */}
              <div className="w-full aspect-square relative bg-black overflow-hidden border-b border-gray-800">
                <img 
                  src={post.imageUrl} 
                  alt="AI Generated" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-gray-700 uppercase tracking-wider">
                  {new Date(post.createdAt).toLocaleDateString()}
                </div>
                
                {post.status === 'posted' && (
                  <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-green-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-xl shadow-green-500/30">
                      <CheckCircle size={20} /> Published to Meta
                    </div>
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex-1">
                  <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed mb-4">
                    {post.caption}
                  </p>
                </div>

                {/* Action Buttons */}
                {post.status === 'pending_approval' && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-800">
                    <button 
                      onClick={() => handleReject(post._id)}
                      className="flex-1 py-3 bg-[#1a1a1a] hover:bg-gray-800 text-gray-400 font-bold rounded-xl transition-colors border border-gray-700 flex items-center justify-center gap-2"
                    >
                      <XCircle size={18} /> Reject
                    </button>
                    
                    <button 
                      onClick={() => handleApprove(post._id)}
                      disabled={publishingId === post._id}
                      className="flex-[2] py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {publishingId === post._id ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
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