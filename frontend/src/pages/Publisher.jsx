import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Edit, Plus, BarChart2, Trash2, Download, Sparkles, MessageSquare, Send, X, RefreshCw, Heart, Eye, Share2, Bookmark } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth'; // 🚀 NEW: Import useAuth to get user and workspaces
import useWorkspaceStore from '../store/workspaceStore'; // 🚀 NEW: Import workspace store
import toast from 'react-hot-toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DashboardAIAssistant from '../components/DashboardAIAssistant';

export default function Publisher() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list, analytics, planner
  const [filter, setFilter] = useState('all'); // all, scheduled, published, drafts, failed
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [plannerPrompt, setPlannerPrompt] = useState('Create a 4-week Instagram content plan for my business. Suggest 3 posts per week, ideal posting days, and how to improve the caption angle for better engagement.');
  const [plannerResponse, setPlannerResponse] = useState('');
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerScheduleLoading, setPlannerScheduleLoading] = useState(false);
  
  // 🚀 NEW: Workspace states
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }]);
  const { activeWorkspaceId: activeWorkspace, setActiveWorkspaceId: setActiveWorkspace } = useWorkspaceStore(); // 🚀 FIX: Use global workspace state

  // 🚀 NEW: State for the Comments Modal
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState(null);
  const [comments, setComments] = useState([]);
  // 🚀 FIX: 'fileInputRef' was not defined. Added useRef to create the reference.
  const fileInputRef = useRef(null);

  const [replyTexts, setReplyTexts] = useState({}); // ✅ FIX: State to hold reply text for each comment individually

  const isSyncing = useRef(false);

  useEffect(() => {
    if (user) {
      setWorkspaces([{ _id: 'main', name: user.businessName || 'Main Business' }, ...(user.workspaces || [])]);
    }
  }, [user]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ... (filter === 'all' ? {} : { status: filter }), workspaceId: activeWorkspace };
      const { data } = await api.get('/posts', { params });
      if (data.success) {
        const nextPosts = [...(data.posts || [])].sort((a, b) => {
          const aDate = new Date(a.publishedAt || a.scheduledAt || a.createdAt || 0).getTime();
          const bDate = new Date(b.publishedAt || b.scheduledAt || b.createdAt || 0).getTime();
          return bDate - aDate;
        });
        setPosts(nextPosts);
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        toast.error('Failed to fetch posts.');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  }, [filter, activeWorkspace]); // Add activeWorkspace to dependencies

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const { data } = await api.get('/posts/analytics', { params: { workspaceId: activeWorkspace } });
      if (data.success) {
        setAnalytics({
          totalReach: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalSaves: 0,
          totalProfileVisits: 0,
          engagementRate: 0,
          bestTimeToPost: 'N/A',
          aiRecommendation: 'Live analytics are syncing from Instagram.',
          ...data.analytics,
          topPosts: Array.isArray(data.analytics?.topPosts) ? data.analytics.topPosts : [],
        });
      }
    } catch (error) {
      toast.error('Failed to fetch analytics.');
      console.error(error);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [activeWorkspace]);

  const syncInstagramPosts = useCallback(async (showToast = false, refreshInsights = false) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    const toastId = showToast ? toast.loading('Syncing live Instagram posts...') : null;
    try {
      const { data } = await api.post('/posts/import-instagram', { workspaceId: activeWorkspace, refreshInsights });
      if (showToast) toast.success(data.message, { id: toastId });
    } catch (error) {
      if (showToast) toast.error(error.response?.data?.message || 'Instagram sync failed.', { id: toastId });
    } finally {
      isSyncing.current = false;
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (view === 'list') {
      fetchPosts();
    } else if (view === 'analytics') {
      fetchAnalytics();
    }
  }, [filter, view, fetchPosts, fetchAnalytics]);

  // Initial silent background sync on component mount
  useEffect(() => {
    syncInstagramPosts();
  }, [syncInstagramPosts]);

  // A publish job completes asynchronously. Refresh while one is in flight so
  // the Publisher switches to "published" without requiring a manual reload.
  useEffect(() => {
    if (!posts.some(post => post.status === 'publishing')) return undefined;
    const timer = window.setInterval(fetchPosts, 5000);
    return () => window.clearInterval(timer);
  }, [posts, fetchPosts]);

  // 🚀 NEW: Delete a post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to permanently delete this post? This action cannot be undone.')) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
      toast.success('Post deleted successfully.');
    } catch (error) {
      toast.error('Failed to delete post.');
      console.error(error);
    }
  };

  // 🚀 NEW: Import existing posts from Instagram
  const handleImportPosts = async () => {
    try {
      await syncInstagramPosts(true);
      fetchPosts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to import posts.');
    }
  };

  // 🚀 NEW: Enhance post with AI
  const handleEnhanceWithAI = (postId) => {
    // This will navigate to the editor with the post ID
    // The editor will then fetch the post and allow AI enhancement.
    toast.success('Loading post in editor for AI enhancement...');
    navigate(`/publish-post?import_id=${postId}`);
  };

  // 🚀 NEW: Trigger file input click
  const handleCreatePostClick = () => {
    fileInputRef.current.click();
  };

  // 🚀 NEW: Handle file selection and navigate to editor
  const handleFileSelectForNewPost = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Use state to pass the file to the editor component
      navigate('/publish-post', { state: { newPostFile: file } });
    }
  };

  // 🚀 NEW: Download post media
  const handleDownloadPost = async (postId, mediaUrl) => {
    if (!mediaUrl) {
      toast.error('This post has no media to download.');
      return;
    }
    const toastId = toast.loading('Preparing download...');
    try {
      // We can't use api.get for file streams easily.
      // Instead, we'll open the backend URL in a new tab, which will trigger the browser's download prompt.
      const downloadUrl = `${api.defaults.baseURL}/posts/${postId}/download`;
      window.open(downloadUrl, '_blank');
      toast.success('Download started!', { id: toastId });
    } catch (error) {
      console.error("Download failed:", error); // 🚀 FIX: Log the actual error
      toast.error('Download failed.', { id: toastId });
    }
  };

  // 🚀 NEW: Open comments modal and fetch comments
  const handleOpenComments = useCallback(async (post) => {
    // ✅ FIX: Only set state on initial open, not on subsequent polling calls.
    // This prevents the modal from re-rendering and the comments from "blinking".
    if (!isCommentModalOpen) {
      setSelectedPostForComments(post);
      setIsCommentModalOpen(true);
      setComments([]); // Clear old comments from previous modal
      setReplyTexts({});
    }
    try {
      const instagramPostId = post.platformPostIds?.instagram;
      if (!instagramPostId) throw new Error('This post is not available on Instagram yet.');
      const { data } = await api.get(`/instagram/posts/${instagramPostId}/comments`, {
        params: { workspaceId: activeWorkspace }
      });
      if (data.success) {
        // 🚀 DEBUG: Log the raw data received from the Meta API to the browser console.
        // This will show exactly what fields are available for each comment (like 'from' and 'username').
        console.log('[DEBUG] Comments data from Meta:', data.comments);
        setComments(data.comments);
      } else {
        // Don't show toast on polling failures, it's annoying.
        if (!isCommentModalOpen) toast.error('Failed to load comments.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not fetch comments.');
    }
  }, [activeWorkspace, isCommentModalOpen]); // ✅ FIX: Add isCommentModalOpen to dependency array

  useEffect(() => {
    if (!isCommentModalOpen || !selectedPostForComments) return undefined;
    const timer = window.setInterval(() => handleOpenComments(selectedPostForComments), 10000);
    return () => window.clearInterval(timer);
  }, [isCommentModalOpen, selectedPostForComments, handleOpenComments]); // 🚀 FIX: Add missing dependency

  // 🚀 NEW: Handle submitting a reply to a comment
  const handleReplySubmit = async (commentId) => {
    const messageToPost = replyTexts[commentId] || '';
    if (!messageToPost.trim()) return;
    const toastId = toast.loading('Posting reply...');
    try {
      const { data } = await api.post(`/instagram/comments/${commentId}/reply`, {
        message: messageToPost,
        workspaceId: activeWorkspace,
        postId: selectedPostForComments._id // ✅ FIX: Send the MongoDB Post ID to the backend
      });
      if (data.success) {
        toast.success('Reply posted!', { id: toastId });
        setReplyTexts(prev => ({ ...prev, [commentId]: '' })); // ✅ FIX: Clear only the specific input field
        // Refresh comments to show the new reply
        if (selectedPostForComments) {
          handleOpenComments(selectedPostForComments);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post reply.', { id: toastId });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this Instagram comment permanently?')) return;
    const toastId = toast.loading('Deleting comment...');
    try {
      await api.delete(`/instagram/comments/${commentId}`, {
        params: { workspaceId: activeWorkspace }
      });
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      toast.success('Comment deleted.', { id: toastId });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete this comment.', { id: toastId });
    }
  };

  // 🚀 NEW: Fetch live insights for a single post
  const handleRefreshStats = async (postId, platformPostId) => {
    if (!platformPostId) return toast.error('This post was not published via API, live stats unavailable.');
    const toastId = toast.loading('Refreshing stats...');
    try {
      const { data } = await api.get(`/instagram/posts/${platformPostId}/insights`, {
        params: { workspaceId: activeWorkspace }
      });
      if (data.success) {
        setPosts(prevPosts => prevPosts.map(p => p._id === postId ? { ...p, analytics: { ...p.analytics, ...data.insights } } : p));
        toast.success('Stats updated!', { id: toastId });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not refresh stats.', { id: toastId });
    }
  };

  // 🚀 NEW: Tatkaal 1-Click Instant Publish for Scheduled/Draft posts
  const handleInstantPublish = async (postId) => {
    const toastId = toast.loading('Publishing post live now... 🚀');
    try {
      const { data } = await api.post(`/posts/${postId}/publish-now`, {
        workspaceId: activeWorkspace
      });
      if (data.success) {
        toast.success('Post published live successfully! 🎉', { id: toastId });
        fetchPosts();
      } else {
        toast.error(data.message || 'Failed to publish post.', { id: toastId });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not publish post immediately.', { id: toastId });
    }
  };

  const handleGeneratePlanner = async () => {
    if (!plannerPrompt.trim()) {
      toast.error('Please describe your content plan goal first.');
      return;
    }

    setPlannerLoading(true);
    try {
      const { data } = await api.post('/ai/dashboard-assistant', {
        message: plannerPrompt,
        history: [],
      });

      if (data.success) {
        setPlannerResponse(data.reply || 'No AI planning response received.');
        toast.success('AI content plan generated.');
      } else {
        throw new Error(data.message || 'Unable to generate AI plan.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to generate content plan.');
    } finally {
      setPlannerLoading(false);
    }
  };

  const handleSchedulePlanner = async () => {
    if (!plannerResponse.trim()) {
      toast.error('Generate the AI plan first before scheduling it.');
      return;
    }

    setPlannerScheduleLoading(true);
    try {
      const { data } = await api.post('/ai/generate-content-plan-schedule', {
        plannerPrompt,
        plannerResponse,
        workspaceId: activeWorkspace,
      });

      if (data.success) {
        toast.success(data.message || 'AI content plan scheduled successfully.');
      } else {
        throw new Error(data.message || 'Unable to schedule AI plan.');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to schedule content plan.');
    } finally {
      setPlannerScheduleLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <Clock className="text-yellow-400" size={14} />;
      case 'published': return <CheckCircle className="text-green-400" size={14} />;
      case 'failed': return <XCircle className="text-red-400" size={14} />;
      case 'draft':
      default:
        return <Edit className="text-gray-400" size={14} />;
    }
  };

  const analyticsSummary = analytics ? (() => {
    const totalPosts = Math.max(analytics.topPosts?.length || 0, 1);
    const avgReach = Math.round((analytics.totalReach || 0) / totalPosts);
    const avgEngagement = analytics.totalReach ? ((analytics.totalLikes + analytics.totalComments + analytics.totalShares + analytics.totalSaves) / analytics.totalReach * 100).toFixed(2) : 0;
    const bestPost = analytics.topPosts?.[0];

    return {
      avgReach,
      avgEngagement,
      bestPost,
    };
  })() : null;

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
              Social Publisher
            </h1>
            <p className="text-gray-400">Plan, schedule, and analyze your social media content from one place.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleImportPosts} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-700 transition-all">
              <Download size={16} /> Import Posts
            </button>
            {/* 🚀 FIX: Changed Link to a button that triggers file input */}
            <button
              onClick={handleCreatePostClick}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              <Plus size={18} /> Create New Post
            </button>
            {/* Hidden file input */}
            <input type="file" ref={fileInputRef} onChange={handleFileSelectForNewPost} className="hidden" accept="image/*,video/*" />

          </div>
        </div>
        
        {/* 🚀 NEW: Workspace Selector */}
        <div className="mb-6">
          <select
            value={activeWorkspace}
            onChange={(e) => setActiveWorkspace(e.target.value)}
            className="bg-[#1a1a1a] border border-gray-700 text-white text-sm font-semibold rounded-lg px-3 py-2 outline-none focus:border-blue-500 cursor-pointer shadow-sm"
          >
            {workspaces.map(ws => <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>)}
          </select>
        </div>

        {/* View & Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-800 pb-4">
          <button onClick={() => setView('list')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border ${view === 'list' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-[#111] border-gray-800 text-gray-400 hover:bg-gray-900'}`}><Calendar size={16}/> Content</button>
          <button onClick={() => setView('analytics')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border ${view === 'analytics' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-[#111] border-gray-800 text-gray-400 hover:bg-gray-900'}`}><BarChart2 size={16}/> Analytics</button>
          <button onClick={() => setView('planner')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border ${view === 'planner' ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-[#111] border-gray-800 text-gray-400 hover:bg-gray-900'}`}><Sparkles size={16}/> AI Planner</button>
          <div className="w-px h-6 bg-gray-700 mx-2 hidden sm:block"></div>
          {view === 'list' && ['all', 'live', 'scheduled', 'draft', 'failed'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border ${
                  filter === status
                    ? status === 'live' ? 'bg-pink-500/10 text-pink-300 border-pink-500/30' : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    : 'bg-[#111] border-gray-800 text-gray-400 hover:bg-gray-900 hover:border-gray-700'
                }`}
              >
                <span>{status === 'live' ? 'Live on Instagram' : status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </button>
            ))}
        </div>

        {/* Content Area */}
        {view === 'planner' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
            <div className="bg-[#111] border border-gray-800 rounded-2xl p-5">
              <h3 className="text-xl font-bold text-white mb-2">AI Content Planner</h3>
              <p className="text-sm text-gray-400 mb-4">Weekly or monthly content plan create karne ke liye goal, cadence aur content pillars describe karein. AI se plan generate hoga.</p>
              <textarea
                value={plannerPrompt}
                onChange={(e) => setPlannerPrompt(e.target.value)}
                rows={8}
                className="w-full bg-[#0a0a0a] border border-gray-700 text-white rounded-xl p-4 outline-none focus:border-purple-500"
                placeholder="Example: Create a 4-week Instagram content calendar for our business. Suggest 3 posts every week, the best days to publish, and a CTA for each post."
              />
              <div className="mt-4 flex gap-3 flex-wrap">
                <button
                  onClick={handleGeneratePlanner}
                  disabled={plannerLoading}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl"
                >
                  {plannerLoading ? 'Generating...' : 'Generate AI Plan'}
                </button>
                <button
                  onClick={handleSchedulePlanner}
                  disabled={plannerScheduleLoading || !plannerResponse.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {plannerScheduleLoading ? 'Scheduling...' : 'Schedule AI Plan'}
                </button>
                <button
                  onClick={() => setPlannerPrompt('Create a 4-week Instagram content calendar for my business. Suggest 3 posts per week, the best posting days, and optimization ideas for better engagement.')}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-700"
                >
                  Reset Prompt
                </button>
              </div>
            </div>

            <div className="bg-[#111] border border-gray-800 rounded-2xl p-5">
              <h3 className="text-xl font-bold text-white mb-2">Smart Content Roadmap</h3>
              <p className="text-sm text-gray-400 mb-4">AI generated schedule ko yahan clear roadmap ke roop me dekhna easy hoga.</p>
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {plannerResponse ? plannerResponse.split('\n').filter(Boolean).map((item, idx) => (
                  <div key={idx} className="bg-[#0d0d0d] border border-gray-800 rounded-xl p-3 text-sm text-gray-300">
                    {item}
                  </div>
                )) : (
                  <div className="bg-[#0d0d0d] border border-dashed border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
                    AI plan generate karne ke liye prompt fill kijiye.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'list' && (loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-[#111] border border-dashed border-gray-800 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-400">No posts found for this filter.</h3>
            <p className="text-gray-500 mt-2">Try creating a new post!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map(post => (
              <div key={post._id} className="bg-[#111] border border-gray-800 rounded-2xl p-4 flex flex-col gap-3 group hover:border-blue-500/50 transition-all relative">
                {/* 🚀 FIX: Handle both new `mediaUrls` (object array) and old `media` (string array) structures */}
                {(() => {
                  const mediaUrl = post.mediaUrls?.[0]?.url || post.media?.[0];
                  if (!mediaUrl) return null;
                  return (
                  <div className="aspect-square bg-black rounded-lg overflow-hidden">
                      <img src={mediaUrl} alt="Post media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                  );
                })()}
                <p className="text-xs text-gray-400 line-clamp-2 flex-1">{post.caption}</p>
                
                {/* 🚀 NEW: Live Post Stats Display */}
                {post.status === 'published' && (
                  // ✅ FIX: Added 'flex-wrap' and 'justify-end' to ensure stats wrap on smaller cards instead of overflowing.
                  <div className="flex items-center justify-end flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 pt-2">
                    <div className="flex items-center gap-1.5" title="Likes"><Heart size={12} className="text-red-500/80"/> {post.analytics?.likes?.toLocaleString() || 0}</div>
                    <div className="flex items-center gap-1.5" title="Comments"><MessageSquare size={12} className="text-blue-400/80"/> {post.analytics?.comments?.toLocaleString() || 0}</div>
                    <div className="flex items-center gap-1.5" title="Shares"><Share2 size={12} className="text-purple-400/80"/> {post.analytics?.shares?.toLocaleString() || 0}</div>
                    <div className="flex items-center gap-1.5" title="Saves"><Bookmark size={12} className="text-yellow-400/80"/> {post.analytics?.saves?.toLocaleString() || 0}</div>
                    <div className="flex items-center gap-1.5" title="Reach"><Eye size={12} className="text-green-400/80"/> {post.analytics?.reach?.toLocaleString() || 0}</div>
                    <button 
                      onClick={() => handleRefreshStats(post._id, post.platformPostIds?.instagram)} 
                      className="p-1 text-gray-500 hover:text-white hover:bg-gray-700 rounded-full transition-all" title="Refresh Stats">
                      <RefreshCw size={10} />
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {getStatusIcon(post.status)}
                    <span className="capitalize">{post.status}</span>
                  </div>
                  {/* ✅ FIX: Added 'flex-wrap' and 'justify-end' to prevent buttons from overflowing on smaller card sizes. */}
                  <div className="flex items-center flex-wrap justify-end gap-2">
                    {(post.status === 'scheduled' || post.status === 'draft' || post.status === 'failed') && (
                      <button
                        onClick={() => handleInstantPublish(post._id)}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 rounded-lg flex items-center gap-1 shadow-md shadow-pink-500/20 transition-all"
                        title="⚡ Tatkaal Publish Now (1-Click Live)"
                      >
                        <Send size={11} /> Post Now
                      </button>
                    )}
                    {post.isImported && !post.designJson && (
                      <button onClick={() => handleEnhanceWithAI(post._id)} className="p-1.5 text-purple-400 bg-purple-500/10 rounded-md hover:bg-purple-500/20" title="Enhance with AI">
                        <Sparkles size={14} />
                      </button>
                    )}
                    <button onClick={() => handleOpenComments(post)} className="p-1.5 text-blue-400 bg-blue-500/10 rounded-md hover:bg-blue-500/20" title="View Comments">
                      <MessageSquare size={14} />
                    </button>
                    <button onClick={() => handleDownloadPost(post._id, post.mediaUrls?.[0]?.url)} className="p-1.5 text-green-400 bg-green-500/10 rounded-md hover:bg-green-500/20" title="Download Media">
                      <Download size={14} />
                    </button>
                    <Link to={`/publish-post?edit_id=${post._id}`} className="p-1.5 text-gray-400 bg-gray-700/50 rounded-md hover:bg-gray-700" title="Edit Post">
                      <Edit size={14} />
                    </Link>
                    <button onClick={() => handleDeletePost(post._id)} className="p-1.5 text-red-400 bg-red-500/10 rounded-md hover:bg-red-500/20" title="Delete Post">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 text-right -mt-2">
                  <div className="text-xs text-gray-500">
                    {new Date(post.scheduledAt || post.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {/* ✅ FIX: Show the failure reason if a post fails to publish */}
                {post.status === 'failed' && post.failureReason && (
                  <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-md mt-2"><strong>Reason:</strong> {post.failureReason}</p>
                )}
              </div>
            ))}
          </div>
        ))}

        {view === 'analytics' && (loadingAnalytics ? (
          <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div></div>
        ) : analytics ? (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-6 rounded-2xl border border-blue-500/20">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">Performance Snapshot</h3>
                      <p className="text-sm text-blue-200">{analytics.aiRecommendation}</p>
                      <p className="text-xs text-purple-300 mt-3 font-bold">Best time to post: {analytics.bestTimeToPost}</p>
                    </div>
                    <div className="bg-black/30 px-4 py-3 rounded-xl border border-white/10">
                      <p className="text-xs text-gray-400 uppercase tracking-wide">Best post</p>
                      <p className="text-sm font-bold text-white mt-1 line-clamp-1">{analyticsSummary?.bestPost?.caption || 'No live post yet'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Reach</p><p className="text-2xl font-bold text-white">{analytics.totalReach.toLocaleString()}</p></div>
                  <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Likes</p><p className="text-2xl font-bold text-white">{analytics.totalLikes.toLocaleString()}</p></div>
                  <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Comments</p><p className="text-2xl font-bold text-white">{analytics.totalComments.toLocaleString()}</p></div>
                  <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Shares</p><p className="text-2xl font-bold text-white">{analytics.totalShares.toLocaleString()}</p></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Saves</p><p className="text-2xl font-bold text-white">{analytics.totalSaves.toLocaleString()}</p></div>
                  <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Profile Visits</p><p className="text-2xl font-bold text-white">{analytics.totalProfileVisits.toLocaleString()}</p></div>
                  <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Avg Reach / Post</p><p className="text-2xl font-bold text-white">{analyticsSummary?.avgReach?.toLocaleString()}</p></div>
                  <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/30 text-center"><p className="text-xs text-purple-300">Engagement Rate</p><p className="text-2xl font-bold text-white">{analytics.engagementRate}%</p></div>
                </div>
              </div>

              <div className="bg-[#111] border border-gray-800 rounded-2xl p-5">
                <h3 className="text-lg font-bold text-white mb-3">What to improve next</h3>
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800">
                    <p className="font-semibold text-blue-300">1. Hook faster</p>
                    <p className="text-gray-400 mt-1">If reach is high but saves/shares are low, your opening line needs more curiosity.</p>
                  </div>
                  <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800">
                    <p className="font-semibold text-purple-300">2. Stronger CTA</p>
                    <p className="text-gray-400 mt-1">Add a clear CTA like “Comment YES”, “Save this post”, or “DM us for pricing”.</p>
                  </div>
                  <div className="bg-gray-900/70 p-3 rounded-xl border border-gray-800">
                    <p className="font-semibold text-green-300">3. Reuse winning angles</p>
                    <p className="text-gray-400 mt-1">Use your best-performing post caption style and content format for the next 2–3 posts.</p>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Tip: Ask the AI assistant on this page for optimization suggestions based on these live metrics.</div>
                </div>
              </div>
            </div>

            {analytics.topPosts && analytics.topPosts.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Top Performing Posts</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                        <th className="p-2">Post</th>
                        <th className="p-2 text-center">Reach</th>
                        <th className="p-2 text-center">Likes</th>
                        <th className="p-2 text-center">Comments</th>
                        <th className="p-2 text-center">Shares</th>
                        <th className="p-2 text-center">Saves</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topPosts.map(p => (
                        <tr key={p._id} className="border-b border-gray-800 hover:bg-gray-900/50">
                          <td className="p-2 flex items-center gap-3">
                            <img src={p.mediaUrl} className="w-10 h-10 rounded-md object-cover bg-black" alt="Post thumbnail"/>
                            <span className="text-xs text-gray-300 line-clamp-1">{p.caption}</span>
                          </td>
                          <td className="p-2 text-center font-bold">{p.reach?.toLocaleString()}</td>
                          <td className="p-2 text-center font-bold">{p.likes?.toLocaleString()}</td>
                          <td className="p-2 text-center font-bold">{p.comments?.toLocaleString()}</td>
                          <td className="p-2 text-center font-bold">{p.shares?.toLocaleString()}</td>
                          <td className="p-2 text-center font-bold">{p.saves?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#111] border border-dashed border-gray-800 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-400">No analytics data available.</h3>
            <p className="text-gray-500 mt-2">Publish some posts to start seeing analytics.</p>
          </div>
        ))}
      </div>

      <DashboardAIAssistant />

      {/* Comments Modal */}
      {isCommentModalOpen && selectedPostForComments && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="font-bold text-lg text-white">Comments for Post</h2>
              <button onClick={() => setIsCommentModalOpen(false)} className="p-2 rounded-full hover:bg-gray-800"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No comments found or still loading...</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="text-sm">
                    <div className="flex gap-3 items-start">
                      {/* Fallback gradient avatar */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 shrink-0"></div>
                      <div className="flex-1">
                        {/* Comment Header: Username, Text, and Delete Button */}
                        <div className="flex items-start justify-between gap-3">
                          <p><span className="font-bold text-white">{comment.from?.username || comment.username}</span> <span className="text-gray-300">{comment.text}</span></p>
                          <button type="button" onClick={() => handleDeleteComment(comment.id)} className="shrink-0 p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10" title="Delete comment">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* ✅ FIX: Replies block is now a SIBLING to the header, not inside it. */}
                        {/* ✅ FIX: Added safety check for comment.replies and comment.replies.data to prevent crashes. */}
                        {comment.replies && comment.replies.data && comment.replies.data.length > 0 && (
                          <div className="mt-3 pl-6 border-l-2 border-gray-800 space-y-3">
                            {comment.replies.data.map(reply => (
                              <div key={reply.id} className="flex gap-3 items-start">
                                {/* Fallback gradient avatar for replies */}
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 to-purple-500 shrink-0"></div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    {/* ✅ FIX: Use fallback pattern for reply username as well. */}
                                    <p><span className="font-bold text-white">{reply.from?.username || reply.username}</span> <span className="text-gray-400">{reply.text}</span></p>
                                    <button type="button" onClick={() => handleDeleteComment(reply.id)} className="shrink-0 p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10" title="Delete reply">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reply form is also a sibling, at the bottom of the comment body */}
                        <form onSubmit={(e) => { e.preventDefault(); handleReplySubmit(comment.id); }} className="flex gap-2 mt-2">
                          <input // ✅ FIX: Input is now controlled by the specific comment's state
                            type="text"
                            value={replyTexts[comment.id] || ''} // ✅ FIX: Use individual state for each reply input
                            onChange={(e) => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                            placeholder={`Reply to @${comment.username}...`} 
                            className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-lg p-2 text-white text-xs focus:border-blue-500 outline-none"
                          />
                          <button type="submit" disabled={!replyTexts[comment.id]?.trim()} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 rounded-lg transition-all disabled:opacity-50 flex items-center">
                            <Send size={14} />
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
