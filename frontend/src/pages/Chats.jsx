import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';

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
        // const { data } = await api.get('/chats');
        // setAllMessages(data);
        
        // Using mock data for now
        const mockData = [
          { _id: 1, customerPhone: '+919876543210', direction: 'incoming', messageText: 'Hello, I want to buy your premium plan.', sentBy: 'customer', timestamp: new Date().toISOString() },
          { _id: 2, customerPhone: '+919876543210', direction: 'outgoing', messageText: 'Sure! Let me check that for you.', sentBy: 'ai', timestamp: new Date().toISOString() },
          { _id: 3, customerPhone: '+911234567890', direction: 'incoming', messageText: 'What is the price?', sentBy: 'customer', timestamp: new Date().toISOString() },
        ];
        setAllMessages(mockData);
        if (mockData.length > 0) {
          setActiveCustomer(mockData[0].customerPhone);
        }

      } catch (error) {
        console.error("Failed to fetch chats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, []);

  const customerList = useMemo(() => {
    const customers = new Set(allMessages.map(m => m.customerPhone));
    return Array.from(customers);
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
      // Real API call to backend chatController
      await api.post('/chats/send', { customerPhone: activeCustomer, messageText: replyText });
    } catch (error) {
        console.error("Failed to send message", error);
        // Optional: handle error, e.g., remove the optimistic message
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
          customerList.map(phone => (
            <div 
              key={phone}
              onClick={() => setActiveCustomer(phone)}
              className={`p-4 cursor-pointer rounded-xl font-medium mb-2 transition-colors ${activeCustomer === phone ? 'bg-green-600/20 border border-green-500 text-green-400' : 'bg-[#0a0a0a] border border-gray-800 hover:bg-gray-800'}`}
            >
              {phone}
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