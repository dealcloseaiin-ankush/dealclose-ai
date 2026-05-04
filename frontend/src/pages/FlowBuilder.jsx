import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MessageSquare, Zap, Clock, GitBranch, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Start (Keyword: "HI")' },
    position: { x: 250, y: 50 },
    style: { background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }
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

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowWrapper.current.getBoundingClientRect().left,
        y: event.clientY - reactFlowWrapper.current.getBoundingClientRect().top,
      });
      
      const newNode = {
        id: getId(),
        type: 'default',
        position,
        data: { label },
        style: { background: '#1f2937', color: 'white', border: '1px solid #374151', borderRadius: '8px', padding: '12px', fontSize: '14px', fontWeight: '600' }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

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
          <button onClick={() => toast.success("Automation Flow Saved!")} className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-colors">
            <Save size={18} /> Save & Publish
          </button>
        </div>
        <ReactFlowProvider>
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onInit={setReactFlowInstance} onDrop={onDrop} onDragOver={onDragOver} fitView theme="dark">
            <Background color="#333" gap={16} />
            <Controls style={{ background: '#111', borderColor: '#333', fill: 'white' }} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}