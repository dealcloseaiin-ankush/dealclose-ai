import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, Send, ChevronDown, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const DashboardAIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hi! Main aapka DealClose AI Onboarding Assistant hu. Main aapka pura business setup, auto-replies, aur WhatsApp templates configure kar sakta hu. Kaha se shuru karein?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleChat = () => setIsOpen(!isOpen);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const response = await axios.post(`${apiUrl}/api/ai/dashboard-assistant`, 
        { message: userMessage.content },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = response.data;

      if (data.success) {
        setMessages((prev) => [...prev, { role: 'ai', content: data.reply }]);
        // Agar AI ne koi action liya hai, toh user ko batao
        if (data.actionTaken) {
          toast.success('AI has updated your settings!', { icon: '🤖' });
        }
      } else {
        const errorMessage = data.reply || data.message || 'Oops! Something went wrong.';
        setMessages((prev) => [...prev, { role: 'ai', content: errorMessage }]);
      }
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMessage = error.response?.data?.reply || error.response?.data?.message || 'Network error. Please try again.';
      setMessages((prev) => [...prev, { role: 'ai', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 sm:w-96 overflow-hidden flex flex-col mb-4 transition-all duration-300 animate-fade-in-up" style={{ height: '500px' }}>
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <Bot size={24} />
              <div>
                <h3 className="font-bold text-sm">DealClose AI</h3>
                <p className="text-xs text-blue-100">Setup Assistant</p>
              </div>
            </div>
            <button onClick={toggleChat} className="text-blue-100 hover:text-white transition-colors p-1 hover:bg-white/20 rounded-md">
              <ChevronDown size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                  {msg.content.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm text-gray-500 text-sm flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100">
            <form onSubmit={sendMessage} className="flex gap-2 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-gray-100 text-gray-900 text-sm rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button 
        onClick={toggleChat} 
        className="bg-blue-600 hover:bg-blue-700 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all duration-300"
      >
        {isOpen ? <X size={28} /> : <span className="text-3xl">✨</span>}
      </button>
    </div>
  );
};

export default DashboardAIAssistant;