import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { MessageSquare, Zap, Clock, GitBranch, ListPlus, Camera, X } from 'lucide-react';

// --- Custom Nodes Definitions ---
export const TriggerNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  const [triggerType, setTriggerType] = useState(data?.triggerType || 'business_selected');

  const handleTriggerTypeChange = (e) => {
    const val = e.target.value;
    setTriggerType(val);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, triggerType: val } } : n)));
  };

  return (
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-emerald-500 min-w-[250px] text-white relative group">
      {id !== '1' && (
        <button onClick={() => {
          setNodes(nds => nds.filter(n => n.id !== id));
          setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
        }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      )}
      <div className="font-bold mb-3 flex items-center gap-2 text-emerald-400">🚀 Start Trigger</div>
      <select value={triggerType} onChange={handleTriggerTypeChange} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-emerald-500 mb-3">
        <option value="business_selected">When Business is Selected</option>
        <option value="keyword">When Keyword Matches</option>
        <option value="new_lead">When New Lead is Created</option>
        <option value="abandoned_cart">When Cart is Abandoned</option>
      </select>
      
      {/* 🚀 NEW: User can type multiple keywords separated by commas */}
      {triggerType === 'keyword' && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Keywords (comma separated)</p>
          <input type="text" placeholder="e.g. offer, price, support" defaultValue={data?.keyword || ""} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, keyword: e.target.value } } : n)))} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-emerald-500 placeholder-gray-600" />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-500 border-none" />
    </div>
  );
};

export const MessageNode = ({ id, data, templates = [], ...props }) => {
  const { setNodes, setEdges } = useReactFlow();

  // 🚀 NEW: Check the platform from the node's data (passed down from the main component)
  const isInstagram = props.data?.platform === 'instagram';

  return (
    <div className={`bg-[#111] p-4 rounded-xl shadow-2xl border min-w-[280px] text-white relative group ${isInstagram ? 'border-pink-500' : 'border-blue-500'}`}>
      <button onClick={() => {
        setNodes(nds => nds.filter(n => n.id !== id));
        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      <Handle type="target" position={Position.Top} className={`w-3 h-3 border-none ${isInstagram ? 'bg-pink-500' : 'bg-blue-500'}`} />
      <div className={`font-bold mb-3 flex items-center gap-2 ${isInstagram ? 'text-pink-400' : 'text-blue-400'}`}>
        {isInstagram ? <Camera size={16}/> : <MessageSquare size={16}/>} Send Message
      </div>
      <div className="space-y-3">
        {/* 🚀 NEW: Show Template selector only for WhatsApp */}
        {!isInstagram && (
          <div>
          <p className="text-xs text-gray-400 mb-1">Select Meta Template</p>
            <select defaultValue={data?.template || ""} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, template: e.target.value } } : n)))} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-blue-500">
            <option value="">-- Choose Template --</option>
            {templates.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            <option value="custom">Create Custom Reply...</option>
          </select>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-400 mb-1">{isInstagram ? 'Message Text' : 'Or Type Custom Text'}</p>
          <textarea defaultValue={data?.message || data?.label || ""} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, message: e.target.value } } : n)))} className={`nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white placeholder-gray-600 ${isInstagram ? 'focus:border-pink-500' : 'focus:border-blue-500'}`} rows="2" placeholder="Hi there! How can we help?"></textarea>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className={`w-3 h-3 border-none ${isInstagram ? 'bg-pink-500' : 'bg-blue-500'}`} />
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
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-purple-500 min-w-[280px] text-white relative group">
      <button onClick={() => {
        setNodes(nds => nds.filter(n => n.id !== id));
        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500 border-none" />
      <div className="font-bold mb-3 flex items-center gap-2 text-purple-400">⚡ Ask Question (Wait for Reply)</div>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Expected Reply Type</p>
          <select value={replyType} onChange={handleReplyTypeChange} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-purple-500 mb-2">
            <option value="yes_no">Yes / No Choice</option>
            <option value="open">Open Text (Name, City, etc.)</option>
          </select>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Question to ask</p>
          <textarea defaultValue={data?.question || data?.label || ""} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, question: e.target.value } } : n)))} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-purple-500 placeholder-gray-600" rows="2" placeholder="e.g., What is your name?"></textarea>
        </div>
        
        {replyType === 'yes_no' && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Expected Replies (Branches)</p>
          <div className="flex justify-between text-[10px] font-bold px-2 mt-3 bg-[#1a1a1a] p-2 rounded border border-gray-800">
            <span className="text-green-400 text-center w-1/3 border-r border-gray-700">If "YES"</span>
            <span className="text-rose-400 text-center w-1/3 border-r border-gray-700">If "NO"</span>
            <span className="text-gray-400 text-center w-1/3">Any Other</span>
          </div>
        </div>
        )}
        
        {replyType === 'open' && (
        <div>
          <div className="flex justify-center text-xs font-bold px-2 mt-3 bg-[#1a1a1a] p-2 rounded border border-gray-800">
            <span className="text-emerald-400 text-center">User Replies Any Text</span>
          </div>
        </div>
        )}
      </div>
      
      {replyType === 'yes_no' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '16%' }} className="w-3 h-3 bg-green-500 border-none" />
          <Handle type="source" position={Position.Bottom} id="no" style={{ left: '50%' }} className="w-3 h-3 bg-rose-500 border-none" />
          <Handle type="source" position={Position.Bottom} id="other" style={{ left: '83%' }} className="w-3 h-3 bg-gray-400 border-none" />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} id="replied" style={{ left: '50%' }} className="w-3 h-3 bg-emerald-500 border-none" />
      )}
    </div>
  );
};

export const DelayNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  return (
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-gray-500 min-w-[220px] text-white relative group">
      <button onClick={() => {
        setNodes(nds => nds.filter(n => n.id !== id));
        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-gray-400 border-none" />
      <div className="font-bold mb-3 flex items-center gap-2 text-gray-300">⏳ Wait / Delay</div>
      <div className="flex gap-2">
        <input type="number" onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, delay: e.target.value } } : n)))} className="nodrag nopan w-20 bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-gray-400" defaultValue={data?.delay || "15"} />
        <select defaultValue={data?.unit || "Minutes"} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, unit: e.target.value } } : n)))} className="nodrag nopan flex-1 bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-gray-400">
          <option>Minutes</option>
          <option>Hours</option>
          <option>Days</option>
        </select>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-400 border-none" />
    </div>
  );
};

export const ConditionNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  return (
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-orange-500 min-w-[250px] text-white relative group">
      <button onClick={() => {
        setNodes(nds => nds.filter(n => n.id !== id));
        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-400 border-none" />
      <div className="font-bold mb-3 flex items-center gap-2 text-orange-400">🔄 Condition (If/Else)</div>
      <select defaultValue={data?.condition || "If User Replied"} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, condition: e.target.value } } : n)))} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-orange-500">
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
};

export const MenuNode = ({ id, data }) => {
  const { setNodes, setEdges } = useReactFlow();
  return (
    <div className="bg-[#111] p-4 rounded-xl shadow-2xl border border-teal-500 min-w-[280px] text-white relative group">
      <button onClick={() => {
        setNodes(nds => nds.filter(n => n.id !== id));
        setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      }} className="absolute top-2 right-2 text-gray-500 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-teal-500 border-none" />
      <div className="font-bold mb-3 flex items-center gap-2 text-teal-400"><ListPlus size={18} /> Interactive Menu</div>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Message Text</p>
          <textarea defaultValue={data?.message || ""} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, message: e.target.value } } : n)))} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-teal-500 placeholder-gray-600" rows="2" placeholder="Please select an option:"></textarea>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Button 1</p>
          <input type="text" defaultValue={data?.opt1 || ""} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, opt1: e.target.value } } : n)))} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-teal-500" placeholder="e.g. Collab / PR" />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Button 2</p>
          <input type="text" defaultValue={data?.opt2 || ""} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, opt2: e.target.value } } : n)))} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-teal-500" placeholder="e.g. Paid Ads" />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Button 3</p>
          <input type="text" defaultValue={data?.opt3 || ""} onChange={(e) => setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, opt3: e.target.value } } : n)))} className="nodrag nopan w-full bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm outline-none text-white focus:border-teal-500" placeholder="e.g. Just a Fan ❤️" />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="opt_0" style={{ left: '20%' }} className="w-3 h-3 bg-teal-500 border-none" />
      <Handle type="source" position={Position.Bottom} id="opt_1" style={{ left: '50%' }} className="w-3 h-3 bg-teal-500 border-none" />
      <Handle type="source" position={Position.Bottom} id="opt_2" style={{ left: '80%' }} className="w-3 h-3 bg-teal-500 border-none" />
    </div>
  );
};