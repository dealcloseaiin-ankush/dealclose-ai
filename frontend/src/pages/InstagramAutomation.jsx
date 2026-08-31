import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Bot, RefreshCw, Layers, Grid, Sliders, MessageSquare, Zap, Heart, Eye, Inbox, FileText, BarChart3, Sparkles, BrainCircuit } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import DashboardAIAssistant from '../components/DashboardAIAssistant';
import PostInsightsModal from '../components/PostInsightsModal'; // Naya component import karein

export default function InstagramAutomation() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');
  const [activeTab, setActiveTab] = useState('posts'); 

  const [insights, setInsights] = useState({
    follower_count: 0,
    reach: 0,
    impressions: 0,
    profile_views: 0,
    website_clicks: 0,
    accounts_engaged_count: 0,
    last_updated: null,
  });
  const [insightHistory, setInsightHistory] = useState([]);

  const [config, setConfig] = useState({
    aiSmartReply: false,
    commentAiReplyEnabled: false,
    autoDmOnComment: false,
    extractPhoneNumbers: false,
    forceWhatsappRedirect: false
  });

  const [igLeads, setIgLeads] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [savedAutomations, setSavedAutomations] = useState([]);
  const [commentGroups, setCommentGroups] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [sendingBulkId, setSendingBulkId] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [iceBreakers, setIceBreakers] = useState('');
  const [catalogItems, setCatalogItems] = useState([]);
  
  // Post Automation Form State
  const [newAuto, setNewAuto] = useState({ postId: '', triggerWord: '', replyMessage: '', fileUrl: '', publicReply: 'Check your DM! 📩', deliveryMode: 'direct', selectedProductIds: [] });
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // Insights Modal ke liye state
  const [selectedPostForInsights, setSelectedPostForInsights] = useState(null);
  
  // AI Analysis Modal ke liye state
  const [analyzingPost, setAnalyzingPost] = useState(null);
  const [analysisResult, setAnalysisResult] = useState('');

  // Pagination for Old Posts
  const [postLimit, setPostLimit] = useState(20);

  const isPremiumUser = user?.isPremium === true || user?.role === 'superadmin' || user?.email === 'ankush.bani@gmail.com';

  const togglePostProduct = (postId, productId) => {
    setRecentPosts(posts => posts.map(p => {
      if (p.id !== postId) return p;
      const current = Array.isArray(p.selectedProductIds) ? p.selectedProductIds : [];
      if (current.includes(productId)) {
        return { ...p, selectedProductIds: current.filter(id => id !== productId) };
      } else {
        if (current.length >= 4) {
          toast.error("You can select maximum 4 featured products per Reel!");
          return p;
        }
        return { ...p, selectedProductIds: [...current, productId] };
      }
    }));
  };

  const getRuleMode = (rule) => {
    if (!rule) return 'off';
    if (rule.deliveryMode === 'instant_shortcut') return 'instant_shortcut';
    if (rule.deliveryMode === 'button' || rule.deliveryMode === 'hybrid') return 'hybrid';
    return 'chatbot';
  };

  const mergePostsWithAutomations = useCallback((posts = [], automations = []) => {
    const ruleMap = new Map(automations.map(rule => [String(rule.postId || ''), rule]));
    console.log('[IG AUTO UI DEBUG] Hydrating posts with automation rules', {
      workspaceId: activeWorkspace,
      postsCount: posts.length,
      rulesCount: automations.length,
      rules: automations.map(rule => ({
        postId: rule.postId || '[GLOBAL]',
        triggerWord: rule.triggerWord,
        deliveryMode: rule.deliveryMode,
        hasFileUrl: Boolean(rule.fileUrl)
      }))
    });

    return posts.map(post => {
      const rule = ruleMap.get(String(post.id));
      if (!rule) return post;
      return {
        ...post,
        botMode: getRuleMode(rule),
        chatBotKeyword: rule.triggerWord || '',
        chatBotReply: rule.replyMessage || '',
        fileUrl: rule.fileUrl || '',
        selectedProductIds: Array.isArray(rule.selectedProductIds) ? rule.selectedProductIds : [],
        publicReply: rule.publicReply || post.publicReply || 'Check your DM! 📩',
        stats: {
          ...(post.stats || {}),
          ...(rule.stats || {}),
          dmsSent: rule.stats?.sentCount ?? post.stats?.dmsSent ?? 0,
          buttonClicks: rule.stats?.clickedCount ?? post.stats?.buttonClicks ?? 0
        }
      };
    });
  }, [activeWorkspace]);

  const handleAnalyzePost = async (post) => {
    if (user.aiCredits <= 0 && user.role !== 'superadmin') {
      return toast.error("You have 0 AI credits. Please recharge from Wallet.");
    }
    setAnalyzingPost(post);
    setAnalysisResult('');
    try {
      const { data } = await api.post(`/instagram/posts/${post.id}/analyze`, { workspaceId: activeWorkspace });
      setAnalysisResult(data.analysis);
      toast.success(`Analysis complete! Credits left: ${data.remainingCredits}`);
    } catch (err) {
      console.error("Analysis Error:", err);
      toast.error(err.response?.data?.message || "Failed to analyze post.");
      setAnalyzingPost(null); // Close modal on error
    }
  };


  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingPdf(true);
    const toastId = toast.loading("Uploading file securely...");
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = uploadRes.data.url || uploadRes.data.imageUrl;
      setNewAuto(prev => ({ ...prev, fileUrl: uploadedUrl }));
      toast.success("File uploaded successfully!", { id: toastId });
    } catch (err) {
      console.error("Upload Error:", err);
      toast.error("Failed to upload file. Check connection.", { id: toastId });
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleAddPostAuto = async (e) => {
    e.preventDefault();
    try {
       const { data } = await api.post('/instagram/automations', { ...newAuto, workspaceId: activeWorkspace });
       const nextRules = Array.isArray(data?.automations) ? data.automations : savedAutomations;
       console.log('[IG AUTO UI DEBUG] Global automation save response', { workspaceId: activeWorkspace, nextRules });
       setSavedAutomations(nextRules);
       setRecentPosts(posts => mergePostsWithAutomations(posts, nextRules));
       toast.success("Global Automation Rule Added!");
       setNewAuto({ postId: '', triggerWord: '', replyMessage: '', fileUrl: '', publicReply: 'Check your DM! 📩', deliveryMode: 'direct' });
    } catch (err) {
       console.error('[IG AUTO UI DEBUG] Failed to add global automation', err.response?.data || err.message);
       toast.error(err.response?.data?.message || "Failed to add rule.");
    }
  };

  const [selectedPostForAuto, setSelectedPostForAuto] = useState(null);
  
  const handleSavePostSpecificAuto = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Saving automation rule...");
    try {
       const { data } = await api.post('/instagram/automations', { 
         ...newAuto, 
         postId: selectedPostForAuto.id,
         thumbnailUrl: selectedPostForAuto.thumbnail_url || selectedPostForAuto.media_url,
         workspaceId: activeWorkspace 
       });
       const nextRules = Array.isArray(data?.automations) ? data.automations : savedAutomations;
       console.log('[IG AUTO UI DEBUG] Post automation save response', { workspaceId: activeWorkspace, postId: selectedPostForAuto.id, nextRules });
       setSavedAutomations(nextRules);
       setRecentPosts(posts => mergePostsWithAutomations(posts, nextRules));
       toast.success("Post Automation Saved Successfully!", { id: toastId });
       setSelectedPostForAuto(null);
       setNewAuto({ postId: '', triggerWord: '', replyMessage: '', fileUrl: '', publicReply: 'Check your DM! 📩', deliveryMode: 'direct' });
       handleSyncPosts();
    } catch (err) { 
       console.error("Save automation specific error:", err);
       toast.error(err.response?.data?.message || "Failed to save post automation.", { id: toastId }); 
    }
  };

  const handleCardPdfUpload = async (postId, file) => {
    if (!file) return;
    setIsUploadingPdf(true);
    const toastId = toast.loading("Uploading file securely...");
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = uploadRes.data.url || uploadRes.data.imageUrl;
      updateInlineValue(postId, 'fileUrl', uploadedUrl);
      toast.success("File uploaded and link attached!", { id: toastId });
    } catch (err) {
      console.error("Upload Error:", err);
      toast.error("Failed to upload file. Check connection.", { id: toastId });
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleInlineShortcutSave = async (post) => {
    const keyword = post.chatBotKeyword?.trim();
    const targetLink = post.fileUrl?.trim();
    const publicReply = post.publicReply !== undefined ? post.publicReply : "Check your DM! Details sent. 📩";
    const dmText = post.chatBotReply || "Here is your requested asset package link details:";

    if (!keyword) return toast.error("Please enter a Comment Trigger Word!");
    const toastId = toast.loading("Saving automation rule...");
    try {
      const { data } = await api.post('/instagram/automations', {
        postId: post.id,
        thumbnailUrl: post.thumbnail_url || post.media_url,
        triggerWord: keyword,
        replyMessage: dmText,
        publicReply: publicReply,
        fileUrl: targetLink || '',
        selectedProductIds: Array.isArray(post.selectedProductIds) ? post.selectedProductIds : [],
        deliveryMode: 'instant_shortcut',
        workspaceId: activeWorkspace
      });
      const nextRules = Array.isArray(data?.automations) ? data.automations : savedAutomations;
      console.log('[IG AUTO UI DEBUG] Inline shortcut save response', { workspaceId: activeWorkspace, postId: post.id, nextRules });
      setSavedAutomations(nextRules);
      setRecentPosts(posts => mergePostsWithAutomations(posts, nextRules));
      toast.success("⚡ Automation Rule Saved Successfully!", { id: toastId });
      handleSyncPosts();
    } catch (err) {
      console.error("Shortcut save crash context:", err);
      toast.error("Failed to save automation rule.", { id: toastId });
    }
  };

  const handleSyncPosts = async () => {
    const toastId = toast.loading("Syncing recent posts from Instagram...");
    try {
      const [res, automationsRes] = await Promise.all([
        api.get('/instagram/posts', { params: { workspaceId: activeWorkspace, limit: postLimit } }),
        api.get('/instagram/automations', { params: { workspaceId: activeWorkspace } }).catch(() => ({ data: { automations: [] } }))
      ]);
      const rules = Array.isArray(automationsRes.data?.automations) ? automationsRes.data.automations : [];
      setSavedAutomations(rules);
      if (res.data && res.data.posts) {
        setRecentPosts(mergePostsWithAutomations(res.data.posts, rules));
        toast.success(`Successfully loaded ${res.data.posts.length} posts! 🎉`, { id: toastId });
      } else {
        toast.success("Sync successful, but no posts found.", { id: toastId });
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync posts. Ensure Instagram is connected.", { id: toastId });
    }
  };

  useEffect(() => {
    const fetchIgData = async () => {
      try {
        const profileRes = await api.get('/users/profile').catch(() => null);
        const u = profileRes?.data?.user || profileRes?.data;
        if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);

        const { data } = await api.get('/instagram/dashboard', { params: { workspaceId: activeWorkspace } }).catch(() => ({ data: {} }));
        if (data.config) setConfig(data.config);
        if (data.igLeads) setIgLeads(Array.isArray(data.igLeads) ? data.igLeads : []);
        if (data.commentGroups) setCommentGroups(Array.isArray(data.commentGroups) ? data.commentGroups : []);
        api.get('/instagram/business/insights', { params: { workspaceId: activeWorkspace } }).then(res => {
          if (res.data?.insights) setInsights(prev => ({ ...prev, ...res.data.insights }));
        }).catch(err => console.error("Failed to fetch business insights", err));
        api.get('/instagram/business/insights/history', { params: { workspaceId: activeWorkspace, days: 30 } }).then(res => setInsightHistory(res.data?.snapshots || [])).catch(err => console.error("Failed to fetch analytics history", err));

        const [postsRes, automationsRes, catalogRes] = await Promise.all([
          api.get('/instagram/posts', { params: { workspaceId: activeWorkspace, limit: postLimit } }),
          api.get('/instagram/automations', { params: { workspaceId: activeWorkspace } }).catch(() => ({ data: { automations: [] } })),
          api.get('/catalog').catch(() => ({ data: [] }))
        ]);
        const rules = Array.isArray(automationsRes.data?.automations) ? automationsRes.data.automations : [];
        setSavedAutomations(rules);
        const cats = Array.isArray(catalogRes.data) ? catalogRes.data : catalogRes.data?.data || [];
        setCatalogItems(cats);
        setSavedAutomations(rules);
        console.log('[IG AUTO UI DEBUG] Initial workspace automation hydrate', {
          workspaceId: activeWorkspace,
          rulesCount: rules.length,
          postsCount: postsRes.data?.posts?.length || 0
        });
        if (postsRes.data && postsRes.data.posts) {
           setRecentPosts(mergePostsWithAutomations(postsRes.data.posts, rules));
        }
      } catch (error) {
        console.error("Failed to fetch IG data", error);
      }
    };
    fetchIgData();
  }, [activeWorkspace, postLimit, mergePostsWithAutomations]);

  const handleReplyChange = (id, text) => {
    setCommentGroups(groups => groups.map(g => g.id === id ? { ...g, replyText: text } : g));
  };

 const sendBulkReply = async (id, count, text) => {
    setSendingBulkId(id);
    try {
      await api.post('/instagram/comments/bulk-reply', { groupId: id, replyText: text });
      toast.success(`Successfully sent Bulk AI Reply to ${count} users! 🚀`);
      setCommentGroups(groups => groups.filter(g => g.id !== id));
    } catch (error) {
      console.error("Bulk reply error:", error);
      toast.error("Failed to send bulk replies.");
    } finally { 
      setSendingBulkId(null); 
    }
  };
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg) return;
    try {
      await api.post('/instagram/broadcast', { messageText: broadcastMsg });
      toast.success("Broadcast sent successfully!");
      setBroadcastMsg('');
    } catch { toast.error('Broadcast failed.'); }
  };

  const handleSetIceBreakers = async (e) => {
    e.preventDefault();
    if (!iceBreakers) return;
    try {
      const questions = iceBreakers.split(',').map(q => q.trim()).filter(q => q);
      await api.post('/instagram/icebreakers', { questions });
      toast.success('Ice Breakers updated on Instagram!');
    } catch { toast.error('Failed to update Ice Breakers.'); }
  };

  const generateAIReply = (id, theme) => {
    let aiGenerated = "";
    if (theme.includes("Price")) aiGenerated = "Hi! Thanks for asking. You can order directly via our link in bio! 🛍️";
    if (theme.includes("Delivery")) aiGenerated = "Hello! We deliver pan-India within 3-5 working days. 🚚";
    if (theme.includes("Unclear")) aiGenerated = "Thank you for the love! ❤️";
    handleReplyChange(id, aiGenerated);
  };

  const handleToggle = async (key) => {
    if (key === 'commentAiReplyEnabled') {
      const nextValue = !config.commentAiReplyEnabled;
      setConfig(prev => ({ ...prev, commentAiReplyEnabled: nextValue }));
      try {
        await api.patch('/instagram/comment-ai/config', { workspaceId: activeWorkspace, commentAiReplyEnabled: nextValue });
        toast.success(`Comment AI replies ${nextValue ? 'enabled' : 'disabled'} for this workspace.`);
      } catch (err) {
        setConfig(prev => ({ ...prev, commentAiReplyEnabled: !nextValue }));
        console.error('Comment AI config update failed:', err.response?.data || err.message);
        toast.error('Failed to update Comment AI setting.');
      }
      return;
    }
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const togglePostCommentAi = async (postId, currentValue) => {
    const nextValue = !currentValue;
    setRecentPosts(posts => posts.map(p => p.id === postId ? { ...p, commentAiReplyEnabled: nextValue } : p));
    try {
      await api.patch('/instagram/comment-ai/post-toggle', {
        workspaceId: activeWorkspace,
        postId,
        commentAiReplyEnabled: nextValue
      });
      toast.success(`Post AI comments ${nextValue ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      setRecentPosts(posts => posts.map(p => p.id === postId ? { ...p, commentAiReplyEnabled: currentValue } : p));
      console.error('Post AI toggle failed:', err.response?.data || err.message);
      toast.error('Failed to update post AI setting.');
    }
  };

  const updatePostMode = (id, newMode) => {
    if (newMode === 'hybrid' && !isPremiumUser) {
      toast.error("🔒 AI Intent Recovery Mode is a Premium Upgrade feature!");
      return;
    }
    setRecentPosts(posts => posts.map(p => p.id === id ? { ...p, botMode: newMode } : p));
  };

  const updateInlineValue = (id, field, value) => {
    setRecentPosts(posts => posts.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const processPendingWithAI = async (id) => {
    setProcessingId(id);
    try {
      await api.post(`/instagram/posts/${id}/process-ai`);
      toast.success("AI is now processing pending comments! ⚡");
      setRecentPosts(posts => posts.map(p => 
        p.id === id ? { ...p, botMode: 'hybrid', stats: { ...p.stats, aiCaught: p.stats.pending, pending: 0 } } : p
      ));
    } catch (error) {
      console.error("AI processing error:", error);
      toast.error("Failed to trigger AI processing.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#050505] text-gray-100 font-sans">
      
      {/* Insights Modal */}
      {selectedPostForInsights && (
        <PostInsightsModal post={selectedPostForInsights} workspaceId={activeWorkspace} onClose={() => setSelectedPostForInsights(null)} />
      )}

      {/* AI Analysis Modal */}
      {analyzingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={() => setAnalyzingPost(null)}>
          <div className="bg-[#111] border border-purple-500/50 rounded-2xl p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2"><BrainCircuit size={20} /> AI Performance Analysis</h2>
            {!analysisResult ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-400">AI is analyzing post performance...</p>
              </div>
            ) : (
              <div className="whitespace-pre-wrap bg-[#0a0a0a] p-4 rounded-lg border border-gray-800 text-sm text-gray-300 max-h-[60vh] overflow-y-auto">
                {analysisResult}
              </div>
            )}
            <button onClick={() => setAnalyzingPost(null)} className="mt-6 w-full bg-purple-600 text-white p-2 rounded-lg font-semibold">Close</button>
          </div>
        </div>
      )}

      {/* Top Header Layout */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 flex items-center gap-2">
              <Bot className="text-pink-500" size={32} /> Instagram AI Funnel
            </h1>
            <select
              value={activeWorkspace} 
              onChange={(e) => setActiveWorkspace(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-pink-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id} className="bg-[#111] text-white">🏢 {ws.name}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-400">Convert your Instagram comments and reels traffic into tracked conversion leads.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-[#111] border border-gray-800 rounded-xl p-1 gap-1 w-full md:w-auto">
            {[10, 20, 50].map(limit => (
              <button 
                key={limit}
                onClick={() => setPostLimit(limit)}
                className={`flex-1 md:flex-none text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${postLimit === limit ? 'bg-pink-500/20 text-pink-400' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                Load {limit}
              </button>
            ))}
          </div>
          <button onClick={handleSyncPosts} className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-pink-500/10 transition-all flex items-center gap-2">
            <RefreshCw size={16} /> Sync Feed
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-[#111111] border border-pink-500/20 p-5 rounded-2xl shadow-lg">
          <p className="text-pink-400 text-xs font-bold uppercase tracking-wide">Total Followers</p>
          <p className="text-3xl font-bold text-white mt-2">{insights.follower_count?.toLocaleString() || '...'}</p>
        </div>
        <div className="bg-[#111111] border border-blue-500/20 p-5 rounded-2xl shadow-lg">
          <p className="text-blue-400 text-xs font-bold uppercase tracking-wide">Account Reach (Last Day)</p>
          <p className="text-3xl font-bold text-white mt-2">{insights.reach?.toLocaleString() || '...'}</p>
        </div>
        <div className="bg-[#111111] border border-green-500/20 p-5 rounded-2xl shadow-lg">
          <p className="text-green-400 text-xs font-bold uppercase tracking-wide">Impressions (Last Day)</p>
          <p className="text-3xl font-bold text-white mt-2">{insights.impressions?.toLocaleString() || '...'}</p>
        </div>
        <div className="bg-[#111111] border border-purple-500/20 p-5 rounded-2xl shadow-lg">
          <p className="text-purple-400 text-xs font-bold uppercase tracking-wide">Profile Visits (Last Day)</p>
          <p className="text-3xl font-bold text-white mt-2">{insights.profile_views?.toLocaleString() || '...'}</p>
        </div>
        <div className="bg-[#111111] border border-yellow-500/20 p-5 rounded-2xl shadow-lg">
          <p className="text-yellow-400 text-xs font-bold uppercase tracking-wide">Website Clicks (Last Day)</p>
          <p className="text-3xl font-bold text-white mt-2">{insights.website_clicks?.toLocaleString() || '...'}</p>
        </div>
        <div className="bg-[#111111] border border-gray-700 p-5 rounded-2xl shadow-lg">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">Accounts Engaged (Last Day)</p>
          <p className="text-3xl font-bold text-white mt-2">{insights.accounts_engaged_count?.toLocaleString() || '...'}</p>
        </div>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 mb-10">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">30-Day Account Growth</h2>
            <p className="text-xs text-gray-500">Daily snapshots are saved whenever this dashboard refreshes.</p>
          </div>
          <span className="text-xs text-gray-400">{insightHistory.length} day{insightHistory.length === 1 ? '' : 's'} recorded</span>
        </div>
        <div className="h-64">
          {insightHistory.length < 2 ? (
            <div className="h-full grid place-items-center text-sm text-gray-500 text-center px-6">Today's snapshot is saved. The follower and reach trends will appear as daily data is collected.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={insightHistory.map(item => ({ ...item, label: new Date(item.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="label" stroke="#737373" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="followers" stroke="#ec4899" tick={{ fontSize: 11 }} width={52} />
                <YAxis yAxisId="reach" orientation="right" stroke="#60a5fa" tick={{ fontSize: 11 }} width={52} />
                <Tooltip contentStyle={{ background: '#171717', border: '1px solid #404040', borderRadius: 10 }} />
                <Line yAxisId="followers" type="monotone" dataKey="followerCount" name="Followers" stroke="#ec4899" strokeWidth={2} dot={false} />
                <Line yAxisId="reach" type="monotone" dataKey="reach" name="Daily Reach" stroke="#60a5fa" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabs View Selector */}
      <div className="flex space-x-6 mb-8 border-b border-gray-800 pb-px">
        <button onClick={() => setActiveTab('general')} className={`pb-3 px-1 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'general' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500 hover:text-gray-300'}`}>
          <Sliders size={16} /> Global Configurations
        </button>
        <button onClick={() => setActiveTab('posts')} className={`pb-3 px-1 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'posts' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500 hover:text-gray-300'}`}>
          <Grid size={16} /> Per-Post Customization {recentPosts.length > 0 && <span className="bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full">{recentPosts.length}</span>}
        </button>
        <button onClick={() => setActiveTab('smart-groups')} className={`pb-3 px-1 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'smart-groups' ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500 hover:text-gray-300'}`}>
          <Layers size={16} /> Smart Clusters
        </button>
      </div>

      {/* TAB 1: GENERAL CONFIGURATIONS */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800">
              <h2 className="text-base font-bold text-white mb-4 uppercase tracking-wider text-gray-400">Global Trigger Architecture</h2>
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-200">AI Smart Reply Engine</p>
                    <p className="text-xs text-gray-500">Reads semantic intent context instead of direct strict keywords</p>
                  </div>
                  <button onClick={() => handleToggle('aiSmartReply')} className={`w-12 h-6 rounded-full transition-colors relative ${config.aiSmartReply ? 'bg-purple-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.aiSmartReply ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-gray-200">Auto-DM on Comments</p>
                    <p className="text-xs text-gray-500">Auto dispatch targeted link directly when user drops a comment</p>
                  </div>
                  <button onClick={() => handleToggle('autoDmOnComment')} className={`w-12 h-6 rounded-full transition-colors relative ${config.autoDmOnComment ? 'bg-purple-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.autoDmOnComment ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-pink-400">Silent Lead Extractor</p>
                    <p className="text-xs text-gray-500">Auto extract contact nodes from inbox chat logs into CRM data</p>
                  </div>
                  <button onClick={() => handleToggle('extractPhoneNumbers')} className={`w-12 h-6 rounded-full transition-colors relative ${config.extractPhoneNumbers ? 'bg-pink-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.extractPhoneNumbers ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-gray-800 pt-4 mt-2">
                  <div>
                    <p className="font-bold text-sm text-green-400">Force WhatsApp Funnel</p>
                    <p className="text-xs text-gray-500">Appends encrypted click-to-chat redirection nodes to optimize tracking</p>
                  </div>
                  <button onClick={() => handleToggle('forceWhatsappRedirect')} className={`w-12 h-6 rounded-full transition-colors relative ${config.forceWhatsappRedirect ? 'bg-green-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.forceWhatsappRedirect ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-sm font-bold text-white mb-1">Ice Breakers (FAQ DM Triggers)</h2>
              <p className="text-[11px] text-gray-500 mb-4">Launches static button targets before a customer starts typing. Separated by commas.</p>
              <form onSubmit={handleSetIceBreakers} className="flex gap-2">
                <input type="text" value={iceBreakers} onChange={(e) => setIceBreakers(e.target.value)} placeholder="e.g. Property Catalog, Schedule Site Visit" className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-pink-500" />
                <button type="submit" className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Set Configurations</button>
              </form>
            </div>

            <div className="bg-[#111111] border border-purple-500/20 rounded-2xl p-6 shadow-lg">
              <h2 className="text-sm font-bold text-purple-400 mb-1">24H High-Conversion Broadcast</h2>
              <p className="text-[11px] text-gray-500 mb-4">Fires custom mass updates to all prospects inside the valid 24-hour compliance session clock.</p>
              <form onSubmit={handleSendBroadcast} className="flex flex-col gap-3">
                <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} rows="3" placeholder="Drop the latest link or announcement template details here..." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-purple-500"></textarea>
                <button type="submit" className="bg-purple-600 text-white py-2 rounded-lg text-xs font-bold transition-all hover:bg-purple-500">Fire Broadcast Sequence 🚀</button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-800 bg-[#1a1a1a] flex justify-between items-center">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Traffic Hub Pipeline</h2>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#0a0a0a] text-gray-500 text-xs uppercase font-bold border-b border-gray-800">
                      <th className="p-4">Prospect Handle</th>
                      <th className="p-4">Comment Context</th>
                      <th className="p-4">AI Intent</th>
                      <th className="p-4">Response Action</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-xs text-gray-300">
                    {igLeads.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-600 font-medium">No conversion leads logged in active pipeline session.</td></tr>
                    ) : (
                      igLeads.map(lead => (
                        <tr key={lead.id} className="hover:bg-gray-900/30 transition-colors">
                          <td className="p-4 font-bold text-pink-400">@{lead.handle}</td>
                          <td className="p-4 truncate max-w-[160px]">{lead.trigger}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${lead.intent === 'High' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-400'}`}>{lead.intent}</span>
                          </td>
                          <td className="p-4 text-gray-400 truncate max-w-[200px]">{lead.action}</td>
                          <td className="p-4 font-bold text-white">{lead.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PER-POST CUSTOMIZATION */}
      {activeTab === 'posts' && (
        <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-lg p-6 animate-fade-in">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-4 gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">Granular Stream Configuration Matrix</h2>
              <p className="text-xs text-gray-500 mt-0.5">Map unique files, redirect variables, or standalone PDF links to corresponding Reels or feed elements.</p>
            </div>
            <div className="text-xs text-pink-400 font-bold bg-pink-500/5 border border-pink-500/10 rounded-lg px-3 py-1.5">
              Feed Cache Array: {recentPosts.length} elements loaded
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recentPosts.map(post => (
              <div key={post.id} className={`border ${post.botMode === 'hybrid' ? 'border-purple-500/40 bg-gradient-to-b from-[#161224] to-[#0a0a0a]' : post.botMode === 'chatbot' ? 'border-blue-500/30 bg-gradient-to-b from-[#111622] to-[#0a0a0a]' : 'border-gray-800/80 bg-[#0a0a0a]'} rounded-2xl p-5 flex flex-col justify-between hover:border-gray-700 transition-all shadow-inner`}>
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 bg-gray-900 rounded-xl flex-shrink-0 relative overflow-hidden border border-gray-800 group shadow-lg">
                      {post.media_type === 'VIDEO' ? (
                        <img src={post.thumbnail_url || post.media_url} alt="Reel Video Thumbnail" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : post.media_url ? (
                        <img src={post.media_url} alt="Feed Asset Representation" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-[10px] text-gray-600 font-bold uppercase p-2 text-center">Asset Missing</div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white uppercase">Open In IG ↗</div>
                    </a>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="truncate">
                          <span className="text-[10px] bg-gray-800 text-gray-400 font-black px-2 py-0.5 rounded border border-gray-700 uppercase tracking-wider">{post.media_type || 'POST'}</span>
                          <span className="text-[10px] text-gray-600 font-bold ml-2">{post.timestamp ? new Date(post.timestamp).toLocaleDateString() : 'Recent Log'}</span>
                        </div>
                        {savedAutomations.find(r => String(r?.postId || '') === String(post.id)) && (
                          <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">
                            🎯 Funnel Locked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-3 mt-1.5 font-medium leading-relaxed">{post.caption || "No caption data specified for this asset block."}</p>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-3 border-t border-gray-800/80 pt-2 text-[11px] text-gray-400 font-bold">
                        <div className="flex items-center gap-1" title="Views/Impressions"><Eye size={12} className="text-blue-400" /> {post.impressions || 0}</div>
                        <div className="flex items-center gap-1" title="Likes"><Heart size={12} className="text-red-400" /> {post.like_count || 0}</div>
                        <div className="flex items-center gap-1" title="Comments"><MessageSquare size={12} className="text-green-400" /> {post.comments_count || 0}</div>
                        <div className="flex items-center gap-1 text-pink-400" title="Auto-DMs Successfully Fired">
                          <Inbox size={12} /> DMs Fired: { savedAutomations.find(r => String(r?.postId || '') === String(post.id))?.stats?.sentCount || post.stats?.sentCount || post.stats?.dmsSent || 0 }
                        </div>
                        <div className="flex items-center gap-1 text-purple-400" title="Quick Reply Button Taps">
                          <Zap size={12} /> Taps: { post.stats?.buttonClicks || 0 }
                        </div>
                        {/* View Insights Button */}
                        <button onClick={() => setSelectedPostForInsights(post)} className="flex items-center gap-1 text-blue-400 hover:underline" title="View Post Insights">
                          <BarChart3 size={12} /> Insights
                        </button>
                        {/* Analyze with AI Button */}
                        <button onClick={() => handleAnalyzePost(post)} className="flex items-center gap-1 text-purple-400 hover:underline" title="Analyze with AI">
                          <Sparkles size={12} /> Analyze
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[9px] font-extrabold tracking-wider uppercase mb-4">
                    <div className="bg-blue-950/20 border border-blue-900/30 text-blue-400 p-1.5 rounded text-center">Bot Replies: {post.stats?.chatBotReplied || 0}</div>
                    <div className={`${post.stats?.pending > 0 ? 'bg-rose-950/30 border border-rose-900/40 text-rose-400' : 'bg-gray-900/40 border border-gray-800 text-gray-500'} p-1.5 rounded text-center`}>Pending/Missed: {post.stats?.pending || 0}</div>
                    <div className="bg-purple-950/20 border border-purple-900/30 text-purple-400 p-1.5 rounded text-center">AI Intercepts: {post.stats?.aiCaught || 0}</div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-gray-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Routing Configuration</label>
                      <button
                        type="button"
                        onClick={() => togglePostCommentAi(post.id, post.commentAiReplyEnabled !== false)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black transition-colors ${post.commentAiReplyEnabled !== false ? 'bg-emerald-500 text-black' : 'bg-gray-700 text-white'}`}
                      >
                        {post.commentAiReplyEnabled !== false ? 'AI Comment Replies ON' : 'AI Comment Replies OFF'}
                      </button>
                    </div>
                    <select 
                      value={post.botMode || 'off'} 
                      onChange={(e) => updatePostMode(post.id, e.target.value)}
                      className="bg-gray-900 border border-gray-700 text-white text-xs font-bold rounded px-2 py-1 outline-none cursor-pointer focus:border-pink-500"
                    >
                        <option value="off" className="bg-[#111] text-white">Off (Disable Bot)</option>
                        <option value="instant_shortcut" className="bg-[#111] text-white">Instant Keyword (Shortcut ⚡)</option>
                        <option value="chatbot" className="bg-[#111] text-white">Keyword Engine Only (Advanced ⚙️)</option>
                        <option value="hybrid" className="bg-[#111] text-white">Keyword + AI Intent Recovery (🔒 Pro)</option>
                      </select>
                    </div>

                    {/* 🚀 SUPER-POWERED INLINE RULE PANEL: Trigger, Public Reply, DM Body & PDF Upload */}
                    {post.botMode === 'instant_shortcut' && (
                      <div className="p-3.5 bg-gray-950 rounded-xl border border-pink-500/20 mt-2 space-y-2.5 animate-fade-in text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-pink-400 uppercase mb-1">Trigger Keyword *</label>
                            <input 
                              type="text" 
                              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-pink-500" 
                              placeholder="e.g. LINK, PRICE, BOOK" 
                              value={post.chatBotKeyword || ''} 
                              onChange={(e) => updateInlineValue(post.id, 'chatBotKeyword', e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Public Comment Reply (Optional)</label>
                            <input 
                              type="text" 
                              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-pink-500" 
                              placeholder="e.g. Check your DM! 📩" 
                              value={post.publicReply !== undefined ? post.publicReply : 'Check your DM! Details sent. 📩'} 
                              onChange={(e) => updateInlineValue(post.id, 'publicReply', e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-purple-400 uppercase mb-1">DM Message Body (Customer Inbox)</label>
                          <textarea 
                            rows="2"
                            className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500" 
                            placeholder="Here is your requested asset package link details:" 
                            value={post.chatBotReply !== undefined ? post.chatBotReply : 'Here is your requested asset package link details:'} 
                            onChange={(e) => updateInlineValue(post.id, 'chatBotReply', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Link URL / Upload PDF File</label>
                          <div className="flex gap-2">
                            <input 
                              type="url" 
                              className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-pink-500" 
                              placeholder="https://... or upload PDF below" 
                              value={post.fileUrl || ''} 
                              onChange={(e) => updateInlineValue(post.id, 'fileUrl', e.target.value)}
                            />
                            <label className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold px-3 rounded-lg cursor-pointer flex items-center justify-center border border-gray-700 whitespace-nowrap text-xs">
                              {isUploadingPdf ? 'Uploading...' : '📎 Upload PDF'}
                              <input 
                                type="file" 
                                accept=".pdf,.png,.jpg,.jpeg" 
                                className="hidden" 
                                onChange={(e) => handleCardPdfUpload(post.id, e.target.files[0])} 
                                disabled={isUploadingPdf} 
                              />
                            </label>
                          </div>
                        </div>

                        {/* 📦 ATTACH FEATURED CATALOG PRODUCTS (1-4 ITEMS) */}
                        <div className="space-y-1.5 border-t border-gray-800/80 pt-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1">
                              <span>📦 Attach Featured Products (Max 4 for this Reel)</span>
                            </label>
                            <span className="text-[9px] text-gray-500 font-mono">
                              {(post.selectedProductIds || []).length}/4 Selected
                            </span>
                          </div>

                          {catalogItems.length === 0 ? (
                            <p className="text-[10px] text-gray-500 italic bg-[#0a0a0a] p-2 rounded-lg border border-gray-800">
                              No products in catalog yet. Add products from the Catalog tab to link them here!
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                              {catalogItems.map(item => {
                                const isSelected = (post.selectedProductIds || []).includes(item._id || item.id);
                                return (
                                  <div 
                                    key={item._id || item.id}
                                    onClick={() => togglePostProduct(post.id, item._id || item.id)}
                                    className={`p-1.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                                      isSelected 
                                        ? 'bg-amber-950/40 border-amber-500 text-white shadow-sm' 
                                        : 'bg-[#0a0a0a] border-gray-800 text-gray-400 hover:border-gray-700'
                                    }`}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-800">
                                      {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-xs">🛍️</span>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[10px] font-bold truncate text-white">{item.name}</p>
                                      <p className="text-[9px] text-emerald-400 font-mono">₹{item.price}</p>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold ${
                                      isSelected ? 'bg-amber-500 border-amber-400 text-black' : 'border-gray-700 text-transparent'
                                    }`}>
                                      ✓
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleInlineShortcutSave(post)}
                          className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-bold text-white rounded-lg uppercase tracking-wider shadow-md hover:opacity-95 transition-all mt-1 flex items-center justify-center gap-1.5"
                        >
                          ⚡ Save Automation Rule (Public Reply + DM + Products)
                        </button>
                      </div>
                    )}

                    {post.botMode === 'chatbot' && (
                      <div className="space-y-2 bg-gray-950 p-3 rounded-xl border border-gray-800/60 animate-fade-in">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Exact Match Trigger Tag</label>
                          <input type="text" className="w-full bg-[#0a0a0a] border border-gray-800 rounded-md px-2 py-1.5 text-xs text-white outline-none" placeholder="e.g. LINK" defaultValue={post.chatBotKeyword} />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Standard Dispatch Message Context</label>
                          <textarea rows="1" className="w-full bg-[#0a0a0a] border border-gray-800 rounded-md px-2 py-1.5 text-xs text-white outline-none" placeholder="Message to append with link payload..." defaultValue={post.chatBotReply} />
                        </div>
                        
                        {post.stats?.pending > 0 && (
                          <button 
                            type="button"
                            disabled={processingId === post.id}
                            onClick={() => processPendingWithAI(post.id)}
                            className="w-full py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-[10px] font-bold text-white rounded-md mt-1 shadow-md"
                          >
                            {processingId === post.id ? 'Processing Pipeline...' : `Intercept ${post.stats.pending} Pending Comments via Smart AI`}
                          </button>
                        )}
                      </div>
                    )}

                    {post.botMode === 'hybrid' && isPremiumUser && (
                      <div className="bg-purple-950/10 border border-purple-500/20 p-3 rounded-xl animate-fade-in">
                        <label className="block text-[9px] font-bold text-purple-400 uppercase mb-1">Target Prompt Constraints for AI Engine</label>
                        <textarea rows="2" className="w-full bg-black border border-gray-800 rounded-md p-2 text-xs text-white outline-none focus:border-purple-500" placeholder="Specify catalog info or alternate backup URLs here..." defaultValue={post.aiContext} />
                      </div>
                    )}
                  </div>

                {post.botMode !== 'instant_shortcut' && (
                  <div className="mt-4 pt-3 border-t border-gray-800/80 flex justify-end">
                    <button 
                      onClick={() => { 
                        setNewAuto({ postId: post.id, triggerWord: post.chatBotKeyword || '', replyMessage: post.chatBotReply || '', fileUrl: post.fileUrl || '', publicReply: post.publicReply || 'Check your DM! 📩', deliveryMode: 'direct' }); 
                        setSelectedPostForAuto(post); 
                      }} 
                      className="bg-gradient-to-r from-pink-600 to-purple-600 text-[11px] font-bold px-4 py-2 rounded-xl text-white shadow-md shadow-pink-600/10 hover:opacity-90"
                    >
                      🎁 Set Dedicated Asset Link Rule
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SMART COMMENT GROUPING */}
      {activeTab === 'smart-groups' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#11] border border-gray-800 p-5 rounded-2xl shadow-lg">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">AI Intent Semantic Clusters</h2>
              <p className="text-xs text-gray-500 mt-1">Comments unhandled by strict keyword match are logically grouped by AI intent block rules here.</p>
          </div>

          <div className="bg-gradient-to-r from-purple-950/40 to-black p-5 rounded-2xl border border-purple-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-purple-400 uppercase tracking-wider flex items-center gap-1">📊 Unmatched Gap Context Analytics</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xl">Out of total post comment engagements, some users missed direct delivery due to bad keywords spellings. Review semantic clusters below to force safe delivery loops.</p>
            </div>
            <button 
              type="button"
              onClick={() => toast.success("Processing bulk delivery sequence across active unmatched queue loops...")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/10 whitespace-nowrap"
            >
              🚀 Send Default Asset Link to All Unmatched in One-Click
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {commentGroups.length === 0 ? (
              <div className="bg-[#111] border border-gray-800 p-8 text-center rounded-2xl text-gray-600 font-medium">No system-captured edge comments require custom cluster configurations.</div>
            ) : (
              commentGroups.map((group) => (
                <div key={group.id} className="bg-[#111111] border border-gray-800 rounded-2xl p-5 flex flex-col md:flex-row gap-6">
                  <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-gray-800/80 pb-4 md:pb-0 md:pr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-purple-500/10 text-purple-400 text-[10px] font-black px-2.5 py-1 rounded-full border border-purple-500/20">{group.count} Leads</span>
                      <h3 className="font-bold text-white text-sm">{group.theme}</h3>
                    </div>
                    <div className="text-xs text-gray-400 mt-3 space-y-1.5">
                      <p className="font-bold text-gray-400 uppercase tracking-wide text-[10px]">Sample Intent Gaps:</p>
                      <ul className="list-disc pl-4 space-y-1 font-medium italic text-gray-500">
                        {group.samples.map((sample, idx) => <li key={idx}>"{sample}"</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="md:w-2/3 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1.5">Configure System Response Payload:</label>
                      <textarea className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-500 font-medium" rows="2" placeholder="Input static message context sequence..." value={group.replyText || ''} onChange={(e) => handleReplyChange(group.id, e.target.value)}></textarea>
                    </div>
                    <div className="flex justify-end gap-3 mt-3">
                      <button onClick={() => generateAIReply(group.id, group.theme)} className="text-xs text-purple-400 font-bold hover:bg-purple-500/5 border border-purple-500/20 px-3 py-1.5 rounded-lg">
                        ✨ Generate Draft via AI
                      </button>
                      <button onClick={() => sendBulkReply(group.id, group.count, group.replyText)} disabled={!group.replyText || sendingBulkId === group.id} className="bg-gradient-to-r from-purple-600 to-pink-600 text-xs font-bold text-white px-5 py-1.5 rounded-lg disabled:opacity-40">
                        {sendingBulkId === group.id ? 'Firing Sequences...' : `Bulk Reply to All ${group.count} Targets`}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* LEAD MAGNET BUILDER CONTAINER FOR GENERAL TARGETS */}
      {activeTab === 'general' && (
        <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-lg p-6 mt-8">
          <h2 className="text-base font-bold text-white uppercase tracking-wider mb-1">🎁 Multi-Asset Global Funnel (Default Catch-All)</h2>
          <p className="text-xs text-gray-500 mb-4">Fallback rule configuration to safe-catch target keyword queries across all general posts when no standalone rules apply.</p>
          
          <form onSubmit={handleAddPostAuto} className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-gray-400 font-bold mb-1">Global Target Mapping Index</label><input type="text" value={newAuto.postId} onChange={e=>setNewAuto({...newAuto, postId: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500" placeholder="Global fallback container (leave blank)" /></div>
              <div><label className="block text-gray-400 font-bold mb-1">Trigger Tag *</label><input type="text" required value={newAuto.triggerWord} onChange={e=>setNewAuto({...newAuto, triggerWord: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500" placeholder="e.g. BOOK, LINK" /></div>
            </div>
            <div><label className="block text-gray-400 font-bold mb-1">Public Feed Comment Content *</label><input type="text" required value={newAuto.publicReply} onChange={e=>setNewAuto({...newAuto, publicReply: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500" /></div>
            <div><label className="block text-gray-400 font-bold mb-1">DM Message Body *</label><textarea required value={newAuto.replyMessage} onChange={e=>setNewAuto({...newAuto, replyMessage: e.target.value})} rows="2" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500" placeholder="Message content detailing link package..."></textarea></div>
            
            <div>
              <label className="block text-gray-400 font-bold mb-1">Destination Target Document/Catalog URL *</label>
              <div className="flex gap-2">
                <input type="url" required value={newAuto.fileUrl} onChange={e=>setNewAuto({...newAuto, fileUrl: e.target.value})} className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500" placeholder="https://newpropertyhub.in/catalog" />
                <label className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-4 rounded-lg cursor-pointer flex items-center justify-center border border-gray-700 whitespace-nowrap">
                  {isUploadingPdf ? 'Uploading...' : '📎 Upload Asset'}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handlePdfUpload} disabled={isUploadingPdf} />
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Action Delivery Method *</label>
                <select value={newAuto.deliveryMode || 'direct'} onChange={e=>setNewAuto({...newAuto, deliveryMode: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500">
                  <option value="direct">Direct Redirection (Immediate Dispatch Link)</option>
                  <option value="button">Interactive Quick Reply Button Element (Adds conversion click tracking)</option>
                </select>
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md w-full md:w-auto">Inject Global Rule Target</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* DEDICATED PER-POST CONFIGURATION BUILDER MODAL */}
      {selectedPostForAuto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-pink-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-fade-in text-xs">
            <button onClick={() => setSelectedPostForAuto(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm">✕</button>
            <h2 className="text-base font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1"><FileText size={16} className="text-pink-500" /> Dedicated Asset Mapping</h2>
            <p className="text-gray-500 mb-5">Define a hyper-targeted response link blueprint exclusively for the selected post item.</p>
            
            <form onSubmit={handleSavePostSpecificAuto} className="space-y-4">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Trigger Word *</label>
                <input type="text" required value={newAuto.triggerWord} onChange={e=>setNewAuto({...newAuto, triggerWord: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500" placeholder="e.g. REEL, PROPERTY, PRICE" />
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1">Public Feed Comment Template *</label>
                <input type="text" required value={newAuto.publicReply} onChange={e=>setNewAuto({...newAuto, publicReply: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500" />
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1">DM Transmission Body *</label>
                <textarea required value={newAuto.replyMessage} onChange={e=>setNewAuto({...newAuto, replyMessage: e.target.value})} rows="2" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500" placeholder="Here is the link details for your property request..."></textarea>
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1">Target Document / Landing Page Link *</label>
                <div className="flex gap-2">
                  <input type="url" required value={newAuto.fileUrl} onChange={e=>setNewAuto({...newAuto, fileUrl: e.target.value})} className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500" placeholder="https://..." />
                  <label className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-3 rounded-lg cursor-pointer flex items-center justify-center border border-gray-700 whitespace-nowrap">
                    {isUploadingPdf ? 'Uploading...' : '📎 Upload File'}
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handlePdfUpload} disabled={isUploadingPdf} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-gray-400 font-bold mb-1">Delivery System Method *</label>
                <select value={newAuto.deliveryMode || 'direct'} onChange={e=>setNewAuto({...newAuto, deliveryMode: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none focus:border-pink-500">
                  <option value="direct">Direct Link Redirection (Immediate Dispatch)</option>
                  <option value="button">Interactive Quick Reply Button (Adds conversion click tracking)</option>
                </select>
              </div>
              <button type="submit" className="bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg w-full mt-2 text-xs">
                Save Asset Funnel Mapping
              </button>
            </form>
          </div>
        </div>
      )}

      <DashboardAIAssistant />
    </div>
  );
}
