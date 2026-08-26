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
  // 🚀 NEW: State to hold the file passed from the Publisher page
  const [initialFile] = useState(location.state?.newPostFile || null);

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
  const uploadInputRef = useRef(null); // 🚀 NEW: Ref for the upload button
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

  // Keep the editor canvas and React controls in sync, including after AI
  // generation and when a saved design is reopened.
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.setBackgroundColor(backgroundColor);
      fabricCanvas.requestRenderAll();
    }
  }, [backgroundColor, fabricCanvas]);

  const handleBackgroundColorChange = useCallback((color) => {
    setBackgroundColor(color);
    if (!fabricCanvas) return;

    // AI fallback templates can contain a full-canvas rectangle above the
    // Fabric background. Update that base layer too, so a colour choice is
    // always visible instead of being hidden behind a template gradient.
    const canvasWidth = fabricCanvas.getWidth();
    const canvasHeight = fabricCanvas.getHeight();
    const backgroundLayer = fabricCanvas.getObjects().find((object) => (
      object.type === 'rect'
      && object.getScaledWidth() >= canvasWidth * 0.98
      && object.getScaledHeight() >= canvasHeight * 0.98
    ));

    fabricCanvas.setBackgroundColor(color);
    if (backgroundLayer) {
      backgroundLayer.set({ fill: color, dirty: true });
      fabricCanvas.fire('object:modified', { target: backgroundLayer });
    }
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas]);


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
          setBackgroundColor(
            designToRender.canvas?.backgroundColor
              || designToRender.backgroundColor
              || '#ffffff'
          );
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
            setBackgroundColor(post.designJson?.canvas?.backgroundColor || post.designJson?.backgroundColor || post.designJson?.background || '#1a1a1a');
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

  // 🚀 NEW: Effect to load the initial file onto the canvas
  useEffect(() => {
    if (initialFile && fabricCanvas) {
      const toastId = toast.loading('Loading your media...');
      const reader = new FileReader();
      reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
          // Auto Scale image to fit neatly within 1080x1080 canvas without overflowing
          const imgW = img.width || 1080;
          const imgH = img.height || 1080;
          const scale = Math.min(1080 / imgW, 1080 / imgH);
          img.set({
            left: 540,
            top: 540,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            cornerColor: '#EC4899',
            cornerStyle: 'circle',
            borderColor: '#EC4899',
            cornerSize: 20,
            transparentCorners: false
          });
          fabricCanvas.add(img);
          fabricCanvas.centerObject(img);
          fabricCanvas.setActiveObject(img);
          fabricCanvas.renderAll();
          toast.success('Image fitted to canvas! 🎯', { id: toastId });
        });
      };
      reader.readAsDataURL(initialFile);
    }
  }, [initialFile, fabricCanvas]);
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
    const file = e.target.files?.[0];
    if (!file || !fabricCanvas) return;

    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target.result;
      fabric.Image.fromURL(data, (img) => {
        // Auto Scale image to fit neatly within 1080x1080 canvas without overflowing
        const imgW = img.width || 1080;
        const imgH = img.height || 1080;
        const scale = Math.min(1080 / imgW, 1080 / imgH);
        img.set({
          left: 540,
          top: 540,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          cornerColor: '#EC4899',
          cornerStyle: 'circle',
          borderColor: '#EC4899',
          cornerSize: 20,
          transparentCorners: false
        });
        fabricCanvas.add(img);
        fabricCanvas.centerObject(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        toast.success('Image fitted to canvas! 🎯');
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 🚀 NEW: Start Fresh / Clear Canvas
  const handleNewPost = () => {
    if (fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.setBackgroundColor('#0a0a0a');
      fabricCanvas.renderAll();
    }
    setCaption('');
    setEditingDraft(null);
    setPreviewImageUrl('');
    toast.success('Canvas cleared! Ready for new post ✨');
  };

  // 🚀 NEW: Trigger the hidden file input for media upload
  const triggerMediaUpload = () => {
    if (uploadInputRef.current) {
      uploadInputRef.current.click();
    }
  };

  const fitToScreen = useCallback(() => {
    if (!fabricCanvas || !canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const containerWidth = container.offsetWidth - 80;
    const containerHeight = container.offsetHeight - 100;
    const scale = Math.min(containerWidth / 1080, containerHeight / 1080);
    // ✅ FIX: The previous logic prevented auto-fitting if the user had zoomed in.
    // This was incorrect. The "Fit to Screen" button should always work.
    handleZoom(scale);
    // ✅ ESLINT FIX: Removed 'zoom' from the dependency array as it's not used inside this callback,
    // resolving the 'react-hooks/exhaustive-deps' warning.
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
      // ✅ CRITICAL FIX: Prevent shortcuts from firing when typing in an input field.
      // This was the root cause of the paste (Ctrl+V) issue on the canvas.
      const activeElement = document.activeElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handlePublish = async () => {
    setIsPublishing(true);
    const toastId = toast.loading('Preparing your post...');

    let fileToUpload;

    // 🚀 FIX: If an initial file was provided, use it directly. Otherwise, export from canvas.
    if (initialFile) {
      fileToUpload = initialFile;
    } else {
      const imageDataUrl = exportToImage('jpeg');
      if (!imageDataUrl) { toast.error("Canvas is empty. Cannot publish."); return setIsPublishing(false); }
      const blob = await (await fetch(imageDataUrl)).blob();
      fileToUpload = new File([blob], 'design.jpg', { type: 'image/jpeg' });
    }

    if (!fileToUpload) {
      toast.error("No media file found to publish.");
      return setIsPublishing(false);
    }

    const selectedPlatforms = Object.keys(platforms).filter(p => platforms[p]);
    if (selectedPlatforms.length === 0) {
      toast.error('Select at least one platform.');
      return setIsPublishing(false);
    }

    const formData = new FormData();
    formData.append('media', fileToUpload);
    formData.append('caption', caption);
    formData.append('workspaceId', activeWorkspace);
    formData.append('designJson', JSON.stringify(exportToJson()));
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
    if (!designData || !(designData.objects?.length || designData.layers?.length)) {
      return toast.error("Canvas is empty, nothing to save.");
    }
    const toastId = toast.loading('Saving draft to cloud...');
    try {
      const imageDataUrl = exportToImage('jpeg');
      let blob;
      if (imageDataUrl) {
        blob = await (await fetch(imageDataUrl)).blob();
      }
      const formData = new FormData();
      if (blob) {
        const file = new File([blob], 'draft-preview.jpg', { type: 'image/jpeg' });
        formData.append('media', file);
        formData.append('image', file);
      }
      formData.append('caption', caption || '');
      formData.append('workspaceId', activeWorkspace);
      formData.append('designJson', JSON.stringify(designData));
      formData.append('platforms', JSON.stringify(platforms));
      formData.append('publishMode', publishMode);
      if (publishMode === 'schedule') formData.append('scheduleDate', scheduleDate);
      if (editingDraft?._id) formData.append('draftId', editingDraft._id);

      const { data } = await api.post('/instagram/drafts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data?.draft) {
        setDrafts(prev => [data.draft, ...prev.filter(d => d._id !== data.draft._id)]);
        setEditingDraft(data.draft);
        toast.success(data?.message || 'Post saved successfully to Publisher! 💾', { id: toastId, duration: 4000 });
      } else {
        toast.error(data?.message || 'Could not save draft.', { id: toastId });
      }
    } catch (error) {
      console.error('Draft save error:', error);
      toast.error(error.response?.data?.message || 'Could not save draft.', { id: toastId });
    }
  };

  // 🚀 NEW: 1-Click Instant Post for Drafts
  const handleQuickPublishDraft = async (draft) => {
    const toastId = toast.loading('Publishing draft to Instagram/Facebook... 🚀');
    try {
      const formData = new FormData();
      formData.append('caption', draft.caption || '');
      formData.append('workspaceId', activeWorkspace);
      formData.append('designJson', JSON.stringify(draft.designJson || {}));
      formData.append('platforms', JSON.stringify(draft.platforms || { instagram: true, facebook: true }));
      formData.append('publishMode', 'now');
      if (draft.imageUrl) formData.append('imageUrl', draft.imageUrl);

      const { data } = await api.post('/instagram/publish', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data?.success) {
        toast.success('Post published live successfully! 🎉', { id: toastId });
        setDrafts(prev => prev.filter(d => d._id !== draft._id));
      } else {
        toast.error(data?.message || 'Failed to publish draft.', { id: toastId });
      }
    } catch (error) {
      console.error('Quick publish error:', error);
      toast.error(error.response?.data?.message || 'Could not publish draft.', { id: toastId });
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
    // 🚀 FIX: Make 'Add Image' button functional
    if (action === 'addImage' || action === 'addIcon') {
      triggerMediaUpload();
      return;
    }

    // Actions that require a selected object
    if (!selectedObject) {
      return toast.error("Please select an object on the canvas first.");
    }

    // 🚀 NEW: Image Canvas Scaling Actions
    if (action === 'fillImage' && selectedObject) {
      const imgW = selectedObject.width || 1080;
      const imgH = selectedObject.height || 1080;
      const scale = Math.max(1080 / imgW, 1080 / imgH);
      selectedObject.set({
        scaleX: scale,
        scaleY: scale,
        left: 540,
        top: 540,
        originX: 'center',
        originY: 'center',
      });
      fabricCanvas.centerObject(selectedObject);
      fabricCanvas.renderAll();
      toast.success('Image filled entire canvas! 🖼️');
      return;
    }
    if (action === 'fitImage' && selectedObject) {
      const imgW = selectedObject.width || 1080;
      const imgH = selectedObject.height || 1080;
      const scale = Math.min(1080 / imgW, 1080 / imgH);
      selectedObject.set({
        scaleX: scale,
        scaleY: scale,
        left: 540,
        top: 540,
        originX: 'center',
        originY: 'center',
      });
      fabricCanvas.centerObject(selectedObject);
      fabricCanvas.renderAll();
      toast.success('Image fitted inside canvas! 📐');
      return;
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
      {/* 🌟 2-Tier Canva Studio Header Bar */}
      <header className="border-b border-gray-800 bg-[#111] z-20 shrink-0 flex flex-col">
        {/* Tier 1: Main Bar (Brand, Workspace, New, Save Draft, Schedule & Publish) */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/80 gap-3">
          {/* Left: Brand & Workspace */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-400 tracking-tight whitespace-nowrap">
              AI Post Designer
            </h1>
            <select
              value={activeWorkspace}
              onChange={(e) => setActiveWorkspace(e.target.value)}
              className="bg-[#1a1a1a] border border-gray-700 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none focus:border-pink-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>)}
            </select>
          </div>

          {/* Right: Actions & Publishing Flow */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleNewPost}
              className="px-2.5 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white font-bold rounded-lg transition-all flex items-center gap-1.5 text-xs border border-gray-700 shadow-sm"
              title="Clear canvas and start fresh"
            >
              <Sparkles size={13} className="text-yellow-400" /> New
            </button>

            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 text-xs border border-gray-700 shadow-sm"
            >
              <Save size={13} /> {editingDraft ? 'Update Draft' : 'Save Draft'}
            </button>

            <div className="h-5 w-px bg-gray-800 mx-1"></div>

            {/* Mode Switcher: Now vs Schedule */}
            <div className="flex items-center bg-[#1a1a1a] border border-gray-700 rounded-lg p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setPublishMode('now')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${publishMode === 'now' ? 'bg-pink-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <Send size={11} /> Now
              </button>
              <button
                type="button"
                onClick={() => setPublishMode('schedule')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${publishMode === 'schedule' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                <Clock size={11} /> Schedule
              </button>
            </div>

            {/* If Schedule is active, show date picker inline */}
            {publishMode === 'schedule' && (
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-[#1a1a1a] border border-purple-500/80 rounded-lg px-2 py-1 text-xs text-white outline-none shadow-sm focus:border-purple-400"
                required
              />
            )}

            <button
              type="submit"
              form="publish-form"
              disabled={isPublishing}
              className="px-4 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-lg transition-all shadow-md shadow-pink-500/20 disabled:opacity-50 flex items-center gap-1.5 text-xs"
            >
              {isPublishing ? <Loader2 size={14} className="animate-spin" /> : publishMode === 'schedule' ? <Clock size={14} /> : <Send size={14} />}
              {publishMode === 'schedule' ? 'Schedule Post ⏰' : 'Publish Live 🚀'}
            </button>
          </div>
        </div>

        {/* Tier 2: Creative Toolbar (Tools, Shapes, Zoom, Formats) */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-[#161616] text-xs gap-3">
          {/* Left Canvas Elements */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#1a1a1a] border border-gray-800 rounded-lg p-0.5">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="p-1.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={13} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="p-1.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                <Redo size={13} />
              </button>
            </div>

            <div className="h-4 w-px bg-gray-800 mx-0.5"></div>

            <button
              onClick={() => handleToolbarAction('addText')}
              className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-gray-800 text-white rounded-lg transition-all font-semibold flex items-center gap-1.5 border border-gray-700 shadow-sm"
              title="Add Text Layer"
            >
              <Type size={13} className="text-pink-400" /> Text
            </button>
            <button
              onClick={triggerMediaUpload}
              className="px-2.5 py-1 bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600/30 hover:to-purple-600/30 text-pink-300 rounded-lg transition-all font-semibold flex items-center gap-1.5 border border-pink-500/30 shadow-sm"
              title="Upload image (Auto-fits canvas frame)"
            >
              <ImageIcon size={13} className="text-pink-400" /> Upload Image
            </button>
            <input type="file" ref={uploadInputRef} accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
            <button
              onClick={() => handleToolbarAction('addShape')}
              className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-gray-800 text-white rounded-lg transition-all font-semibold flex items-center gap-1.5 border border-gray-700 shadow-sm"
              title="Add Rectangle Shape"
            >
              <Square size={13} className="text-purple-400" /> Shape
            </button>

            {/* Context Object Tools (Bold, Italic, Delete, Fill, Fit) */}
            {selectedObject && (
              <div className="ml-2 animate-fade-in flex items-center">
                <Toolbar onAction={handleToolbarAction} selectedObject={selectedObject} />
              </div>
            )}
          </div>

          {/* Right Zoom Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#1a1a1a] border border-gray-800 rounded-lg p-0.5">
              <button onClick={() => handleZoom(zoom - 0.1)} className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white" title="Zoom Out"><ZoomOut size={12} /></button>
              <button onClick={fitToScreen} className="px-2 py-0.5 hover:bg-gray-700 rounded text-[11px] font-semibold text-gray-300 hover:text-white flex items-center gap-1" title="Fit to Screen"><Expand size={11} /> Fit Screen</button>
              <button onClick={() => handleZoom(zoom + 0.1)} className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white" title="Zoom In"><ZoomIn size={12} /></button>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">{Math.round(zoom * 100)}%</span>
          </div>
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
              {/* ✅ FIX: Added onPaste handler to prevent the global paste listener from interfering.
                  This allows users to paste text into Fabric.js text objects on the canvas
                  without it being accidentally captured by the AI chat input. */}
              <input
                type="text"
                value={chatInput}
                onPaste={(e) => setChatInput(e.clipboardData.getData('text'))}
                onChange={e => setChatInput(e.target.value)}
                placeholder="e.g., 'Diwali sale post'" className="flex-1 bg-[#2a2a2a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
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
                <button type="button" disabled title="Threads publishing is coming soon" className="flex items-center justify-center gap-2 py-2 rounded-lg border-2 bg-[#1a1a1a] border-gray-800 text-gray-600 cursor-not-allowed text-sm"><FaThreads size={16} /></button>
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
                    <button onClick={() => handleQuickPublishDraft(draft)} className="p-2 text-pink-400 hover:text-white bg-pink-500/20 hover:bg-pink-600 rounded-lg transition-all" title="⚡ Tatkaal Publish Now (1-Click Live)"><Send size={13} /></button>
                    <button onClick={() => { setEditingDraft(draft); setCaption(draft.caption); setBackgroundColor(draft.designJson?.canvas?.backgroundColor || draft.designJson?.backgroundColor || draft.designJson?.background || '#1a1a1a'); renderDesign(draft.designJson); if (draft.platforms) setPlatforms(draft.platforms); if (draft.publishMode) setPublishMode(draft.publishMode); if (draft.scheduleDate) setScheduleDate(draft.scheduleDate); }} className="p-2 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors" title="Edit Draft"><Edit size={14} /></button>
                    <button onClick={async () => { try { await api.delete(`/instagram/drafts/${draft._id}`); setDrafts(p => p.filter(d => d._id !== draft._id)); toast.success('Draft deleted.'); } catch { toast.error('Could not delete draft.'); } }} className="p-2 text-gray-400 hover:text-rose-400 bg-red-900/30 hover:bg-red-900/60 rounded-lg transition-colors" title="Delete Draft"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Center Panel: Canvas Workspace (Full Height Clean Canvas) */}
        <main className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
          {/* Clean Canvas Display Area (Zero visual clutter!) */}
          <div ref={canvasContainerRef} className="flex-1 w-full h-full flex items-center justify-center p-6 overflow-auto custom-scrollbar" id="canvas-wrapper">
            <div className="shadow-2xl shadow-black/90 rounded-xl border border-gray-800/80 overflow-hidden">
              <CanvasRenderer ref={canvasRef} />
            </div>
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
                    onClick={() => handleBackgroundColorChange(color)}
                    className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-all ${backgroundColor === color ? 'border-white' : 'border-transparent hover:border-gray-500'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input id="bg-color" type="color" value={backgroundColor} onChange={(e) => handleBackgroundColorChange(e.target.value)} className="w-8 h-8 p-0 border-none rounded-md cursor-pointer bg-transparent" />
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
