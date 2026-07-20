import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth'; // 🚀 NEW: Import more icons for the new UI
import { Send, Loader2, CheckCircle, ExternalLink, Bot, Sparkles, Save, Edit, Trash2, ClipboardPlus, Calendar, Clock, Repeat, Facebook } from 'lucide-react';
import Instagram from 'lucide-react/dist/esm/icons/instagram'; // 🚀 FIX: Direct import to resolve build error
import { useFabric } from '../hooks/useFabric'; // 🚀 NEW: Import the custom hook

import CanvasRenderer from '../components/editor/CanvasRenderer'; // 🚀 NEW
import Toolbar from '../components/editor/Toolbar';             // 🚀 NEW
import ObjectPanel from '../components/editor/ObjectPanel';       // 🚀 NEW

export default function PublishPost() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');

  // 🚀 NEW: AI Chat States
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: 'Hi! Tell me what kind of post you want to create. For example: "Create a post about our new shoe collection."' }]);
  const [chatInput, setChatInput] = useState(''); // This is the user's typed message
  const [isAiWorking, setIsAiWorking] = useState(false);
  
  const [drafts, setDrafts] = useState([]);
  const [editingDraft, setEditingDraft] = useState(null);

  // Main form state (now also used for editing drafts)
  const [caption, setCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');

  // 🚀 NEW: State for advanced publishing options
  const [publishMode, setPublishMode] = useState('now'); // now, schedule
  const [scheduleDate, setScheduleDate] = useState('');
  const [platforms, setPlatforms] = useState({ instagram: true, facebook: false });

  // 🚀 UPGRADED: Canvas logic is now managed by the useFabric hook
  const canvasRef = useRef(null);
  const { fabricCanvas, renderDesign, exportToJson, exportToImage } = useFabric(canvasRef);
  const [canvasLayers, setCanvasLayers] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
    }).catch(console.error);
  }, []);

  // 🚀 NEW: Sync Fabric.js canvas layers with our React state for the ObjectPanel
  useEffect(() => {
    if (!fabricCanvas) return;

    const updateLayers = () => {
      const objects = fabricCanvas.getObjects().map(obj => ({
        id: obj.id || obj.type + Date.now(),
        type: obj.type,
        text: obj.text || '',
      }));
      setCanvasLayers(objects);
    };

    const updateSelection = () => {
      setSelectedObject(fabricCanvas.getActiveObject());
    };
    
    fabricCanvas.on('object:added', updateLayers);
    fabricCanvas.on('object:removed', updateLayers);
    fabricCanvas.on('selection:created', updateSelection);
    fabricCanvas.on('selection:updated', updateSelection);
    fabricCanvas.on('selection:cleared', updateSelection);

    return () => {
      if (fabricCanvas) {
        fabricCanvas.off('object:added', updateLayers);
        fabricCanvas.off('object:removed', updateLayers);
        fabricCanvas.off('selection:created', updateSelection);
        fabricCanvas.off('selection:updated', updateSelection);
        fabricCanvas.off('selection:cleared', updateSelection);
      }
    };
  }, [fabricCanvas]);

  const handlePublish = async () => {
    setIsPublishing(true);
    
    // 🚀 NEW: Export the canvas as an image
    const imageDataUrl = exportToImage('jpeg');
    if (!imageDataUrl) {
      toast.error("Canvas is empty. Cannot publish.");
      return setIsPublishing(false);
    }

    setPublishedUrl('');
    const toastId = toast.loading('Publishing post to Instagram...');

    // Convert data URL to a file object to send to the backend
    const blob = await (await fetch(imageDataUrl)).blob();
    const imageFileFromCanvas = new File([blob], 'design.jpg', { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('image', imageFileFromCanvas);
    formData.append('caption', caption);
    formData.append('workspaceId', activeWorkspace);
    // 🚀 NEW: Send publishing options to backend
    formData.append('publishMode', publishMode);
    if (publishMode === 'schedule') formData.append('scheduledAt', scheduleDate);
    formData.append('platforms', JSON.stringify(Object.keys(platforms).filter(p => platforms[p])));

    try {
      const { data } = await api.post('/instagram/publish', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        if (publishMode === 'schedule') {
          toast.success('Post scheduled successfully!', { id: toastId });
        } else {
          toast.success('Post published successfully!', { id: toastId });
        }
        setPublishedUrl(data.postUrl);
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
      // 🚀 NEW: Check if there's a design on the canvas to edit.
      const currentDesignJson = exportToJson();
      const isEditing = currentDesignJson && currentDesignJson.layers.length > 0;

      // 🚀 REAL API CALL to the new backend endpoint
      const { data } = await api.post('/instagram/ai-generate-post', {
        prompt: chatInput,
        workspaceId: activeWorkspace,
        existingDesign: isEditing ? currentDesignJson : null // Pass existing design for edits
      });

      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'ai', text: data.aiReply || (isEditing ? "I've updated the design for you!" : "Here's a new design!") }]);
        // 🚀 Render the generated design on the canvas
        if (renderDesign) renderDesign(data.designJson);
        toast.success('AI has generated a new design!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "AI Assistant is currently unavailable.");
    } finally {
      setIsAiWorking(false);
    }
  };

  // 🚀 NEW: Save as Draft
  const handleSaveDraft = () => {
    // This will be implemented with backend APIs in a future step
    const designData = exportToJson();
    if (!designData || designData.objects.length === 0) {
      return toast.error("Canvas is empty, nothing to save.");
    }
    console.log("Saving draft:", { designData, caption });
    toast.success("Draft saved successfully! (Backend to be implemented)");
  };

  // 🚀 NEW: Handler for platform selection
  const togglePlatform = (platform) => {
    setPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  // 🚀 NEW: Toolbar action handler
  const handleToolbarAction = (action) => {
    if (!selectedObject) return toast.error("Please select an object on the canvas first.");
    if (!selectedObject) return toast.error("Please select an object on the canvas first.");
    if (action === 'bold') {
      selectedObject.set('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold');
    }
    if (fabricCanvas) fabricCanvas.renderAll();
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 🚀 UPGRADED: Left panel for Layers and Toolbar */}
          <div className="lg:col-span-1 space-y-6">
            <Toolbar onAction={handleToolbarAction} />
            <ObjectPanel layers={canvasLayers} onSelect={(layer) => console.log('Selected layer:', layer)} />
          </div>
          {/* 🚀 UPGRADED: Center panel for the Canvas */}
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <form onSubmit={(e) => { e.preventDefault(); handlePublish(); }} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Write Caption</label>
                <textarea
                  rows="8"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  required
                  placeholder="Write your engaging caption here..."
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none transition-colors"
                ></textarea>
              </div>

              {/* 🚀 NEW: Platform Selector */}
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Publish to</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => togglePlatform('instagram')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${platforms.instagram ? 'bg-pink-500/20 border-pink-500 text-white' : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    <Instagram size={18} /> Instagram
                  </button>
                  <button type="button" onClick={() => togglePlatform('facebook')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${platforms.facebook ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-[#0a0a0a] border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    <Facebook size={18} /> Facebook
                  </button>
                </div>
              </div>

              {/* 🚀 NEW: Scheduling Options */}
              <div>
                <div className="flex bg-[#0a0a0a] p-1 rounded-lg border border-gray-700">
                  <button type="button" onClick={() => setPublishMode('now')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${publishMode === 'now' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Publish Now</button>
                  <button type="button" onClick={() => setPublishMode('schedule')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${publishMode === 'schedule' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Schedule</button>
                </div>
                {publishMode === 'schedule' && (
                  <div className="mt-3">
                    <input 
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-pink-500 outline-none"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-800">
                <button type="button" onClick={handleSaveDraft} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all flex justify-center items-center gap-2">
                  <Save size={18} /> {editingDraft ? 'Update Draft' : 'Save Draft'}
                </button>
                <button type="submit" disabled={isPublishing} className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-600/20 disabled:opacity-50 flex justify-center items-center gap-2">
                  {isPublishing ? <Loader2 className="animate-spin" /> : (publishMode === 'schedule' ? <Calendar size={18} /> : <Send size={18} />)}
                  {publishMode === 'schedule' ? 'Schedule Post' : 'Publish Now'}
                </button>
              </div>

            </form>
          </div>

          {/* 🚀 UPGRADED: Right panel for the Live Preview */}
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-inner">
            <h2 className="text-lg font-bold text-white mb-4">Live Preview</h2>
            <div className="bg-black border border-gray-700 rounded-xl overflow-hidden max-w-sm mx-auto">
              <div className="p-3 flex items-center gap-2 border-b border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500"></div>
                <p className="text-sm font-bold">{user?.businessName?.toLowerCase().replace(/\s/g, '') || 'your_handle'}</p>
              </div>
              <CanvasRenderer ref={canvasRef} />
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
              <div key={i} className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.role === 'ai' ? 'bg-[#1a1a1a] self-start' : 'bg-blue-600 text-white self-end'}`}>{msg.text}</div>
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
                    <button onClick={() => { setEditingDraft(draft); setCaption(draft.caption); renderDesign(draft.designJson); }} className="flex-1 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center gap-1"><Edit size={12}/> Edit</button>
                    <button onClick={() => setDrafts(drafts.filter(d => d._id !== draft._id))} className="py-2 px-3 text-xs bg-red-900/50 hover:bg-red-900/80 rounded-lg"><Trash2 size={12}/></button>
                  </div>
                  <div className="flex gap-2">
                    <select className="flex-1 py-2 text-xs bg-gray-700 rounded-lg text-center outline-none border border-gray-600">
                      <option>Schedule...</option>
                      <option>Post Tomorrow (9 AM)</option>
                      <option>Post Next Week</option>
                    </select>
                    <button onClick={() => handlePublish()} disabled={isPublishing} className="flex-1 py-2 text-xs bg-pink-600 hover:bg-pink-500 rounded-lg flex items-center justify-center gap-1 font-bold">
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