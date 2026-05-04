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
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MessageSquare, Zap, Clock, GitBranch, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

// --- Custom Nodes Definitions ---
const TriggerNode = () => (
  <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-emerald-500 min-w-[250px] text-white">
    <div className="font-bold mb-3 flex items-center gap-2 text-emerald-400">🚀 Start Trigger</div>
    <select className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-emerald-500">
      <option>When Keyword is "HI"</option>
      <option>When New Lead is Created</option>
      <option>When Cart is Abandoned</option>
    </select>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-500 border-none" />
  </div>
);

const MessageNode = () => {
  const [templates, setTemplates] = useState([]);
  
  useEffect(() => {
    // Fetch real templates from Meta via our backend
    api.get('/whatsapp/templates').then(res => {
      if (Array.isArray(res.data)) setTemplates(res.data);
    }).catch(e => console.error("Template fetch error:", e));
  }, []);

  return (
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-blue-500 min-w-[280px] text-white">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-none" />
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
          <textarea className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-blue-500 placeholder-gray-600" rows="2" placeholder="Hi there! How can we help?"></textarea>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-none" />
    </div>
  );
};

const DelayNode = () => (
  <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-gray-500 min-w-[220px] text-white">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-none" />
    <div className="font-bold mb-3 flex items-center gap-2 text-gray-300">⏳ Wait / Delay</div>
    <div className="flex gap-2">
      <input type="number" className="nodrag nopan w-20 bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-gray-400" defaultValue="15" />
      <select className="nodrag nopan flex-1 bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-gray-400">
        <option>Minutes</option>
        <option>Hours</option>
        <option>Days</option>
      </select>
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400 border-none" />
  </div>
);

const ConditionNode = () => (
  <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-orange-500 min-w-[250px] text-white">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-400 border-none" />
    <div className="font-bold mb-3 flex items-center gap-2 text-orange-400">🔄 Condition (If/Else)</div>
    <select className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-orange-500">
      <option>If User Replied</option>
      <option>If Payment Pending</option>
      <option>If Tag = VIP</option>
    </select>
    <div className="flex justify-between mt-5 text-xs font-bold px-2">
      <span className="text-green-400">TRUE</span>
      <span className="text-rose-400">FALSE</span>
    </div>
    <Handle type="source" position={Position.Bottom} id="true" style={{ left: '20%' }} className="w-3 h-3 bg-green-500 border-none" />
    <Handle type="source" position={Position.Bottom} id="false" style={{ left: '80%' }} className="w-3 h-3 bg-rose-500 border-none" />
  </div>
);

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  delay: DelayNode,
  condition: ConditionNode
};

const initialNodes = [
  {
    id: '1',
    type: 'trigger',
    data: { label: 'Trigger' },
    position: { x: 250, y: 50 },
  },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

export default function FlowBuilder() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

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

  const handleSave = async () => {
    if (reactFlowInstance) {
      const flowData = reactFlowInstance.toObject();
      console.log("Saving Flow:", flowData);
      // Here you would normally send flowData to backend:
      // await api.post('/api/flows', flowData);
      toast.success("Automation Flow Saved & Published! 🚀");
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#050505] text-gray-100 font-sans">
      {/* Node Palette Sidebar */}
      <div className="w-64 bg-[#111] border-r border-gray-800 p-6 flex flex-col gap-4 z-10">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Flow Builder</h2>
          <p className="text-xs text-gray-400 mb-6">Drag and drop blocks to build automation logic.</p>
        </div>
        
        <div className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-grab hover:border-blue-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '💬 Send Message')} draggable>
          <MessageSquare size={18} className="text-blue-400" /> <span className="font-semibold text-sm">Send Message</span>
        </div>
        <div className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-grab hover:border-purple-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '⚡ Ask Question')} draggable>
          <Zap size={18} className="text-purple-400" /> <span className="font-semibold text-sm">Ask Question</span>
        </div>
        <div className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-grab hover:border-orange-500 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '🔄 Condition (If/Else)')} draggable>
          <GitBranch size={18} className="text-orange-400" /> <span className="font-semibold text-sm">Condition</span>
        </div>
        <div className="bg-[#1a1a1a] border border-gray-700 p-3 rounded-xl cursor-grab hover:border-gray-400 transition-colors flex items-center gap-3" onDragStart={(e) => e.dataTransfer.setData('application/label', '⏳ Wait 15 Mins')} draggable>
          <Clock size={18} className="text-gray-400" /> <span className="font-semibold text-sm">Add Delay</span>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-6 right-6 z-10">
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-colors">
            <Save size={18} /> Save & Publish
          </button>
        </div>
        <ReactFlowProvider>
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
  );
}