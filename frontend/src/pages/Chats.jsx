import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth'; 
import { Search, Camera, MessageSquare, MessageCircle, Check, CheckCheck, Trash2, MapPin, CornerDownLeft, X } from 'lucide-react';
import DashboardAIAssistant from '../components/DashboardAIAssistant';

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
  // 🚀 NEW: State for replying to a specific message
  const [replyingTo, setReplyingTo] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  // 🚀 FIX: Real useRef (persists across renders, doesn't retrigger effects)
  const allMessagesRef = useRef([]);

  useEffect(() => {
    let isFirstLoad = true;
    let isMounted = true;

    const playNotificationSound = () => {
      try {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.play().catch(err => console.log('Audio autoplay blocked', err));
      } catch (error) {
        console.debug('Audio initialization failed', error);
      }
    };

    const fetchChats = async () => {
      if (isFirstLoad) setLoading(true);
      try {
        if (isFirstLoad) {
          const profileRes = await api.get('/users/profile').catch(() => null); // 🚀 NEW: Fetch profile to get workspaces
          const u = profileRes?.data?.user || profileRes?.data;
          if (u && isMounted) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
        }

        const { data } = await api.get('/chats');
        const messages = Array.isArray(data) ? data : data.data || [];

        if (!isMounted) return;

        // 🚀 FIX: Compare against ref (always fresh, never stale, never causes re-run)
        const currentMessages = allMessagesRef.current;
        if (!isFirstLoad && messages.length > currentMessages.length) {
          const existingIds = new Set(currentMessages.map(m => m._id));
          const newIncomingMessages = messages.filter(m => !existingIds.has(m._id) && m.direction === 'incoming');
          if (newIncomingMessages.length > 0) {
            playNotificationSound();
          }
        }

        setAllMessages(messages);
        allMessagesRef.current = messages; // keep ref in sync with latest fetched data

      } catch (error) {
        console.error("Failed to fetch chats", error);
      } finally {
        if (isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };
    
    fetchChats();
    const intervalId = setInterval(fetchChats, 4000); // 🚀 Auto-refresh silently every 4 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []); // 🚀 FIX: empty deps — runs once on mount. No more restart/blink on every message change

  // 🔥 Filter messages by selected Workspace
  const filteredMessages = useMemo(() => {
    const filtered = allMessages.filter(msg => {
      const ws = msg.workspaceId || 'main';
      // Bring back older messages that were saved as 'default'
      const matchesWorkspace = activeWorkspace === 'main' ? (ws === 'main' || ws === 'default') : ws === activeWorkspace;
      const matchesPlatform = platformFilter === 'all' || msg.platform === platformFilter;
      return matchesWorkspace && matchesPlatform;
    });
    return filtered;
  }, [allMessages, activeWorkspace, platformFilter]);

  // Advanced logic to calculate 24-Hour Window, Needs Reply status, and Name/City
  const customerDetails = useMemo(() => {
    const map = new Map();

    filteredMessages.forEach(msg => {
      const phone = msg.customerPhone;
      if (!phone) return; // Prevent crashes on corrupt data
      
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
      
      // SAFE DATE PARSING (Prevents 'Invalid Date' crashes)
      const msgDate = new Date(msg.timestamp || msg.createdAt || 0).getTime();
      const lastMsgDate = new Date(data.lastMessage.timestamp || data.lastMessage.createdAt || 0).getTime();
      
      // Track the latest message overall
      if (!isNaN(msgDate) && !isNaN(lastMsgDate) && msgDate > lastMsgDate) {
        data.lastMessage = msg;
      }
      // Track the latest INCOMING message to calculate 24-hour window
      if (msg.direction === 'incoming') {
        const lastIncDate = data.lastIncoming ? new Date(data.lastIncoming.timestamp || data.lastIncoming.createdAt || 0).getTime() : 0;
        if (!data.lastIncoming || (!isNaN(msgDate) && msgDate > lastIncDate)) {
          data.lastIncoming = msg;
        }
      }
    });

    let finalDetails = Array.from(map.values()).map(data => {
      let windowOpen = false;
      let timeLeft = "";
      if (data.lastIncoming) {
        const incTime = new Date(data.lastIncoming.timestamp || data.lastIncoming.createdAt || 0).getTime();
        if (!isNaN(incTime)) {
           const diffHours = (new Date().getTime() - incTime) / (1000 * 60 * 60);
           if (diffHours <= 24) {
             windowOpen = true;
             timeLeft = `${Math.floor(24 - diffHours)}h ${Math.floor((24 - diffHours) * 60 % 60)}m`;
           }
        }
      }
      // Show blue dot for all unreplied messages permanently, regardless of 24h window
      return { ...data, windowOpen, timeLeft, needsReply: data.lastMessage.direction === 'incoming' };
    }).sort((a, b) => {
       // SAFE NUMERIC SORTING (Ignores NaNs)
       const dateA = new Date(a.lastMessage.timestamp || a.lastMessage.createdAt || 0).getTime();
       const dateB = new Date(b.lastMessage.timestamp || b.lastMessage.createdAt || 0).getTime();
       return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });
    
    // Search Filter Logic
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      finalDetails = finalDetails.filter(c => 
        (c.name && c.name.toLowerCase().includes(term)) || 
        (c.phone && c.phone.includes(term)) || 
        (c.city && c.city.toLowerCase().includes(term))
      );
    }
    return finalDetails;
  }, [filteredMessages, searchTerm]);

  // 🔥 Auto-select the first chat if none is active
  useEffect(() => {
    if (!activeCustomer && customerDetails.length > 0) {
      setActiveCustomer(customerDetails[0].phone);
    }
  }, [customerDetails, activeCustomer]);

  // Chat sorting ascending (oldest to newest)
  const activeChatMessages = useMemo(() => {
    return filteredMessages
      .filter(m => m.customerPhone === activeCustomer)
      .sort((a, b) => new Date(a.timestamp || a.createdAt || 0) - new Date(b.timestamp || b.createdAt || 0));
  }, [filteredMessages, activeCustomer]);

  // Auto scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages]);

  // Start a manual chat by entering a new number
  const handleStartChatSubmit = (e) => {
    e.preventDefault();
    if (!newChatPhone) return;
    
    let validPhone = newChatPhone.startsWith('+') ? newChatPhone : '+' + newChatPhone;
    setActiveCustomer(validPhone);
    
    const isExisting = allMessages.some(m => m.customerPhone === validPhone);
    if (!isExisting) {
      const initMsg = { _id: Date.now(), customerPhone: validPhone, direction: 'system', messageText: `Chat started with ${newChatName || validPhone} (Source: ${newChatSource})`, sentBy: 'system', timestamp: new Date().toISOString() };
      setAllMessages(prev => {
        const updated = [initMsg, ...prev];
        allMessagesRef.current = updated; // 🚀 keep ref in sync
        return updated;
      });
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
    setAllMessages(prev => {
      const updated = [...prev, newMessage];
      allMessagesRef.current = updated; // 🚀 keep ref in sync so next poll doesn't think this is "new"
      return updated;
    });
    setReplyText("");
    setReplyingTo(null);

    try {
      const payload = { 
        customerPhone: activeCustomer, 
        messageText: replyText,
        repliedToMessageId: replyingTo?._id 
      };
      const res = await api.post('/chats/send', payload);
      
      // Update optimistic message with real DB ID from backend
      if (res.data?.message) {
        setAllMessages(prev => {
          const updated = prev.map(m => m._id === newMessage._id ? res.data.message : m);
          allMessagesRef.current = updated; // 🚀 keep ref in sync
          return updated;
        });
      }
    } catch (error) {
      console.error("Failed to send message", error);
      toast.error(error.response?.data?.message || "Failed to send message");
      // Remove the optimistic message if API fails
      setAllMessages(prev => {
        const updated = prev.filter(m => m._id !== newMessage._id);
        allMessagesRef.current = updated; // 🚀 keep ref in sync
        return updated;
      });
    }
  };

  // Delete a single message
  const deleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message? This cannot be undone.")) return;

    // Optimistic UI update
    setAllMessages(prev => {
      const updated = prev.filter(m => m._id !== messageId);
      allMessagesRef.current = updated; // 🚀 keep ref in sync
      return updated;
    });

    try {
      await api.delete(`/chats/${messageId}`);
      toast.success("Message deleted.");
    } catch {
      toast.error("Failed to delete message.");
      // Re-fetch to revert UI state on failure
      const { data } = await api.get('/chats');
      const messages = Array.isArray(data) ? data : data.data || [];
      setAllMessages(messages);
      allMessagesRef.current = messages; // 🚀 keep ref in sync
    }
  };

  // Send current location
  const sendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setReplyText(`Here is my current location: https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`);
      });
    } else { toast.error("Geolocation is not supported by this browser."); }
  };

  // Format Time (e.g., 10:30 AM)
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format Date Badge (e.g., Today, Yesterday, 12 Oct 2023)
  const formatDateBadge = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format Sender Badges
  const formatSender = (sentBy, direction) => {
    if (sentBy === 'ai') return '🤖 AI Agent';
    if (sentBy === 'auto-reply') return '⚡ Bot / Flow';
    if (sentBy === 'owner_app') return '📱 You (IG App)';
    if (sentBy === 'staff') return '💻 You (Dashboard)';
    if (sentBy === 'system') return '⚙️ System';
    if (direction === 'incoming') return '👤 Customer';
    return sentBy || 'Unknown';
  };
  
  // WhatsApp style message status
  const getMessageStatusIcon = (status) => {
    switch(status) {
      case 'sent': return <Check size={12} className="text-gray-400" />;
      case 'delivered': return <CheckCheck size={12} className="text-gray-400" />;
      case 'read': return <CheckCheck size={12} className="text-blue-400" />;
      case 'failed': return <span className="text-red-400 text-[10px]">⚠️</span>;
      default: return <span className="text-gray-500 text-[10px]">🕒</span>;
    }
  };

  const activeCustomerData = customerDetails?.find(c => c.phone === activeCustomer) || null;
  const isActiveIg = activeCustomerData?.lastMessage?.platform?.startsWith('instagram');

  return (
    <main className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#050505] p-0 text-gray-200 md:p-6">
      
      {/* New Chat Modal Box */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <section role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl border border-gray-800 bg-[#111] p-7 shadow-2xl">
            <header className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Start New Chat</h2>
              <button onClick={() => setIsModalOpen(false)} aria-label="Close dialog" className="text-gray-400 hover:text-white transition-colors p-1">✕</button>
            </header>
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
          </section>
        </div>
      )}

      {/* Backdrop for Mobile Sidebar */}
      {isSidebarOpen && (
        <span
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed left-0 top-0 z-[35] h-screen w-screen bg-black/85 backdrop-blur-md md:hidden cursor-pointer"
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

        {loading ? <p className="text-gray-400 text-sm text-center mt-4">Loading chats...</p> : (
          customerDetails.length > 0 ? customerDetails.map(customer => (
            <div 
              key={customer.phone}
              onClick={() => { setActiveCustomer(customer.phone); setIsSidebarOpen(false); }}
              className={`p-4 cursor-pointer rounded-xl mb-3 transition-all border ${
                activeCustomer === customer.phone 
                  ? (customer.lastMessage?.platform?.startsWith('instagram') ? 'bg-pink-600/10 border-pink-500' : 'bg-green-600/10 border-green-500') 
                  : 'bg-[#0a0a0a] border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="overflow-hidden pr-2">
                  <div className={`font-bold text-sm flex items-center gap-1.5 ${
                    activeCustomer === customer.phone 
                      ? (customer.lastMessage?.platform?.startsWith('instagram') ? 'text-pink-400' : 'text-green-400') 
                      : 'text-gray-200'
                  }`}>
                    {customer.lastMessage?.platform === 'instagram_dm' ? (
                  <Camera size={14} className={activeCustomer === customer.phone ? "text-pink-400" : "text-pink-500"} />
                    ) : customer.lastMessage?.platform === 'instagram_comment' ? (
                      <MessageCircle size={14} className={activeCustomer === customer.phone ? "text-pink-400" : "text-pink-500"} />
                    ) : (
                      <MessageSquare size={14} className={activeCustomer === customer.phone ? "text-green-400" : "text-green-500"} />
                    )}
                    <span className="truncate">{customer.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">{customer.phone} {customer.city ? `• ${customer.city}` : ''}</div>
                </div>
                {customer.needsReply && (
                  <span className="relative flex h-3 w-3 shrink-0 mt-1" title="Needs Reply">
                    {activeCustomer !== customer.phone && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    )}
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {customer.windowOpen ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">🟢 {customer.timeLeft} left</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">🔴 Window Closed</span>
                )}
              </div>
            </div>
          )) : <p className="text-gray-500 text-sm text-center mt-10">No chats found for the selected workspace or filter.</p>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col w-full h-full bg-[#0a0a0a] md:border border-gray-800 md:border-l-0 md:rounded-r-2xl shadow-xl relative">
        
        {!activeCustomer ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 relative p-4 text-center">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden absolute top-4 left-4 bg-gray-800 text-white px-3 py-2 rounded-lg font-bold">☰ Chats</button>
            <p className="text-6xl mb-4">💬</p>
            <h3 className="text-2xl font-bold text-white mb-2">No Chat Selected</h3>
            <p className="mb-6">Select a chat from the sidebar or click "+ New Chat" to start messaging.</p>
            
            {allMessages.length === 0 && (
              <div className="bg-gray-900/80 border border-gray-700 p-6 rounded-2xl max-w-lg text-left mt-4 shadow-xl">
                <h4 className="text-lg font-bold text-yellow-500 mb-3 flex items-center gap-2">🛠️ Not receiving Meta messages?</h4>
                <p className="text-sm text-gray-300 mb-3">Settings shows <strong>"Connected ✅"</strong> but Inbox is empty? This is a common Meta Webhook issue. Please check:</p>
                <ul className="text-sm text-gray-400 space-y-2 list-disc pl-5">
                  <li><strong>Instagram App:</strong> Go to Settings &gt; Messages and story replies &gt; Message controls &gt; Turn ON <strong className="text-white">"Allow access to messages"</strong>.</li>
                  <li><strong>Meta App Mode:</strong> Your App in developers.facebook.com might be in "Development" mode. Switch it to "Live".</li>
                  <li><strong>Webhook Subscriptions:</strong> Ensure your Meta App Webhook is subscribed to <code>messages</code> and <code>comments</code>.</li>
                </ul>
                <p className="text-xs text-gray-500 mt-4 border-t border-gray-800 pt-3">
                  Once Meta successfully sends the first webhook, your messages will instantly appear here!
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Active Customer Header */}
            <div className="p-4 border-b border-gray-800 bg-[#111] flex items-center gap-3 md:rounded-tr-2xl shrink-0">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-gray-800 text-white p-2 rounded-lg">
                ☰
              </button>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isActiveIg ? 'bg-pink-500/20 text-pink-400' : 'bg-green-500/20 text-green-400'}`}>
                {isActiveIg ? <Camera size={16} /> : <MessageSquare size={16} />}
              </div>
              <h3 className="font-bold text-white truncate">
                {activeCustomerData?.name || activeCustomer} <span className="text-xs text-gray-400 font-normal">({activeCustomer})</span>
              </h3>
              
              {/* 🚀 NEW: Share Contact Button */}
              <button onClick={() => {
                const text = `Name: ${activeCustomerData?.name || 'Unknown'}\nPhone: ${activeCustomer}\nCity: ${activeCustomerData?.city || 'N/A'}`;
                if (navigator.share) navigator.share({ title: 'Shared Contact', text }).catch(()=>{});
                else { navigator.clipboard.writeText(text); toast.success("Contact Details Copied!"); }
              }} className="ml-auto text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors font-bold flex items-center gap-1.5 shadow-sm">
                🔗 Share 
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeChatMessages.map((msg, index) => {
                const msgDateStr = new Date(msg.timestamp || msg.createdAt || 0).toDateString();
                const prevMsgDateStr = index > 0 ? new Date(activeChatMessages[index - 1].timestamp || activeChatMessages[index - 1].createdAt || 0).toDateString() : null;
                const showDateBadge = msgDateStr !== prevMsgDateStr;

                return (
                  <div key={msg._id} className="flex flex-col w-full">
                    {showDateBadge && (
                      <div className="flex justify-center my-4">
                        <span className="bg-[#1a1a1a] border border-gray-800 text-gray-400 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                          {formatDateBadge(msg.timestamp || msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`group p-4 max-w-sm rounded-2xl relative ${msg.direction === 'outgoing' ? 'bg-green-600 text-white rounded-br-sm' : 'bg-[#1a1a1a] border border-gray-800 text-gray-200 rounded-bl-sm'}`}>
                        {/* 🚀 NEW: Reply and Delete buttons on hover */}
                        <div className="absolute top-1/2 -translate-y-1/2 flex gap-1 bg-black/20 backdrop-blur-sm p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity -left-20">
                          <button onClick={() => setReplyingTo(msg)} className="text-gray-300 hover:text-white p-1.5 rounded hover:bg-gray-700" title="Reply"><CornerDownLeft size={14}/></button>
                          <button onClick={() => deleteMessage(msg._id)} className="text-gray-300 hover:text-rose-400 p-1.5 rounded hover:bg-gray-700" title="Delete"><Trash2 size={14}/></button>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.messageText || "📎 [Attachment / Shared Post]"}</p>
                        <div className="flex justify-between items-center gap-4 mt-2">
                          <span className="text-[10px] font-medium opacity-80">{formatSender(msg.sentBy, msg.direction)}</span>
                          <span className="text-[10px] opacity-70 flex items-center gap-1">
                            {formatTime(msg.timestamp || msg.createdAt)}
                            {msg.direction === 'outgoing' && getMessageStatusIcon(msg.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Active Customer Status Warning */}
            {activeCustomerData && !activeCustomerData.windowOpen && (
               <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
                 ⚠️ 24-Hour window closed. Normal messages might fail. Please use Meta Templates to initiate contact.
               </div>
            )}

            <div className="p-4 bg-[#111] border-t border-gray-800 rounded-br-2xl flex flex-col gap-3">
              
              {/* 🚀 NEW: Replying To Banner */}
              {replyingTo && (
                <div className="bg-[#1a1a1a] border border-gray-700 p-2 rounded-lg flex justify-between items-start animate-fade-in">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-green-400">Replying to {replyingTo.direction === 'incoming' ? 'Customer' : 'You'}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">"{replyingTo.messageText}"</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white p-1"><X size={14}/></button>
                </div>
              )}
              
              {/* 🚀 AI SUGGESTED / QUICK REPLIES */}
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                 {['Here is our catalog 📦', 'Please share your location 📍', 'I will call you shortly 📞', 'Let me check and revert ⏳'].map((qr, idx) => (
                    <button key={idx} onClick={() => setReplyText(prev => prev ? prev + " " + qr : qr)} disabled={!activeCustomer} className="text-[10px] font-bold whitespace-nowrap bg-[#1a1a1a] hover:bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full border border-gray-700 transition-colors shrink-0 disabled:opacity-50">
                       {qr}
                    </button>
                 ))}
              </div>

              <div className="flex items-center gap-3">
                <button disabled={!activeCustomer} className="p-3 text-gray-400 hover:text-white bg-[#0a0a0a] border border-gray-700 rounded-xl transition-colors disabled:opacity-50" title="Send Approved Template">📄</button>
                <button onClick={sendLocation} disabled={!activeCustomer} className="p-3 text-gray-400 hover:text-white bg-[#0a0a0a] border border-gray-700 rounded-xl transition-colors disabled:opacity-50" title="Share Location"><MapPin size={16}/></button>
                <button disabled={!activeCustomer} className="p-3 text-gray-400 hover:text-white bg-[#0a0a0a] border border-gray-700 rounded-xl transition-colors disabled:opacity-50" title="Attach Image or Document">📎</button>
                <button onClick={() => setReplyText("Thank you for your visit! 🙏\n\n⭐ Please leave us a 5-star review: [Review Link]\n📸 Follow us on Instagram: [Instagram Link]\n\n🎁 *Special Offer:* Use code *WELCOME10* on your next visit to get 10% OFF!")} disabled={!activeCustomer} className="p-3 text-yellow-500 hover:text-yellow-400 bg-[#0a0a0a] border border-gray-700 rounded-xl transition-colors disabled:opacity-50" title="Load Rating & Discount Offer">⭐</button>
                
                <textarea 
                  rows="1"
                  value={replyText} 
                  onChange={e => setReplyText(e.target.value)} 
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  placeholder="Type a message or paste a link (Shift+Enter for new line)..." 
                  className="flex-1 p-3 bg-[#0a0a0a] border border-gray-700 text-white rounded-xl focus:border-green-500 outline-none resize-none" 
                  disabled={!activeCustomer}
                />
                <button onClick={sendReply} disabled={!activeCustomer || !replyText.trim()} className="px-4 md:px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0">Send 🚀</button>
              </div>
            </div>
          </>
        )}
      </div>
      
      <DashboardAIAssistant />
    </main>
  );
}