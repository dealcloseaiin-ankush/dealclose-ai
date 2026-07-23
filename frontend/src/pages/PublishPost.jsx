import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom'; // 🚀 NEW: For handling import/edit IDs from URL
import { fabric } from 'fabric'; // ✅ FIX: Import fabric
import { useAuth } from '../hooks/useAuth'; // 🚀 NEW: More icons for the new professional UI
import { Send, Loader2, Bot, Sparkles, Save, Edit, Trash2, Calendar, ZoomIn, ZoomOut, Expand, Minimize, Image as ImageIcon, Type, Square, Star, ChevronLeft, Menu, Undo, Redo, UploadCloud } from 'lucide-react';
import { useFabric } from '../hooks/useFabric'; // 🚀 NEW: Import the custom hook
import { FaInstagram, FaFacebook, FaThreads } from "react-icons/fa6"; // ✅ FIX: Use react-icons for brand logos
import { Heart, MessageCircle, Send as SendIcon, Bookmark } from 'lucide-react'; // For realistic preview
import CanvasRenderer from '../components/editor/CanvasRenderer'; // 🚀 NEW
import Toolbar from '../components/editor/Toolbar';             // 🚀 NEW
import ObjectPanel from '../components/editor/ObjectPanel';       // 🚀 NEW

export default function PublishPost() {
  const location = useLocation(); // 🚀 NEW: Get URL query params
  const navigate = useNavigate(); // 🚀 NEW: For redirecting after save
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

  // 🚀 NEW: State for advanced publishing options
  const [publishMode, setPublishMode] = useState('now'); // now, schedule
  const [scheduleDate, setScheduleDate] = useState('');
  const [platforms, setPlatforms] = useState({ instagram: true, facebook: false });

  // 🚀 UPGRADED: Canvas logic is now managed by the useFabric hook
  const canvasRef = useRef(null);
  const { fabricCanvas, renderDesign, exportToJson, exportToImage, undo, redo, canUndo, canRedo } = useFabric(canvasRef);
  const [canvasLayers, setCanvasLayers] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  
  // 🚀 NEW: State for canvas zoom and pan
  const [zoom, setZoom] = useState(1);
  const canvasContainerRef = useRef(null);
  const isPanning = useRef(false);
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a'); // 🚀 NEW: State for background color
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  // ✅ FIX: State for live preview image
  const [previewImageUrl, setPreviewImageUrl] = useState('');

  const lastPanPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
    }).catch(console.error);
  }, []);

  // 🚀 NEW: Effect to update canvas background color when state changes
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.setBackgroundColor(backgroundColor, fabricCanvas.renderAll.bind(fabricCanvas));
    }
  }, [backgroundColor, fabricCanvas]);


  // 🚀 NEW: AI Chat Handler (wrapped in useCallback to fix crash)
  const handleAiChat = useCallback(async (e, predefinedPrompt = null) => {
    if (e) e.preventDefault(); // Prevent form submission if called from an event
    const currentPrompt = predefinedPrompt || chatInput.trim();
    if (!currentPrompt) return;

    const userMessage = { role: 'user', text: currentPrompt };
    setChatMessages(prev => [...prev, userMessage]);
    if (!predefinedPrompt)
    setChatInput('');
    setIsAiWorking(true);

    try {
      const currentDesignJson = exportToJson();
      const isEditing = Boolean(currentDesignJson && ((Array.isArray(currentDesignJson.objects) && currentDesignJson.objects.length > 0) || (Array.isArray(currentDesignJson.layers) && currentDesignJson.layers.length > 0)));

      const { data } = await api.post('/instagram/ai-generate-post', {
        prompt: currentPrompt,
        workspaceId: activeWorkspace,
        existingDesign: isEditing ? currentDesignJson : null
      });

      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'ai', text: data.aiReply || (isEditing ? "I've updated the design for you!" : "Here's a new design!") }]);
        const designToRender = data.designJson || null;

        if (renderDesign && designToRender) {
          renderDesign(designToRender, () => {
            setTimeout(() => {
              const nextImage = exportToImage('jpeg');
              setPreviewImageUrl(nextImage || '');
              if (designToRender?.caption) {
                setCaption([designToRender.caption, designToRender.hashtags].filter(Boolean).join('\n\n'));
              }
            }, 150);
          });
        }
        toast.success('AI has generated a new design!');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "AI Assistant is currently unavailable.");
    } finally {
      setIsAiWorking(false);
    }
  }, [chatInput, exportToJson, activeWorkspace, renderDesign, exportToImage]);

  // 🚀 NEW: Handle loading post for editing or enhancing with AI
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit_id');
    const importId = params.get('import_id');
    const postId = editId || importId;

    if (postId) {
      const toastId = toast.loading('Loading post data...');
      api.get(`/posts/${postId}`)
        .then(({ data }) => {
          if (data.success && data.post) {
            const post = data.post;
            setCaption(post.caption || '');
            setBackgroundColor(post.designJson?.canvas?.backgroundColor || post.designJson?.background || '#1a1a1a');
            if (post.designJson) {
              renderDesign(post.designJson);
            } else if (post.mediaUrls && post.mediaUrls.length > 0) {
              // If it's an imported post without a design, load the image onto the canvas
              const design = {
                version: '5.3.0',
                objects: [{
                  type: 'image',
                  src: post.mediaUrls[0].url,
                  scaleX: 1,
                  scaleY: 1,
                  crossOrigin: 'anonymous'
                }]
              };
              renderDesign(design);
            }
            setEditingDraft({ _id: post._id }); // Set it as an editing draft
            toast.success('Post loaded for editing!', { id: toastId });

            // If it's an import, trigger AI enhancement
            if (importId) {
              handleAiChat(null, "Enhance this post with a better caption and hashtags.");
            }
          }
        })
        .catch(err => {
          toast.error(err.response?.data?.message || 'Failed to load post.', { id: toastId });
        });
    }
  }, [location.search, renderDesign, handleAiChat]);

  // ✅ FIX: Moved zoom handlers before the useEffect that depends on them to fix crash.
  const handleZoom = useCallback((newZoom) => {
    if (!fabricCanvas) return; // Safety check
    const clampedZoom = Math.max(0.1, Math.min(newZoom, 3)); // Clamp zoom between 10% and 300%
    setZoom(clampedZoom);
    fabricCanvas.setZoom(clampedZoom);
    fabricCanvas.setWidth(1080 * clampedZoom);
    fabricCanvas.setHeight(1080 * clampedZoom);
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  // 🚀 NEW: Handle user uploading their own media file
  const handleMediaUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target.result;
      fabric.Image.fromURL(data, (img) => {
        // Scale image to fit the canvas
        const scale = Math.min(1080 / img.width, 1080 / img.height);
        img.set({
          left: 540,
          top: 540,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
        });
        fabricCanvas.add(img);
        fabricCanvas.centerObject(img);
        fabricCanvas.renderAll();
        toast.success('Image loaded! Now ask the AI to create a caption for it.');
      });
    };
    reader.readAsDataURL(file);
  };

  const fitToScreen = useCallback(() => {
    if (!fabricCanvas || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const containerWidth = container.offsetWidth - 80;
    const containerHeight = container.offsetHeight - 100;
    const scale = Math.min(containerWidth / 1080, containerHeight / 1080);
    handleZoom(scale);
  }, [fabricCanvas, handleZoom]);

  useEffect(() => {
    api.get('/instagram/drafts', { params: { workspaceId: activeWorkspace } })
      .then(({ data }) => setDrafts(data.drafts || []))
      .catch(() => toast.error('Could not load saved drafts.'));
  }, [activeWorkspace]);

  // 🚀 NEW: Fit canvas to screen on initial load and on window resize
  useEffect(() => {
    // Initial fit
    fitToScreen();

    // 🚀 FIX: Also refit when panels are collapsed/expanded for a truly responsive feel
    const resizeObserver = new ResizeObserver(fitToScreen);
    if (canvasContainerRef.current) resizeObserver.observe(canvasContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [fabricCanvas, isLeftPanelCollapsed, isRightPanelCollapsed, fitToScreen]);

  // 🚀 NEW: Sync Fabric.js canvas layers with our React state for the ObjectPanel
  useEffect(() => {
    if (!fabricCanvas) return;

    const updateLayers = () => {
      const objects = fabricCanvas.getObjects().map((obj, index) => ({
        id: obj.id || `${obj.type}-${index}`,
        index,
        type: obj.type,
        text: obj.text || '',
      }));
      setCanvasLayers(objects);
    };

    const updateSelection = () => {
      setSelectedObject(fabricCanvas.getActiveObject());
    };
    
    // ✅ FIX: Debounced function to update the live preview to avoid performance issues.
    const debounce = (func, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    };
    const updatePreview = debounce(() => {
      if (fabricCanvas) setPreviewImageUrl(exportToImage('jpeg'));
    }, 250); // Update preview 250ms after the last change

    fabricCanvas.on('object:added', updateLayers);
    fabricCanvas.on('after:render', updatePreview); // The most reliable event for any visual change
    fabricCanvas.on('object:removed', updateLayers);
    fabricCanvas.on('selection:created', updateSelection);
    fabricCanvas.on('selection:updated', updateSelection);
    fabricCanvas.on('selection:cleared', updateSelection);
    
    // 🚀 NEW: Pan and Zoom wheel listeners
    const onMouseWheel = (opt) => {
      if (opt.e.ctrlKey) { // Zoom with Ctrl + Mouse Wheel
        opt.e.preventDefault();
        opt.e.stopPropagation();
        const delta = opt.e.deltaY;
        let newZoom = fabricCanvas.getZoom();
        newZoom *= 0.999 ** delta;
        handleZoom(newZoom);
      }
    };

    const onMouseDown = (opt) => {
      if (opt.e.isSpace) { isPanning.current = true; lastPanPoint.current = { x: opt.e.clientX, y: opt.e.clientY }; }
    };
    const onMouseMove = (opt) => {
      if (isPanning.current && opt.e.isSpace) {
        const vpt = fabricCanvas.viewportTransform;
        vpt[4] += opt.e.clientX - lastPanPoint.current.x;
        vpt[5] += opt.e.clientY - lastPanPoint.current.y;
        fabricCanvas.requestRenderAll();
        lastPanPoint.current = { x: opt.e.clientX, y: opt.e.clientY };
      }
    };
    const onMouseUp = () => { isPanning.current = false; };

    fabricCanvas.on('mouse:wheel', onMouseWheel);
    fabricCanvas.on('mouse:down', onMouseDown);
    fabricCanvas.on('mouse:move', onMouseMove);
    fabricCanvas.on('mouse:up', onMouseUp);


    return () => {
      if (fabricCanvas) {
        fabricCanvas.off('object:added', updateLayers);
        fabricCanvas.off('after:render', updatePreview);
        fabricCanvas.off('object:removed', updateLayers);
        fabricCanvas.off('selection:created', updateSelection);
        fabricCanvas.off('selection:updated', updateSelection);
        fabricCanvas.off('selection:cleared', updateSelection);
        fabricCanvas.off('mouse:wheel', onMouseWheel);
        fabricCanvas.off('mouse:down', onMouseDown);
        fabricCanvas.off('mouse:move', onMouseMove);
        fabricCanvas.off('mouse:up', onMouseUp);
      }
    };
  }, [fabricCanvas, handleZoom, exportToImage]);

  // ✅ FIX: Update preview on initial render
  useEffect(() => {
    if (fabricCanvas) {
      setPreviewImageUrl(exportToImage('jpeg'));
    }
  }, [fabricCanvas, exportToImage, renderDesign]); // Re-render preview if renderDesign changes (e.g. new draft loaded)

  // ✅ FIX: Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handlePublish = async () => {
    setIsPublishing(true);
    
    // 🚀 NEW: Export the canvas as an image
    const imageDataUrl = exportToImage('jpeg');
    if (!imageDataUrl) {
      toast.error("Canvas is empty. Cannot publish.");
      return setIsPublishing(false);
    }

    const toastId = toast.loading('Publishing post to Instagram...');

    // Convert data URL to a file object to send to the backend
    const blob = await (await fetch(imageDataUrl)).blob();
    const imageFileFromCanvas = new File([blob], 'design.jpg', { type: 'image/jpeg' });

    const selectedPlatforms = Object.keys(platforms).filter(p => platforms[p]);
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform.');
      return setIsPublishing(false);
    }

    const formData = new FormData();
    formData.append('media', imageFileFromCanvas);
    formData.append('caption', caption);
    formData.append('workspaceId', activeWorkspace);
    // 🚀 NEW: Send publishing options to backend
    formData.append('status', publishMode === 'schedule' ? 'scheduled' : 'now');
    if (publishMode === 'schedule') formData.append('scheduledAt', scheduleDate);
    formData.append('platforms', JSON.stringify(selectedPlatforms));

    try {
      const { data } = await api.post('/posts', formData, { // This now correctly calls postController.createPost
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        if (publishMode === 'schedule') {
          toast.success(`Post scheduled for ${new Date(scheduleDate).toLocaleString()}`, { id: toastId, duration: 5000 });
        } else {
          // ✅ FIX: Show a toast with a link to the published post
          const postUrl = data.post?.postUrl || (data.post?.platformPostIds?.instagram ? `https://instagram.com/p/${data.post.platformPostIds.instagram}` : null);
          if (postUrl) {
            toast.success(<span>Post published! <a href={postUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-400 underline">View Post</a></span>, { id: toastId, duration: 10000 });
          } else {
            toast.success('Post is being published!', { id: toastId });
          }
        navigate('/publisher'); // ✅ FIX: Redirect to publisher page after success
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

  // 🚀 NEW: Save as Draft
  const handleSaveDraft = async () => {
    const designData = exportToJson();
    if (!designData || !designData.layers?.length) {
      return toast.error("Canvas is empty, nothing to save.");
    }
    try {
      const imageDataUrl = exportToImage('jpeg');
      const blob = await (await fetch(imageDataUrl)).blob();
      const formData = new FormData();
      formData.append('media', new File([blob], 'draft-preview.jpg', { type: 'image/jpeg' }));
      formData.append('caption', caption);
      formData.append('workspaceId', activeWorkspace);
      formData.append('designJson', JSON.stringify(designData));
      // 🚀 NEW: Save platform and schedule info with the draft
      formData.append('platforms', JSON.stringify(platforms));
      formData.append('publishMode', publishMode);
      if (publishMode === 'schedule') formData.append('scheduleDate', scheduleDate);
      if (editingDraft?._id) formData.append('draftId', editingDraft._id);
      const { data } = await api.post('/instagram/drafts', formData);
      setDrafts(prev => [data.draft, ...prev.filter(d => d._id !== data.draft._id)]);
      setEditingDraft(data.draft);
      toast.success('Draft saved successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save draft.');
    }
  };

  // 🚀 NEW: Handler for platform selection
  const togglePlatform = (platform) => {
    setPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  // 🚀 NEW: Toolbar action handler
  const handleToolbarAction = (action) => {
    // Actions that don't require a selected object
    if (action === 'addText') {
      fabricCanvas.add(new fabric.Textbox('New Text', { left: 100, top: 100, fill: '#ffffff', fontSize: 80, fontFamily: 'Poppins' }));
      return;
    }
    if (action === 'addShape') {
      fabricCanvas.add(new fabric.Rect({ left: 150, top: 150, fill: '#8A2BE2', width: 200, height: 200 }));
      return;
    }
    // For future implementation
    if (action === 'addImage' || action === 'addIcon') {
      return toast('This feature is coming soon!', { icon: '🚧' });
    }

    // Actions that require a selected object
    if (!selectedObject) {
      return toast.error("Please select an object on the canvas first.");
    }

    if (action === 'bold') {
      selectedObject.set('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold');
    }
    if (action === 'italic') {
      selectedObject.set('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic');
    }
    if (action === 'underline') {
      selectedObject.set('underline', !selectedObject.underline);
    }
    if (action === 'delete') {
      fabricCanvas.remove(selectedObject);
      fabricCanvas.discardActiveObject();
    }
    // ✅ FIX: Use Undo/Redo from the hook
    if (action === 'undo') {
      undo();
    }
    if (action === 'redo') {
      redo();
    }
    if (fabricCanvas) fabricCanvas.renderAll();
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#111] z-20 shrink-0">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
          AI Post Designer
        </h1>
        <div className="flex items-center gap-4">
          <select
            value={activeWorkspace}
            onChange={(e) => setActiveWorkspace(e.target.value)}
            className="bg-[#1a1a1a] border border-gray-700 text-white text-sm font-semibold rounded-lg px-3 py-2 outline-none focus:border-pink-500 cursor-pointer shadow-sm"
          >
            {workspaces.map(ws => <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>)}
          </select>
          <button type="button" onClick={handleSaveDraft} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-all flex justify-center items-center gap-2 text-sm border border-gray-700">
            <Save size={16} /> {editingDraft ? 'Update' : 'Save'}
          </button>
          <button type="submit" form="publish-form" disabled={isPublishing} className="px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 flex justify-center items-center gap-2 text-sm">
            {isPublishing ? <Loader2 className="animate-spin" /> : <Send size={16} />}
            {publishMode === 'schedule' ? 'Schedule' : 'Publish'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden bg-[#050505]">
        {/* Left Panel: Controls */}
        <aside className={`bg-[#111] p-4 border-r border-gray-800 overflow-y-auto space-y-6 transition-all duration-300 ${isLeftPanelCollapsed ? 'w-0 p-0' : 'w-80'}`}>
          {/* AI Assistant */}
          <div className="bg-[#1a1a1a] border border-blue-500/20 rounded-2xl p-4">
            <h2 className="text-md font-bold text-white mb-3 flex items-center gap-2"><Bot className="text-blue-400" /> AI Assistant</h2>
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl h-48 p-3 overflow-y-auto flex flex-col gap-2 mb-3 custom-scrollbar">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`p-2.5 rounded-xl max-w-[85%] text-xs ${msg.role === 'ai' ? 'bg-[#2a2a2a] self-start' : 'bg-blue-600 text-white self-end'}`}>{msg.text}</div>
              ))}
              {isAiWorking && <div className="self-start p-2.5 bg-[#2a2a2a] rounded-xl"><Loader2 size={16} className="animate-spin text-blue-400" /></div>}
            </div>
            <form onSubmit={handleAiChat} className="flex gap-2">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="e.g., 'Diwali sale post'" className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
              <button type="submit" disabled={isAiWorking} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 rounded-lg transition-all disabled:opacity-50 flex items-center">
                <Sparkles size={14} />
              </button>
            </form>
          </div>

          {/* Publish Form */}
          <form id="publish-form" onSubmit={(e) => { e.preventDefault(); handlePublish(); }} className="space-y-5">
            <textarea rows="5" value={caption} onChange={(e) => setCaption(e.target.value)} required placeholder="Write your engaging caption here..." className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-3 text-white focus:border-pink-500 outline-none transition-colors text-sm shadow-inner"></textarea>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">Publish to</label>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => togglePlatform('instagram')} className={`flex items-center justify-center gap-2 py-2 rounded-lg border-2 transition-all text-sm ${platforms.instagram ? 'bg-pink-500/20 border-pink-500 text-white' : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-gray-500'}`}><FaInstagram size={16} /></button>
                <button type="button" onClick={() => togglePlatform('facebook')} className={`flex items-center justify-center gap-2 py-2 rounded-lg border-2 transition-all text-sm ${platforms.facebook ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-gray-500'}`}><FaFacebook size={16} /></button>
                <button type="button" onClick={() => togglePlatform('threads')} className={`flex items-center justify-center gap-2 py-2 rounded-lg border-2 transition-all text-sm ${platforms.threads ? 'bg-gray-400/20 border-gray-400 text-white' : 'bg-[#1a1a1a] border-gray-700 text-gray-400 hover:border-gray-500'}`}><FaThreads size={16} /></button>
              </div>
            </div>
            <div>
              <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-gray-700">
                <button type="button" onClick={() => setPublishMode('now')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${publishMode === 'now' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Now</button>
                <button type="button" onClick={() => setPublishMode('schedule')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-colors ${publishMode === 'schedule' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}>Schedule</button>
              </div>
              {publishMode === 'schedule' && (
                <div className="mt-2"><input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg p-2.5 text-white focus:border-pink-500 outline-none text-sm" required /></div>
              )}
            </div>
          </form>

          {/* Saved Drafts */}
          <div>
            <h2 className="text-md font-bold text-white mb-3">Recent Drafts</h2>
            {drafts.length === 0 ? (
              <p className="text-gray-500 text-center text-sm py-4 bg-[#1a1a1a] border border-dashed border-gray-800 rounded-xl">No drafts saved.</p>
            ) : (
              <div className="space-y-2">
                {drafts.slice(0, 5).map(draft => (
                  <div key={draft._id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-2 flex items-center gap-3 hover:border-gray-600 transition-colors">
                    <img src={draft.imageUrl} alt="Draft" className="w-12 h-12 object-cover rounded-md border border-gray-700" />
                    <div className="flex-1"><p className="text-xs text-gray-300 line-clamp-2">{draft.caption || 'Untitled Draft'}</p></div>
                    <button onClick={() => { setEditingDraft(draft); setCaption(draft.caption); renderDesign(draft.designJson); if (draft.platforms) setPlatforms(draft.platforms); if (draft.publishMode) setPublishMode(draft.publishMode); if (draft.scheduleDate) setScheduleDate(draft.scheduleDate); }} className="p-2 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"><Edit size={14} /></button>
                    <button onClick={async () => { try { await api.delete(`/instagram/drafts/${draft._id}`); setDrafts(p => p.filter(d => d._id !== draft._id)); toast.success('Draft deleted.'); } catch { toast.error('Could not delete draft.'); } }} className="p-2 text-gray-400 hover:text-rose-400 bg-red-900/30 hover:bg-red-900/60 rounded-lg transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Center Panel: Canvas & Toolbars */}
        <main ref={canvasContainerRef} className="flex-1 flex items-center justify-center bg-[#050505] relative p-4 overflow-hidden">
          {/* Floating Toolbar for selected object */}
          {selectedObject && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10"><Toolbar onAction={handleToolbarAction} selectedObject={selectedObject} /></div>}
          
          {/* Add Object Toolbar */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-[#111] border border-gray-800 rounded-xl p-2 flex flex-col gap-2 z-10">
            {/* ✅ FIX: Use canUndo/canRedo to disable buttons */}
            <button onClick={undo} disabled={!canUndo} className="p-3 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)"><Undo size={20} /></button>
            <button onClick={redo} disabled={!canRedo} className="p-3 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed" title="Redo (Ctrl+Y)"><Redo size={20} /></button>
            <div className="h-px w-full bg-gray-700 my-1"></div>
            <button onClick={() => handleToolbarAction('addText')} className="p-3 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors" title="Add Text"><Type size={20} /></button>
            <button onClick={() => handleToolbarAction('addImage')} className="p-3 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors" title="Add Image"><ImageIcon size={20} /></button>
            <button onClick={() => handleToolbarAction('addShape')} className="p-3 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors" title="Add Shape"><Square size={20} /></button>
            <button onClick={() => handleToolbarAction('addIcon')} className="p-3 hover:bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors" title="Add Icon/Logo"><Star size={20} /></button>
          </div>
          
          {/* 🚀 NEW: Upload Media Button */}
          <div className="absolute left-4 bottom-4 z-10">
            <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl border border-gray-700 transition-all cursor-pointer text-sm" title="Upload your own image or video">
              <UploadCloud size={16} /> Upload Media
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
            </label>
          </div>

          <div className="flex-1 w-full h-full flex items-center justify-center" id="canvas-wrapper">
            <div className="shadow-2xl shadow-black/50">
              <CanvasRenderer ref={canvasRef} />
            </div>
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-gray-700 rounded-lg p-1 flex items-center gap-2 text-white shadow-lg">
            <button onClick={() => handleZoom(zoom - 0.1)} className="p-2 hover:bg-gray-700 rounded-md"><ZoomOut size={16} /></button>
            <button onClick={fitToScreen} className="p-2 hover:bg-gray-700 rounded-md"><Expand size={16} /></button>
            <span className="text-xs font-mono w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <button onClick={() => handleZoom(1)} className="p-2 hover:bg-gray-700 rounded-md"><Minimize size={16} /></button>
            <button onClick={() => handleZoom(zoom + 0.1)} className="p-2 hover:bg-gray-700 rounded-md"><ZoomIn size={16} /></button>
          </div>
        </main>

        {/* Right Panel: Preview & Layers */}
        <aside className={`bg-[#111] p-4 border-l border-gray-800 overflow-y-auto space-y-6 transition-all duration-300 ${isRightPanelCollapsed ? 'w-0 p-0' : 'w-80'}`}>
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-4">
            <h2 className="text-md font-bold text-white mb-3">Live Preview</h2>
            <div className="bg-black border border-gray-700 rounded-2xl overflow-hidden max-w-sm mx-auto shadow-inner">
              <div className="p-2 flex items-center gap-2 border-b border-gray-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500"></div>
                <p className="text-xs font-bold">{user?.brandKit?.businessName?.toLowerCase().replace(/\s/g, '') || 'your_handle'}</p>
              </div>
              {/* ✅ FIX: Use state for live preview image source */}
              <img src={previewImageUrl} alt="Live Preview" className="w-full aspect-square object-cover" />
              <div className="p-3 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <Heart size={22} /> <MessageCircle size={22} /> <SendIcon size={22} />
                  </div>
                  <Bookmark size={22} />
                </div>
                <p className="text-xs mt-2"><span className="font-bold">{user?.brandKit?.businessName?.toLowerCase().replace(/\s/g, '') || 'your_handle'}</span> <span className="text-gray-300 line-clamp-2">{caption}</span></p>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-4">
            <h2 className="text-md font-bold text-white mb-3">Canvas</h2>
            <div className="flex items-center justify-between">
              <label htmlFor="bg-color" className="text-sm text-gray-300">Background Color</label>
              <div className="flex items-center gap-2">
                {['#ffffff', '#000000', '#1a1a1a', '#ff4b4b', '#4b79ff', '#4bff9f'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setBackgroundColor(color)}
                    className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-all ${backgroundColor === color ? 'border-white' : 'border-transparent hover:border-gray-500'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input id="bg-color" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent" />
              </div>
            </div>
          </div>
          <ObjectPanel layers={canvasLayers} onSelect={(layer) => {
            const object = fabricCanvas?.getObjects()[layer.index];
            if (object && fabricCanvas) { fabricCanvas.setActiveObject(object); fabricCanvas.renderAll(); setSelectedObject(object); }
          }} />
        </aside>
      </div>

      {/* Panel Collapse Toggles */}
      <button onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)} className="absolute top-1/2 -translate-y-1/2 left-0 z-10 bg-[#1a1a1a] p-1 rounded-r-lg border-y border-r border-gray-700 text-gray-400 hover:bg-gray-800">
        <ChevronLeft className={`transition-transform ${isLeftPanelCollapsed ? 'rotate-180' : ''}`} />
      </button>
      <button onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)} className="absolute top-1/2 -translate-y-1/2 right-0 z-10 bg-[#1a1a1a] p-1 rounded-l-lg border-y border-l border-gray-700 text-gray-400 hover:bg-gray-800">
        <ChevronLeft className={`transition-transform ${!isRightPanelCollapsed ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
