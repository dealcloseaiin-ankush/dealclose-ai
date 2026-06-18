import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Phone, PhoneOff, Mic, Settings, PlayCircle, History, Bot, Volume2, Activity, Database, FileText, Link as LinkIcon, Clock, Radio, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import DashboardAIAssistant from '../components/DashboardAIAssistant';

export default function Calls() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');
  const [aiCredits, setAiCredits] = useState(0);
  
  const [callMode, setCallMode] = useState('web'); // 'web', 'phone', 'bulk'
  const [isCalling, setIsCalling] = useState(false);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("Ready to Call");
  const [logs, setLogs] = useState([]);
  const [targetNumber, setTargetNumber] = useState('');
  const [callGoal, setCallGoal] = useState("You are the AI assistant for DealClose. Your goal is to qualify the lead and capture their email address.");
  const [crmResult, setCrmResult] = useState(null);
  
  // CRM Leads Dropdown States
  const [crmLeads, setCrmLeads] = useState([]);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) {
         setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
         setAiCredits(u.aiCredits || 0);
      }
    }).catch(console.error);
    
    api.get('/crm/pipeline').then(res => {
       const allContacts = [];
       if (res.data && res.data.data) {
         Object.values(res.data.data).forEach(arr => allContacts.push(...arr));
       }
       setCrmLeads(allContacts);
    }).catch(console.error);
  }, []);

  // Timer Effect
  useEffect(() => {
    let interval;
    if (isCalling) {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  const addLog = (msg) => {
    setLogs(prev => [...prev, { 
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}), 
      text: msg 
    }]);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startCall = async () => {
    if (callMode === 'phone' || callMode === 'bulk') {
       return toast.success(`Initiating Real Phone Call to ${targetNumber} via Twilio/Exotel API...`);
    }
    try {
      setDuration(0);
      setStatus("Connecting to AI...");
      setLogs([]); // Clear previous logs
      addLog("Initializing Audio & WebSocket...");
      
      // 🚀 FIX: Redirect WebSocket directly to the Backend (Render) instead of the Frontend host
      const backendBase = import.meta.env.VITE_API_URL || 'https://dealclose-ai.onrender.com/api';
      const wsUrl = import.meta.env.MODE === 'development' 
        ? 'ws://localhost:5000/api/webhooks/mobile/stream' 
        : backendBase.replace('http', 'ws').replace('/api', '') + '/api/webhooks/mobile/stream';
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setStatus("Connected! Speak now...");
        addLog("Connected to Server. Requesting Mic access...");
        setIsCalling(true);
        
        // 🚀 FULL PAYLOAD (Workspace & CRM Link)
        ws.send(JSON.stringify({ 
          event: 'start',
          targetNumber,
          workspaceId: activeWorkspace,
          callGoal
        }));

        // 🎤 1. GET MICROPHONE ACCESS
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            autoGainControl: true,    // 🚀 Dheere aawaz ko automatically loud karega
            echoCancellation: true,   // 🚀 Echo (goonj) ko kam karega
            noiseSuppression: true    // 🚀 Background shor ko hatayega
          } 
        });
        streamRef.current = stream;
        addLog("Mic access granted! Streaming audio...");
        
        // 🔊 2. SETUP AUDIO CONTEXT (For 16000Hz PCM required by Deepgram)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        
        source.connect(processor);
        processor.connect(audioCtx.destination);

        // 🚀 3. CAPTURE AUDIO & SEND TO BACKEND
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          
          // Convert Float32 (Browser) to Int16 (Deepgram Format)
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          
          const uint8 = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < uint8.byteLength; i++) {
              binary += String.fromCharCode(uint8[i]);
          }
          
          ws.send(JSON.stringify({ event: 'audio', data: window.btoa(binary) }));
        };
        
        processorRef.current = processor;
      };

      // 🔈 4. RECEIVE AI AUDIO & PLAY IT
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'audio' && msg.data) {
            playAudio(msg.data);
          } else if (msg.event === 'transcript') {
            addLog(`👤 Customer: ${msg.text}`);
          } else if (msg.event === 'ai_response') {
            addLog(`🤖 AI: ${msg.text}`);
          }
        } catch (error) {
          console.log("Ignored non-JSON WS message", error);
        }
      };

      ws.onclose = () => endCall("Call ended by server");
      ws.onerror = () => { toast.error("Connection error!"); endCall("Error occurred"); };

    } catch (err) {
      console.error(err);
      toast.error("Microphone access denied or error occurred.");
      endCall("Failed to start call");
    }
  };

  const playAudio = (base64) => {
    if (!audioCtxRef.current) return;
    
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;

    const audioBuffer = audioCtxRef.current.createBuffer(1, float32.length, 16000);
    audioBuffer.getChannelData(0).set(float32);

    const source = audioCtxRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtxRef.current.destination);
    source.start();
  };

  const endCall = (reason = "Call Disconnected") => {
    // 🚀 SAFETY FIX: Check readyState before sending/closing
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) { 
       wsRef.current.send(JSON.stringify({ event: 'stop' })); 
       wsRef.current.close(); 
    }
    wsRef.current = null;
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    setIsCalling(false);
    setStatus(reason);
    addLog(reason);
    
    // Mocking post-call CRM extraction after call ends
    if (reason !== "Failed to start call") {
      setTimeout(() => {
        setCrmResult({
          summary: "Customer was interested in the premium plan.",
          actionTaken: "Lead status updated to 'Hot'. Email captured.",
          confidence: "High"
        });
        toast.success("Call ended. AI has updated the CRM notes!");
      }, 1500);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-10 bg-[#050505] text-gray-200 font-sans">
      
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
              AI Voice Studio & Web Caller
            </h1>
            <select value={activeWorkspace} onChange={(e) => setActiveWorkspace(e.target.value)} className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-green-500 cursor-pointer shadow-sm">
              {workspaces.map(ws => (<option key={ws._id} value={ws._id}>🏢 {ws.name}</option>))}
            </select>
          </div>
          <p className="text-gray-400">Make free internet calls to your CRM leads and train your AI Agent.</p>
        </div>
        <Link to="/campaigns" className="px-5 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 hover:border-green-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2">
          <LinkIcon size={16}/> Go to IVR & Bulk Dialer
        </Link>
      </div>

      {/* IVR / Bulk Calling Info Banner */}
      <div className="mb-8 bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-green-400">Looking for "Press 1 for AI, Press 2 for Human" & Call Recording?</h3>
          <p className="text-sm text-gray-400 mt-1">IVR scripts, MP3 Cloudinary Recordings, and Bulk Auto-Dialing have been moved to the <Link to="/campaigns" className="text-green-300 underline font-semibold">Campaigns & Ads Manager</Link> page.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        
        {/* COLUMN 1: Agent Configuration */}
        <div className="bg-[#111] border border-gray-800 p-6 rounded-3xl shadow-xl flex flex-col gap-5">
          <h3 className="font-bold text-white flex items-center gap-2 text-lg border-b border-gray-800 pb-4">
            <Settings size={20} className="text-blue-400"/> Agent Configuration
          </h3>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Agent Persona</label>
            <select className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none cursor-pointer">
              <option>Sales Representative (Energetic)</option>
              <option>Customer Support (Calm & Empathetic)</option>
              <option>Appointment Setter (Professional)</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex justify-between">
              Goal of the Call (Prompt)
              <span className="text-[10px] text-blue-400 normal-case bg-blue-500/10 px-2 rounded">Uses Workspace Data</span>
            </label>
            <textarea 
              className="w-full h-32 bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none resize-none text-sm"
              value={callGoal}
              onChange={(e) => setCallGoal(e.target.value)}
            ></textarea>
          </div>

          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-xl">
            <p className="text-xs font-bold text-gray-300 mb-1 flex items-center gap-1"><FileText size={14}/> Knowledge Base / PDF Data</p>
            <p className="text-[10px] text-gray-500">AI will automatically use the business description and rules saved in your <b>Settings</b> & <b>AI Agent</b> knowledge base during this call.</p>
          </div>
        </div>

        {/* COLUMN 2: Live Dialer Console */}
        <div className="bg-[#111] border border-gray-800 rounded-3xl shadow-2xl flex flex-col items-center justify-start relative overflow-hidden lg:h-auto border-t-4 border-t-green-500 p-6">
          <div className="absolute top-0 w-full h-full bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none"></div>
          
          {/* Call Mode Tabs */}
          <div className="w-full flex bg-[#1a1a1a] rounded-lg p-1 border border-gray-800 mb-6 z-10">
             <button onClick={() => setCallMode('web')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex justify-center items-center gap-1 ${callMode === 'web' ? 'bg-green-600/20 text-green-400 border border-green-500/30 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}><Mic size={14}/> Web Call (Free)</button>
             <button onClick={() => setCallMode('phone')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex justify-center items-center gap-1 ${callMode === 'phone' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}><Smartphone size={14}/> Real Phone Call</button>
          </div>

          <div className="absolute top-4 right-4 z-10 text-right">
            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Credits Left</p>
            <p className="text-sm font-black text-purple-400">{aiCredits}</p>
          </div>

          <div className="text-center z-10 w-full max-w-sm">
            <h2 className={`text-lg font-bold mb-2 transition-colors ${isCalling ? 'text-green-400 animate-pulse' : 'text-white'}`}>{status}</h2>
            
            {/* 🚀 TIMER & RECORDING INDICATOR */}
            <div className="flex items-center justify-center gap-4 mb-6 h-6">
               {isCalling && (
                 <>
                   <span className="flex items-center gap-1 text-sm font-bold text-gray-300 bg-gray-800 px-3 py-1 rounded-full border border-gray-700"><Clock size={14}/> {formatDuration(duration)}</span>
                   <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/30 uppercase tracking-widest animate-pulse"><Radio size={12}/> Rec</span>
                 </>
               )}
            </div>
            
            <div className={`mx-auto w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${isCalling ? 'bg-green-500/20 border-4 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.4)]' : 'bg-[#1a1a1a] border-4 border-gray-700 shadow-xl'}`}>
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isCalling ? 'bg-green-500 animate-pulse' : 'bg-gray-800'}`}>
                {isCalling ? <Volume2 size={32} className="text-white" /> : <Bot size={32} className="text-gray-400" />}
              </div>
            </div>

            {/* 🚀 CRM LEAD SEARCH DROPDOWN */}
            <div className="relative mb-6 text-left">
              <div className="flex justify-between items-center mb-1">
                 <label className="text-xs font-bold text-gray-400 flex items-center gap-1"><Database size={12}/> Target Lead (CRM)</label>
                 {callMode === 'phone' && <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">Cost: ₹0.30/min</span>}
              </div>
              <input 
                type="text" 
                value={targetNumber}
                onChange={(e) => { setTargetNumber(e.target.value); setShowLeadDropdown(true); }}
                onFocus={() => setShowLeadDropdown(true)}
                onBlur={() => setTimeout(() => setShowLeadDropdown(false), 200)}
                placeholder="Search Name or Number..." 
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white text-center focus:border-green-500 outline-none shadow-inner"
                disabled={isCalling}
              />
              
              {/* Dropdown Results */}
              {showLeadDropdown && crmLeads.length > 0 && (
                 <div className="absolute z-50 w-full mt-2 bg-[#1a1a1a] border border-gray-700 rounded-xl max-h-48 overflow-y-auto shadow-2xl custom-scrollbar text-left divide-y divide-gray-800">
                   {crmLeads.filter(l => (l.name || '').toLowerCase().includes(targetNumber.toLowerCase()) || (l.phoneNumber || '').includes(targetNumber)).map(lead => (
                     <div key={lead._id} className="p-3 hover:bg-gray-800 cursor-pointer transition-colors" onClick={() => setTargetNumber(lead.phoneNumber)}>
                       <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-bold text-white">{lead.name || 'Unknown'}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${lead.status === 'hot' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400'}`}>{lead.status}</span>
                       </div>
                       <p className="text-xs text-gray-500">{lead.phoneNumber} • {lead.source || 'CRM'}</p>
                     </div>
                   ))}
                 </div>
              )}
            </div>
            
            {!isCalling ? (
              <button onClick={startCall} className={`w-full flex items-center justify-center gap-3 text-white py-4 rounded-xl font-bold transition-transform hover:scale-105 active:scale-95 shadow-lg ${callMode === 'web' ? 'bg-green-600 hover:bg-green-500 shadow-green-600/30' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'}`}>
                <Phone size={20} /> {callMode === 'web' ? 'Start Free Web Call' : 'Dial to Real Phone'}
              </button>
            ) : (
              <button onClick={() => endCall()} className="w-full flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-xl font-bold transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-rose-600/30">
                <PhoneOff size={20} /> End Call
              </button>
            )}
          </div>
        </div>

        {/* COLUMN 3: Live Transcripts & Logs */}
        <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-3xl flex flex-col relative">
          <h3 className="font-bold text-white flex items-center gap-2 text-lg border-b border-gray-800 pb-4 mb-4">
            <History size={20} className="text-purple-400"/> Live Call Transcripts
          </h3>
          
          <div className="flex-1 bg-[#111] rounded-xl p-4 overflow-y-auto font-mono text-sm space-y-3 border border-gray-800 min-h-[250px] mb-4">
            {logs.length === 0 ? (
               <div className="text-center text-gray-600 flex flex-col items-center justify-center h-full">
                 <Activity size={32} className="mb-2 opacity-20" />
                 <p>Call logs will appear here</p>
               </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="flex flex-col gap-1 border-b border-gray-800/50 pb-2 last:border-0 animate-fade-in">
                  <span className="text-[10px] text-gray-500">{log.time}</span> 
                  <span className="text-green-400 leading-snug">{log.text}</span>
                </div>
              ))
            )}
          </div>
          
          {/* Post-Call CRM Update Simulation */}
          <div className="bg-[#111] border border-blue-500/30 p-4 rounded-xl shadow-inner">
            <h4 className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider">Post-Call CRM Results</h4>
            {crmResult ? (
              <div className="text-xs text-gray-300 space-y-1 animate-fade-in">
                <p><strong className="text-gray-400">Summary:</strong> {crmResult.summary}</p>
                <p><strong className="text-gray-400">Action:</strong> <span className="text-green-400">{crmResult.actionTaken}</span></p>
              </div>
            ) : (
              <p className="text-xs text-gray-600 italic">Call results, summaries, and extracted data will appear here after the call ends.</p>
            )}
          </div>
        </div>
      </div>
      
      {/* AI Assistant available here too to build scripts */}
      <DashboardAIAssistant />
    </div>
  );
}