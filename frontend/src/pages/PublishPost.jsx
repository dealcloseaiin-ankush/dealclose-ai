import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Image as ImageIcon, Send, Loader2, CheckCircle, ExternalLink, Bot, Sparkles, Calendar, Trash2, Edit, Save, ClipboardPlus } from 'lucide-react';

export default function PublishPost() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');

  // 🚀 NEW: AI Chat States
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: 'Hi! Tell me what kind of post you want to create. For example: "Create a post about our new shoe collection."' }]);
  const [chatInput, setChatInput] = useState(''); // This is the user's typed message
  const [isAiWorking, setIsAiWorking] = useState(false);

  // 🚀 NEW: Saved Drafts State
  const [drafts, setDrafts] = useState([]);
  const [editingDraft, setEditingDraft] = useState(null); // Holds the draft being edited

  // Main form state (now also used for editing drafts)
  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
    }).catch(console.error);
  }, []);

  // 🚀 NEW: Fetch drafts when workspace changes
  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        const { data } = await api.get('/instagram/drafts', { params: { workspaceId: activeWorkspace } });
        if (data.success) setDrafts(data.drafts);
      } catch (error) { console.error("Failed to fetch drafts:", error); }
    };
    fetchDrafts();
  }, [activeWorkspace]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setPublishedUrl(''); // Reset on new image
    }
  };

  const handlePublish = async (draftToPublish = null) => {
    if (!imageFile || !caption) {
      if (!draftToPublish || !draftToPublish.imageUrl || !draftToPublish.caption)
        return toast.error('Please provide both an image and a caption.');
    }

    setIsPublishing(true);
    setPublishedUrl('');
    const toastId = toast.loading('Publishing post to Instagram...');

    const formData = new FormData();
    if (imageFile) {
      formData.append('image', imageFile);
    } else if (draftToPublish?.imageUrl) {
      // If publishing a draft without a new image, send the existing URL
      formData.append('imageUrl', draftToPublish.imageUrl);
    }

    formData.append('caption', draftToPublish?.caption || caption);
    formData.append('workspaceId', activeWorkspace);

    try {
      const { data } = await api.post('/instagram/publish', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        toast.success('Post published successfully!', { id: toastId });
        setPublishedUrl(data.postUrl);
        if (draftToPublish) {
          // Remove the draft from the list after publishing
          setDrafts(drafts.filter(d => d.id !== draftToPublish.id));
        }
      } else {
        throw new Error(data.message || 'An unknown error occurred.');
      }
    } catch (error) {
      console.error('Publish Error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to publish post.', { id: toastId });
    } finally {
      setIsPublishing(false);
    }
  };

  // 🚀 NEW: AI Chat Handler
  const handleAiChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAiWorking(true);

    try {
      // 🚀 REAL API CALL to the new backend endpoint
      const { data } = await api.post('/instagram/ai-generate-post', {
        prompt: chatInput,
        workspaceId: activeWorkspace
      });

      if (data.success) {
        // Add AI's conversational reply to the chat
        setChatMessages(prev => [...prev, { 
          role: 'ai', 
          text: data.aiReply,
          // 🚀 Store the generated content within the message object
          generatedContent: {
            caption: data.caption,
            hashtags: data.hashtags
          }
        }]);
        toast.success('AI has generated content!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "AI Assistant is currently unavailable.");
    } finally {
      setIsAiWorking(false);
    }
  };

  // 🚀 NEW: Save as Draft
  const handleSaveDraft = async () => {
    if (!caption && !imagePreview) return toast.error("Nothing to save.");

    const toastId = toast.loading(editingDraft ? 'Updating draft...' : 'Saving draft...');
    
    const formData = new FormData();
    formData.append('caption', caption);
    formData.append('workspaceId', activeWorkspace);
    if (editingDraft) formData.append('draftId', editingDraft._id);
    if (imageFile) {
      formData.append('image', imageFile);
    } else if (editingDraft?.imageUrl) {
      // If not uploading a new image, send the existing URL to keep it
      formData.append('imageUrl', editingDraft.imageUrl);
    }

    try {
      const { data } = await api.post('/instagram/drafts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        if (editingDraft) {
          setDrafts(drafts.map(d => d._id === editingDraft._id ? data.draft : d));
          toast.success('Draft updated!', { id: toastId });
        } else {
          setDrafts([data.draft, ...drafts]);
          toast.success('Saved as draft!', { id: toastId });
        }
        // Reset form
        setCaption(''); setImageFile(null); setImagePreview(''); setEditingDraft(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save draft.', { id: toastId });
    }
  };

  const handleDeleteDraft = async (draftId) => {
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    try {
      await api.delete(`/instagram/drafts/${draftId}`);
      setDrafts(drafts.filter(d => d._id !== draftId));
      toast.success('Draft deleted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete draft.');
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 mb-2">
              Publish to Instagram
            </h1>
            <p className="text-gray-400">Upload an image, write a caption, and post directly to your feed.</p>
          </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <form onSubmit={(e) => { e.preventDefault(); handlePublish(); }} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">1. Upload Image</label>
                <input type="file" accept="image/jpeg,image/png" onChange={handleImageChange} required className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-500/10 file:text-pink-400 hover:file:bg-pink-500/20 w-full" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">2. Write Caption</label>
                <textarea
                  rows="8"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  required
                  placeholder="Write your engaging caption here..."
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none"
                ></textarea>
              </div>              
              <div className="flex gap-3">
                <button type="button" onClick={handleSaveDraft} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2">
                  <Save size={18} /> {editingDraft ? 'Update Draft' : 'Save Draft'}
                </button>
                <button type="submit" disabled={isPublishing} className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-600/20 disabled:opacity-50 flex justify-center items-center gap-2">
                  {isPublishing ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                  Publish Now
                </button>
              </div>

            </form>
          </div>

          {/* Preview Section */}
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-inner">
            <h2 className="text-lg font-bold text-white mb-4">Live Preview</h2>
            <div className="bg-black border border-gray-700 rounded-xl overflow-hidden max-w-sm mx-auto">
              <div className="p-3 flex items-center gap-2 border-b border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gray-700"></div>
                <p className="text-sm font-bold">{user?.businessName?.toLowerCase().replace(/\s/g, '') || 'your_handle'}</p>
              </div>
              <div className="aspect-square bg-[#111] flex items-center justify-center">
                {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-600" size={48} />}
              </div>
              <div className="p-4 text-sm">
                <p className="whitespace-pre-wrap line-clamp-3"><strong className="mr-1">{user?.businessName?.toLowerCase().replace(/\s/g, '') || 'your_handle'}</strong>{caption || 'Your caption will appear here...'}</p>
              </div>
            </div>
            {publishedUrl && (
              <div className="mt-6 bg-green-500/10 border border-green-500/20 p-4 rounded-xl animate-fade-in text-center">
                <div className="flex items-center justify-center gap-2 font-bold text-green-400 mb-3">
                  <CheckCircle size={20} /> Post Published Successfully!
                </div>
                <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-semibold transition-colors">
                  View on Instagram <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 🚀 NEW: AI Chat Command Center */}
        <div className="mt-8 bg-[#111] border border-blue-500/20 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Bot className="text-blue-400" /> AI Content Assistant</h2>
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl h-64 p-4 overflow-y-auto flex flex-col gap-3 mb-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-2 ${msg.role === 'ai' ? 'items-start' : 'items-end'}`}>
                <div className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.role === 'ai' ? 'bg-[#1a1a1a] self-start' : 'bg-blue-600 text-white self-end'}`}>
                  {msg.text}
                </div>
                {/* 🚀 NEW: Show "Insert Content" button if AI generated content */}
                {msg.role === 'ai' && msg.generatedContent && (
                  <button onClick={() => setCaption(`${msg.generatedContent.caption}\n\n${msg.generatedContent.hashtags}`)} className="text-xs bg-blue-600/20 text-blue-400 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-600/30 transition-colors">
                    <ClipboardPlus size={14} /> Insert into Caption
                  </button>
                )}
              </div>
            ))}
            {isAiWorking && <div className="self-start p-3 bg-[#1a1a1a] rounded-lg"><Loader2 className="animate-spin text-blue-400" /></div>}
          </div>
          <form onSubmit={handleAiChat} className="flex gap-3">
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Tell AI what to do... e.g., 'Create a post for a 20% Diwali sale'" className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" />
            <button type="submit" disabled={isAiWorking} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 rounded-lg transition-all shadow-lg disabled:opacity-50 flex items-center gap-2">
              <Sparkles size={16} /> {isAiWorking ? 'Thinking...' : 'Generate'}
            </button>
          </form>
        </div>

        {/* 🚀 NEW: Saved Drafts Section */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Saved Drafts</h2>
          {drafts.length === 0 ? (
            <p className="text-gray-500 text-center py-8 bg-[#111] border border-dashed border-gray-800 rounded-2xl">No drafts saved yet. Use the form above or the AI assistant to create one.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drafts.map(draft => (
                <div key={draft._id} className="bg-[#111] border border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
                  <img src={draft.imageUrl} alt="Draft" className="w-full h-32 object-cover rounded-lg border border-gray-700" />
                  <p className="text-xs text-gray-400 line-clamp-2">{draft.caption}</p>
                  <p className="text-[10px] text-gray-600 font-mono">ID: {draft._id}</p>
                  <div className="flex gap-2 mt-auto pt-2 border-t border-gray-800">
                    <button onClick={() => { setEditingDraft(draft); setCaption(draft.caption); setImagePreview(draft.imageUrl); }} className="flex-1 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center gap-1"><Edit size={12}/> Edit</button>
                    <button onClick={() => handleDeleteDraft(draft._id)} className="py-2 px-3 text-xs bg-red-900/50 hover:bg-red-900/80 rounded-lg"><Trash2 size={12}/></button>
                  </div>
                  <div className="flex gap-2">
                    <select className="flex-1 py-2 text-xs bg-gray-700 rounded-lg text-center outline-none border border-gray-600">
                      <option>Schedule...</option>
                      <option>Post Tomorrow (9 AM)</option>
                      <option>Post Next Week</option>
                    </select>
                    <button onClick={() => handlePublish(draft)} disabled={isPublishing} className="flex-1 py-2 text-xs bg-pink-600 hover:bg-pink-500 rounded-lg flex items-center justify-center gap-1 font-bold">
                      <Send size={12}/> Publish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}