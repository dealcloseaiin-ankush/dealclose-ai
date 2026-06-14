import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Phone, PhoneOff, Mic, Activity } from 'lucide-react';

export default function Calls() {
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState("Ready to Call");
  const [logs, setLogs] = useState([]);
  
  const wsRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);

  const addLog = (msg) => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: msg }]);
  };

  const startCall = async () => {
    try {
      setStatus("Connecting to AI...");
      addLog("Initializing Audio & WebSocket...");
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = import.meta.env.MODE === 'development' 
        ? 'ws://localhost:5000/api/webhooks/mobile/stream' 
        : `${protocol}//${window.location.host}/api/webhooks/mobile/stream`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setStatus("Connected! Speak now...");
        addLog("Connected to Server. Requesting Mic access...");
        setIsCalling(true);
        
        ws.send(JSON.stringify({ event: 'start' }));

        // 🎤 1. GET MICROPHONE ACCESS
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    <div className="min-h-screen p-8 bg-[#050505] text-gray-200">
      <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-2">Web AI Calling (Test Mode)</h1>
      <p className="text-gray-400 mb-8">Test your AI Voice Assistant directly from your browser before launching the Android App.</p>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center flex-1">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${isCalling ? 'bg-green-500/20 border-4 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-gray-800 border-4 border-gray-700'}`}>
            {isCalling ? <Activity size={50} className="text-green-500" /> : <Mic size={50} className="text-gray-500" />}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{status}</h2>
          <p className="text-sm text-gray-400 text-center mb-8 max-w-xs">Make sure you have added your Deepgram API Key and Gemini API Key in the backend `.env` file.</p>
          
          {!isCalling ? (
            <button onClick={startCall} className="flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-green-600/30"><Phone size={24} /> Start Test Call</button>
          ) : (
            <button onClick={() => endCall()} className="flex items-center gap-3 bg-rose-600 hover:bg-rose-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-rose-600/30"><PhoneOff size={24} /> End Call</button>
          )}
        </div>

        <div className="bg-[#0a0a0a] border border-gray-800 p-6 rounded-3xl flex-1 flex flex-col">
          <h3 className="font-bold text-gray-300 mb-4 uppercase tracking-wider text-sm">System Logs</h3>
          <div className="flex-1 bg-black rounded-xl p-4 overflow-y-auto font-mono text-xs text-green-400 space-y-2 border border-gray-900 min-h-[300px]">
            {logs.map((log, i) => <div key={i}><span className="text-gray-600">[{log.time}]</span> {log.text}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}