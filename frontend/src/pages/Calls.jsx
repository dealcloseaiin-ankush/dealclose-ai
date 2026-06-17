import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Phone, PhoneOff, Mic, Settings, PlayCircle, History, Bot, Volume2 } from 'lucide-react';

export default function Calls() {
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState("Ready to Call");
  const [logs, setLogs] = useState([]);
  
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);

  const addLog = (msg) => {
    setLogs(prev => [...prev, { 
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}), 
      text: msg 
    }]);
  };

  const startCall = async () => {
    try {
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
        
        ws.send(JSON.stringify({ event: 'start' }));

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
    if (wsRef.current) { wsRef.current.send(JSON.stringify({ event: 'stop' })); wsRef.current.close(); wsRef.current = null; }
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    setIsCalling(false);
    setStatus(reason);
    addLog(reason);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 bg-[#050505] text-gray-200 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-2">
          AI Voice Studio
        </h1>
        <p className="text-gray-400">Configure and test your AI Voice Assistant before deploying it to real customers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        
        {/* COLUMN 1: Agent Configuration */}
        <div className="bg-[#111] border border-gray-800 p-6 rounded-3xl shadow-xl flex flex-col gap-6">
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
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">AI Voice Model</label>
            <select className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none cursor-pointer">
              <option>Aura Asteria (Female - US English)</option>
              <option>Aura Orion (Male - US English)</option>
              <option>Aura Luna (Female - Soft Accent)</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">System Instructions (Prompt)</label>
            <textarea 
              className="w-full h-32 bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none resize-none text-sm"
              defaultValue="You are the AI assistant for DealClose. Your goal is to answer questions politely and try to capture the user's email address."
            ></textarea>
          </div>
        </div>

        {/* COLUMN 2: Live Dialer Console */}
        <div className="bg-[#111] border border-gray-800 rounded-3xl shadow-xl flex flex-col items-center justify-center relative overflow-hidden h-[500px] lg:h-auto border-t-4 border-t-green-500">
          <div className="absolute top-0 w-full h-full bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none"></div>
          
          <div className="text-center z-10">
            <h2 className={`text-xl font-bold mb-8 transition-colors ${isCalling ? 'text-green-400' : 'text-white'}`}>{status}</h2>
            
            <div className={`mx-auto w-40 h-40 rounded-full flex items-center justify-center mb-10 transition-all duration-500 ${isCalling ? 'bg-green-500/20 border-4 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.4)]' : 'bg-[#1a1a1a] border-4 border-gray-700 shadow-xl'}`}>
              <div className={`w-28 h-28 rounded-full flex items-center justify-center ${isCalling ? 'bg-green-500 animate-pulse' : 'bg-gray-800'}`}>
                {isCalling ? <Volume2 size={40} className="text-white" /> : <Bot size={40} className="text-gray-400" />}
              </div>
            </div>
            
            {!isCalling ? (
              <button onClick={startCall} className="mx-auto flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white px-10 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-green-600/30">
                <Phone size={24} /> Connect to AI
              </button>
            ) : (
              <button onClick={() => endCall()} className="mx-auto flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-500 text-white px-10 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-rose-600/30">
                <PhoneOff size={24} /> End Session
              </button>
            )}
          </div>
        </div>

        {/* COLUMN 3: Live Transcripts & Logs */}
        <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-3xl flex flex-col">
          <h3 className="font-bold text-white flex items-center gap-2 text-lg border-b border-gray-800 pb-4 mb-4">
            <History size={20} className="text-purple-400"/> Live Call Transcripts
          </h3>
          
          <div className="flex-1 bg-[#111] rounded-xl p-4 overflow-y-auto font-mono text-sm space-y-3 border border-gray-800 min-h-[300px]">
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
        </div>
      </div>
    </div>
  );
}