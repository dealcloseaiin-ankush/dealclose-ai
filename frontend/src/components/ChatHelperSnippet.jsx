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
  return (
    <div className={`p-3 max-w-sm rounded-xl mb-2 ${message.direction === 'outgoing' ? 'bg-blue-100 ml-auto' : 'bg-gray-100 mr-auto'}`}>
      {/* SHOW AI BADGE IF MESSAGE WAS SENT BY AI */}
      {message.sentBy === 'ai' && (
        <div className="text-[10px] font-bold text-purple-600 mb-1 flex items-center gap-1">
          <span>🤖 AI Replied</span>
        </div>
      )}
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.messageText}</p>
    </div>
  );
}