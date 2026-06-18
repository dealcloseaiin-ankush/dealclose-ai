import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import DashboardAIAssistant from '../components/DashboardAIAssistant';

export default function InstagramAutomation() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');

  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'posts'

  const [stats, setStats] = useState({
    totalCommentsAnalyzed: 0,
    totalDMsReceived: 0,
    leadsExtracted: 0,
    dmsSent: 0,
    whatsappConversationsStarted: 0,
    conversionRate: '0%'
  });

  const [config, setConfig] = useState({
    aiSmartReply: false,
    autoDmOnComment: false,
    extractPhoneNumbers: false,
    forceWhatsappRedirect: false
  });

  const [igLeads, setIgLeads] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [commentGroups, setCommentGroups] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [sendingBulkId, setSendingBulkId] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [iceBreakers, setIceBreakers] = useState('');
  
  // 🚀 NEW: Post Automation Form State
  const [newAuto, setNewAuto] = useState({ postId: '', triggerWord: '', replyMessage: '', fileUrl: '', publicReply: 'Check your DM! 📩', deliveryMode: 'direct' });
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

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
       await api.put('/users/profile', { postAutomations: [...(user?.postAutomations || []), newAuto] });
       toast.success("Post Automation Rule Added!");
       setNewAuto({ postId: '', triggerWord: '', replyMessage: '', fileUrl: '', publicReply: 'Check your DM! 📩', deliveryMode: 'direct' });
    } catch { toast.error("Failed to add rule."); }
  };

  // 🚀 NEW: Specific Post Auto-DM State & Function
  const [selectedPostForAuto, setSelectedPostForAuto] = useState(null);
  const handleSavePostSpecificAuto = async (e) => {
    e.preventDefault();
    try {
       const updatedAutomations = [...(user?.postAutomations || []).filter(r => r.postId !== selectedPostForAuto.id), { ...newAuto, postId: selectedPostForAuto.id }];
       await api.put('/users/profile', { postAutomations: updatedAutomations });
       toast.success("Post Automation Saved Successfully!");
       setSelectedPostForAuto(null);
       setNewAuto({ postId: '', triggerWord: '', replyMessage: '', fileUrl: '', publicReply: 'Check your DM! 📩', deliveryMode: 'direct' });
    } catch { toast.error("Failed to save post automation."); }
  };

  // 🚀 NEW: Fetch real posts & reels from Meta API
  const handleSyncPosts = async () => {
    const toastId = toast.loading("Syncing recent posts from Instagram...");
    try {
      // 🚀 FIX: Calling the exact matching backend route /instagram/posts
      const res = await api.get('/instagram/posts', { params: { workspaceId: activeWorkspace } });
      if (res.data && res.data.posts) {
        // 🚀 CRITICAL FIX: Add default stats object to prevent React crash when rendering!
        const safePosts = res.data.posts.map(p => ({
          ...p,
          stats: p.stats || { views: '1.2k', totalComments: 0, dmsSent: 0, chatBotReplied: 0, pending: 0, aiCaught: 0 },
          botMode: p.botMode || 'off'
        }));
        setRecentPosts(safePosts);
        toast.success("Posts synced successfully! 🎉", { id: toastId });
      } else {
        toast.success("Sync successful, but no new posts found.", { id: toastId });
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to sync posts. Please check if Instagram is connected in Settings.", { id: toastId });
    }
  };

  useEffect(() => {
    const fetchIgData = async () => {
      try {
        const profileRes = await api.get('/users/profile').catch(() => null);
        const u = profileRes?.data?.user || profileRes?.data;
        if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);

        const { data } = await api.get('/instagram/dashboard', { params: { workspaceId: activeWorkspace } }).catch(() => ({ data: {} }));
        if (data.stats) setStats(data.stats);
        if (data.config) setConfig(data.config);
        if (data.igLeads) setIgLeads(Array.isArray(data.igLeads) ? data.igLeads : []);
        if (data.commentGroups) setCommentGroups(Array.isArray(data.commentGroups) ? data.commentGroups : []);

        // 🚀 FIX: Start hote hi directly posts wale route ko call karke load karega!
        const postsRes = await api.get('/instagram/posts', { params: { workspaceId: activeWorkspace } }).catch(() => ({ data: { posts: [] } }));
        if (postsRes.data && postsRes.data.posts) {
           const safePosts = postsRes.data.posts.map(p => ({
             ...p,
             stats: p.stats || { views: '1.2k', totalComments: 0, dmsSent: 0, chatBotReplied: 0, pending: 0, aiCaught: 0 },
             botMode: p.botMode || 'off'
           }));
           setRecentPosts(safePosts);
        }
      } catch (error) {
        console.error("Failed to fetch IG data", error);
      }
    };
    fetchIgData();
  }, [activeWorkspace]);

  const handleReplyChange = (id, text) => {
    setCommentGroups(groups => groups.map(g => g.id === id ? { ...g, replyText: text } : g));
  };

  const sendBulkReply = async (id, count, text) => {
    setSendingBulkId(id);
    try {
      await api.post('/instagram/comments/bulk-reply', { groupId: id, replyText: text });
      toast.success(`Successfully sent Bulk AI Reply to ${count} users! 🚀`);
      // Remove from UI after sending
      setCommentGroups(groups => groups.filter(g => g.id !== id));
    } catch (error) {
      console.error("Bulk reply error:", error);
      toast.error("Failed to send bulk replies. Check connection.");
    } finally {
      setSendingBulkId(null);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg) return;
    try {
      const res = await api.post('/instagram/broadcast', { messageText: broadcastMsg });
      toast.success(res.data.message);
      setBroadcastMsg('');
    } catch (err) { toast.error(err.response?.data?.message || 'Broadcast failed.'); }
  };

  const handleSetIceBreakers = async (e) => {
    e.preventDefault();
    if (!iceBreakers) return;
    try {
      const questions = iceBreakers.split(',').map(q => q.trim()).filter(q => q);
      await api.post('/instagram/icebreakers', { questions });
      toast.success('Ice Breakers updated on Instagram!');
  } catch (err) { toast.error(err.response?.data?.message || 'Failed to update Ice Breakers.'); }
  };

  const generateAIReply = (id, theme) => {
    let aiGenerated = "";
    // Generating polite, public-friendly Instagram comments
    if (theme.includes("Price")) aiGenerated = "Hi! Thanks for asking. The price is ₹999. You can order directly via our link in bio! 🛍️";
    if (theme.includes("Delivery")) aiGenerated = "Hello! We deliver pan-India within 3-5 working days. 🚚";
    if (theme.includes("Unclear")) aiGenerated = "Thank you for the love! ❤️";
    handleReplyChange(id, aiGenerated);
  };

  const handleToggle = (key) => {
    setConfig({ ...config, [key]: !config[key] });
  };

  const updatePostMode = (id, newMode) => {
    setRecentPosts(posts => posts.map(p => p.id === id ? { ...p, botMode: newMode } : p));
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
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#020202] text-gray-100 font-sans">
      
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              Instagram AI Funnel
            </h1>
            <select 
              value={activeWorkspace} 
              onChange={(e) => setActiveWorkspace(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-pink-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-400">Manage your Instagram automations and see how AI is converting comments into WhatsApp leads.</p>
        </div>
        <button onClick={handleSyncPosts} className="px-5 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 hover:border-pink-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center gap-2">
          🔄 Sync IG Posts
        </button>
      </div>

      {/* 1. Analytics Section (The "Value" Prover) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-[#111111] border border-gray-800 p-5 rounded-2xl shadow-lg">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Total DMs Received</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.totalDMsReceived}</p>
        </div>
        <div className="bg-[#111111] border border-pink-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/10 rounded-bl-full"></div>
          <p className="text-pink-400 text-sm font-semibold uppercase tracking-wide">Leads Generated</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.leadsExtracted}</p>
          <div className="flex justify-between items-end mt-1">
            <p className="text-xs text-gray-400">Moved to CRM pipeline</p>
            <Link to="/crm" className="text-xs font-bold text-pink-400 hover:text-pink-300 transition-colors relative z-10">View in CRM ↗</Link>
          </div>
        </div>
        <div className="bg-[#111111] border border-green-500/30 p-5 rounded-2xl shadow-lg">
          <p className="text-green-400 text-sm font-semibold uppercase tracking-wide">Bot/AI Replies Sent</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.dmsSent}</p>
          <p className="text-xs text-gray-400 mt-1">Automated DMs delivered</p>
        </div>
        <div className="bg-gradient-to-br from-pink-600 to-purple-700 p-5 rounded-2xl shadow-lg text-white">
          <p className="text-white/80 text-sm font-semibold uppercase tracking-wide">Lead Conversion Rate</p>
          <p className="text-4xl font-extrabold mt-1">{stats.conversionRate}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-800 pb-px">
        <button onClick={() => setActiveTab('general')} className={`pb-3 px-2 font-semibold transition-all duration-300 ${activeTab === 'general' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
          General Rules & Live Activity
        </button>
        <button onClick={() => setActiveTab('posts')} className={`pb-3 px-2 font-semibold transition-all duration-300 ${activeTab === 'posts' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
          Per-Post Customization (E-commerce)
        </button>
        <button onClick={() => setActiveTab('smart-groups')} className={`pb-3 px-2 font-semibold transition-all duration-300 ${activeTab === 'smart-groups' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
          Smart Comment Grouping
        </button>
      </div>

      {activeTab === 'general' && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 2. Automation Settings */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Global AI Rules</h2>
              
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200">AI Smart Reply</p>
                    <p className="text-xs text-gray-500">AI reads context instead of generic replies</p>
                  </div>
                  <button onClick={() => handleToggle('aiSmartReply')} className={`w-12 h-6 rounded-full transition-colors relative ${config.aiSmartReply ? 'bg-purple-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.aiSmartReply ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200">Auto-DM on Comments</p>
                    <p className="text-xs text-gray-500">Send catalog/link to commentors</p>
                  </div>
                  <button onClick={() => handleToggle('autoDmOnComment')} className={`w-12 h-6 rounded-full transition-colors relative ${config.autoDmOnComment ? 'bg-purple-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.autoDmOnComment ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200 text-pink-400">Silent Lead Extractor</p>
                    <p className="text-xs text-gray-500">Auto-save phone numbers to CRM</p>
                  </div>
                  <button onClick={() => handleToggle('extractPhoneNumbers')} className={`w-12 h-6 rounded-full transition-colors relative ${config.extractPhoneNumbers ? 'bg-pink-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.extractPhoneNumbers ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-gray-800 pt-4 mt-2">
                  <div>
                    <p className="font-bold text-green-400">Force WhatsApp Funnel</p>
                    <p className="text-xs text-gray-500">Always try to move users to WhatsApp</p>
                  </div>
                  <button onClick={() => handleToggle('forceWhatsappRedirect')} className={`w-12 h-6 rounded-full transition-colors relative ${config.forceWhatsappRedirect ? 'bg-green-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.forceWhatsappRedirect ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>

          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-lg mt-6">
            <h2 className="text-lg font-semibold text-white mb-2">Ice Breakers (FAQ Buttons)</h2>
            <p className="text-xs text-gray-400 mb-4">Show buttons to new users before they type. Comma separated.</p>
            <form onSubmit={handleSetIceBreakers} className="flex gap-2">
              <input type="text" value={iceBreakers} onChange={(e) => setIceBreakers(e.target.value)} placeholder="e.g. Chat with Sales, Collab Request" className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg p-2 text-sm text-white outline-none focus:border-purple-500" />
              <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-500 transition-colors">Set</button>
            </form>
          </div>

          <div className="bg-gradient-to-br from-[#1a1525] to-[#111] border border-purple-500/30 rounded-2xl p-6 shadow-lg mt-6">
            <h2 className="text-lg font-semibold text-purple-400 mb-2">24H Marketing Broadcast</h2>
            <p className="text-xs text-gray-400 mb-4">Send a bulk DM to everyone who messaged you in the last 24 hours.</p>
            <form onSubmit={handleSendBroadcast} className="flex flex-col gap-3">
              <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} rows="3" placeholder="Hey! Check out our new reel..." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500"></textarea>
              <button type="submit" className="bg-purple-600 text-white py-2 rounded-lg text-sm font-bold shadow-lg shadow-purple-500/20 hover:bg-purple-500 transition-colors">Send Broadcast 🚀</button>
            </form>
          </div>
          </div>

          {/* 3. IG Leads Tracker */}
          <div className="lg:col-span-2">
            <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-5 border-b border-gray-800 bg-[#1a1a1a]">
                <h2 className="text-lg font-semibold text-white">Live IG Activity & Conversions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#0a0a0a] text-gray-400 text-sm tracking-wider">
                      <th className="p-4 font-semibold">IG Handle</th>
                      <th className="p-4 font-semibold">User Action</th>
                      <th className="p-4 font-semibold">AI Intent</th>
                      <th className="p-4 font-semibold">AI Response</th>
                      <th className="p-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-sm">
                    {igLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-900/50 transition-colors">
                        <td className="p-4 font-medium text-pink-400">{lead.handle}</td>
                        <td className="p-4 text-gray-300 truncate max-w-[200px]">{lead.trigger}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${lead.intent === 'High' ? 'bg-green-500/20 text-green-400' : lead.intent === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>{lead.intent}</span>
                        </td>
                        <td className="p-4 text-gray-400">{lead.action}</td>
                        <td className="p-4 font-semibold text-white">{lead.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        {/* 🚀 NEW: Send Link in DM & Public Comment Reply Builder */}
        <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-white mb-2">🎁 Auto-DM Link Delivery (Lead Magnet)</h2>
          <p className="text-gray-400 text-sm mb-6">When users comment a specific keyword on your post, publicly reply to their comment and secretly DM them the link!</p>
          
          <form onSubmit={handleAddPostAuto} className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-gray-400 mb-1">Post/Reel ID (Optional)</label><input type="text" value={newAuto.postId} onChange={e=>setNewAuto({...newAuto, postId: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none" placeholder="Leave empty for all posts" /></div>
              <div><label className="block text-xs font-bold text-gray-400 mb-1">Trigger Keyword <span className="text-rose-500">*</span></label><input type="text" required value={newAuto.triggerWord} onChange={e=>setNewAuto({...newAuto, triggerWord: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none" placeholder="e.g. LINK" /></div>
            </div>
            <div><label className="block text-xs font-bold text-gray-400 mb-1">Public Comment Reply <span className="text-rose-500">*</span></label><input type="text" required value={newAuto.publicReply} onChange={e=>setNewAuto({...newAuto, publicReply: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none" placeholder="Hey! I've sent you a DM 📩" /></div>
            <div><label className="block text-xs font-bold text-gray-400 mb-1">DM Message <span className="text-rose-500">*</span></label><textarea required value={newAuto.replyMessage} onChange={e=>setNewAuto({...newAuto, replyMessage: e.target.value})} rows="2" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none" placeholder="Here is the link you asked for!"></textarea></div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">File / Website Link <span className="text-rose-500">*</span></label>
              <div className="flex gap-2">
                <input type="url" required value={newAuto.fileUrl} onChange={e=>setNewAuto({...newAuto, fileUrl: e.target.value})} className="flex-1 w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none" placeholder="https://..." />
                <label className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2.5 px-4 rounded-lg cursor-pointer transition-colors text-xs flex items-center justify-center whitespace-nowrap border border-gray-700 shadow-sm">
                  {isUploadingPdf ? '⏳ Uploading...' : '📎 Upload PDF'}
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handlePdfUpload} disabled={isUploadingPdf} />
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1">Delivery Method <span className="text-rose-500">*</span></label>
              <select value={newAuto.deliveryMode || 'direct'} onChange={e=>setNewAuto({...newAuto, deliveryMode: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none">
                <option value="direct">Direct Link (Send immediately)</option>
                <option value="button">Quick Reply Button (User taps to get link)</option>
              </select>
            </div>
            <button type="submit" className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg w-full md:w-auto">Add Automation Rule</button>
          </form>
        </div>
        </>
      )}
      
      {activeTab === 'posts' && (
        <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-lg p-6 animate-fade-in">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Per-Post Bot Configuration</h2>
            <p className="text-gray-400 text-sm">First, the Chat Bot replies to exact keywords. Then, the AI Smart Chat Bot handles all remaining/complex comments!</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recentPosts.map(post => (
              <div key={post.id} className={`border ${post.botMode === 'hybrid' ? 'border-purple-500/50 bg-[#1a1525]' : post.botMode === 'chatbot' ? 'border-blue-500/50 bg-[#151a25]' : 'border-gray-800 bg-[#0a0a0a]'} rounded-xl p-5 relative transition-all`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center text-3xl shadow-inner overflow-hidden border border-gray-700">
                    {post.mediaUrl ? <img src={post.mediaUrl} alt="post" className="w-full h-full object-cover"/> : post.image}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{post.type}</span>
                      {/* 🚀 Show if Auto-DM Rule exists for this post */}
                      {user?.postAutomations?.find(r => r.postId === post.id) && (
                        <span className="bg-pink-500/20 text-pink-400 border border-pink-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          🎁 Auto-DM Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2 mt-1 font-medium">{post.caption}</p>
                    
                    {/* 🚀 NEW: Visual Enterprise Stats (Views, Comments, DMs) */}
                    <div className="flex items-center gap-4 mt-3 border-t border-gray-800 pt-2">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold"><span className="text-blue-400">👁️</span> {post.stats?.views || '1.2k'}</div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold"><span className="text-green-400">💬</span> {post.stats?.totalComments || 0}</div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold"><span className="text-pink-400">📩</span> {
                        user?.postAutomations?.find(r => r.postId === post.id)?.stats?.sentCount || post.stats?.dmsSent || 0
                      }</div>
                    </div>

                    {/* Performance Stats highlighting AI Value */}
                    <div className="mt-3 text-[10px] font-bold space-y-1">
                      <div className="flex gap-2">
                        <span className="text-blue-400 bg-blue-400/10 px-2 py-1 rounded">Chat Bot: {post.stats.chatBotReplied}</span>
                      </div>
                      
                      {post.stats.pending > 0 && (
                        <div className="text-rose-400 bg-rose-400/10 px-2 py-1 rounded inline-block">
                          ⚠️ Missed/Pending: {post.stats.pending} 
                        </div>
                      )}
                      {post.stats.aiCaught > 0 && (
                        <div className="text-purple-400 bg-purple-400/10 px-2 py-1 rounded inline-block flex items-center gap-1">
                          ✨ AI Caught & Replied: {post.stats.aiCaught}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 border-t border-gray-800 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-gray-400 uppercase">Automation Mode</label>
                    <select 
                      value={post.botMode} 
                      onChange={(e) => updatePostMode(post.id, e.target.value)}
                      className="bg-gray-900 border border-gray-700 text-white text-xs font-bold rounded p-1 outline-none"
                    >
                      <option value="off">Off</option>
                      <option value="chatbot">Chat Bot Only (Basic)</option>
                      <option value="hybrid">Chat Bot + AI Smart Chat Bot (Pro)</option>
                    </select>
                  </div>

                  {(post.botMode === 'chatbot' || post.botMode === 'hybrid') && (
                    <div className="space-y-3 animate-fade-in bg-blue-900/10 p-3 rounded-lg border border-blue-500/20">
                      <div>
                        <label className="block text-xs text-blue-400 mb-1">Exact Keyword Trigger</label>
                        <input type="text" className="w-full bg-black border border-gray-700 rounded-md p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="e.g. LINK" defaultValue={post.chatBotKeyword} />
                      </div>
                      <div>
                        <label className="block text-xs text-blue-400 mb-1">Static DM Reply</label>
                        <textarea rows="2" className="w-full bg-black border border-gray-700 rounded-md p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="Static reply message..." defaultValue={post.chatBotReply} />
                      </div>
                      <p className="text-[10px] text-gray-500">Fast & Free: Replies instantly if comment exactly matches the keyword.</p>
                      
                      {/* The UPSELL Button */}
                      {post.botMode === 'chatbot' && post.stats.pending > 0 && (
                        <button onClick={() => processPendingWithAI(post.id)} disabled={processingId === post.id} className="w-full mt-2 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(168,85,247,0.3)] disabled:opacity-50">
                          {processingId === post.id ? 'Processing...' : `Process remaining ${post.stats.pending} comments with AI Smart Chat Bot ⚡`}
                        </button>
                      )}
                    </div>
                  )}

                  {post.botMode === 'hybrid' && (
                    <div className="space-y-3 animate-fade-in bg-purple-900/10 p-3 rounded-lg border border-purple-500/20 mt-3">
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-lg">✨</span>
                         <label className="block text-xs font-bold text-purple-400">AI Smart Chat Bot Instructions</label>
                      </div>
                      <textarea 
                        rows="2" 
                        className="w-full bg-black border border-gray-700 rounded-md p-2 text-sm text-white focus:border-purple-500 outline-none" 
                        placeholder="e.g. This is a red dress, price 500. Send link: vyapar.in/red"
                        defaultValue={post.aiContext}
                      />
                      <p className="text-[10px] text-gray-500">AI automatically handles spelling mistakes, questions, and any pending comments missed by the basic Chat Bot!</p>
                    </div>
                  )}
                </div>

                {/* 🚀 NEW: Specific Lead Magnet Button */}
                <div className="mt-4 pt-4 border-t border-gray-800 flex justify-end">
                  <button onClick={() => { setNewAuto(user?.postAutomations?.find(r => r.postId === post.id) || { postId: post.id, triggerWord: '', replyMessage: '', fileUrl: '', publicReply: 'Check your DM! 📩', deliveryMode: 'direct' }); setSelectedPostForAuto(post); }} className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg transition-all flex items-center gap-2">
                    🎁 Set Auto-DM Link Rule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'smart-groups' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#111111] border border-gray-800 p-6 rounded-2xl shadow-lg mb-6">
             <h2 className="text-xl font-bold text-white mb-2">Unanswered Comments (AI Clustered)</h2>
             <p className="text-gray-400 text-sm">30 comments were not understood by basic bots. AI has grouped them by intent so you can bulk-reply.</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {commentGroups.map((group) => (
              <div key={group.id} className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row gap-6">
                
                {/* Left Side: Group Info */}
                <div className="md:w-1/3 border-r border-gray-800 pr-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30">
                      {group.count} Comments
                    </span>
                    <h3 className="font-bold text-white">{group.theme}</h3>
                  </div>
                  <div className="text-sm text-gray-400 space-y-2 mt-3">
                    <p className="font-semibold text-gray-300">Samples from users:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {group.samples.map((sample, idx) => (
                        <li key={idx} className="italic">"{sample}"</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right Side: Action & Reply */}
                <div className="md:w-2/3 flex flex-col justify-between">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Set Bulk Reply for this Group:</label>
                    <textarea className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-purple-500 outline-none" rows="3" placeholder="Type your reply here or draft with AI..." value={group.replyText} onChange={(e) => handleReplyChange(group.id, e.target.value)}></textarea>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => generateAIReply(group.id, group.theme)} className="flex items-center gap-2 text-sm text-purple-400 hover:bg-purple-500/10 px-4 py-2 rounded-lg font-bold border border-purple-500/30 transition-colors">
                      ✨ Draft with AI
                    </button>
                  <button onClick={() => sendBulkReply(group.id, group.count, group.replyText)} disabled={!group.replyText || sendingBulkId === group.id} className="flex items-center gap-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 transition-all">
                    🚀 {sendingBulkId === group.id ? 'Sending...' : `Send to ${group.count} Users`}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🚀 NEW: Per-Post Lead Magnet Modal */}
      {selectedPostForAuto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-pink-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setSelectedPostForAuto(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
            <h2 className="text-xl font-bold text-white mb-2">🎁 Reel / Post Automation</h2>
            <p className="text-xs text-gray-400 mb-6">Create a specific keyword rule for this selected post.</p>
            
            <form onSubmit={handleSavePostSpecificAuto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Trigger Keyword <span className="text-rose-500">*</span></label>
                <input type="text" required value={newAuto.triggerWord} onChange={e=>setNewAuto({...newAuto, triggerWord: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none" placeholder="e.g. PDF, COURSE, LINK" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Public Comment Reply <span className="text-rose-500">*</span></label>
                <input type="text" required value={newAuto.publicReply} onChange={e=>setNewAuto({...newAuto, publicReply: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none" placeholder="I've sent the PDF to your DM! 📩" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">DM Message <span className="text-rose-500">*</span></label>
                <textarea required value={newAuto.replyMessage} onChange={e=>setNewAuto({...newAuto, replyMessage: e.target.value})} rows="2" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none" placeholder="Here is your requested file..."></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">File / Website Link <span className="text-rose-500">*</span></label>
                <div className="flex gap-2">
                  <input type="url" required value={newAuto.fileUrl} onChange={e=>setNewAuto({...newAuto, fileUrl: e.target.value})} className="flex-1 w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none" placeholder="https://..." />
                  <label className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2.5 px-4 rounded-lg cursor-pointer transition-colors text-xs flex items-center justify-center whitespace-nowrap border border-gray-700 shadow-sm">
                    {isUploadingPdf ? '⏳ Uploading...' : '📎 Upload PDF'}
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handlePdfUpload} disabled={isUploadingPdf} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Delivery Method <span className="text-rose-500">*</span></label>
                <select value={newAuto.deliveryMode || 'direct'} onChange={e=>setNewAuto({...newAuto, deliveryMode: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-pink-500 outline-none">
                  <option value="direct">Direct Link (Send immediately)</option>
                  <option value="button">Quick Reply Button (User taps to get link)</option>
                </select>
              </div>
              <button type="submit" className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg w-full mt-2">
                Save Reel Automation
              </button>
            </form>
          </div>
        </div>
      )}

      <DashboardAIAssistant />
    </div>
  );
}