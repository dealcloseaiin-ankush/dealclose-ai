import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Edit, Plus, BarChart2, Trash2, Download, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Publisher() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState('all'); // all, scheduled, published, drafts, failed
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === 'all' ? {} : { status: filter };
      const { data } = await api.get('/posts', { params });
      if (data.success) {
        setPosts(data.posts);
      }
    } catch (error) {
      toast.error('Failed to fetch posts.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const { data } = await api.get('/posts/analytics');
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      toast.error('Failed to fetch analytics.');
      console.error(error);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'list') {
      fetchPosts();
    } else if (view === 'analytics') {
      fetchAnalytics();
    }
  }, [filter, view, fetchPosts, fetchAnalytics]);

  // 🚀 NEW: Delete a post
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to permanently delete this post?')) return;
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
    const toastId = toast.loading('Importing posts from Instagram...');
    try {
      const { data } = await api.post('/posts/import-instagram');
      if (data.success) {
        toast.success(`${data.importedCount} new posts imported!`, { id: toastId });
        fetchPosts(); // Refresh the list
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to import posts.', { id: toastId });
    }
  };

  // 🚀 NEW: Enhance post with AI
  const handleEnhanceWithAI = async (postId) => {
    toast.loading('AI is enhancing the post...');
    // This is a placeholder. You would typically navigate to the editor with the post ID
    // and have the editor call an AI service.
    navigate(`/publish-post?import_id=${postId}`);
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

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
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
            <Link
              to="/publish-post"
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              <Plus size={18} /> Create New Post
            </Link>
          </div>
        </div>

        {/* View & Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-gray-800 pb-4">
          <button onClick={() => setView('list')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border ${view === 'list' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-[#111] border-gray-800 text-gray-400 hover:bg-gray-900'}`}><Calendar size={16}/> Content</button>
          <button onClick={() => setView('analytics')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border ${view === 'analytics' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' : 'bg-[#111] border-gray-800 text-gray-400 hover:bg-gray-900'}`}><BarChart2 size={16}/> Analytics</button>
          <div className="w-px h-6 bg-gray-700 mx-2"></div>
          {view === 'list' && ['all', 'scheduled', 'published', 'draft', 'failed'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border ${
                  filter === status
                    ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                    : 'bg-[#111] border-gray-800 text-gray-400 hover:bg-gray-900 hover:border-gray-700'
                }`}
              >
                <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
              </button>
            ))}
        </div>

        {/* Content Area */}
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
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div className="aspect-square bg-black rounded-lg overflow-hidden">
                    <img src={post.mediaUrls[0].url} alt="Post media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <p className="text-xs text-gray-400 line-clamp-2 flex-1">{post.caption}</p>
                <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {getStatusIcon(post.status)}
                    <span className="capitalize">{post.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.isImported && (
                      <button onClick={() => handleEnhanceWithAI(post._id)} className="p-1.5 text-purple-400 bg-purple-500/10 rounded-md hover:bg-purple-500/20" title="Enhance with AI">
                        <Sparkles size={14} />
                      </button>
                    )}
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
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Reach</p><p className="text-2xl font-bold text-white">{analytics.totalReach.toLocaleString()}</p></div>
              <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Likes</p><p className="text-2xl font-bold text-white">{analytics.totalLikes.toLocaleString()}</p></div>
              <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Comments</p><p className="text-2xl font-bold text-white">{analytics.totalComments.toLocaleString()}</p></div>
              <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Saves</p><p className="text-2xl font-bold text-white">{analytics.totalSaves.toLocaleString()}</p></div>
              <div className="bg-[#111] p-4 rounded-xl border border-gray-800 text-center"><p className="text-xs text-gray-400">Profile Visits</p><p className="text-2xl font-bold text-white">{analytics.totalProfileVisits.toLocaleString()}</p></div>
              <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/30 text-center"><p className="text-xs text-purple-300">Engagement Rate</p><p className="text-2xl font-bold text-white">{analytics.engagementRate}%</p></div>
            </div>

            {/* AI Recommendations */}
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-6 rounded-2xl border border-blue-500/20">
              <h3 className="text-lg font-bold text-white mb-2">AI Recommendations</h3>
              <p className="text-sm text-blue-200">{analytics.aiRecommendation}</p>
              <p className="text-xs text-purple-300 mt-3 font-bold">Best time to post: {analytics.bestTimeToPost}</p>
            </div>

            {/* Top Posts */}
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
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topPosts.map(p => (
                      <tr key={p._id} className="border-b border-gray-800 hover:bg-gray-900/50">
                        <td className="p-2 flex items-center gap-3">
                          <img src={p.mediaUrl} className="w-10 h-10 rounded-md object-cover bg-black"/>
                          <span className="text-xs text-gray-300 line-clamp-1">{p.caption}</span>
                        </td>
                        <td className="p-2 text-center font-bold">{p.reach?.toLocaleString()}</td>
                        <td className="p-2 text-center font-bold">{p.likes?.toLocaleString()}</td>
                        <td className="p-2 text-center font-bold">{p.comments?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-[#111] border border-dashed border-gray-800 rounded-2xl">
            <h3 className="text-xl font-bold text-gray-400">No analytics data available.</h3>
            <p className="text-gray-500 mt-2">Publish some posts to start seeing analytics.</p>
          </div>
        ))}
      </div>
    </div>
  );
}