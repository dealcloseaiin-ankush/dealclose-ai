import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Search } from 'lucide-react';

export default function Chats() {
  const [allMessages, setAllMessages] = useState([]);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');
  const [platformFilter, setPlatformFilter] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatSource, setNewChatSource] = useState('Manual Entry');
  const [sendAutoOffer, setSendAutoOffer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      try {
        const profileRes = await api.get('/users/profile').catch(() => null);
        const u = profileRes?.data?.user || profileRes?.data;
        if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);

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

  // 🔥 Filter messages by selected Workspace
  const filteredMessages = useMemo(() => {
    return allMessages.filter(msg => {
      const ws = msg.workspaceId || 'main';
      // Bring back older messages that were saved as 'default'
      const matchesWorkspace = activeWorkspace === 'main' ? (ws === 'main' || ws === 'default') : ws === activeWorkspace;
      const matchesPlatform = platformFilter === 'all' || msg.platform === platformFilter;
      return matchesWorkspace && matchesPlatform;
    });
  }, [allMessages, activeWorkspace, platformFilter]);

  // Advanced logic to calculate 24-Hour Window, Needs Reply status, and Name/City
  const customerDetails = useMemo(() => {
    const map = new Map();

    filteredMessages.forEach(msg => {
      const phone = msg.customerPhone;
      if (!map.has(phone)) {
        map.set(phone, { 
          phone, 
          name: msg.customerName || 'Unknown', 
          city: msg.customerCity || '', 
          lastIncoming: null, 
          lastMessage: msg, 
          needsReply: false 
        });
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

    let finalDetails = Array.from(map.values()).map(data => {
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
    
    // Search Filter Logic
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      finalDetails = finalDetails.filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term) || c.city.toLowerCase().includes(term) || (c.lastMessage && new Date(c.lastMessage.timestamp || c.lastMessage.createdAt).toLocaleDateString().toLowerCase().includes(term)));
    }
    return finalDetails;
  }, [filteredMessages, searchTerm]);

  const activeChatMessages = useMemo(() => {
    return filteredMessages.filter(m => m.customerPhone === activeCustomer);
  }, [filteredMessages, activeCustomer]);

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
    
    if (sendAutoOffer) {
      setTimeout(() => {
        setReplyText("Thank you for connecting with us! 🙏\n\n⭐ Please leave us a 5-star review: [Your Link]\n📸 Follow us on Instagram: [Your Link]\n▶️ Subscribe on YouTube: [Your Link]\n\n🎁 *Special Offer:* Use code *WELCOME10* on your next order to get 10% OFF!");
      }, 100);
    }
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
    <div className="flex h-[calc(100vh-4rem)] p-0 md:p-6 bg-[#050505] text-gray-200 relative overflow-hidden">
      
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
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer mt-2">
                  <input type="checkbox" checked={sendAutoOffer} onChange={e => setSendAutoOffer(e.target.checked)} className="w-4 h-4 accent-green-500 rounded" />
                  Load Rating & Discount Offer message
                </label>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors">Start Chat</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/70 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar for Customers */}
      <div className={`absolute md:relative z-40 w-4/5 md:w-1/3 h-full bg-[#111] border-r border-gray-800 md:rounded-l-2xl p-4 overflow-y-auto transition-transform duration-300 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4 mt-2">
          <h2 className="text-xl font-bold">Active Chats</h2>
          <button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-500 text-white text-sm px-3 py-1.5 rounded-lg font-bold transition-colors">+ New Chat</button>
        </div>
        
        <select 
          value={activeWorkspace} 
          onChange={(e) => { setActiveWorkspace(e.target.value); setActiveCustomer(null); }} 
          className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-green-500 cursor-pointer mb-4"
        >
          {workspaces.map(ws => (
            <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
          ))}
        </select>

        <select 
          value={platformFilter} 
          onChange={(e) => { setPlatformFilter(e.target.value); setActiveCustomer(null); }} 
          className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-green-500 cursor-pointer mb-4"
        >
          <option value="all">💬 All Platforms</option>
          <option value="whatsapp">🟩 WhatsApp Messages</option>
          <option value="instagram_dm">🟪 Instagram DMs</option>
          <option value="instagram_comment">📸 Instagram Comments</option>
        </select>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input type="text" placeholder="Search name, phone, city..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
            className="w-full bg-[#0a0a0a] border border-gray-800 text-white text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:border-green-500" 
          />
        </div>

        {loading ? <p>Loading chats...</p> : (
          customerDetails.map(customer => (
            <div 
              key={customer.phone}
              onClick={() => { setActiveCustomer(customer.phone); setIsSidebarOpen(false); }}
              className={`p-4 cursor-pointer rounded-xl mb-3 transition-all border ${activeCustomer === customer.phone ? 'bg-green-600/10 border-green-500' : 'bg-[#0a0a0a] border-gray-800 hover:border-gray-600'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className={`font-bold text-sm ${activeCustomer === customer.phone ? 'text-green-400' : 'text-gray-200'}`}>
                    {customer.lastMessage?.platform === 'instagram_dm' ? '🟪 ' : customer.lastMessage?.platform === 'instagram_comment' ? '📸 ' : '🟩 '}
                    {customer.name}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">{customer.phone} {customer.city ? `• ${customer.city}` : ''}</div>
                </div>
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
      <div className="flex-1 flex flex-col w-full h-full bg-[#0a0a0a] md:border border-gray-800 md:border-l-0 md:rounded-r-2xl shadow-xl relative">
        
        {!activeCustomer ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 relative p-4 text-center">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden absolute top-4 left-4 bg-gray-800 text-white px-3 py-2 rounded-lg font-bold">☰ Chats</button>
            <p className="text-6xl mb-4">💬</p>
            <h3 className="text-2xl font-bold text-white mb-2">No Chat Selected</h3>
            <p>Select a chat from the sidebar or click "+ New Chat" to start messaging.</p>
          </div>
        ) : (
          <>
            {/* Active Customer Header */}
            <div className="p-4 border-b border-gray-800 bg-[#111] flex items-center gap-3 md:rounded-tr-2xl shrink-0">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-gray-800 text-white p-2 rounded-lg">
                ☰
              </button>
              <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold text-sm">{customerDetails.find(c => c.phone === activeCustomer)?.name?.charAt(0) || 'U'}</div>
              <h3 className="font-bold text-white truncate">{customerDetails.find(c => c.phone === activeCustomer)?.name || activeCustomer} <span className="text-xs text-gray-400 font-normal">({activeCustomer})</span></h3>
            </div>

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
              <button 
                onClick={() => setReplyText("Thank you for your visit! 🙏\n\n⭐ Please leave us a 5-star review: [Review Link]\n📸 Follow us on Instagram: [Instagram Link]\n▶️ Subscribe on YouTube: [YouTube Link]\n\n🎁 *Special Offer:* Use code *WELCOME10* on your next visit within 30 days to get 10% OFF!")}
                disabled={!activeCustomer} 
                className="p-3 text-yellow-500 hover:text-yellow-400 bg-[#0a0a0a] border border-gray-700 rounded-xl transition-colors disabled:opacity-50" 
                title="Load Rating & Discount Offer"
              >
                ⭐
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
              <button onClick={sendReply} disabled={!activeCustomer || !replyText.trim()} className="px-4 md:px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0">Send 🚀</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}