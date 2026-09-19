import React, { useState, useEffect, useRef } from 'react';
import { 
  X, RotateCcw, Send, Smartphone, Bot, User, Check, Sparkles, 
  Clock, ChevronRight, ShieldCheck, AlertCircle, ArrowRight, CornerDownLeft
} from 'lucide-react';

export default function FlowSimulatorModal({
  isOpen,
  onClose,
  nodes = [],
  edges = [],
  platform = 'whatsapp',
  flowName = 'Untitled Flow',
  businessName = 'My Business'
}) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [waitingForInput, setWaitingForInput] = useState(null); // null | 'button' | 'question_open' | 'question_yes_no'
  const [activeButtons, setActiveButtons] = useState([]);
  const [collectedData, setCollectedData] = useState({ name: '', city: '', phone: '' });
  const [activeTrace, setActiveTrace] = useState([]);
  const [simulationStatus, setSimulationStatus] = useState('idle'); // 'idle' | 'running' | 'completed' | 'blocked'
  const [blockedReason, setBlockedReason] = useState('');

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Extract trigger info from nodes
  const triggerNode = nodes.find(n => n.type === 'trigger');
  const triggerKeywords = triggerNode?.data?.keyword 
    ? triggerNode.data.keyword.split(',').map(k => k.trim()).filter(Boolean)
    : ['hi', 'hello'];

  // Start / Restart the simulation
  const startSimulation = (initialUserText = null) => {
    if (!triggerNode) {
      setSimulationStatus('blocked');
      setBlockedReason('Canvas par koi Start Trigger block nahi mila.');
      setMessages([
        {
          id: 'err-1',
          sender: 'system',
          text: '⚠️ No Start Trigger: Pehle canvas par ek Start Trigger block add karein.',
          timestamp: getTime()
        }
      ]);
      return;
    }

    const firstOutgoingEdge = edges.find(e => e.source === triggerNode.id);
    if (!firstOutgoingEdge) {
      setSimulationStatus('blocked');
      setBlockedReason('Start Trigger kisi bhi agle block se connect nahi hai.');
      setMessages([
        {
          id: 'err-2',
          sender: 'system',
          text: '⚠️ Start Trigger Unconnected: Start Trigger ke bottom dot se agle message block ko jodein.',
          timestamp: getTime()
        }
      ]);
      return;
    }

    const startKeyword = initialUserText || triggerKeywords[0] || 'hi';
    const initMessages = [
      {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text: startKeyword,
        timestamp: getTime()
      }
    ];

    setMessages(initMessages);
    setCollectedData({ name: '', city: '', phone: '' });
    setActiveTrace([triggerNode.id]);
    setSimulationStatus('running');
    setBlockedReason('');
    setWaitingForInput(null);
    setActiveButtons([]);

    // Step into first connected node after a short natural delay
    setTimeout(() => {
      processNode(firstOutgoingEdge.target, { name: '', city: '', phone: '' }, [triggerNode.id]);
    }, 400);
  };

  // Reset simulation whenever modal opens
  useEffect(() => {
    if (isOpen) {
      startSimulation();
    }
  }, [isOpen]);

  const getTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Process a node step-by-step
  const processNode = (nodeId, currentData, currentTrace) => {
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) {
      setSimulationStatus('completed');
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: '🏁 Flow Completed (Target block reached).',
          timestamp: getTime()
        }
      ]);
      return;
    }

    setCurrentNodeId(nodeId);
    const newTrace = [...currentTrace, nodeId];
    setActiveTrace(newTrace);

    // Bot Typing Animation
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);

      if (targetNode.type === 'message') {
        let rawText = targetNode.data?.message || targetNode.data?.label || 'Hello!';
        // Template variable replacement (pure visual)
        rawText = rawText
          .replace(/\{\{\s*name\s*\}\}/gi, currentData.name || 'Friend')
          .replace(/\{\{\s*city\s*\}\}/gi, currentData.city || 'your city');

        setMessages(prev => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: rawText,
            timestamp: getTime()
          }
        ]);

        // Check next node
        const nextEdge = edges.find(e => e.source === nodeId);
        if (nextEdge) {
          setTimeout(() => {
            processNode(nextEdge.target, currentData, newTrace);
          }, 700);
        } else {
          setSimulationStatus('completed');
          setMessages(prev => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              sender: 'system',
              text: '🏁 Flow End: Customer journey successfully completed.',
              timestamp: getTime()
            }
          ]);
        }
      } 
      else if (targetNode.type === 'menu') {
        const promptText = targetNode.data?.message || 'Please select an option:';
        const opts = [];
        if (targetNode.data?.opt1) opts.push({ label: targetNode.data.opt1, handleId: 'opt_0' });
        if (targetNode.data?.opt2) opts.push({ label: targetNode.data.opt2, handleId: 'opt_1' });
        if (targetNode.data?.opt3) opts.push({ label: targetNode.data.opt3, handleId: 'opt_2' });

        setMessages(prev => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: promptText,
            buttons: opts,
            timestamp: getTime()
          }
        ]);

        setWaitingForInput('button');
        setActiveButtons(opts);
      } 
      else if (targetNode.type === 'askQuestion') {
        const questionText = targetNode.data?.question || 'Please provide your details:';
        const isYesNo = targetNode.data?.replyType === 'yes_no';

        setMessages(prev => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: questionText,
            timestamp: getTime()
          }
        ]);

        setWaitingForInput(isYesNo ? 'question_yes_no' : 'question_open');
        setTimeout(() => inputRef.current?.focus(), 200);
      } 
      else if (targetNode.type === 'delay') {
        const delayVal = targetNode.data?.delay || '15';
        const unitVal = targetNode.data?.unit || 'Minutes';

        setMessages(prev => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: `⏳ Simulated Delay: Bot waits ${delayVal} ${unitVal} before next reply...`,
            timestamp: getTime()
          }
        ]);

        const nextEdge = edges.find(e => e.source === nodeId);
        if (nextEdge) {
          setTimeout(() => {
            processNode(nextEdge.target, currentData, newTrace);
          }, 800);
        } else {
          setSimulationStatus('completed');
        }
      } 
      else if (targetNode.type === 'condition') {
        setMessages(prev => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: `🔄 Evaluating Condition ("${targetNode.data?.condition || 'If User Replied'}") ➔ Following TRUE branch`,
            timestamp: getTime()
          }
        ]);

        const trueEdge = edges.find(e => e.source === nodeId && e.sourceHandle === 'true') || edges.find(e => e.source === nodeId);
        if (trueEdge) {
          setTimeout(() => {
            processNode(trueEdge.target, currentData, newTrace);
          }, 600);
        } else {
          setSimulationStatus('completed');
        }
      }
    }, 550);
  };

  // Handle clicking a menu button option
  const handleOptionClick = (btn) => {
    setWaitingForInput(null);
    setActiveButtons([]);

    setMessages(prev => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text: `👉 ${btn.label}`,
        timestamp: getTime()
      }
    ]);

    // Match edge with specific handle
    const branchEdge = edges.find(e => e.source === currentNodeId && (e.sourceHandle === btn.handleId || !e.sourceHandle));
    
    if (branchEdge) {
      setTimeout(() => {
        processNode(branchEdge.target, collectedData, activeTrace);
      }, 400);
    } else {
      setSimulationStatus('blocked');
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `⚠️ Unlinked Button: Button "${btn.label}" is not connected to any next block on canvas.`,
          timestamp: getTime()
        }
      ]);
    }
  };

  // Handle answering an open question or yes/no
  const handleSendAnswer = (answerText, handleOverride = null) => {
    const textToSend = answerText || userInput.trim();
    if (!textToSend) return;

    setUserInput('');
    const prevWaiting = waitingForInput;
    setWaitingForInput(null);

    setMessages(prev => [
      ...prev,
      {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text: textToSend,
        timestamp: getTime()
      }
    ]);

    // Update dummy sandbox variables
    const updatedData = { ...collectedData };
    if (!updatedData.name && isNaN(Number(textToSend)) && textToSend.length < 25) {
      updatedData.name = textToSend;
    } else if (!updatedData.city && textToSend.length < 20) {
      updatedData.city = textToSend;
    }
    setCollectedData(updatedData);

    let nextEdge = null;
    if (prevWaiting === 'question_yes_no') {
      const isYes = handleOverride === 'yes' || /yes|haan|ha|sure|ok|yup/i.test(textToSend);
      const isNo = handleOverride === 'no' || /no|nahin|na|cancel/i.test(textToSend);
      const targetHandle = isYes ? 'yes' : isNo ? 'no' : 'other';

      nextEdge = edges.find(e => e.source === currentNodeId && e.sourceHandle === targetHandle)
        || edges.find(e => e.source === currentNodeId);
    } else {
      // Open text question
      nextEdge = edges.find(e => e.source === currentNodeId && e.sourceHandle === 'replied')
        || edges.find(e => e.source === currentNodeId);
    }

    if (nextEdge) {
      setTimeout(() => {
        processNode(nextEdge.target, updatedData, activeTrace);
      }, 400);
    } else {
      setSimulationStatus('completed');
      setMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: '🏁 Question answered. End of connected flow reached.',
          timestamp: getTime()
        }
      ]);
    }
  };

  if (!isOpen) return null;

  const isInstagram = platform === 'instagram';

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in select-none">
      
      {/* Outer Shell */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full max-w-4xl max-h-[96vh]">
        
        {/* 📱 VIRTUAL PHONE MOCKUP */}
        <div className="w-full max-w-[360px] sm:max-w-[390px] h-[85vh] max-h-[720px] bg-[#0c0c10] border-[8px] border-[#22222a] rounded-[42px] shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-white/10">
          
          {/* Phone Top Notch / Dynamic Island */}
          <div className="bg-[#111116] pt-2 pb-1.5 px-6 flex justify-between items-center shrink-0 border-b border-gray-800/40">
            <span className="text-[11px] font-bold text-gray-400">9:41</span>
            <div className="w-20 h-3.5 bg-black rounded-full mx-auto" />
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="text-[10px] font-bold">5G</span>
              <div className="w-4 h-2.5 border border-gray-400 rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-emerald-400 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Chat App Header (WhatsApp Green or IG Purple/Pink) */}
          <div className={`p-3 flex items-center justify-between text-white shrink-0 shadow-md ${
            isInstagram 
              ? 'bg-gradient-to-r from-purple-700 via-pink-600 to-rose-600' 
              : 'bg-[#1f2c34] border-b border-[#2a3942]'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-black text-sm border border-white/30 text-white shadow-inner">
                {businessName ? businessName.charAt(0).toUpperCase() : 'B'}
              </div>
              <div className="leading-tight">
                <h3 className="font-bold text-xs sm:text-sm truncate max-w-[170px]">{businessName || 'Business Bot'}</h3>
                <p className="text-[10px] text-emerald-300 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  {isInstagram ? 'Instagram Automation' : 'WhatsApp Business Verified'}
                </p>
              </div>
            </div>

            <button 
              onClick={() => startSimulation()} 
              className="p-1.5 rounded-full hover:bg-white/20 active:scale-95 transition-all text-white/90"
              title="Restart Simulation"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Sandbox Notice Banner */}
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1 flex items-center justify-between text-[10px] text-amber-300">
            <span className="flex items-center gap-1 font-semibold">
              <ShieldCheck size={12} className="text-amber-400" /> Pure Client Sandbox (Zero DB/API calls)
            </span>
            <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-500/20 px-1.5 py-0.5 rounded">Safe</span>
          </div>

          {/* Message Stream */}
          <div className={`flex-1 overflow-y-auto p-3 space-y-3 ${
            isInstagram ? 'bg-[#0f0f14]' : 'bg-[#0b141a]'
          }`}>
            
            {/* Simulation Start Stamp */}
            <div className="text-center my-1">
              <span className="text-[10px] bg-gray-800/60 text-gray-400 px-2.5 py-1 rounded-full border border-gray-700/50">
                💬 Simulating: <strong>{flowName}</strong>
              </span>
            </div>

            {messages.map((msg) => {
              if (msg.sender === 'system') {
                return (
                  <div key={msg.id} className="text-center my-1.5 animate-fade-in">
                    <span className="text-[10px] bg-blue-950/40 text-blue-300 px-3 py-1 rounded-xl border border-blue-500/30 inline-block max-w-[90%]">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-fade-in`}>
                  <div 
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-md ${
                      isUser
                        ? isInstagram
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-xs'
                          : 'bg-[#005c4b] text-[#e9edef] rounded-br-xs'
                        : isInstagram
                          ? 'bg-[#262626] text-white rounded-bl-xs border border-gray-800'
                          : 'bg-[#202c33] text-[#e9edef] rounded-bl-xs border border-gray-800/40'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    
                    {/* Timestamp & double check */}
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-gray-400">
                      <span>{msg.timestamp}</span>
                      {isUser && <span className="text-blue-400 font-bold">✓✓</span>}
                    </div>
                  </div>

                  {/* If message has interactive buttons attached (Menu Node) */}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="w-full max-w-[85%] mt-1.5 space-y-1.5">
                      {msg.buttons.map((btn, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionClick(btn)}
                          disabled={waitingForInput !== 'button'}
                          className={`w-full py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 ${
                            waitingForInput === 'button'
                              ? isInstagram
                                ? 'bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border-purple-500/40 active:scale-98 shadow-md'
                                : 'bg-[#00a884]/20 hover:bg-[#00a884]/35 text-[#00a884] border-[#00a884]/40 active:scale-98 shadow-md'
                              : 'bg-gray-800/50 text-gray-500 border-gray-700/50 cursor-not-allowed'
                          }`}
                        >
                          <span>{btn.label}</span>
                          {waitingForInput === 'button' && <ChevronRight size={14} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Animation */}
            {isTyping && (
              <div className="flex items-center gap-1.5 bg-[#202c33] text-gray-300 px-3 py-2 rounded-2xl rounded-bl-xs w-20 border border-gray-800 animate-pulse">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Dummy Chips for Questions */}
          {waitingForInput && (
            <div className="p-2 bg-[#111116] border-t border-gray-800/80 shrink-0">
              <p className="text-[10px] text-gray-400 mb-1.5 font-bold flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400" /> Tap to Reply / Test:
              </p>
              
              {waitingForInput === 'question_yes_no' ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendAnswer('Yes', 'yes')}
                    className="flex-1 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    Yes ✅
                  </button>
                  <button
                    onClick={() => handleSendAnswer('No', 'no')}
                    className="flex-1 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/50 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    No ❌
                  </button>
                </div>
              ) : waitingForInput === 'question_open' ? (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSendAnswer('Rahul Sharma')}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-[11px] font-medium border border-gray-700"
                  >
                    ⚡ Rahul Sharma
                  </button>
                  <button
                    onClick={() => handleSendAnswer('Mumbai')}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-[11px] font-medium border border-gray-700"
                  >
                    ⚡ Mumbai
                  </button>
                  <button
                    onClick={() => handleSendAnswer('9876543210')}
                    className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-[11px] font-medium border border-gray-700"
                  >
                    ⚡ 9876543210
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* Bottom Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendAnswer();
            }}
            className="p-2.5 bg-[#111116] border-t border-gray-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={
                waitingForInput === 'button'
                  ? 'Tap an option button above...'
                  : 'Type a message as customer...'
              }
              disabled={waitingForInput === 'button'}
              className="flex-1 bg-[#1a1a22] border border-gray-700 text-white text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500 placeholder-gray-500 font-medium disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!userInput.trim() || waitingForInput === 'button'}
              className={`p-2.5 rounded-xl transition-all text-white disabled:opacity-40 shadow-md ${
                isInstagram 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500' 
                  : 'bg-[#00a884] hover:bg-[#009070]'
              }`}
            >
              <Send size={15} />
            </button>
          </form>

        </div>

        {/* ℹ️ SIDE PANEL (Simulator Controls & Flow Diagnostics) */}
        <div className="hidden md:flex flex-col justify-between w-72 bg-[#111116] border border-gray-800 rounded-3xl p-5 shadow-2xl h-[85vh] max-h-[720px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2 text-white">
                <Smartphone size={18} className="text-emerald-400" />
                <h3 className="font-black text-sm">Flow Sandbox 📱</h3>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status Card */}
            <div className="mt-4 p-3 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Simulator Status:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] uppercase ${
                  simulationStatus === 'running' 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : simulationStatus === 'completed' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {simulationStatus}
                </span>
              </div>
              <div className="text-[11px] text-gray-300">
                <strong>Blocks Executed:</strong> {activeTrace.length} of {nodes.length}
              </div>
            </div>

            {/* Test Trigger Keywords */}
            <div className="mt-4 space-y-2">
              <span className="text-xs font-bold text-gray-300 block">Trigger Keywords:</span>
              <div className="flex flex-wrap gap-1.5">
                {triggerKeywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => startSimulation(kw)}
                    className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold transition-all active:scale-95"
                    title={`Start simulation with keyword "${kw}"`}
                  >
                    "{kw}"
                  </button>
                ))}
              </div>
            </div>

            {/* Collected Sandbox Data */}
            <div className="mt-4 p-3 bg-[#0a0a0f] border border-gray-800/80 rounded-2xl space-y-1 text-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Captured Sandbox Data:
              </span>
              <p className="text-gray-300 text-[11px]">
                👤 Name: <strong className="text-white">{collectedData.name || '—'}</strong>
              </p>
              <p className="text-gray-300 text-[11px]">
                📍 City: <strong className="text-white">{collectedData.city || '—'}</strong>
              </p>
              <p className="text-[10px] text-emerald-400/80 pt-1">
                ✓ Stored strictly in browser memory
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-gray-800 space-y-2">
            <button
              onClick={() => startSimulation()}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <RotateCcw size={14} />
              <span>Restart Simulation</span>
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              Close Simulator
            </button>
          </div>
        </div>

      </div>

      {/* Floating Close Button on Mobile */}
      <button 
        onClick={onClose}
        className="md:hidden absolute top-4 right-4 p-2 bg-gray-900 border border-gray-700 text-white rounded-full shadow-lg"
      >
        <X size={20} />
      </button>

    </div>
  );
}
