import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Chats() {
  const [allMessages, setAllMessages] = useState([]);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatSource, setNewChatSource] = useState('Manual Entry');

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/chats');
        const messages = Array.isArray(data) ? data : data.data || [];
        setAllMessages(messages);
        if (messages.length > 0) {
          setActiveCustomer(messages[0].customerPhone);
        }

      } catch (error) {
        console.error("Failed to fetch chats", error);
        toast.error("Failed to load chats data");
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  // Advanced logic to calculate 24-Hour Window and Needs Reply status
  const customerDetails = useMemo(() => {
    const map = new Map();

    allMessages.forEach(msg => {
      const phone = msg.customerPhone;
      if (!map.has(phone)) {
        map.set(phone, { phone, lastIncoming: null, lastMessage: msg, needsReply: false });
      }

      const data = map.get(phone);
      // Track the latest message overall
      if (new Date(msg.timestamp || msg.createdAt) > new Date(data.lastMessage.timestamp || data.lastMessage.createdAt)) {
        data.lastMessage = msg;
      }
      // Track the latest INCOMING message to calculate 24-hour window
      if (msg.direction === 'incoming') {
        if (!data.lastIncoming || new Date(msg.timestamp || msg.createdAt) > new Date(data.lastIncoming.timestamp || data.lastIncoming.createdAt)) {
          data.lastIncoming = msg;
        }
      }
    });

    return Array.from(map.values()).map(data => {
      let windowOpen = false;
      let timeLeft = "";
      if (data.lastIncoming) {
        const diffHours = (new Date() - new Date(data.lastIncoming.timestamp || data.lastIncoming.createdAt)) / (1000 * 60 * 60);
        if (diffHours <= 24) {
          windowOpen = true;
          timeLeft = `${Math.floor(24 - diffHours)}h ${Math.floor((24 - diffHours) * 60 % 60)}m`;
        }
      }
      return { ...data, windowOpen, timeLeft, needsReply: data.lastMessage.direction === 'incoming' };
    }).sort((a, b) => new Date(b.lastMessage.timestamp || b.lastMessage.createdAt) - new Date(a.lastMessage.timestamp || a.lastMessage.createdAt));
  }, [allMessages]);

  const activeChatMessages = useMemo(() => {
    return allMessages.filter(m => m.customerPhone === activeCustomer);
  }, [allMessages, activeCustomer]);

  // Start a manual chat by entering a new number
  const handleStartChatSubmit = (e) => {
    e.preventDefault();
    if (!newChatPhone) return;
    
    let validPhone = newChatPhone.startsWith('+') ? newChatPhone : '+' + newChatPhone;
    setActiveCustomer(validPhone);
    
    const isExisting = allMessages.some(m => m.customerPhone === validPhone);
    if (!isExisting) {
      const initMsg = { _id: Date.now(), customerPhone: validPhone, direction: 'system', messageText: `Chat started with ${newChatName || validPhone} (Source: ${newChatSource})`, sentBy: 'system', timestamp: new Date().toISOString() };
      setAllMessages(prev => [initMsg, ...prev]);
    }
    
    setIsModalOpen(false);
    setNewChatPhone('');
    setNewChatName('');
    setNewChatSource('Manual Entry');
  };

  const sendReply = async () => {
    if (!replyText.trim() || !activeCustomer) return;

    const newMessage = {
      _id: Date.now(),
      customerPhone: activeCustomer,
      direction: 'outgoing',
      messageText: replyText,
      sentBy: 'staff',
      timestamp: new Date().toISOString()
    };

    // Optimistic UI update
    setAllMessages(prev => [...prev, newMessage]);
    setReplyText("");

    try {
      const res = await api.post('/chats/send', { customerPhone: activeCustomer, messageText: replyText });
      
      // Update optimistic message with real DB ID if backend returns it
      if (res.data?.message) {
        setAllMessages(prev => prev.map(m => m._id === newMessage._id ? res.data.message : m));
      }
    } catch (error) {
      console.error("Failed to send message", error);
        toast.error(error.response?.data?.message || "Failed to send message");
      // Remove the optimistic message if API fails
      setAllMessages(prev => prev.filter(m => m._id !== newMessage._id));
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] p-6 bg-[#050505] text-gray-200">
      
      {/* New Chat Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl">✕</button>
            <h2 className="text-2xl font-bold text-white mb-6">Start New Chat</h2>
            <form onSubmit={handleStartChatSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">WhatsApp Number <span className="text-red-500">*</span></label>
                <input type="text" required value={newChatPhone} onChange={e => setNewChatPhone(e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="+919876543210" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Customer Name (Optional)</label>
                <input type="text" value={newChatName} onChange={e => setNewChatName(e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="e.g. Rahul Sharma" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Lead Source</label>
                <select value={newChatSource} onChange={e => setNewChatSource(e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none">
                  <option value="Manual Entry">Manual Entry</option>
                  <option value="Just Dial / Indiamart">Just Dial / Indiamart</option>
                  <option value="Walk-in Customer">Walk-in Customer</option>
                  <option value="Website Form">Website Form</option>
                </select>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors">Start Chat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar for Customers */}
      <div className="w-1/3 bg-[#111] border-r border-gray-800 rounded-l-2xl p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4 mt-2">
          <h2 className="text-xl font-bold">Active Chats</h2>
          <button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-500 text-white text-sm px-3 py-1.5 rounded-lg font-bold transition-colors">+ New Chat</button>
        </div>
        {loading ? <p>Loading chats...</p> : (
          customerDetails.map(customer => (
            <div 
              key={customer.phone}
              onClick={() => setActiveCustomer(customer.phone)}
              className={`p-4 cursor-pointer rounded-xl mb-3 transition-all border ${activeCustomer === customer.phone ? 'bg-green-600/10 border-green-500' : 'bg-[#0a0a0a] border-gray-800 hover:border-gray-600'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`font-bold ${activeCustomer === customer.phone ? 'text-green-400' : 'text-gray-200'}`}>{customer.phone}</span>
                {customer.needsReply && <span className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.8)]" title="Needs Reply"></span>}
              </div>
              
              <div className="flex items-center gap-2">
                {customer.windowOpen ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">🟢 {customer.timeLeft} left</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">🔴 Window Closed</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] border border-gray-800 border-l-0 rounded-r-2xl shadow-xl relative">
        
        {!activeCustomer ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <p className="text-6xl mb-4">💬</p>
            <h3 className="text-2xl font-bold text-white mb-2">No Chat Selected</h3>
            <p>Select a chat from the sidebar or click "+ New Chat" to start messaging.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeChatMessages.map(msg => (
                <div key={msg._id} className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 max-w-sm rounded-2xl ${msg.direction === 'outgoing' ? 'bg-green-600 text-white rounded-br-sm' : 'bg-[#1a1a1a] border border-gray-800 text-gray-200 rounded-bl-sm'}`}>
                    <p>{msg.messageText}</p>
                    <span className="text-xs opacity-75 mt-1 block capitalize">Sent by: {msg.sentBy}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Active Customer Status Warning */}
            {(() => {
               const currentData = customerDetails.find(c => c.phone === activeCustomer);
               if (currentData && !currentData.windowOpen) {
                 return (
                   <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
                     ⚠️ 24-Hour window closed. Normal messages might fail. Please use Meta Templates to initiate contact.
                   </div>
                 )
               }
               return null;
            })()}

            <div className="p-4 bg-[#111] border-t border-gray-800 rounded-br-2xl flex items-center gap-3">
              <button disabled={!activeCustomer} className="p-3 text-gray-400 hover:text-white bg-[#0a0a0a] border border-gray-700 rounded-xl transition-colors disabled:opacity-50" title="Send Approved Template">
                📄
              </button>
              <button disabled={!activeCustomer} className="p-3 text-gray-400 hover:text-white bg-[#0a0a0a] border border-gray-700 rounded-xl transition-colors disabled:opacity-50" title="Attach Image or Document">
                📎
              </button>
          <input 
            type="text" 
            value={replyText} 
            onChange={e => setReplyText(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && sendReply()}
                placeholder="Type a message or paste a link..." 
            className="flex-1 p-3 bg-[#0a0a0a] border border-gray-700 text-white rounded-xl focus:border-green-500 outline-none" 
            disabled={!activeCustomer}
          />
              <button onClick={sendReply} disabled={!activeCustomer || !replyText.trim()} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Send 🚀</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}