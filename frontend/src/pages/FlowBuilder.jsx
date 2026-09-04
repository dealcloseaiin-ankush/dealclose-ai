import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType,
  Handle,
  MiniMap,
  Position,
  useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  MessageSquare, Zap, Clock, GitBranch, Save, HelpCircle, X, Bot, Send, 
  FolderOpen, ChevronLeft, Menu, ListPlus, Camera, Edit, Trash2,
  Plus, ZoomIn, ZoomOut, Maximize2, Sparkles, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { TriggerNode, MessageNode, AskQuestionNode, DelayNode, ConditionNode, MenuNode } from '../components/flow/CustomNodes';

const initialNodes = [
  {
    id: '1',
    type: 'trigger',
    data: { label: 'Trigger', triggerType: 'keyword', keyword: 'hi, hello' },
    position: { x: 250, y: 50 },
  },
];

const getId = () => `dndnode_${crypto.randomUUID()}`;

// 🚀 NEW: LocalStorage Logic for Chat History (12 hours limit & Max 5 recent chats)
const CHAT_STORAGE_KEY = 'dealclose_ai_chat_history';
const CHAT_EXPIRY_HOURS = 12;

const loadChatHistory = () => {
  const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const now = new Date().getTime();
      if (now - parsed.timestamp < CHAT_EXPIRY_HOURS * 60 * 60 * 1000) {
        return parsed.messages;
      } else {
        sessionStorage.removeItem(CHAT_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to parse chat history:', error);
    }
  }
  return [{ role: 'ai', content: 'Welcome to DealClose Flow Builder! ✨ I have analyzed your business profile. You don\'t need to build from scratch. Just tell me your goal (e.g. "I want to capture leads", "Create a Support Menu"), and I will auto-generate the complete flow for you!' }];
};

function FlowBuilder() {
  // 🚀 ReactFlow hooks
  const { fitView, zoomIn, zoomOut, zoomTo, setViewport } = useReactFlow();
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(window.innerWidth >= 768);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  // 🚀 NEW: Workspace/Business Selector States
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('main');
  const [mainBusinessName, setMainBusinessName] = useState('DealClose AI (Main)');
  const [platform, setPlatform] = useState('whatsapp'); // 🚀 NEW: State for platform
  const [flowName, setFlowName] = useState('');
  const [templates, setTemplates] = useState([]);
  
  // 🚀 NEW: Flow List Modal States
  const [isFlowListOpen, setIsFlowListOpen] = useState(false);
  const [savedFlows, setSavedFlows] = useState([]);

  // 🚀 NEW: AI Flow Builder Assistant States
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState(loadChatHistory);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const aiChatEndRef = useRef(null);

  // 🚀 NEW: Draggable Chat Widget States
  const [chatOffset, setChatOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  useEffect(() => {
    // Auto-save chat history & strictly keep only max 5-6 recent chats
    if (aiMessages.length > 6) {
      setAiMessages([aiMessages[0], ...aiMessages.slice(-5)]);
      return;
    }
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
      timestamp: new Date().getTime(),
      messages: aiMessages
    }));
  }, [aiMessages]);

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  // 🚀 NEW: Drag Handlers for Chat Box
  const handleChatDragStart = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - chatOffset.x, y: e.clientY - chatOffset.y };
    document.addEventListener('mousemove', handleChatDragMove);
    document.addEventListener('mouseup', handleChatDragEnd);
  };

  const handleChatDragMove = (e) => {
    if (isDragging.current) {
      setChatOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    }
  };

  const handleChatDragEnd = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleChatDragMove);
    document.removeEventListener('mouseup', handleChatDragEnd);
  };

  const isInitialMount = useRef(true);

  useEffect(() => {
    // Fetch workspaces so users can assign flows to different businesses
    api.get('/users/profile').then(res => {
      const userData = res.data.user || res.data;
      if (userData && userData.workspaces) {
        setWorkspaces(userData.workspaces);
      }

      if (userData) {
        const bName = (userData.businessName && userData.businessName !== 'Main Business') ? userData.businessName : 'DealClose AI (Main)';
        setMainBusinessName(bName);
      }
    }).catch(console.error);

    // Check URL parameters for flowId, workspaceId, platform
    const urlParams = new URLSearchParams(window.location.search);
    const flowIdParam = urlParams.get('flowId');
    const wsParam = urlParams.get('workspaceId');
    const platformParam = urlParams.get('platform');

    if (wsParam) setSelectedWorkspace(wsParam);
    if (platformParam) setPlatform(platformParam);

    if (flowIdParam) {
      api.get(`/whatsapp/flows?flowId=${flowIdParam}`)
        .then(res => {
          const fullFlow = res.data?.data?.[0];
          if (fullFlow && fullFlow.flowData) {
            const flowPlatform = fullFlow.platform || platformParam || 'whatsapp';
            const normalizedNodes = (fullFlow.flowData.nodes || []).map((node) => ({
              ...node,
              data: { ...(node.data || {}), platform: flowPlatform },
            }));
            setNodes(normalizedNodes);
            setEdges(fullFlow.flowData.edges || []);
            setFlowName(fullFlow.name || '');
            if (fullFlow.platform) setPlatform(fullFlow.platform);
            if (fullFlow.workspaceId) setSelectedWorkspace(fullFlow.workspaceId);
            toast.success(`Loaded Flow: ${fullFlow.name}`);
            setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 150);
          }
        })
        .catch(err => console.error("Error loading flow by flowId:", err));
    } else {
      // Auto-load latest saved flow for active workspace
      api.get('/whatsapp/flows', {
        params: { workspaceId: wsParam || 'main', platform: platformParam || 'whatsapp' }
      })
        .then(res => {
          const flows = res.data?.data || [];
          if (flows.length > 0) {
            const target = flows.find(f => f.name !== 'Flow-343') || flows[0];
            if (target) {
              api.get(`/whatsapp/flows?flowId=${target._id}`).then(fRes => {
                const full = fRes.data?.data?.[0];
                if (full && full.flowData && full.flowData.nodes && full.flowData.nodes.length > 0) {
                  const flowPlatform = full.platform || 'whatsapp';
                  const normalizedNodes = (full.flowData.nodes || []).map((node) => ({
                    ...node,
                    data: { ...(node.data || {}), platform: flowPlatform },
                  }));
                  setNodes(normalizedNodes);
                  setEdges(full.flowData.edges || []);
                  setFlowName(full.name || '');
                  setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 150);
                }
              });
            }
          }
        })
        .catch(err => console.error("Error auto-loading flow:", err));
    }
  }, []);

  // When workspace or platform is changed manually after initial load, fetch the flows or reset
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    api.get('/whatsapp/flows', {
      params: { workspaceId: selectedWorkspace, platform }
    }).then(res => {
      const flows = res.data?.data || [];
      if (flows.length > 0) {
        const target = flows.find(f => f.name !== 'Flow-343') || flows[0];
        if (target) {
          api.get(`/whatsapp/flows?flowId=${target._id}`).then(fRes => {
            const full = fRes.data?.data?.[0];
            if (full && full.flowData && full.flowData.nodes && full.flowData.nodes.length > 0) {
              const flowPlatform = full.platform || platform;
              const normalizedNodes = (full.flowData.nodes || []).map((node) => ({
                ...node,
                data: { ...(node.data || {}), platform: flowPlatform },
              }));
              setNodes(normalizedNodes);
              setEdges(full.flowData.edges || []);
              setFlowName(full.name || '');
              setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 150);
            }
          });
        }
      } else {
        setNodes(initialNodes);
        setEdges([]);
        setFlowName('');
        setTimeout(() => fitView({ padding: 0.2, duration: 200 }), 50);
      }
    }).catch(() => {
      setNodes(initialNodes);
      setEdges([]);
      setFlowName('');
    });
  }, [selectedWorkspace, platform]);

  useEffect(() => {
    api.get('/whatsapp/templates')
      .then(res => {
        if (Array.isArray(res.data)) {
          setTemplates(res.data);
        }
      })
      .catch((e) => console.error('Template fetch error:', e));
  }, []);

  useEffect(() => {
    if (!reactFlowInstance) return;
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }, 300);

    return () => clearTimeout(timer);
  }, [isPaletteOpen, reactFlowInstance]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed, color: '#9ca3af' }, style: { stroke: '#9ca3af', strokeWidth: 2 } }, eds)), [setEdges]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const label = event.dataTransfer.getData('application/label');
      if (!label) return;

      let type = 'default';
      if (label.includes('Message')) type = 'message';
      else if (label.includes('Wait') || label.includes('Delay')) type = 'delay';
      else if (label.includes('Condition')) type = 'condition';
      else if (label.includes('Question')) type = 'askQuestion';
      else if (label.includes('Menu')) type = 'menu';

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
        y: event.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
      }); 
      
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label, platform },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, platform, setNodes]
  );

  // 🚀 NEW: Handle Click-to-add for Mobile and Desktop
  const onNodeClickAdd = useCallback((label) => {
    let type = 'default';
    if (label.includes('Message')) type = 'message';
    else if (label.includes('Wait') || label.includes('Delay')) type = 'delay';
    else if (label.includes('Condition')) type = 'condition';
    else if (label.includes('Question')) type = 'askQuestion';
    else if (label.includes('Menu')) type = 'menu';

    // Calculate a nice position based on existing nodes
    const lastNode = nodes[nodes.length - 1];
    const newX = lastNode ? lastNode.position.x : 250;
    const newY = lastNode ? lastNode.position.y + 180 : 250;

    const newNode = {
      id: getId(),
      type,
      position: { x: newX, y: newY },
      data: { label, platform },
    };
    setNodes((nds) => nds.concat(newNode));
    setIsMobileDrawerOpen(false);
    toast.success(`Added ${label.replace(/[^a-zA-Z ]/g, '')} block! ⚡`);
  }, [platform, setNodes, nodes]); 

  // 🚀 NEW: Handle AI Prompt to Auto-Generate Flow
  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiInput('');
    setIsAiTyping(true);

    try {
      const simplifyNodes = nodes.map(n => ({ id: n.id, type: n.type, data: { ...n.data, platform }, position: n.position }));
      const simplifyEdges = edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle }));
      const recentChat = aiMessages.slice(-6).map(m => `${m.role === 'ai' ? 'AI' : 'User'}: ${m.content}`).join('\n');
      
      const enrichedPrompt = `Chat History:\n${recentChat}\n\nCurrent Canvas Nodes:\n${JSON.stringify(simplifyNodes)}\n\nCurrent Canvas Edges:\n${JSON.stringify(simplifyEdges)}\n\nUser Request: ${userMsg}\n\nIMPORTANT INSTRUCTIONS:\n1. If modifying the flow, return the FULL updated nodes and edges arrays (do not delete existing ones unless asked).\n2. Put actual conversational text inside data.message or data.question.\n3. If just chatting, return nodes: [] and edges: [].`;

      const activeBizName = selectedWorkspace === 'main' ? mainBusinessName : workspaces.find(w => w._id === selectedWorkspace)?.name || mainBusinessName;
      const res = await api.post('/ai/generate-flow', { prompt: enrichedPrompt, businessName: activeBizName, platform });
      if (res.data.nodes && res.data.edges) {
        if (res.data.nodes.length > 0) {
          setNodes(res.data.nodes);
          setEdges(res.data.edges);
        }
        setAiMessages(prev => [...prev, { role: 'ai', content: res.data.reply || "Here is your generated flow! You can drag and connect the blocks to customize it further." }]);
      } else {
        setAiMessages(prev => [...prev, { role: 'ai', content: res.data.reply || "I couldn't generate the flow." }]);
      }
      if (res.data.nodes && res.data.nodes.length > 0) {
        setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
      }
      setIsAiTyping(false);
    } catch (err) {
      console.error("AI Flow Generation API failed or not ready:", err);
      const errorMsg = err.response?.data?.reply || err.response?.data?.message || "Oops! Mera AI engine abhi connect nahi ho paya. Please check backend API Routes & Gemini API Keys.";
      setAiMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
      setIsAiTyping(false);
    }
  };

  const nodeTypes = useMemo(() => ({
    trigger: TriggerNode,
    message: (props) => <MessageNode {...props} templates={templates} />,
    delay: DelayNode,
    condition: ConditionNode,
    askQuestion: AskQuestionNode,
    menu: MenuNode
  }), [templates]);

  const handleSave = async () => {
    if (!reactFlowInstance) {
      toast.error("Flow builder is still loading. Please wait.");
      return;
    }
    setIsSaving(true);
    try {
      const flowData = reactFlowInstance.toObject();
      const finalName = flowName.trim() === '' ? `Flow-${Math.floor(Math.random() * 1000)}` : flowName;
      await api.post('/whatsapp/flows', { name: finalName, flowData, workspaceId: selectedWorkspace, platform });
      toast.success(`🎉 Success! Flow "${finalName}" has been created & saved. You can find it inside the 'My Flows' 📂 folder.`, { duration: 6000 });
    } catch (error) {
      console.error("Failed to save flow:", error);
      toast.error(error.response?.data?.message || "Failed to save automation flow.");
    } finally {
      setIsSaving(false);
    }
  };

  // 🚀 Fetch and Load Flows Logic
  const fetchSavedFlows = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/flows', {
        params: { platform, workspaceId: selectedWorkspace }
      });
      setSavedFlows(res.data.data || []);
    } catch (err) {
      console.error("Fetch flows error:", err);
      toast.error("Failed to fetch flows.");
    }
  }, [platform, selectedWorkspace]);

  useEffect(() => {
    if (!isFlowListOpen) return;
    fetchSavedFlows();
  }, [isFlowListOpen, fetchSavedFlows]);

  const loadFlow = async (flow) => {
    try {
      const res = await api.get(`/whatsapp/flows?flowId=${flow._id}`);
      const fullFlow = res.data.data[0];

      if (!fullFlow || !fullFlow.flowData) return toast.error("Could not load flow details.");

      const flowPlatform = fullFlow.platform || platform;
      const normalizedNodes = (fullFlow.flowData.nodes || []).map((node) => ({
        ...node,
        data: { ...(node.data || {}), platform: flowPlatform },
      }));

      setNodes(normalizedNodes);
      setEdges(fullFlow.flowData.edges || []);
      setFlowName(fullFlow.name || '');
      setPlatform(flowPlatform);
      setSelectedWorkspace(fullFlow.workspaceId || 'main');
      setIsFlowListOpen(false);
      setIsMobileDrawerOpen(false);
      toast.success(`Loaded Flow: ${fullFlow.name}`);
      setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
    } catch {
      toast.error("Failed to load flow data.");
    }
  };

  // 🚀 Pre-built Templates (1-Click Deploy)
  const loadTemplate = (type) => {
    let newNodes = [];
    let newEdges = [];
    
    if (type === 'influencer_collab') {
      newNodes = [
        { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'collab, sponsor, brand, pr, ad, promotion, fan, hi' }, position: { x: 250, y: 50 } },
        { id: '2', type: 'menu', data: { message: 'Hi! 👋 Thanks for reaching out. What are you looking for?', opt1: 'Collab / PR', opt2: 'Brand Promotion', opt3: 'Just a Fan ❤️' }, position: { x: 250, y: 200 } },
        { id: '3', type: 'askQuestion', data: { question: 'Awesome! Please share your Brand Name, Budget, and Campaign Details.', replyType: 'open' }, position: { x: 50, y: 520 } },
        { id: '4', type: 'askQuestion', data: { question: 'Great! What kind of promotion? (Reel/Story) Will you provide the script? And what is the budget?', replyType: 'open' }, position: { x: 380, y: 520 } },
        { id: '5', type: 'message', data: { message: 'Aww! Thank you so much for the love and support! Means the world to me. ❤️✨' }, position: { x: 700, y: 520 } },
        { id: '6', type: 'message', data: { message: 'Thank you! ✅ I have saved your details. My team will review and share the Media Kit shortly!' }, position: { x: 220, y: 800 } }
      ];
      newEdges = [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3', sourceHandle: 'opt_0' },
        { id: 'e2-4', source: '2', target: '4', sourceHandle: 'opt_1' },
        { id: 'e2-5', source: '2', target: '5', sourceHandle: 'opt_2' },
        { id: 'e3-6', source: '3', target: '6', sourceHandle: 'replied' },
        { id: 'e4-6', source: '4', target: '6', sourceHandle: 'replied' }
      ];
      setFlowName("Creator Collab Flow");
    } else if (type === 'lead_gen') {
      newNodes = [
        { id: '1', type: 'trigger', data: { triggerType: 'keyword', keyword: 'hi, hello, price, wholesale, b2b, catalog' }, position: { x: 250, y: 50 } },
        { id: '2', type: 'askQuestion', data: { question: `Welcome to ${mainBusinessName}! 🏢 To serve you better, please reply with your Full Name and City.`, replyType: 'open' }, position: { x: 250, y: 200 } },
        { id: '3', type: 'askQuestion', data: { question: 'Thanks! What products are you looking for today?', replyType: 'open' }, position: { x: 250, y: 440 } },
        { id: '4', type: 'message', data: { message: 'Great! Our sales team has been notified and will contact you shortly!' }, position: { x: 250, y: 680 } }
      ];
      newEdges = [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3', sourceHandle: 'replied' },
        { id: 'e3-4', source: '3', target: '4', sourceHandle: 'replied' }
      ];
      setFlowName("B2B Lead Capture Flow");
    }

    setNodes(newNodes);
    setEdges(newEdges);
    setIsMobileDrawerOpen(false);
    toast.success("Template Loaded! You can now customize or save it.");
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
  };

  const handleDeleteFlow = async (flowId, fName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the flow "${fName}"?`)) return;
    try {
      await api.delete(`/whatsapp/flows/${flowId}`);
      toast.success(`Flow "${fName}" deleted.`);
      setSavedFlows(prev => prev.filter(f => f._id !== flowId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete flow.");
    }
  };

  const handleRenameFlow = async (flowId, currentName) => {
    const newName = prompt("Enter the new name for the flow:", currentName);
    if (!newName || newName.trim() === "" || newName.trim() === currentName) return;

    try {
      const res = await api.patch(`/whatsapp/flows/${flowId}/rename`, { newName: newName.trim() });
      toast.success("Flow renamed successfully!");
      setSavedFlows(prev => prev.map(f => f._id === flowId ? res.data.flow : f));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to rename flow.");
    }
  };

  const handleBackToMobile = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/mobile';
    }
  };

  const handleAutoAlignNodes = () => {
    setNodes(prevNodes => {
      let currentY = 50;
      return prevNodes.map((node) => {
        const updated = {
          ...node,
          position: { x: 250, y: currentY }
        };
        currentY += 240;
        return updated;
      });
    });
    setTimeout(() => {
      fitView({ padding: 0.25, duration: 300 });
    }, 100);
    toast.success('Flow nodes neatly aligned! ✨');
  };

  const workspaceExists = (id) => id === 'main' || workspaces.some(ws => ws._id === id);

  return (
    <>
    {/* Help Guide Modal */}
    {isGuideOpen && (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative">
          <button onClick={() => setIsGuideOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
            <X size={22} />
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <HelpCircle className="text-blue-500" /> How to use Flow Builder
          </h2>
          <p className="text-gray-400 text-xs md:text-sm mb-6">Build automation rules without coding by simply connecting blocks.</p>
          
          <div className="space-y-3 mb-6">
            <div className="bg-[#1a1a1a] p-3.5 rounded-xl border border-gray-800">
              <p className="text-emerald-400 font-bold text-sm mb-0.5">1. Start with a Trigger</p>
              <p className="text-xs text-gray-300">The first block decides WHEN the flow will run (e.g., "When Keyword is HI").</p>
            </div>
            <div className="bg-[#1a1a1a] p-3.5 rounded-xl border border-gray-800">
              <p className="text-blue-400 font-bold text-sm mb-0.5">2. Add Actions</p>
              <p className="text-xs text-gray-300">Tap "[+ Add Step]" or drag items like "Send Message" onto the canvas.</p>
            </div>
            <div className="bg-[#1a1a1a] p-3.5 rounded-xl border border-gray-800">
              <p className="text-orange-400 font-bold text-sm mb-0.5">3. Connect the Dots</p>
              <p className="text-xs text-gray-300">Touch/drag from the bottom dot of one block to the top dot of another block to link them.</p>
            </div>
          </div>
          <button onClick={() => setIsGuideOpen(false)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-sm">Got it, let's build! 🚀</button>
        </div>
      </div>
    )}

    {/* Saved Flows List Modal */}
    {isFlowListOpen && (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative max-h-[80vh] flex flex-col">
          <button onClick={() => setIsFlowListOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
            <X size={22} />
          </button>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <FolderOpen className="text-indigo-500" /> My Saved Automations
          </h2>
          <div className="overflow-y-auto flex-1 space-y-3 pr-1">
            {savedFlows.length === 0 ? (
              <p className="text-gray-500 text-center py-10 text-sm">No saved flows found. Build and save one first!</p>
            ) : (
              savedFlows.map(flow => (
                <div key={flow._id} className="bg-[#1a1a1a] border border-gray-700 p-3.5 rounded-xl flex justify-between items-center hover:border-indigo-500 transition-colors">
                  <div className="flex-1 pr-2">
                    <h3 className="font-bold text-white text-sm md:text-base">{flow.name}</h3>
                    <p className="text-[11px] text-gray-400">
                      Workspace: {flow.workspaceId === 'main' ? mainBusinessName : workspaces.find(w => w._id === flow.workspaceId)?.name || 'Default'}
                    </p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${flow.platform === 'instagram' ? 'bg-pink-500/20 text-pink-400' : 'bg-green-500/20 text-green-400'}`}>
                      {flow.platform === 'instagram' ? 'Instagram' : 'WhatsApp'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleRenameFlow(flow._id, flow.name)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" title="Rename"><Edit size={15} /></button>
                    <button onClick={() => handleDeleteFlow(flow._id, flow.name)} className="p-2 text-gray-400 hover:text-rose-400 hover:bg-gray-700 rounded-lg transition-colors" title="Delete"><Trash2 size={15} /></button>
                    <button onClick={() => loadFlow(flow)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors">
                      Load
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}

    {/* 🚀 MOBILE SLIDE-UP BOTTOM DRAWER FOR ADDING NODES */}
    {isMobileDrawerOpen && (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center md:hidden animate-fade-in" onClick={() => setIsMobileDrawerOpen(false)}>
        <div className="bg-[#111116] border-t border-gray-800 rounded-t-3xl p-5 w-full max-h-[75vh] overflow-y-auto space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-1.5 bg-gray-700 rounded-full mx-auto mb-1 cursor-pointer" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white">Add Step to Flow ⚡</h3>
              <p className="text-xs text-gray-400">Tap any block to insert it into canvas</p>
            </div>
            <button onClick={() => setIsMobileDrawerOpen(false)} className="text-gray-400 p-1">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button 
              onClick={() => onNodeClickAdd('💬 Send Message')} 
              className="bg-[#1a1a24] border border-blue-500/40 hover:border-blue-500 p-3 rounded-2xl flex items-center gap-2.5 text-left active:scale-95 transition-all shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <MessageSquare size={18} />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Send Message</div>
                <div className="text-[10px] text-gray-400">Bot text or template</div>
              </div>
            </button>

            <button 
              onClick={() => onNodeClickAdd('⚡ Ask Question')} 
              className="bg-[#1a1a24] border border-purple-500/40 hover:border-purple-500 p-3 rounded-2xl flex items-center gap-2.5 text-left active:scale-95 transition-all shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Ask Question</div>
                <div className="text-[10px] text-gray-400">Capture Name/City/Choice</div>
              </div>
            </button>

            <button 
              onClick={() => onNodeClickAdd('📋 Interactive Menu')} 
              className="bg-[#1a1a24] border border-teal-500/40 hover:border-teal-500 p-3 rounded-2xl flex items-center gap-2.5 text-left active:scale-95 transition-all shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <ListPlus size={18} />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Menu Buttons</div>
                <div className="text-[10px] text-gray-400">Up to 3 Quick Options</div>
              </div>
            </button>

            <button 
              onClick={() => onNodeClickAdd('🔄 Condition (If/Else)')} 
              className="bg-[#1a1a24] border border-orange-500/40 hover:border-orange-500 p-3 rounded-2xl flex items-center gap-2.5 text-left active:scale-95 transition-all shadow-sm"
            >
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
                <GitBranch size={18} />
              </div>
              <div>
                <div className="font-bold text-xs text-white">If / Else Condition</div>
                <div className="text-[10px] text-gray-400">Branching Logic</div>
              </div>
            </button>

            <button 
              onClick={() => onNodeClickAdd('⏳ Wait 15 Mins')} 
              className="bg-[#1a1a24] border border-gray-700 hover:border-gray-500 p-3 rounded-2xl flex items-center gap-2.5 text-left active:scale-95 transition-all shadow-sm col-span-2"
            >
              <div className="w-8 h-8 rounded-xl bg-gray-800 text-gray-300 flex items-center justify-center shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Add Delay / Wait Timer</div>
                <div className="text-[10px] text-gray-400">Wait 15 mins, 2 hours or 1 day before next step</div>
              </div>
            </button>
          </div>

          <div className="pt-2 border-t border-gray-800 space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">1-Click Prebuilt Flows:</span>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => loadTemplate('influencer_collab')} className="bg-pink-500/10 border border-pink-500/30 p-2.5 rounded-xl text-left hover:bg-pink-500/20">
                <p className="text-pink-400 font-bold text-xs">📸 Creator Collab</p>
                <p className="text-[9px] text-gray-400">Auto-negotiate PR deals</p>
              </button>
              <button onClick={() => loadTemplate('lead_gen')} className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl text-left hover:bg-emerald-500/20">
                <p className="text-emerald-400 font-bold text-xs">🧲 B2B Lead Gen</p>
                <p className="text-[9px] text-gray-400">Capture name & city</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* MAIN BUILDER LAYOUT */}
    <div className="flex flex-col h-[100dvh] bg-[#050505] text-gray-100 font-sans select-none overflow-hidden">
      
      {/* 🚀 TWO-ROW CLEAN RESPONSIVE HEADER */}
      <header className="bg-[#0f0f13] border-b border-gray-800 px-3 py-2 z-40 flex flex-col gap-2 shrink-0">
        {/* ROW 1: Navigation & Flow Title */}
        <div className="flex items-center gap-2 w-full">
          <button 
            onClick={handleBackToMobile}
            className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors shrink-0"
            title="Back to Mobile App"
          >
            <ArrowLeft size={16} />
          </button>

          <input 
            type="text" 
            value={flowName} 
            onChange={(e) => setFlowName(e.target.value)} 
            placeholder="Enter Flow Name..." 
            className="flex-1 bg-black/60 border border-gray-700 text-white text-xs md:text-sm rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 font-semibold min-w-0"
          />

          <select 
            value={platform} 
            onChange={(e) => setPlatform(e.target.value)} 
            className="bg-black/60 border border-gray-700 text-white text-xs rounded-xl px-2 py-1.5 outline-none focus:border-blue-500 cursor-pointer font-semibold shrink-0"
          >
            <option value="whatsapp">🟩 WhatsApp</option>
            <option value="instagram">🟪 Instagram</option>
          </select>
        </div>

        {/* ROW 2: Action Buttons (Flows, Templates, AI, Save) */}
        <div className="flex items-center justify-between gap-1.5 w-full pt-1 border-t border-gray-800/60">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => { setIsFlowListOpen(true); fetchSavedFlows(); }} 
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
            >
              <FolderOpen size={13} />
              <span>My Flows</span>
            </button>

            <button 
              onClick={() => setIsAiChatOpen(prev => !prev)} 
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/90 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
            >
              <Sparkles size={13} />
              <span>AI Copilot</span>
            </button>

            <select 
              value={selectedWorkspace} 
              onChange={(e) => setSelectedWorkspace(e.target.value)} 
              className="bg-black/60 border border-gray-700 text-white text-[11px] rounded-xl px-2 py-1 outline-none focus:border-blue-500 cursor-pointer font-semibold max-w-[120px] truncate"
            >
              <option value="main">🏢 {mainBusinessName}</option>
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50 shrink-0"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Flow 💾'}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Desktop Node Palette Sidebar */}
        {isPaletteOpen && (
          <div className="hidden md:flex w-64 bg-[#111] border-r border-gray-800 p-5 flex-col gap-3 z-10 shrink-0 overflow-y-auto">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-lg font-bold text-white">Flow Blocks</h2>
                <p className="text-[11px] text-gray-400">Click or Drag to add</p>
              </div>
              <button onClick={() => setIsPaletteOpen(false)} className="text-gray-400 hover:text-white bg-gray-800/50 p-1.5 rounded-lg">
                <ChevronLeft size={16} />
              </button>
            </div>
            
            <div onClick={() => onNodeClickAdd('💬 Send Message')} className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-pointer hover:border-blue-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '💬 Send Message')} draggable>
              <MessageSquare size={16} className="text-blue-400" /> <span className="font-semibold text-xs text-white">Send Message</span>
            </div>
            <div onClick={() => onNodeClickAdd('⚡ Ask Question')} className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-pointer hover:border-purple-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '⚡ Ask Question')} draggable>
              <Zap size={16} className="text-purple-400" /> <span className="font-semibold text-xs text-white">Ask Question</span>
            </div>
            <div onClick={() => onNodeClickAdd('📋 Interactive Menu')} className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-pointer hover:border-teal-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '📋 Interactive Menu')} draggable>
              <ListPlus size={16} className="text-teal-400" /> <span className="font-semibold text-xs text-white">Interactive Menu</span>
            </div>
            <div onClick={() => onNodeClickAdd('🔄 Condition (If/Else)')} className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-pointer hover:border-orange-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '🔄 Condition (If/Else)')} draggable>
              <GitBranch size={16} className="text-orange-400" /> <span className="font-semibold text-xs text-white">Condition</span>
            </div>
            <div onClick={() => onNodeClickAdd('⏳ Wait 15 Mins')} className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-pointer hover:border-gray-400 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '⏳ Wait 15 Mins')} draggable>
              <Clock size={16} className="text-gray-400" /> <span className="font-semibold text-xs text-white">Add Delay</span>
            </div>

            {/* Pre-built Templates */}
            <div className="mt-4 border-t border-gray-800 pt-4">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Templates</h3>
              <div className="space-y-2">
                <div onClick={() => loadTemplate('influencer_collab')} className="bg-pink-500/10 border border-pink-500/30 p-2.5 rounded-xl cursor-pointer hover:bg-pink-500/20 transition-colors">
                  <p className="text-pink-400 font-bold text-xs">📸 Influencer Collab</p>
                  <p className="text-[10px] text-gray-400">Auto-negotiate PR deals</p>
                </div>
                <div onClick={() => loadTemplate('lead_gen')} className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl cursor-pointer hover:bg-emerald-500/20 transition-colors">
                  <p className="text-emerald-400 font-bold text-xs">🧲 B2B Lead Gen</p>
                  <p className="text-[10px] text-gray-400">Ask name & city</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Flow Canvas Area */}
        <div className="flex-1 relative h-full w-full" ref={reactFlowWrapper}>
          
          {/* Desktop sidebar open button if closed */}
          {!isPaletteOpen && (
            <div className="hidden md:block absolute top-4 left-4 z-30">
              <button onClick={() => setIsPaletteOpen(true)} className="p-2 bg-[#1a1a1a] border border-gray-700 text-gray-300 hover:text-white rounded-xl shadow-lg">
                <Menu size={18} />
              </button>
            </div>
          )}

          {/* 🚀 FLOATING DESKTOP CANVAS NAVIGATION TOOLBAR (TOP RIGHT) */}
          <div className="hidden md:flex absolute top-4 right-4 z-40 items-center gap-1.5 bg-[#111116]/95 backdrop-blur-md border border-gray-700/80 p-1.5 rounded-2xl shadow-2xl">
            <button
              onClick={() => zoomIn({ duration: 250 })}
              className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl transition-all active:scale-95"
              title="Zoom In (+)"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => zoomOut({ duration: 250 })}
              className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl transition-all active:scale-95"
              title="Zoom Out (-)"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => zoomTo(1.0, { duration: 300 })}
              className="px-2.5 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-bold rounded-xl transition-all active:scale-95"
              title="Reset Zoom to 100%"
            >
              100%
            </button>
            <button
              onClick={() => fitView({ padding: 0.25, duration: 350 })}
              className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl transition-all active:scale-95"
              title="Fit Whole Flow on Screen"
            >
              <Maximize2 size={16} />
            </button>
            <div className="h-4 w-px bg-gray-700 mx-0.5" />
            <button
              onClick={handleAutoAlignNodes}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              title="Neatly Auto-Align All Flow Nodes"
            >
              <Sparkles size={14} />
              <span>Auto Align</span>
            </button>
          </div>

          {/* 🚀 FLOATING MOBILE CONTROLS & BOTTOM BAR */}
          <div className="md:hidden absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-[#111116]/95 backdrop-blur-md border border-gray-700/80 px-2.5 py-1.5 rounded-2xl shadow-2xl">
            <button 
              onClick={() => setIsMobileDrawerOpen(true)} 
              className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-95 text-white font-black text-xs rounded-xl shadow-md"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>

            <div className="h-5 w-px bg-gray-700 mx-0.5" />

            <button 
              onClick={() => fitView({ padding: 0.25, duration: 300 })} 
              className="p-2 bg-gray-800 active:bg-gray-700 text-gray-200 rounded-xl" 
              title="Fit to Screen"
            >
              <Maximize2 size={15} />
            </button>

            <button 
              onClick={() => zoomIn({ duration: 200 })} 
              className="p-2 bg-gray-800 active:bg-gray-700 text-gray-200 rounded-xl" 
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>

            <button 
              onClick={() => zoomOut({ duration: 200 })} 
              className="p-2 bg-gray-800 active:bg-gray-700 text-gray-200 rounded-xl" 
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>

            <button 
              onClick={handleAutoAlignNodes}
              className="p-2 bg-indigo-600 active:bg-indigo-500 text-white rounded-xl shadow-sm" 
              title="Auto Align Flow"
            >
              <Sparkles size={15} />
            </button>

            <button 
              onClick={() => setIsAiChatOpen(!isAiChatOpen)} 
              className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 active:scale-95 text-white rounded-xl shadow-md" 
              title="AI Generator"
            >
              <Bot size={15} />
            </button>
          </div>

          {/* AI Flow Assistant Widget Floating */}
          <div 
            className="absolute bottom-20 md:bottom-6 left-4 md:left-6 z-50 flex flex-col items-start"
            style={{ transform: `translate(${chatOffset.x}px, ${chatOffset.y}px)`, transition: isDragging.current ? 'none' : 'transform 0.1s' }}
          >
            {isAiChatOpen && (
              <div className="bg-[#111] border border-blue-500/40 rounded-2xl shadow-2xl w-72 md:w-80 mb-3 overflow-hidden flex flex-col animate-fade-in origin-bottom-left">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 md:p-4 flex justify-between items-center cursor-move"
                  onMouseDown={handleChatDragStart}
                >
                  <div className="flex items-center gap-2 text-white pointer-events-none">
                    <Bot size={18} />
                    <h3 className="font-bold leading-tight text-xs md:text-sm">AI Flow Builder</h3>
                  </div>
                  <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setIsAiChatOpen(false)} className="text-white/80 hover:text-white cursor-pointer"><X size={16} /></button>
                </div>
                
                <div className="h-56 md:h-64 p-3 overflow-y-auto flex flex-col gap-2.5 bg-[#0a0a0a]">
                  {aiMessages.map((msg, idx) => (
                    <div key={idx} className={`max-w-[88%] p-2.5 rounded-2xl text-xs ${msg.role === 'ai' ? 'bg-[#1a1a1a] text-gray-200 self-start rounded-tl-sm border border-gray-800' : 'bg-blue-600 text-white self-end rounded-tr-sm'}`}>
                      {msg.content}
                    </div>
                  ))}
                  {isAiTyping && (
                    <div className="bg-[#1a1a1a] text-gray-400 self-start p-2.5 rounded-2xl rounded-tl-sm border border-gray-800 text-xs flex gap-1">
                      <span className="animate-bounce">.</span><span className="animate-bounce" style={{animationDelay: '0.1s'}}>.</span><span className="animate-bounce" style={{animationDelay: '0.2s'}}>.</span>
                    </div>
                  )}
                  <div ref={aiChatEndRef} />
                </div>
                
                <form onSubmit={handleAiSubmit} className="p-2.5 bg-[#111] border-t border-gray-800 flex gap-2">
                  <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Type 'build lead capture flow'" className="flex-1 bg-[#1a1a1a] border border-gray-700 text-white rounded-xl px-2.5 py-1.5 text-xs focus:border-blue-500 outline-none" disabled={isAiTyping} />
                  <button type="submit" disabled={isAiTyping || !aiInput.trim()} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50">
                    <Send size={14} />
                  </button>
                </form>
              </div>
            )}
            
            {/* Desktop only AI trigger button */}
            <button onClick={() => setIsAiChatOpen(!isAiChatOpen)} className="hidden md:flex w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-110 transition-transform">
              {isAiChatOpen ? <X size={20} /> : <Bot size={22} />}
            </button>
          </div>

          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange} 
            onConnect={onConnect} 
            onInit={setReactFlowInstance} 
            onDrop={onDrop} 
            onDragOver={onDragOver} 
            nodeTypes={nodeTypes} 
            fitView 
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            selectNodesOnDrag={false}
            panOnDrag={true}
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={false}
            minZoom={0.05}
            maxZoom={3.5}
            translateExtent={[[-8000, -8000], [8000, 8000]]}
            nodeExtent={[[-8000, -8000], [8000, 8000]]}
            snapToGrid={false}
            fitViewOptions={{ padding: 0.25, duration: 300 }}
          >
            <Background color="#2a2a35" gap={20} size={1.2} />
            <MiniMap 
              className="hidden md:block" 
              style={{ backgroundColor: '#0e0e14', border: '1px solid #2a2a35', borderRadius: '14px' }} 
              nodeColor={(n) => n.type === 'trigger' ? '#10b981' : (n.type === 'message' ? '#3b82f6' : '#8b5cf6')} 
              maskColor="rgba(0,0,0,0.6)" 
            />
          </ReactFlow>
        </div>
      </div>
    </div>
    </>
  );
}

export default function FlowBuilderWithProvider() {
  return (
    <ReactFlowProvider>
      <FlowBuilder />
    </ReactFlowProvider>
  );
}