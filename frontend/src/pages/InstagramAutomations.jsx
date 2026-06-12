import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Make sure the path to your API service is correct
import DashboardAIAssistant from '../components/DashboardAIAssistant';

const InstagramAutomations = () => {
  const [posts, setPosts] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  
  // Form State
  const [triggerWord, setTriggerWord] = useState('LINK');
  const [replyMessage, setReplyMessage] = useState('Here is the link you requested!');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState('button');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [postsRes, autoRes] = await Promise.all([
        api.get('/instagram/posts'),
        api.get('/instagram/automations')
      ]);
      if (postsRes.data.success) setPosts(postsRes.data.posts);
      if (autoRes.data.success) setAutomations(autoRes.data.automations);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAutomation = async (e) => {
    e.preventDefault();
    if (!selectedPost) return;

    setUploading(true);
    let finalFileUrl = "";

    try {
      // Step 1: Upload File to Cloudinary (if selected)
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.success) {
          finalFileUrl = uploadRes.data.url;
        }
      }

      // Step 2: Save Automation Rule
      const res = await api.post('/instagram/automations', {
        postId: selectedPost.id,
        thumbnailUrl: selectedPost.thumbnailUrl,
        triggerWord,
        replyMessage,
        fileUrl: finalFileUrl,
        deliveryMode
      });

      if (res.data.success) {
        setAutomations(res.data.automations);
        setSelectedPost(null); // Close modal
        setFile(null);
        alert('Automation saved successfully! 🎉');
      }
    } catch (error) {
      console.error("Save error:", error);
      alert('Failed to save automation.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this automation?')) return;
    try {
      const res = await api.delete(`/instagram/automations/${postId}`);
      if (res.data.success) {
        setAutomations(res.data.automations);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Check if a post already has an automation
  const getAutoForPost = (id) => automations.find(a => a.postId === id);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Reels & Post Automation</h1>
          <p className="text-gray-500">Auto-DM a PDF or Link when someone comments a specific keyword on your posts.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Fetching your recent Instagram posts... ⏳</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {posts.map(post => {
            const hasAutomation = getAutoForPost(post.id);
            return (
              <div 
                key={post.id} 
                onClick={() => setSelectedPost(post)}
                className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${hasAutomation ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-gray-200'}`}
              >
                <img src={post.thumbnailUrl} alt="IG Post" className="w-full h-48 object-cover" />
                
                {hasAutomation && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    Automated ⚡
                  </div>
                )}
                
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs line-clamp-2">{post.caption}</p>
                </div>
                {hasAutomation && (
                  <div className="absolute bottom-8 left-2 right-2 flex justify-between bg-black/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold border border-gray-700">
                    <span className="text-blue-300">Sent: {hasAutomation.stats?.sentCount || 0}</span>
                    <span className="text-green-400">Clicked: {hasAutomation.stats?.clickedCount || 0}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL FOR SETTING UP AUTOMATION */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <button onClick={() => setSelectedPost(null)} className="absolute top-4 right-4 text-gray-500 hover:text-black">✖</button>
            
            {/* Left Side: Image Preview */}
            <div className="rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
               <img src={selectedPost.thumbnailUrl} alt="Preview" className="max-h-80 object-contain" />
            </div>

            {/* Right Side: Form */}
            <form onSubmit={handleSaveAutomation} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">Set up Auto-Reply</h2>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700">If user comments:</label>
                <input 
                  type="text" 
                  value={triggerWord}
                  onChange={(e) => setTriggerWord(e.target.value)}
                  placeholder="e.g. LINK, PRICE, PDF" 
                  className="mt-1 w-full p-2 border rounded-lg uppercase" 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Link Delivery Method:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="dmode" checked={deliveryMode === 'button'} onChange={() => setDeliveryMode('button')} /> 2-Step Button (Tracks Clicks)
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="dmode" checked={deliveryMode === 'direct'} onChange={() => setDeliveryMode('direct')} /> Direct Link (Instantly)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Send them this DM:</label>
                <textarea 
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="mt-1 w-full p-2 border rounded-lg h-24" 
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Attach PDF/Link (Optional):</label>
                <input 
                  type="file" 
                  onChange={(e) => setFile(e.target.files[0])}
                  className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button type="submit" disabled={uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold disabled:opacity-50">
                  {uploading ? 'Saving & Uploading...' : 'Save Automation 🚀'}
                </button>
                {getAutoForPost(selectedPost.id) && (
                  <button type="button" onClick={() => handleDelete(selectedPost.id)} className="bg-red-100 text-red-600 px-4 rounded-lg hover:bg-red-200">
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating AI Chat Assistant */}
      <DashboardAIAssistant />
    </div>
  );
};

export default InstagramAutomations;
