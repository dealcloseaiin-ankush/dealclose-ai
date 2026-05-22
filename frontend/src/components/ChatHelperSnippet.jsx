import React, { useState } from 'react';

// 💡 UI SNIPPET FOR CHAT HEADER (AI ON/OFF TOGGLE)
export function ChatHeaderToggle({ customerPhone, initialAiStatus = false }) {
  const [isAiPaused, setIsAiPaused] = useState(initialAiStatus);

  const toggleAi = async () => {
    const newState = !isAiPaused;
    setIsAiPaused(newState);
    
    // Call Backend API
    await fetch('/api/chats/toggle-ai', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ customerPhone, isAiPaused: newState })
    });
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div>
        <h2 className="font-bold text-lg">+{customerPhone}</h2>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 font-medium">Auto-Reply AI:</span>
        <button 
          onClick={toggleAi}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!isAiPaused ? 'bg-green-500' : 'bg-gray-300'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isAiPaused ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-xs font-bold">{!isAiPaused ? 'ON' : 'OFF (Human Only)'}</span>
      </div>
    </div>
  );
}

// 💡 UI SNIPPET FOR MESSAGE BUBBLE (AI BADGE)
export function MessageBubble({ message }) {
  // Format time (e.g. "10:30 AM")
  const timeStr = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Ticks for outgoing messages
  let StatusIcon = null;
  if (message.direction === 'outgoing') {
    if (message.status === 'read') {
      StatusIcon = <span className="text-blue-500 font-bold ml-1 text-[10px]">✓✓</span>;
    } else if (message.status === 'delivered') {
      StatusIcon = <span className="text-gray-400 font-bold ml-1 text-[10px]">✓✓</span>;
    } else if (message.status === 'failed') {
      StatusIcon = <span className="text-red-500 font-bold ml-1 text-[10px]">⚠️</span>;
    } else {
      // sent
      StatusIcon = <span className="text-gray-400 font-bold ml-1 text-[10px]">✓</span>;
    }
  }

  return (
    <div className={`p-3 max-w-sm rounded-xl mb-2 flex flex-col shadow-sm ${message.direction === 'outgoing' ? 'bg-[#dcf8c6] ml-auto rounded-tr-none' : 'bg-white mr-auto rounded-tl-none border border-gray-100'}`}>
      {/* SHOW AI BADGE IF MESSAGE WAS SENT BY AI */}
      {message.sentBy === 'ai' && (
        <div className="text-[10px] font-bold text-purple-600 mb-1 flex items-center gap-1">
          <span>🤖 AI Replied</span>
        </div>
      )}
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.messageText}</p>
      <div className="text-[10px] text-gray-500 mt-1 self-end flex items-center gap-1">
        {timeStr} {StatusIcon}
      </div>
    </div>
  );
}