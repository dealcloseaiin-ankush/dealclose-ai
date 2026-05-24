import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType,
  Handle,
  Position,
  MiniMap,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MessageSquare, Zap, Clock, GitBranch, Save, HelpCircle, X, Bot, Send, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

// --- Custom Nodes Definitions ---
const TriggerNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  const [triggerType, setTriggerType] = useState(data?.triggerType || 'business_selected');
  return (
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-emerald-500 min-w-[250px] text-white relative group">
      {id !== '1' && (
        <button onClick={() => {
          setNodes(nds => nds.filter(n => n.id !== id));
          setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
        }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      )}
      <div className="font-bold mb-3 flex items-center gap-2 text-emerald-400">🚀 Start Trigger</div>
      <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-emerald-500 mb-3">
        <option value="business_selected">When Business is Selected</option>
        <option value="keyword">When Keyword Matches</option>
        <option value="new_lead">When New Lead is Created</option>
        <option value="abandoned_cart">When Cart is Abandoned</option>
      </select>
      
      {/* 🚀 NEW: User can type multiple keywords separated by commas */}
      {triggerType === 'keyword' && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Keywords (comma separated)</p>
          <input type="text" placeholder="e.g. offer, price, support" defaultValue={data?.keyword || ""} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-emerald-500 placeholder-gray-600" />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-emerald-500 border-2 border-[#111] z-50 cursor-crosshair" />
    </div>
  );
};

const MessageNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  const [templates, setTemplates] = useState([]);
  
  useEffect(() => {
    // Fetch real templates from Meta via our backend
    api.get('/whatsapp/templates').then(res => {
      if (Array.isArray(res.data)) setTemplates(res.data);
    }).catch(e => console.error("Template fetch error:", e));
  }, []);

  return (
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-blue-500 min-w-[280px] text-white relative group">
      <button onClick={() => {
        setNodes(nds => nds.filter(n => n.id !== id));
        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      <Handle type="target" position={Position.Top} className="w-4 h-4 bg-blue-500 border-2 border-[#111] z-50 cursor-crosshair" />
      <div className="font-bold mb-3 flex items-center gap-2 text-blue-400">💬 Send Message</div>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Select Meta Template</p>
          <select className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-blue-500">
            <option value="">-- Choose Template --</option>
            {templates.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            <option value="custom">Create Custom Reply...</option>
          </select>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Or Type Custom Text</p>
          <textarea defaultValue={data?.message || data?.label || ""} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-blue-500 placeholder-gray-600" rows="2" placeholder="Hi there! How can we help?"></textarea>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-blue-500 border-2 border-[#111] z-50 cursor-crosshair" />
    </div>
  );
};

const AskQuestionNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  return (
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-purple-500 min-w-[280px] text-white relative group">
      <button onClick={() => {
        setNodes(nds => nds.filter(n => n.id !== id));
        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      <Handle type="target" position={Position.Top} className="w-4 h-4 bg-purple-500 border-2 border-[#111] z-50 cursor-crosshair" />
      <div className="font-bold mb-3 flex items-center gap-2 text-purple-400">⚡ Ask Question (Wait for Reply)</div>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Question to ask</p>
          <textarea defaultValue={data?.question || data?.label || ""} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-purple-500 placeholder-gray-600" rows="2" placeholder="e.g., Are you interested? (Reply YES or NO)"></textarea>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Expected Replies (Branches)</p>
          <div className="flex justify-between text-[10px] font-bold px-2 mt-3 bg-[#1a1a1a] p-2 rounded border border-gray-800">
            <span className="text-green-400 text-center w-1/3 border-r border-gray-700">If "YES"</span>
            <span className="text-rose-400 text-center w-1/3 border-r border-gray-700">If "NO"</span>
            <span className="text-gray-400 text-center w-1/3">Any Other</span>
          </div>
        </div>
      </div>
      {/* Multiple Output Handles for different user replies */}
      <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '16%' }} className="w-4 h-4 bg-green-500 border-2 border-[#111] z-50 cursor-crosshair" />
      <Handle type="source" position={Position.Bottom} id="no" style={{ left: '50%' }} className="w-4 h-4 bg-rose-500 border-2 border-[#111] z-50 cursor-crosshair" />
      <Handle type="source" position={Position.Bottom} id="other" style={{ left: '83%' }} className="w-4 h-4 bg-gray-400 border-2 border-[#111] z-50 cursor-crosshair" />
    </div>
  );
};

const DelayNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  return (
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-gray-500 min-w-[220px] text-white relative group">
      <button onClick={() => {
        setNodes(nds => nds.filter(n => n.id !== id));
        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      <Handle type="target" position={Position.Top} className="w-4 h-4 bg-gray-400 border-2 border-[#111] z-50 cursor-crosshair" />
      <div className="font-bold mb-3 flex items-center gap-2 text-gray-300">⏳ Wait / Delay</div>
      <div className="flex gap-2">
        <input type="number" className="nodrag nopan w-20 bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-gray-400" defaultValue={data?.delay || "15"} />
        <select defaultValue={data?.unit || "Minutes"} className="nodrag nopan flex-1 bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-gray-400">
          <option>Minutes</option>
          <option>Hours</option>
          <option>Days</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-gray-400 border-2 border-[#111] z-50 cursor-crosshair" />
    </div>
  );
};

const ConditionNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  return (
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-orange-500 min-w-[250px] text-white relative group">
      <button onClick={() => {
        setNodes(nds => nds.filter(n => n.id !== id));
        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      <Handle type="target" position={Position.Top} className="w-4 h-4 bg-orange-400 border-2 border-[#111] z-50 cursor-crosshair" />
      <div className="font-bold mb-3 flex items-center gap-2 text-orange-400">🔄 Condition (If/Else)</div>
      <select defaultValue={data?.condition || "If User Replied"} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-orange-500">
        <option>If User Replied</option>
        <option>If Payment Pending</option>
        <option>If Tag = VIP</option>
      </select>
      <div className="flex justify-between mt-5 text-xs font-bold px-2">
        <span className="text-green-400">TRUE</span>
        <span className="text-rose-400">FALSE</span>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '20%' }} className="w-4 h-4 bg-green-500 border-2 border-[#111] z-50 cursor-crosshair" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '80%' }} className="w-4 h-4 bg-rose-500 border-2 border-[#111] z-50 cursor-crosshair" />
    </div>
  );
};

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  delay: DelayNode,
  condition: ConditionNode,
  askQuestion: AskQuestionNode
};

const initialNodes = [
  {
    id: '1',
    type: 'trigger',
    data: { label: 'Trigger', triggerType: 'keyword', keyword: 'hi, hello' },
    position: { x: 250, y: 50 },
  },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

// 🚀 NEW: LocalStorage Logic for Chat History (12 hours limit & Max 5 recent chats)
const CHAT_STORAGE_KEY = 'dealclose_ai_chat_history';
const CHAT_EXPIRY_HOURS = 12;

const loadChatHistory = () => {
  const saved = localStorage.getItem(CHAT_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const now = new Date().getTime();
      if (now - parsed.timestamp < CHAT_EXPIRY_HOURS * 60 * 60 * 1000) {
        return parsed.messages;
      } else {
        localStorage.removeItem(CHAT_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to parse chat history:', error);
    }
  }
  return [{ role: 'ai', content: 'Welcome to DealClose Flow Builder! ✨ I have analyzed your business profile. You don\'t need to build from scratch. Just tell me your goal (e.g. "I want to capture leads", "Create a Support Menu"), and I will auto-generate the complete flow for you!' }];
};

export default function FlowBuilder() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 🚀 NEW: Workspace/Business Selector States
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState('main');
  const [mainBusinessName, setMainBusinessName] = useState('DealClose AI (Main)');
  const [flowName, setFlowName] = useState('Main Automation');
  
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
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
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

  useEffect(() => {
    // Fetch workspaces so users can assign flows to different businesses
    api.get('/users/profile').then(res => {
      const userData = res.data.user || res.data;
      if (userData && userData.workspaces) {
        setWorkspaces(userData.workspaces);
      }
      
      // 🚀 SAAS LOGIC: If multiple businesses exist, auto-switch trigger to "Business Selected"
      if (userData && userData.workspaces && userData.workspaces.length > 0) {
        setNodes((nds) => nds.map(n => n.id === '1' ? { ...n, data: { ...n.data, triggerType: 'business_selected', keyword: '' } } : n));
      }

      if (userData) {
        const bName = (userData.businessName && userData.businessName !== 'Main Business') ? userData.businessName : 'DealClose AI (Main)';
        setMainBusinessName(bName);
      }
    }).catch(console.error);
  }, [setNodes]);

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

      // Determine Node Type based on Label dropped
      let type = 'default';
      if (label.includes('Message')) type = 'message';
      else if (label.includes('Wait') || label.includes('Delay')) type = 'delay';
      else if (label.includes('Condition')) type = 'condition';
      else if (label.includes('Question')) type = 'askQuestion';
      else if (label.includes('Trigger')) type = 'trigger';

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
        y: event.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
      });
      
      const newNode = {
        id: getId(),
        type,
        position,
        data: { label },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // 🚀 NEW: Handle Click-to-add for Sidebar Buttons (Taki bina drag kiye bhi add ho sakein)
  const onNodeClickAdd = useCallback((label) => {
    let type = 'default';
    if (label.includes('Message')) type = 'message';
    else if (label.includes('Wait') || label.includes('Delay')) type = 'delay';
    else if (label.includes('Condition')) type = 'condition';
    else if (label.includes('Question')) type = 'askQuestion';
    else if (label.includes('Trigger')) type = 'trigger';

    const newNode = {
      id: getId(),
      type,
      position: { x: 300 + Math.random() * 50, y: 150 + Math.random() * 50 },
      data: { label },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  // 🚀 NEW: Handle AI Prompt to Auto-Generate Flow
  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = aiInput.trim();
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiInput('');
    setIsAiTyping(true);

    try {
      // 🚀 NEW: Add canvas state and chat history to the prompt so AI remembers context
      const simplifyNodes = nodes.map(n => ({ id: n.id, type: n.type, data: n.data, position: n.position }));
      const simplifyEdges = edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle }));
      const recentChat = aiMessages.slice(-6).map(m => `${m.role === 'ai' ? 'AI' : 'User'}: ${m.content}`).join('\n');
      
      const enrichedPrompt = `Chat History:\n${recentChat}\n\nCurrent Canvas Nodes:\n${JSON.stringify(simplifyNodes)}\n\nCurrent Canvas Edges:\n${JSON.stringify(simplifyEdges)}\n\nUser Request: ${userMsg}\n\nIMPORTANT INSTRUCTIONS:\n1. If modifying the flow, return the FULL updated nodes and edges arrays (do not delete existing ones unless asked).\n2. Put actual conversational text inside data.message or data.question.\n3. If just chatting, return nodes: [] and edges: [].`;

      // Pass the selected business name to the backend explicitly
      const activeBizName = selectedWorkspace === 'main' ? mainBusinessName : workspaces.find(w => w._id === selectedWorkspace)?.name || mainBusinessName;
      const res = await api.post('/ai/generate-flow', { prompt: enrichedPrompt, businessName: activeBizName });
      if (res.data.nodes && res.data.edges) {
        if (res.data.nodes.length > 0) {
          setNodes(res.data.nodes);
          setEdges(res.data.edges);
        }
        setAiMessages(prev => [...prev, { role: 'ai', content: res.data.reply || "Here is your generated flow! You can drag and connect the blocks to customize it further." }]);
      } else {
        setAiMessages(prev => [...prev, { role: 'ai', content: res.data.reply || "I couldn't generate the flow." }]);
      }
      setIsAiTyping(false);
    } catch (err) {
      console.error("AI Flow Generation API failed or not ready:", err);
      // Now showing the real error from the backend instead of the fake dummy replies
      const errorMsg = err.response?.data?.reply || err.response?.data?.message || "Oops! Mera AI engine abhi connect nahi ho paya. Please check backend API Routes & Gemini API Keys.";
      setAiMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
      setIsAiTyping(false);
    }
  };

  const handleSave = async () => {
    if (reactFlowInstance) {
      setIsSaving(true);
      try {
      const flowData = reactFlowInstance.toObject();
      console.log("Saving Flow:", flowData);
        const finalName = flowName.trim() === '' ? `Flow-${Math.floor(Math.random() * 1000)}` : flowName;
        await api.post('/whatsapp/flows', { name: finalName, flowData, workspaceId: selectedWorkspace });
      toast.success("Automation Flow Saved & Published! 🚀");
      } catch (error) {
        console.error("Failed to save flow:", error);
        toast.error("Failed to save automation flow.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 🚀 NEW: Fetch and Load Flows Logic
  const fetchSavedFlows = async () => {
    try {
      const res = await api.get('/whatsapp/flows');
      setSavedFlows(res.data.data || []);
    } catch (err) {
      console.error("Fetch flows error:", err);
      toast.error("Failed to fetch flows.");
    }
  };

  const loadFlow = (flow) => {
    if (flow.flowData) {
      setNodes(flow.flowData.nodes || []);
      setEdges(flow.flowData.edges || []);
      setFlowName(flow.name);
      setSelectedWorkspace(flow.workspaceId || 'main');
      setIsFlowListOpen(false);
      toast.success(`Loaded Flow: ${flow.name}`);
    }
  };

  return (
    <>
    {/* Help Guide Modal */}
    {isGuideOpen && (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 w-full max-w-lg shadow-2xl relative">
          <button onClick={() => setIsGuideOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <HelpCircle className="text-blue-500" /> How to use Flow Builder
          </h2>
          <p className="text-gray-400 text-sm mb-6">Build automation rules without coding by simply connecting blocks.</p>
          
          <div className="space-y-4 mb-6">
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
              <p className="text-emerald-400 font-bold mb-1">1. Start with a Trigger</p>
              <p className="text-sm text-gray-300">The first block is always a Trigger (e.g., "When Keyword is HI"). This decides WHEN the flow will run.</p>
            </div>
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
              <p className="text-blue-400 font-bold mb-1">2. Drag & Drop Actions</p>
              <p className="text-sm text-gray-300">Drag items like "Send Message" or "Wait" from the left sidebar onto the dotted canvas.</p>
            </div>
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
              <p className="text-orange-400 font-bold mb-1">3. Connect the Dots</p>
              <p className="text-sm text-gray-300">Click and drag from the bottom circle of one block to the top circle of another block to link them.</p>
            </div>
          </div>
          <button onClick={() => setIsGuideOpen(false)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">Got it, let's build! 🚀</button>
        </div>
      </div>
    )}

    {/* 🚀 NEW: Saved Flows List Modal */}
    {isFlowListOpen && (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 w-full max-w-2xl shadow-2xl relative max-h-[80vh] flex flex-col">
          <button onClick={() => setIsFlowListOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <FolderOpen className="text-indigo-500" /> My Saved Automations
          </h2>
          <div className="overflow-y-auto flex-1 space-y-3">
            {savedFlows.length === 0 ? (
              <p className="text-gray-500 text-center py-10">No saved flows found. Build and save one first!</p>
            ) : (
              savedFlows.map(flow => (
                <div key={flow._id} className="bg-[#1a1a1a] border border-gray-700 p-4 rounded-xl flex justify-between items-center hover:border-indigo-500 transition-colors">
                  <div>
                    <h3 className="font-bold text-white text-lg">{flow.name}</h3>
                    <p className="text-xs text-gray-400">Workspace: {flow.workspaceId === 'main' ? 'Main Business' : workspaces.find(w => w._id === flow.workspaceId)?.name || flow.workspaceId}</p>
                  </div>
                  <button onClick={() => loadFlow(flow)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                    Load Flow
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}

    <div className="flex h-[calc(100vh-4rem)] bg-[#050505] text-gray-100 font-sans">
      {/* Node Palette Sidebar */}
      <div className="w-64 bg-[#111] border-r border-gray-800 p-6 flex flex-col gap-4 z-10">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Flow Builder</h2>
          <p className="text-xs text-gray-400 mb-6">Drag and drop blocks or click to build automation logic.</p>
        </div>
        <div onClick={() => onNodeClickAdd('🚀 Start Trigger')} className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-pointer hover:border-emerald-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '🚀 Start Trigger')} draggable>
          <span className="text-lg">🚀</span> <span className="font-semibold text-sm">Start Trigger</span>
        </div>
        
        <div onClick={() => onNodeClickAdd('💬 Send Message')} className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-pointer hover:border-blue-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '💬 Send Message')} draggable>
          <MessageSquare size={18} className="text-blue-400" /> <span className="font-semibold text-sm">Send Message</span>
        </div>
        <div onClick={() => onNodeClickAdd('⚡ Ask Question')} className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-pointer hover:border-purple-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '⚡ Ask Question')} draggable>
          <Zap size={18} className="text-purple-400" /> <span className="font-semibold text-sm">Ask Question</span>
        </div>
        <div onClick={() => onNodeClickAdd('🔄 Condition (If/Else)')} className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-pointer hover:border-orange-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '🔄 Condition (If/Else)')} draggable>
          <GitBranch size={18} className="text-orange-400" /> <span className="font-semibold text-sm">Condition</span>
        </div>
        <div onClick={() => onNodeClickAdd('⏳ Wait 15 Mins')} className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-pointer hover:border-gray-400 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '⏳ Wait 15 Mins')} draggable>
          <Clock size={18} className="text-gray-400" /> <span className="font-semibold text-sm">Add Delay</span>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-6 right-6 z-50 flex gap-3">
          
          {/* 🚀 NEW: Flow Name Input */}
          <input 
            type="text" 
            value={flowName} 
            onChange={(e) => setFlowName(e.target.value)} 
            placeholder="Enter Flow Name..." 
            className="bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 shadow-lg font-bold w-48"
          />

          {/* 🚀 NEW: Business / Workspace Selector */}
          <select value={selectedWorkspace} onChange={(e) => setSelectedWorkspace(e.target.value)} className="bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 cursor-pointer shadow-lg font-bold">
            <option value="main">🏢 {mainBusinessName}</option>
            {workspaces.map(ws => (
              <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
            ))}
          </select>
          
          {/* 🚀 NEW: My Flows Button */}
          <button onClick={() => { setIsFlowListOpen(true); fetchSavedFlows(); }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg transition-colors">
            <FolderOpen size={18} /> My Flows
          </button>

          <button onClick={() => setIsGuideOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold shadow-lg transition-colors">
            <HelpCircle size={18} /> How to Use?
          </button>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-colors shadow-green-600/20 disabled:opacity-50">
          <Save size={18} /> {isSaving ? 'Saving...' : 'Save & Publish'}
          </button>
        </div>
        <ReactFlowProvider>
          
          {/* 🚀 NEW: AI Flow Assistant Widget Floating */}
          <div 
            className="absolute bottom-6 left-6 z-50 flex flex-col items-start"
            style={{ transform: `translate(${chatOffset.x}px, ${chatOffset.y}px)`, transition: isDragging.current ? 'none' : 'transform 0.1s' }}
          >
            {isAiChatOpen && (
              <div className="bg-[#111] border border-blue-500/30 rounded-2xl shadow-2xl w-80 mb-4 overflow-hidden flex flex-col animate-fade-in origin-bottom-left">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center cursor-move"
                  onMouseDown={handleChatDragStart}
                >
                  <div className="flex items-center gap-2 text-white pointer-events-none">
                    <Bot size={20} />
                    <h3 className="font-bold leading-tight text-sm">AI Flow Builder</h3>
                  </div>
                  <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setIsAiChatOpen(false)} className="text-white/80 hover:text-white cursor-pointer"><X size={18} /></button>
                </div>
                
                <div className="h-64 p-4 overflow-y-auto flex flex-col gap-3 bg-[#0a0a0a]">
                  {aiMessages.map((msg, idx) => (
                    <div key={idx} className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'ai' ? 'bg-[#1a1a1a] text-gray-200 self-start rounded-tl-sm border border-gray-800' : 'bg-blue-600 text-white self-end rounded-tr-sm'}`}>
                      {msg.content}
                    </div>
                  ))}
                  {isAiTyping && (
                    <div className="bg-[#1a1a1a] text-gray-400 self-start p-3 rounded-2xl rounded-tl-sm border border-gray-800 text-sm flex gap-1">
                      <span className="animate-bounce">.</span><span className="animate-bounce" style={{animationDelay: '0.1s'}}>.</span><span className="animate-bounce" style={{animationDelay: '0.2s'}}>.</span>
                    </div>
                  )}
                  <div ref={aiChatEndRef} />
                </div>
                
                <form onSubmit={handleAiSubmit} className="p-3 bg-[#111] border-t border-gray-800 flex gap-2">
                  <input type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder="Type 'build abandoned cart flow'" className="flex-1 bg-[#1a1a1a] border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:border-blue-500 outline-none" disabled={isAiTyping} />
                  <button type="submit" disabled={isAiTyping || !aiInput.trim()} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50">
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
            <button onClick={() => setIsAiChatOpen(!isAiChatOpen)} className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-110 transition-transform text-2xl relative">
              {isAiChatOpen ? <X size={24} /> : <Bot size={28} />}
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
          >
            <Background color="#333" gap={16} size={1} />
            <Controls className="bg-[#111] border border-gray-800 text-white fill-white" />
            <MiniMap style={{ backgroundColor: '#111', border: '1px solid #333' }} nodeColor="#4B5563" maskColor="rgba(0,0,0,0.7)" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
    </>
  );
}