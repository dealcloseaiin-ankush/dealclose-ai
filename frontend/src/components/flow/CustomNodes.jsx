import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { MessageSquare, Zap, Clock, GitBranch, ListPlus, Camera, X, GripHorizontal } from 'lucide-react';

// --- Custom Nodes Definitions with Smooth Drag & Grip Handles ---

export const TriggerNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  const [triggerType, setTriggerType] = useState(data?.triggerType || 'business_selected');

  const handleTriggerTypeChange = (e) => {
    const val = e.target.value;
    setTriggerType(val);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, triggerType: val } } : n)));
  };

  return (
    <div className="bg-[#111] p-4 rounded-2xl shadow-2xl border border-emerald-500 min-w-[270px] text-white relative group cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-emerald-500/20 hover:shadow-xl">
      {id !== '1' && (
        <button 
          onClick={() => {
            setNodes(nds => nds.filter(n => n.id !== id));
            setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
          }} 
          className="nodrag nopan absolute top-2.5 right-2.5 text-gray-400 hover:text-rose-500 p-1 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <X size={15}/>
        </button>
      )}
      <div className="font-bold mb-3 flex items-center justify-between text-emerald-400 text-sm">
        <span className="flex items-center gap-1.5">🚀 Start Trigger</span>
        <GripHorizontal size={14} className="text-gray-600 mr-6" />
      </div>
      <div className="nodrag nopan space-y-2.5 cursor-default">
        <select value={triggerType} onChange={handleTriggerTypeChange} className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-emerald-500">
          <option value="business_selected">When Business is Selected</option>
          <option value="keyword">When Keyword Matches</option>
          <option value="new_lead">When New Lead is Created</option>
          <option value="abandoned_cart">When Cart is Abandoned</option>
        </select>
        
        {triggerType === 'keyword' && (
          <div>
            <p className="text-[11px] text-gray-400 mb-1">Keywords (comma separated)</p>
            <input 
              type="text" 
              placeholder="e.g. offer, price, support" 
              defaultValue={data?.keyword || ""} 
              onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, keyword: e.target.value } } : n)))} 
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-emerald-500 placeholder-gray-600" 
            />
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-emerald-500 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
    </div>
  );
};

export const MessageNode = ({ id, data, templates = [], ...props }) => {
  const { setNodes, setEdges } = useReactFlow();
  const isInstagram = props.data?.platform === 'instagram';

  return (
    <div className={`bg-[#111] p-4 rounded-2xl shadow-2xl border min-w-[280px] text-white relative group cursor-grab active:cursor-grabbing select-none transition-shadow ${isInstagram ? 'border-pink-500 hover:shadow-pink-500/20' : 'border-blue-500 hover:shadow-blue-500/20'}`}>
      <button 
        onClick={() => {
          setNodes(nds => nds.filter(n => n.id !== id));
          setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
        }} 
        className="nodrag nopan absolute top-2.5 right-2.5 text-gray-400 hover:text-rose-500 p-1 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <X size={15}/>
      </button>
      <Handle type="target" position={Position.Top} className={`!w-4 !h-4 !border-2 !border-[#111] shadow-lg cursor-pointer -top-2 ${isInstagram ? '!bg-pink-500' : '!bg-blue-500'}`} />
      
      <div className={`font-bold mb-3 flex items-center justify-between text-sm ${isInstagram ? 'text-pink-400' : 'text-blue-400'}`}>
        <span className="flex items-center gap-1.5">
          {isInstagram ? <Camera size={16}/> : <MessageSquare size={16}/>} Send Message
        </span>
        <GripHorizontal size={14} className="text-gray-600 mr-6" />
      </div>

      <div className="nodrag nopan space-y-2.5 cursor-default">
        {!isInstagram && (
          <div>
            <p className="text-[11px] text-gray-400 mb-1">Select Meta Template</p>
            <select defaultValue={data?.template || ""} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, template: e.target.value } } : n)))} className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-blue-500">
              <option value="">-- Choose Template --</option>
              {templates.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              <option value="custom">Create Custom Reply...</option>
            </select>
          </div>
        )}
        <div>
          <p className="text-[11px] text-gray-400 mb-1">{isInstagram ? 'Message Text' : 'Or Type Custom Text'}</p>
          <textarea 
            defaultValue={data?.message || data?.label || ""} 
            onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, message: e.target.value } } : n)))} 
            className={`w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white placeholder-gray-600 ${isInstagram ? 'focus:border-pink-500' : 'focus:border-blue-500'}`} 
            rows="2" 
            placeholder="Hi there! How can we help?"
          ></textarea>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className={`!w-4 !h-4 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2 ${isInstagram ? '!bg-pink-500' : '!bg-blue-500'}`} />
    </div>
  );
};

export const AskQuestionNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  const [replyType, setReplyType] = useState(data?.replyType || 'yes_no');

  const handleReplyTypeChange = (e) => {
    const newType = e.target.value;
    setReplyType(newType);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, replyType: newType } } : n)));
  };

  return (
    <div className="bg-[#111] p-4 rounded-2xl shadow-2xl border border-purple-500 min-w-[280px] text-white relative group cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-purple-500/20">
      <button 
        onClick={() => {
          setNodes(nds => nds.filter(n => n.id !== id));
          setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
        }} 
        className="nodrag nopan absolute top-2.5 right-2.5 text-gray-400 hover:text-rose-500 p-1 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <X size={15}/>
      </button>
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-purple-500 !border-2 !border-[#111] shadow-lg cursor-pointer -top-2" />
      
      <div className="font-bold mb-3 flex items-center justify-between text-purple-400 text-sm">
        <span className="flex items-center gap-1.5">⚡ Ask Question (Wait for Reply)</span>
        <GripHorizontal size={14} className="text-gray-600 mr-6" />
      </div>

      <div className="nodrag nopan space-y-2.5 cursor-default">
        <div>
          <p className="text-[11px] text-gray-400 mb-1">Expected Reply Type</p>
          <select value={replyType} onChange={handleReplyTypeChange} className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-purple-500">
            <option value="yes_no">Yes / No Choice</option>
            <option value="open">Open Text (Name, City, etc.)</option>
          </select>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-1">Question to ask</p>
          <textarea 
            defaultValue={data?.question || data?.label || ""} 
            onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, question: e.target.value } } : n)))} 
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-purple-500 placeholder-gray-600" 
            rows="2" 
            placeholder="e.g., What is your name?"
          ></textarea>
        </div>
        
        {replyType === 'yes_no' && (
          <div>
            <p className="text-[11px] text-gray-400 mb-1">Expected Replies (Branches)</p>
            <div className="flex justify-between text-[10px] font-bold px-2 mt-1 bg-[#1a1a1a] p-2 rounded-xl border border-gray-800">
              <span className="text-green-400 text-center w-1/3 border-r border-gray-700">If "YES"</span>
              <span className="text-rose-400 text-center w-1/3 border-r border-gray-700">If "NO"</span>
              <span className="text-gray-400 text-center w-1/3">Any Other</span>
            </div>
          </div>
        )}
        
        {replyType === 'open' && (
          <div>
            <div className="flex justify-center text-xs font-bold px-2 mt-1 bg-[#1a1a1a] p-2 rounded-xl border border-gray-800">
              <span className="text-emerald-400 text-center">User Replies Any Text</span>
            </div>
          </div>
        )}
      </div>
      
      {replyType === 'yes_no' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '16%' }} className="!w-4 !h-4 !bg-green-500 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
          <Handle type="source" position={Position.Bottom} id="no" style={{ left: '50%' }} className="!w-4 !h-4 !bg-rose-500 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
          <Handle type="source" position={Position.Bottom} id="other" style={{ left: '83%' }} className="!w-4 !h-4 !bg-gray-400 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} id="replied" style={{ left: '50%' }} className="!w-4 !h-4 !bg-emerald-500 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
      )}
    </div>
  );
};

export const DelayNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  return (
    <div className="bg-[#111] p-4 rounded-2xl shadow-2xl border border-gray-500 min-w-[220px] text-white relative group cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-gray-500/20">
      <button 
        onClick={() => {
          setNodes(nds => nds.filter(n => n.id !== id));
          setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
        }} 
        className="nodrag nopan absolute top-2.5 right-2.5 text-gray-400 hover:text-rose-500 p-1 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <X size={15}/>
      </button>
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-gray-400 !border-2 !border-[#111] shadow-lg cursor-pointer -top-2" />
      
      <div className="font-bold mb-3 flex items-center justify-between text-gray-300 text-sm">
        <span className="flex items-center gap-1.5">⏳ Wait / Delay</span>
        <GripHorizontal size={14} className="text-gray-600 mr-6" />
      </div>

      <div className="nodrag nopan flex gap-2 cursor-default">
        <input 
          type="number" 
          onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, delay: e.target.value } } : n)))} 
          className="w-20 bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-gray-400" 
          defaultValue={data?.delay || "15"} 
        />
        <select 
          defaultValue={data?.unit || "Minutes"} 
          onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, unit: e.target.value } } : n)))} 
          className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-gray-400"
        >
          <option>Minutes</option>
          <option>Hours</option>
          <option>Days</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-gray-400 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
    </div>
  );
};

export const ConditionNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  return (
    <div className="bg-[#111] p-4 rounded-2xl shadow-2xl border border-orange-500 min-w-[250px] text-white relative group cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-orange-500/20">
      <button 
        onClick={() => {
          setNodes(nds => nds.filter(n => n.id !== id));
          setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
        }} 
        className="nodrag nopan absolute top-2.5 right-2.5 text-gray-400 hover:text-rose-500 p-1 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <X size={15}/>
      </button>
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-orange-400 !border-2 !border-[#111] shadow-lg cursor-pointer -top-2" />
      
      <div className="font-bold mb-3 flex items-center justify-between text-orange-400 text-sm">
        <span className="flex items-center gap-1.5">🔄 Condition (If/Else)</span>
        <GripHorizontal size={14} className="text-gray-600 mr-6" />
      </div>

      <div className="nodrag nopan space-y-2 cursor-default">
        <select 
          defaultValue={data?.condition || "If User Replied"} 
          onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, condition: e.target.value } } : n)))} 
          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-orange-500"
        >
          <option>If User Replied</option>
          <option>If Payment Pending</option>
          <option>If Tag = VIP</option>
        </select>
        <div className="flex justify-between text-xs font-bold px-2 pt-1">
          <span className="text-green-400">TRUE</span>
          <span className="text-rose-400">FALSE</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="true" style={{ left: '20%' }} className="!w-4 !h-4 !bg-green-500 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
      <Handle type="source" position={Position.Bottom} id="false" style={{ left: '80%' }} className="!w-4 !h-4 !bg-rose-500 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
    </div>
  );
};

export const MenuNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  return (
    <div className="bg-[#111] p-4 rounded-2xl shadow-2xl border border-teal-500 min-w-[280px] text-white relative group cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-teal-500/20">
      <button 
        onClick={() => {
          setNodes(nds => nds.filter(n => n.id !== id));
          setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
        }} 
        className="nodrag nopan absolute top-2.5 right-2.5 text-gray-400 hover:text-rose-500 p-1 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <X size={15}/>
      </button>
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-teal-500 !border-2 !border-[#111] shadow-lg cursor-pointer -top-2" />
      
      <div className="font-bold mb-3 flex items-center justify-between text-teal-400 text-sm">
        <span className="flex items-center gap-1.5"><ListPlus size={18} /> Interactive Menu</span>
        <GripHorizontal size={14} className="text-gray-600 mr-6" />
      </div>

      <div className="nodrag nopan space-y-2.5 cursor-default">
        <div>
          <p className="text-[11px] text-gray-400 mb-1">Message Text</p>
          <textarea 
            defaultValue={data?.message || ""} 
            onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, message: e.target.value } } : n)))} 
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-teal-500 placeholder-gray-600" 
            rows="2" 
            placeholder="Please select an option:"
          ></textarea>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-1">Button 1</p>
          <input 
            type="text" 
            defaultValue={data?.opt1 || ""} 
            onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, opt1: e.target.value } } : n)))} 
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-teal-500" 
            placeholder="e.g. Collab / PR" 
          />
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-1">Button 2</p>
          <input 
            type="text" 
            defaultValue={data?.opt2 || ""} 
            onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, opt2: e.target.value } } : n)))} 
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-teal-500" 
            placeholder="e.g. Paid Ads" 
          />
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-1">Button 3</p>
          <input 
            type="text" 
            defaultValue={data?.opt3 || ""} 
            onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, opt3: e.target.value } } : n)))} 
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-2.5 text-xs outline-none text-white focus:border-teal-500" 
            placeholder="e.g. Just a Fan ❤️" 
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="opt_0" style={{ left: '20%' }} className="!w-4 !h-4 !bg-teal-500 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
      <Handle type="source" position={Position.Bottom} id="opt_1" style={{ left: '50%' }} className="!w-4 !h-4 !bg-teal-500 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
      <Handle type="source" position={Position.Bottom} id="opt_2" style={{ left: '80%' }} className="!w-4 !h-4 !bg-teal-500 !border-2 !border-[#111] shadow-lg cursor-pointer -bottom-2" />
    </div>
  );
};