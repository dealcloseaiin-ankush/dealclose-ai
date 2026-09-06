import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useInboxStore } from '../store/inboxStore';
import { 
  Search, Camera, MessageSquare, MessageCircle, Check, CheckCheck, Trash2, MapPin, 
  CornerDownLeft, X, ExternalLink, User, Tag, Phone, Mail, FileText, Bot, 
  PanelRightClose, PanelRightOpen, Sparkles, Send, Copy, CheckCircle2, ChevronRight
} from 'lucide-react';
import DashboardAIAssistant from '../components/DashboardAIAssistant';

export default function Chats() {
  const [allMessages, setAllMessages] = useState([]);
  const [activeCustomer, setActiveCustomer] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Left chat list sidebar
  const [isContextSidebarOpen, setIsContextSidebarOpen] = useState(true); // 🚀 NEW: Right CRM Context Sidebar
  
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // Date range filter
  
  // Instagram Reply Mode & Multi-Post Filter
  const [replyMode, setReplyMode] = useState('private_dm'); // 'public_comment' or 'private_dm'
  const [postFilter, setPostFilter] = useState('all'); // 'all' or specific mediaId
  
  // CRM Lead Context State
  const [isUpdatingLead, setIsUpdatingLead] = useState(false);
  const [leadNotes, setLeadNotes] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatSource, setNewChatSource] = useState('Manual Entry');
  const [sendAutoOffer, setSendAutoOffer] = useState(false);
  
  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVars, setTemplateVars] = useState({});
  
  // State for replying to a specific message
  const [replyingTo, setReplyingTo] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevActiveCustomerRef = useRef(null);
  const prevMsgCountRef = useRef(0);

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
          const profileRes = await api.get('/users/profile').catch(() => null);
          const u = profileRes?.data?.user || profileRes?.data;
          if (u && isMounted) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
        }

        const { data } = await api.get('/chats', { params: { workspaceId: activeWorkspace } });
        const messages = Array.isArray(data) ? data : data.data || [];

        if (!isMounted) return;

        const currentMessages = allMessagesRef.current;
        if (!isFirstLoad && messages.length > currentMessages.length) {
          const existingIds = new Set(currentMessages.map(m => m._id));
          const newIncomingMessages = messages.filter(m => !existingIds.has(m._id) && m.direction === 'incoming');
          if (newIncomingMessages.length > 0) {
            playNotificationSound();
          }
        }

        setAllMessages(messages);
        allMessagesRef.current = messages;

      } catch (error) {
        console.error("Failed to fetch chats", error);
        if (error.response?.status === 401) {
          isMounted = false;
        }
      } finally {
        if (isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };
    
    fetchChats();
    const intervalId = setInterval(fetchChats, 4000); // Auto-refresh silently every 4 seconds
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeWorkspace, platformFilter]);

  // Filter messages by selected Workspace
  const filteredMessages = useMemo(() => {
    const filtered = allMessages.filter(msg => {
      if (msg.isDeleted) return false;
      const ws = msg.workspaceId || 'main';
      const matchesWorkspace = activeWorkspace === 'main' ? (ws === 'main' || ws === 'default') : ws === activeWorkspace;
      return matchesWorkspace;
    });
    return filtered;
  }, [allMessages, activeWorkspace]);

  // Advanced logic to calculate 24-Hour Window, Needs Reply status, Name/City, and CRM Context
  const customerDetails = useMemo(() => {
    const map = new Map();

    const messagesToProcess = allMessages.filter(msg => {
        const matchesPlatform = platformFilter === 'all' || msg.platform === platformFilter || (platformFilter === 'instagram' && msg.platform?.startsWith('instagram'));
        return matchesPlatform;
    });

    messagesToProcess.forEach(msg => {
      const phone = msg.customerPhone;
      if (!phone) return;
      
      if (!map.has(phone)) {
        map.set(phone, { 
          phone, 
          name: msg.customerName || 'Unknown', 
          city: msg.customerCity || '', 
          lastIncoming: null, 
          lastMessage: msg, 
          leadContext: msg.leadContext || null,
          isAiPaused: msg.isAiPaused || false,
          needsReply: false 
        });
      }

      const data = map.get(phone);
      if (msg.leadContext) {
        data.leadContext = msg.leadContext;
      }
      if (msg.isAiPaused !== undefined) {
        data.isAiPaused = msg.isAiPaused;
      }
      
      const msgDate = new Date(msg.timestamp || msg.createdAt || 0).getTime();
      const lastMsgDate = new Date(data.lastMessage.timestamp || data.lastMessage.createdAt || 0).getTime();
      
      if (!isNaN(msgDate) && !isNaN(lastMsgDate) && msgDate > lastMsgDate) {
        data.lastMessage = msg;
      }
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
      return { ...data, windowOpen, timeLeft, needsReply: data.lastMessage.direction === 'incoming' };
    }).sort((a, b) => {
       const dateA = new Date(a.lastMessage.timestamp || a.lastMessage.createdAt || 0).getTime();
       const dateB = new Date(b.lastMessage.timestamp || b.lastMessage.createdAt || 0).getTime();
       return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });

    if (dateFilter !== 'all') {
      finalDetails = finalDetails.filter(c => {
        const msgDate = new Date(c.lastMessage.timestamp || c.lastMessage.createdAt || 0);
        const today = new Date();
        const daysAgo = parseInt(dateFilter);
        const filterDate = new Date();
        filterDate.setDate(today.getDate() - daysAgo);
        return msgDate >= filterDate;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      finalDetails = finalDetails.filter(c => 
        (c.name && c.name.toLowerCase().includes(term)) || 
        (c.phone && c.phone.includes(term)) ||
        (c.lastMessage?.timestamp && new Date(c.lastMessage.timestamp).toLocaleDateString('en-IN').includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term))
      );
    }
    return finalDetails.filter(c => c.lastMessage.workspaceId === activeWorkspace || (activeWorkspace === 'main' && (c.lastMessage.workspaceId === 'main' || !c.lastMessage.workspaceId || c.lastMessage.workspaceId === 'default')));
  }, [allMessages, platformFilter, searchTerm, activeWorkspace, dateFilter]);

  // Auto-select first chat
  useEffect(() => {
    if (!activeCustomer && customerDetails.length > 0) {
      setActiveCustomer(customerDetails[0].phone);
    }
  }, [customerDetails, activeCustomer]);

  // Auto mark active customer as read
  useEffect(() => {
    if (activeCustomer) {
      const hasUnread = allMessages.some(m => m.customerPhone === activeCustomer && m.direction === 'incoming' && m.status !== 'read');
      if (hasUnread) {
        api.post('/chats/mark-read', { customerPhone: activeCustomer }).catch(() => {});
        setAllMessages(prev => {
          const updated = prev.map(m => m.customerPhone === activeCustomer && m.direction === 'incoming' ? { ...m, status: 'read' } : m);
          allMessagesRef.current = updated;
          return updated;
        });
      }
    }
  }, [activeCustomer, allMessages]);

  const activeCustomerData = customerDetails?.find(c => c.phone === activeCustomer) || null;
  const isActiveIg = activeCustomerData?.lastMessage?.platform?.startsWith('instagram');

  // Sync lead notes when activeCustomer changes
  useEffect(() => {
    if (activeCustomerData?.leadContext?.notes) {
      setLeadNotes(activeCustomerData.leadContext.notes);
    } else {
      setLeadNotes('');
    }
    setPostFilter('all');
    if (activeCustomerData?.lastMessage?.platform === 'instagram_comment') {
      setReplyMode('public_comment');
    } else {
      setReplyMode('private_dm');
    }
  }, [activeCustomer]);

  // Extract all distinct posts related to this customer's interactions
  const activeCustomerPosts = useMemo(() => {
    const map = new Map();
    filteredMessages
      .filter(m => m.customerPhone === activeCustomer)
      .forEach(msg => {
        const postTag = msg.tags?.find(t => t.startsWith('post_'));
        const tagId = postTag ? postTag.replace('post_', '') : null;
        const match = msg.messageText?.match(/Post\/Reel\s*#?([0-9a-zA-Z_]+)/i);
        const extractedId = tagId || (match && match[1] !== 'Reel' ? match[1] : null);

        if (extractedId) {
          if (!map.has(extractedId)) {
            map.set(extractedId, {
              id: extractedId,
              caption: msg.messageText?.replace(/^[💬[^]]+]:\s*/, '')?.slice(0, 60) || 'Instagram Post / Reel',
              timestamp: msg.timestamp || msg.createdAt,
              count: 1
            });
          } else {
            map.get(extractedId).count += 1;
          }
        }
      });
    return Array.from(map.values());
  }, [filteredMessages, activeCustomer]);

  // Chat sorting ascending with post filtering
  const activeChatMessages = useMemo(() => {
    return filteredMessages
      .filter(m => {
        if (m.customerPhone !== activeCustomer) return false;
        if (platformFilter === 'whatsapp') return m.platform === 'whatsapp';
        if (platformFilter === 'instagram_dm') return m.platform === 'instagram_dm';
        if (platformFilter === 'instagram_comment') return m.platform === 'instagram_comment';
        if (postFilter !== 'all') {
          const matchesTag = m.tags?.includes(`post_${postFilter}`);
          const matchesText = m.messageText?.includes(postFilter);
          return matchesTag || matchesText;
        }
        return true;
      })
      .sort((a, b) => new Date(a.timestamp || a.createdAt || 0) - new Date(b.timestamp || b.createdAt || 0));
  }, [filteredMessages, activeCustomer, platformFilter, postFilter]);

  // Smart Auto-Scroll
  useEffect(() => {
    const isNewCustomer = prevActiveCustomerRef.current !== activeCustomer;
    prevActiveCustomerRef.current = activeCustomer;

    const msgCount = activeChatMessages.length;
    const hasNewMsg = msgCount > prevMsgCountRef.current;
    prevMsgCountRef.current = msgCount;

    if (isNewCustomer) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    } else if (hasNewMsg) {
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [activeChatMessages, activeCustomer]);

  const handleSelectCustomer = async (phone) => {
    setActiveCustomer(phone);
    setIsSidebarOpen(false);
    
    setAllMessages(prev => {
      const updated = prev.map(m => m.customerPhone === phone && m.direction === 'incoming' ? { ...m, status: 'read' } : m);
      allMessagesRef.current = updated;
      return updated;
    });

    try {
      await api.post('/chats/mark-read', { customerPhone: phone });
    } catch (e) {
      console.debug('Failed to mark chat as read:', e.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setAllMessages(prev => {
        const updated = prev.map(m => ({ ...m, status: 'read' }));
        allMessagesRef.current = updated;
        return updated;
      });
      await api.post('/chats/mark-all-read', { workspaceId: activeWorkspace });
      useInboxStore.getState().setUnreadCount(0);
      toast.success('All chats marked as read!');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

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
        allMessagesRef.current = updated;
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

    const targetChannel = (isActiveIg && replyMode === 'public_comment') ? 'instagram_comment' : (isActiveIg ? 'instagram_dm' : 'whatsapp');
    const isPublicComment = isActiveIg && replyMode === 'public_comment';

    const newMessage = {
      _id: Date.now(),
      customerPhone: activeCustomer,
      channel: targetChannel,
      direction: 'outgoing',
      messageText: replyText,
      sentBy: 'staff',
      tags: isPublicComment ? ['public_comment_reply'] : [],
      timestamp: new Date().toISOString()
    };

    setAllMessages(prev => {
      const updated = [...prev, newMessage];
      allMessagesRef.current = updated;
      return updated;
    });
    setReplyText("");
    setReplyingTo(null);

    try {
      const payload = { 
        customerPhone: activeCustomer, 
        messageText: replyText,
        repliedToMessageId: replyingTo?._id,
        replyMode: isActiveIg ? replyMode : undefined,
        commentId: replyingTo?._id || undefined,
        mediaId: postFilter !== 'all' ? postFilter : undefined
      };
      const res = await api.post('/chats/send', payload);
      
      if (res.data?.message) {
        setAllMessages(prev => {
          const updated = prev.map(m => m._id === newMessage._id ? res.data.message : m);
          allMessagesRef.current = updated;
          return updated;
        });
      }
      if (isPublicComment) {
        toast.success("Public comment reply posted on Instagram!");
      }
    } catch (error) {
      console.error("Failed to send message", error);
      toast.error(error.response?.data?.message || "Failed to send message");
      setAllMessages(prev => {
        const updated = prev.filter(m => m._id !== newMessage._id);
        allMessagesRef.current = updated;
        return updated;
      });
    }
  };

  // CRM Update Status Handler
  const handleUpdateLeadStatus = async (newStatus) => {
    if (!activeCustomer) return;
    setIsUpdatingLead(true);
    try {
      await api.patch(`/chats/${activeCustomer}/lead-context`, { status: newStatus });
      toast.success(`CRM Stage updated to "${newStatus.replace('_', ' ').toUpperCase()}"`);
      setAllMessages(prev => {
        const updated = prev.map(m => m.customerPhone === activeCustomer ? {
          ...m,
          leadContext: { ...(m.leadContext || {}), status: newStatus }
        } : m);
        allMessagesRef.current = updated;
        return updated;
      });
    } catch (err) {
      toast.error("Failed to update CRM status");
    } finally {
      setIsUpdatingLead(false);
    }
  };

  // CRM Save Notes Handler
  const handleSaveLeadNotes = async () => {
    if (!activeCustomer) return;
    setIsUpdatingLead(true);
    try {
      await api.patch(`/chats/${activeCustomer}/lead-context`, { notes: leadNotes });
      toast.success("Lead notes saved!");
      setAllMessages(prev => {
        const updated = prev.map(m => m.customerPhone === activeCustomer ? {
          ...m,
          leadContext: { ...(m.leadContext || {}), notes: leadNotes }
        } : m);
        allMessagesRef.current = updated;
        return updated;
      });
    } catch (err) {
      toast.error("Failed to save notes");
    } finally {
      setIsUpdatingLead(false);
    }
  };

  // AI Toggle Handler
  const handleToggleAi = async () => {
    if (!activeCustomer) return;
    const currentPaused = activeCustomerData?.isAiPaused || false;
    const newPaused = !currentPaused;
    try {
      await api.post('/chats/toggle-ai', { customerPhone: activeCustomer, isAiPaused: newPaused });
      toast.success(newPaused ? "AI Assistant paused for this chat." : "AI Assistant resumed!");
      setAllMessages(prev => {
        const updated = prev.map(m => m.customerPhone === activeCustomer ? {
          ...m,
          isAiPaused: newPaused
        } : m);
        allMessagesRef.current = updated;
        return updated;
      });
    } catch (err) {
      toast.error("Failed to toggle AI status");
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm("This will only hide the message from your dashboard, not from the customer's WhatsApp. Are you sure?")) return;

    setAllMessages(prev => {
      const updated = prev.filter(m => m._id !== messageId);
      allMessagesRef.current = updated;
      return updated;
    });
    try {
      await api.delete(`/chats/${messageId}`);
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message.");
      const { data } = await api.get('/chats');
      setAllMessages(Array.isArray(data) ? data : data.data || []);
    }
  };

  const deleteConversation = async (customerPhone) => {
    if (!window.confirm(`Are you sure you want to delete the entire chat history with ${customerPhone}? This will hide it from your dashboard.`)) return;

    setAllMessages(prev => {
      const updated = prev.filter(m => m.customerPhone !== customerPhone);
      allMessagesRef.current = updated;
      return updated;
    });
    if (activeCustomer === customerPhone) {
      setActiveCustomer(null);
    }

    try {
      await api.delete(`/chats/conversation/${customerPhone}`);
      toast.success("Conversation deleted.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete conversation.");
    }
  };
  
  const openTemplateModal = async () => {
    try {
      const { data } = await api.get('/whatsapp/templates'); 
      setTemplates(Array.isArray(data) ? data : []);
      setIsTemplateModalOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not fetch templates.");
    }
  };

  const handleSendTemplate = async () => {
    if (!selectedTemplate) return toast.error("Please select a template.");
    try {
      const payload = {
        customerPhone: activeCustomer,
        templateName: selectedTemplate.name,
        variables: Object.values(templateVars)
      };
      await api.post('/chats/send-template', payload);
      toast.success("Template message sent!");
      setIsTemplateModalOpen(false);
      setSelectedTemplate(null);
      setTemplateVars({});
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send template.");
    }
  };

  const sendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setReplyText(`Here is my current location: https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`);
      });
    } else { toast.error("Geolocation is not supported by this browser."); }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  const formatSender = (sentBy, direction) => {
    if (sentBy === 'ai') return '🤖 AI Agent';
    if (sentBy === 'auto-reply') return '⚡ Bot / Flow';
    if (sentBy === 'owner_app') return '📱 You (IG App)';
    if (sentBy === 'staff') return '💻 You (Dashboard)';
    if (sentBy === 'system') return '⚙️ System';
    if (direction === 'incoming') return '👤 Customer';
    return sentBy || 'Unknown';
  };
  
  const MessageStatus = ({ msg }) => {
    const { status, sentAt, deliveredAt, readAt } = msg;

    const formatStatusTime = (isoString) => {
      if (!isoString) return 'Pending...';
      return new Date(isoString).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const getIcon = () => {
      switch(status) {
        case 'sent': return <Check size={16} className="text-gray-400" />;
        case 'delivered': return <CheckCheck size={16} className="text-gray-400" />;
        case 'read': return <CheckCheck size={16} className="text-blue-400" />;
        case 'failed': return <span className="text-red-400 text-lg">⚠️</span>;
        default: return <span className="text-gray-500 text-lg">🕒</span>;
      }
    };

    return (
      <div className="relative group flex items-center">
        {getIcon()}
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-black border border-gray-700 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
          <ul className="space-y-1">
            {sentAt && <li className="flex justify-between"><span>Sent:</span> <span>{formatStatusTime(sentAt)}</span></li>}
            {deliveredAt && <li className="flex justify-between"><span>Delivered:</span> <span>{formatStatusTime(deliveredAt)}</span></li>}
            {readAt && <li className="flex justify-between"><span>Read:</span> <span>{formatStatusTime(readAt)}</span></li>}
          </ul>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-black"></div>
        </div>
      </div>
    );
  };

  const leadCtx = activeCustomerData?.leadContext || {};
  const customFields = leadCtx.customFields || {};
  const isAiPaused = activeCustomerData?.isAiPaused || false;

  return (
    <main className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-[#050505] p-0 text-gray-200 md:p-4 gap-0 md:gap-3">
      
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

      {/* Template Sender Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <section role="dialog" aria-modal="true" className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-[#111] p-7 shadow-2xl">
            <header className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Send Template Message</h2>
              <button onClick={() => setIsTemplateModalOpen(false)} aria-label="Close dialog" className="text-gray-400 hover:text-white transition-colors p-1">✕</button>
            </header>
            <div className="space-y-4">
              <select onChange={(e) => {
                const template = templates.find(t => t.name === e.target.value);
                setSelectedTemplate(template);
                setTemplateVars({});
              }} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none">
                <option value="">-- Select a Template --</option>
                {templates.map(t => <option key={t.id} value={t.name}>{t.name} ({t.category})</option>)}
              </select>

              {selectedTemplate && (
                <div className="bg-[#0a0a0a] p-4 rounded-lg border border-gray-700 text-sm text-gray-400 italic">
                  {selectedTemplate.components.find(c => c.type === 'BODY')?.text}
                </div>
              )}

              {selectedTemplate?.components.find(c => c.type === 'BODY')?.text.match(/\{\{\d+\}\}/g)?.map((v, i) => (
                <div key={i}>
                  <label className="block text-sm text-gray-400 mb-1">Variable {"{{"}{i+1}{"}}"}</label>
                  <input type="text" onChange={e => setTemplateVars({...templateVars, [i]: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder={`Value for variable ${i+1}`} />
                </div>
              ))}

              <button onClick={handleSendTemplate} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors">Send Template</button>
            </div>
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

      {/* ========================================================================= */}
      {/* COLUMN 1: LEFT CONVERSATION LIST (320px)                                  */}
      {/* ========================================================================= */}
      <div className={`absolute md:relative z-40 w-4/5 md:w-[320px] lg:w-[340px] shrink-0 h-full bg-[#111] border border-gray-800 md:rounded-2xl p-4 overflow-y-auto transition-transform duration-300 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 custom-scrollbar shadow-2xl flex flex-col`}>
        <div className="flex justify-between items-center mb-3 border-b border-gray-800 pb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            💬 Inboxes
          </h2>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleMarkAllAsRead} 
              title="Mark all chats in this workspace as read"
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-[11px] px-2 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 border border-gray-700"
            >
              <CheckCheck size={13} className="text-emerald-400" /> Read
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-green-600 hover:bg-green-500 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors shadow-sm">+ Chat</button>
          </div>
        </div>
        
        <select 
          value={activeWorkspace} 
          onChange={(e) => { setActiveWorkspace(e.target.value); setActiveCustomer(null); }} 
          className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-xs rounded-lg p-2 outline-none focus:border-green-500 cursor-pointer mb-2.5"
        >
          {workspaces.map(ws => (
            <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
          ))}
        </select>

        {/* Platform Tabs Filter */}
        <div className="grid grid-cols-4 gap-1 bg-[#1a1a1a] p-1 rounded-lg border border-gray-700 text-[11px] font-bold mb-3">
          <button onClick={() => { setPlatformFilter('all'); setActiveCustomer(null); }} className={`py-1.5 rounded text-center transition-all ${platformFilter === 'all' ? 'bg-gray-800 text-white shadow-sm border border-gray-600' : 'text-gray-400 hover:text-gray-200'}`}>All</button>
          <button onClick={() => { setPlatformFilter('whatsapp'); setActiveCustomer(null); }} className={`py-1.5 rounded text-center transition-all ${platformFilter === 'whatsapp' ? 'bg-emerald-600/30 text-emerald-400 shadow-sm border border-emerald-500/40' : 'text-gray-400 hover:text-gray-200'}`}>WA</button>
          <button onClick={() => { setPlatformFilter('instagram_dm'); setActiveCustomer(null); }} className={`py-1.5 rounded text-center transition-all ${platformFilter === 'instagram_dm' ? 'bg-purple-600/30 text-purple-400 shadow-sm border border-purple-500/40' : 'text-gray-400 hover:text-gray-200'}`}>DMs</button>
          <button onClick={() => { setPlatformFilter('instagram_comment'); setActiveCustomer(null); }} className={`py-1.5 rounded text-center transition-all ${platformFilter === 'instagram_comment' ? 'bg-pink-600/30 text-pink-400 shadow-sm border border-pink-500/40' : 'text-gray-400 hover:text-gray-200'}`}>Post 💬</button>
        </div>

        {/* Date Range Quick Filters */}
        <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-gray-800 text-[10px] font-bold mb-3">
          <button onClick={() => setDateFilter('all')} className={`flex-1 py-1 rounded transition-colors ${dateFilter === 'all' ? 'bg-green-600/20 text-green-400' : 'text-gray-500 hover:text-white'}`}>
            All Time
          </button>
          <button onClick={() => setDateFilter('7')} className={`flex-1 py-1 rounded transition-colors ${dateFilter === '7' ? 'bg-green-600/20 text-green-400' : 'text-gray-500 hover:text-white'}`}>
            Last 7D
          </button>
          <button onClick={() => setDateFilter('30')} className={`flex-1 py-1 rounded transition-colors ${dateFilter === '30' ? 'bg-green-600/20 text-green-400' : 'text-gray-500 hover:text-white'}`}>
            Last 30D
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
          <input type="text" placeholder="Search contact, phone, city..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
            className="w-full bg-[#0a0a0a] border border-gray-800 text-white text-xs rounded-lg pl-8 pr-3 py-2 outline-none focus:border-green-500" 
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? <p className="text-gray-400 text-xs text-center mt-6">Loading conversations...</p> : (
            customerDetails.length > 0 ? customerDetails.map(customer => {
              const isCommentChat = customer.lastMessage?.platform === 'instagram_comment';
              const isDmChat = customer.lastMessage?.platform === 'instagram_dm';
              const isSelected = activeCustomer === customer.phone;

              return (
                <div 
                  key={customer.phone}
                  onClick={() => handleSelectCustomer(customer.phone)}
                  className={`p-3 cursor-pointer rounded-xl transition-all border relative ${
                    isSelected 
                      ? (isCommentChat ? 'bg-pink-600/15 border-pink-500/80 shadow-md shadow-pink-950/20' : (isDmChat ? 'bg-purple-600/15 border-purple-500/80' : 'bg-green-600/15 border-green-500/80 shadow-md shadow-green-950/20')) 
                      : 'bg-[#0e0e0e] border-gray-800/80 hover:border-gray-700 hover:bg-[#141414]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="overflow-hidden pr-2 flex-1">
                      <div className={`font-bold text-xs flex items-center gap-1.5 ${
                        isSelected 
                          ? (isCommentChat ? 'text-pink-400' : (isDmChat ? 'text-purple-300' : 'text-green-400')) 
                          : 'text-gray-200'
                      }`}>
                        {isCommentChat ? (
                          <span className="p-1 rounded bg-pink-500/20 text-pink-400 shrink-0"><MessageCircle size={11} /></span>
                        ) : isDmChat ? (
                          <span className="p-1 rounded bg-purple-500/20 text-purple-400 shrink-0"><Camera size={11} /></span>
                        ) : (
                          <span className="p-1 rounded bg-green-500/20 text-green-400 shrink-0"><MessageSquare size={11} /></span>
                        )}
                        <span className="truncate">{customer.name}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                        {customer.phone} {customer.city ? `• ${customer.city}` : ''}
                      </div>
                    </div>
                    {customer.needsReply && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1" title="Needs Reply">
                        {activeCustomer !== customer.phone && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        )}
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400 truncate mb-1.5 italic">
                    {customer.lastMessage?.messageText || 'Attachment / Image'}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {customer.windowOpen ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">🟢 {customer.timeLeft}</span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">🔴 24h Closed</span>
                      )}
                      {customer.leadContext?.status && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 uppercase border border-gray-700">
                          {customer.leadContext.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-gray-500">{formatTime(customer.lastMessage?.timestamp || customer.lastMessage?.createdAt)}</span>
                  </div>
                </div>
              );
            }) : <p className="text-gray-500 text-xs text-center mt-8">No chats found.</p>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 2: CENTER CHAT & ACTION WINDOW (Flexible Width)                    */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] border border-gray-800 md:rounded-2xl shadow-2xl relative overflow-hidden">
        
        {!activeCustomer ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 relative p-4 text-center">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden absolute top-4 left-4 bg-gray-800 text-white px-3 py-2 rounded-lg font-bold">☰ Inboxes</button>
            <p className="text-6xl mb-4">💬</p>
            <h3 className="text-2xl font-bold text-white mb-2">No Conversation Selected</h3>
            <p className="mb-6 max-w-sm text-sm">Select a customer thread from the left panel to inspect comments, DMs, or WhatsApp chats.</p>
          </div>
        ) : (
          <>
            {/* Active Customer Header */}
            <div className="p-3.5 border-b border-gray-800 bg-[#111] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden bg-gray-800 text-white p-2 rounded-lg text-xs">
                  ☰
                </button>
                
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isActiveIg ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                  {isActiveIg ? <Camera size={18} /> : <MessageSquare size={18} />}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white truncate">{activeCustomerData?.name || activeCustomer}</h3>
                    {isActiveIg && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/30">
                        Instagram
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 font-normal truncate flex items-center gap-1.5">
                    <span>{activeCustomer}</span>
                    {activeCustomerData?.city && <span>• {activeCustomerData.city}</span>}
                  </div>
                </div>
              </div>
              
              {/* Right Action Icons & Context Sidebar Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                {/* 🤖 AI Status Quick Toggle Pill */}
                <button 
                  onClick={handleToggleAi}
                  title={isAiPaused ? "AI is Paused. Click to resume." : "AI is Active. Click to pause."}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all border ${
                    isAiPaused 
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25' 
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                  }`}
                >
                  <Bot size={13} />
                  <span className="hidden sm:inline">{isAiPaused ? 'AI Paused' : 'AI Live'}</span>
                </button>

                {/* Share Contact Button */}
                <button onClick={() => {
                  const text = `Name: ${activeCustomerData?.name || 'Unknown'}\nPhone/Handle: ${activeCustomer}\nCity: ${activeCustomerData?.city || 'N/A'}`;
                  if (navigator.share) navigator.share({ title: 'Contact Details', text }).catch(()=>{});
                  else { navigator.clipboard.writeText(text); toast.success("Contact Details Copied!"); }
                }} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-lg transition-colors font-bold flex items-center gap-1 border border-gray-700" title="Share Contact">
                  <Copy size={13} />
                </button>

                {/* Delete Conversation Button */}
                {user?.role === 'owner' && (
                  <button onClick={() => deleteConversation(activeCustomer)} className="text-xs bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 p-2 rounded-lg transition-colors font-bold flex items-center gap-1 border border-rose-800/40" title="Delete Conversation">
                    <Trash2 size={13} />
                  </button>
                )}

                {/* 👤 1-CLICK TOGGLE RIGHT CRM CONTEXT SIDEBAR */}
                <button 
                  onClick={() => setIsContextSidebarOpen(prev => !prev)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all border ${
                    isContextSidebarOpen 
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-sm' 
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                  }`}
                  title={isContextSidebarOpen ? "Hide CRM Context (1-Click)" : "Show CRM Context (1-Click)"}
                >
                  {isContextSidebarOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                  <span className="hidden lg:inline">{isContextSidebarOpen ? 'Hide Info' : 'Lead Info'}</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 📸 STICKY INSTAGRAM POST THUMBNAIL & MULTI-POST CONTEXT BANNER            */}
            {/* ========================================================================= */}
            {(activeCustomerPosts.length > 0 || isActiveIg) && (
              <div className="bg-gradient-to-r from-pink-950/30 via-[#16121e] to-[#121212] border-b border-pink-500/20 p-2.5 px-4 shrink-0 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                      <Camera size={14} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                        <span>Instagram Post Context</span>
                        {activeCustomerPosts.length > 1 && (
                          <span className="text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.2 rounded-full font-bold border border-pink-500/30">
                            {activeCustomerPosts.length} Posts Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate max-w-md">
                        {postFilter !== 'all' ? `Viewing comments for Post #${postFilter}` : 'Customer has commented on your published content'}
                      </p>
                    </div>
                  </div>

                  {/* Multi-Post Switcher Pills */}
                  {activeCustomerPosts.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                      <button 
                        onClick={() => setPostFilter('all')} 
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all shrink-0 ${
                          postFilter === 'all' 
                            ? 'bg-pink-600 text-white shadow-sm' 
                            : 'bg-gray-800/80 text-gray-400 hover:text-white border border-gray-700'
                        }`}
                      >
                        📂 All Posts ({activeCustomerPosts.length})
                      </button>
                      {activeCustomerPosts.map(p => (
                        <div key={p.id} className="flex items-center gap-1 shrink-0">
                          <button 
                            onClick={() => setPostFilter(p.id)} 
                            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                              postFilter === p.id 
                                ? 'bg-pink-600 text-white shadow-sm' 
                                : 'bg-gray-800/80 text-gray-400 hover:text-white border border-gray-700'
                            }`}
                          >
                            🎬 #{p.id.slice(-6)} ({p.count})
                          </button>
                          <a 
                            href={`https://www.instagram.com/p/${p.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-gray-400 hover:text-pink-400 p-1"
                            title="Open on Instagram"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Message Feed */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {activeChatMessages.map((msg, index) => {
                const msgDateStr = new Date(msg.timestamp || msg.createdAt || 0).toDateString();
                const prevMsgDateStr = index > 0 ? new Date(activeChatMessages[index - 1].timestamp || activeChatMessages[index - 1].createdAt || 0).toDateString() : null;
                const showDateBadge = msgDateStr !== prevMsgDateStr;

                return (
                  <div key={msg._id} className="flex flex-col w-full">
                    {showDateBadge && (
                      <div className="flex justify-center my-3">
                        <span className="bg-[#1a1a1a] border border-gray-800 text-gray-400 text-[11px] font-bold px-3 py-0.5 rounded-full shadow-sm">
                          {formatDateBadge(msg.timestamp || msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`group p-3.5 max-w-md rounded-2xl relative shadow-md ${
                        msg.direction === 'outgoing' 
                          ? (msg.channel === 'instagram_comment' ? 'bg-pink-700 text-white rounded-br-sm' : 'bg-green-600 text-white rounded-br-sm') 
                          : 'bg-[#151515] border border-gray-800 text-gray-200 rounded-bl-sm'
                      }`}>
                        {/* Channel Badge (Post Comment vs DM) */}
                        {msg.channel === 'instagram_comment' && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-pink-300 bg-pink-950/60 border border-pink-500/30 px-2 py-0.5 rounded-md mb-1.5 w-fit">
                            <MessageCircle size={11} /> {msg.tags?.includes('public_comment_reply') ? 'Public Comment Reply' : 'Post Comment'}
                          </div>
                        )}
                        {msg.channel === 'instagram_dm' && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-md mb-1.5 w-fit">
                            <Camera size={11} /> {msg.tags?.includes('ig_private_reply') ? 'Auto Private Reply' : 'Instagram DM'}
                          </div>
                        )}

                        {/* Reply and Delete buttons on hover */}
                        <div className={`absolute top-1/2 -translate-y-1/2 flex gap-1 bg-black/50 backdrop-blur-sm p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                          msg.direction === 'outgoing' ? '-left-20' : '-right-20'
                        }`}
                        > 
                          <button onClick={() => setReplyingTo(msg)} className="text-gray-300 hover:text-white p-1.5 rounded hover:bg-gray-700" title="Reply"><CornerDownLeft size={14}/></button>
                          {user?.role === 'owner' && (
                            <button onClick={() => deleteMessage(msg._id)} className="text-gray-300 hover:text-rose-400 p-1.5 rounded hover:bg-gray-700" title="Delete"><Trash2 size={14}/></button>
                          )}
                        </div>

                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.isDeleted ? <span className="italic text-gray-400">This message was deleted</span> : (msg.messageText || "📎 [Attachment / Shared Post]")}</p>
                        
                        <div className="flex justify-between items-center gap-4 mt-2 border-t border-white/10 pt-1.5">
                          <span className="text-[10px] font-medium opacity-80">{formatSender(msg.sentBy, msg.direction)}</span>
                          <span className="text-[10px] opacity-70 flex items-center gap-1">
                            {formatTime(msg.timestamp || msg.createdAt)}
                            {msg.direction === 'outgoing' && <MessageStatus msg={msg} />}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            {/* 24-Hour Closed Warning */}
            {activeCustomerData && !activeCustomerData.windowOpen && (
               <div className="px-4 py-2 bg-rose-500/10 border-t border-rose-500/20 text-rose-400 text-xs font-semibold text-center">
                 ⚠️ 24-Hour window closed. Normal messages might fail. <button onClick={openTemplateModal} className="font-bold underline hover:text-rose-200">Use a Template</button> to re-initiate.
               </div>
            )}

            {/* ========================================================================= */}
            {/* ACTION & INPUT AREA                                                       */}
            {/* ========================================================================= */}
            <div className="p-3.5 bg-[#111] border-t border-gray-800 flex flex-col gap-2.5 shrink-0">
              
              {/* Replying To Banner */}
              {replyingTo && (
                <div className="bg-[#1a1a1a] border border-gray-700 p-2 rounded-lg flex justify-between items-start animate-fade-in">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-green-400">Replying to {replyingTo.direction === 'incoming' ? 'Customer' : 'You'}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">"{replyingTo.messageText}"</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white p-1"><X size={14}/></button>
                </div>
              )}
              
              {/* 🔀 DEDICATED PUBLIC COMMENT VS PRIVATE DM SWITCHER (Instagram Only) */}
              {isActiveIg && (
                <div className="flex items-center gap-2 pb-1">
                  <span className="text-[11px] font-bold text-gray-400">Reply As:</span>
                  <div className="flex bg-[#1a1a1a] p-0.5 rounded-lg border border-gray-700 text-xs font-bold">
                    <button 
                      onClick={() => setReplyMode('public_comment')} 
                      className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                        replyMode === 'public_comment' 
                          ? 'bg-pink-600 text-white shadow-sm' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <MessageCircle size={13} /> Reply as Public Comment
                    </button>
                    <button 
                      onClick={() => setReplyMode('private_dm')} 
                      className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                        replyMode === 'private_dm' 
                          ? 'bg-purple-600 text-white shadow-sm' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Camera size={13} /> Send Private DM
                    </button>
                  </div>
                </div>
              )}

              {/* AI Quick Replies */}
              <div className="flex gap-2 overflow-x-auto pb-0.5 custom-scrollbar">
                 {['Here is our catalog 📦', 'Please share your location 📍', 'I will call you shortly 📞', 'Let me check and revert ⏳'].map((qr, idx) => (
                    <button key={idx} onClick={() => setReplyText(prev => prev ? prev + " " + qr : qr)} disabled={!activeCustomer} className="text-[10px] font-bold whitespace-nowrap bg-[#1a1a1a] hover:bg-gray-800 text-gray-400 px-3 py-1.5 rounded-full border border-gray-700 transition-colors shrink-0 disabled:opacity-50">
                       {qr}
                    </button>
                 ))}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={openTemplateModal} disabled={!activeCustomer} className="p-2.5 text-gray-400 hover:text-white bg-[#0a0a0a] border border-gray-700 rounded-xl transition-colors disabled:opacity-50 text-sm" title="Send Approved Template">📄</button>
                <button onClick={sendLocation} disabled={!activeCustomer} className="p-2.5 text-gray-400 hover:text-white bg-[#0a0a0a] border border-gray-700 rounded-xl transition-colors disabled:opacity-50" title="Share Location"><MapPin size={15}/></button>
                <button onClick={() => setReplyText("Thank you for connecting with us! 🙏\n\n⭐ Please leave us a review: [Review Link]\n📸 Follow on Instagram: [Instagram Link]\n\n🎁 *Special Offer:* Use code *WELCOME10* on your next visit to get 10% OFF!")} disabled={!activeCustomer} className="p-2.5 text-yellow-500 hover:text-yellow-400 bg-[#0a0a0a] border border-gray-700 rounded-xl transition-colors disabled:opacity-50" title="Load Rating & Discount Offer">⭐</button>
                
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
                  placeholder={
                    isActiveIg 
                      ? (replyMode === 'public_comment' ? "Type public comment reply on post (e.g. Thanks @user! Check your DM)..." : "Type private Instagram DM (Shift+Enter for new line)...")
                      : "Type a WhatsApp message or paste a link (Shift+Enter for new line)..."
                  } 
                  className="flex-1 p-2.5 bg-[#0a0a0a] border border-gray-700 text-white text-sm rounded-xl focus:border-green-500 outline-none resize-none" 
                  disabled={!activeCustomer}
                />
                <button 
                  onClick={sendReply} 
                  disabled={!activeCustomer || !replyText.trim()} 
                  className={`px-4 py-2.5 text-white text-xs font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 flex items-center gap-1.5 shadow-md ${
                    isActiveIg && replyMode === 'public_comment' 
                      ? 'bg-pink-600 hover:bg-pink-500' 
                      : (isActiveIg ? 'bg-purple-600 hover:bg-purple-500' : 'bg-green-600 hover:bg-green-500')
                  }`}
                >
                  <Send size={13} />
                  <span>{isActiveIg && replyMode === 'public_comment' ? 'Post Reply' : 'Send'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 3: RIGHT COLLAPSIBLE CRM & LEAD CONTEXT SIDEBAR (300px - 340px)    */}
      {/* ========================================================================= */}
      {isContextSidebarOpen && activeCustomer && (
        <aside className="w-full md:w-[320px] lg:w-[340px] shrink-0 h-full bg-[#111] border border-gray-800 md:rounded-2xl p-4 overflow-y-auto custom-scrollbar shadow-2xl flex flex-col gap-4 animate-fade-in">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <User size={15} className="text-blue-400" /> Customer & Lead CRM
            </h3>
            <button 
              onClick={() => setIsContextSidebarOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"
              title="Collapse CRM Context (1-Click)"
            >
              <X size={15} />
            </button>
          </div>

          {/* Contact Profile Summary */}
          <div className="bg-[#0e0e0e] border border-gray-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 text-sm shrink-0">
                {activeCustomerData?.name ? activeCustomerData.name.slice(0, 2).toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-sm text-white truncate">{activeCustomerData?.name || 'Unknown Contact'}</h4>
                <p className="text-xs text-gray-400 truncate">{activeCustomer}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-gray-500 block">Channel:</span>
                <span className="font-semibold text-gray-300">{isActiveIg ? 'Instagram' : 'WhatsApp'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">City:</span>
                <span className="font-semibold text-gray-300">{activeCustomerData?.city || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* CRM Pipeline Stage Dropdown */}
          <div className="bg-[#0e0e0e] border border-gray-800 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
              <span>📊 CRM Pipeline Stage</span>
              {isUpdatingLead && <span className="text-[10px] text-blue-400 animate-pulse">Updating...</span>}
            </label>
            <select 
              value={leadCtx.status || 'new'} 
              onChange={(e) => handleUpdateLeadStatus(e.target.value)}
              className="w-full bg-[#161616] border border-gray-700 text-white text-xs font-semibold rounded-lg p-2.5 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="new">🟢 New Lead</option>
              <option value="contacted">📞 Contacted</option>
              <option value="interested">⭐ Interested</option>
              <option value="hot">🔥 Hot Lead</option>
              <option value="negotiating">🤝 In Negotiation / Site Visit</option>
              <option value="converted">🏆 Converted / Won</option>
              <option value="lost">❌ Lost / Not Interested</option>
            </select>
          </div>

          {/* Ingested Real Estate Requirements Card */}
          <div className="bg-[#0e0e0e] border border-gray-800 rounded-xl p-3.5 space-y-2.5">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              🏡 Property Requirements & Ingest
            </h4>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-gray-800">
                <span className="text-gray-400">Budget / Demand:</span>
                <span className="font-bold text-emerald-400">{customFields.budget || customFields.demandPrice || leadCtx.dealValue ? `₹${leadCtx.dealValue || customFields.budget || customFields.demandPrice}` : 'N/A'}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-800">
                <span className="text-gray-400">Type / BHK:</span>
                <span className="font-semibold text-gray-200">{customFields.propertyType || customFields.bhk || '2/3 BHK Flat'}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-gray-800">
                <span className="text-gray-400">Location / Society:</span>
                <span className="font-semibold text-gray-200">{customFields.society || customFields.location || activeCustomerData?.city || 'N/A'}</span>
              </div>

              {/* GPS Coordinates & Google Maps Link */}
              {(customFields.gpsLocation || customFields.coordinates) && (
                <div className="py-1 border-b border-gray-800">
                  <span className="text-gray-400 block mb-1">GPS Coordinates:</span>
                  <a 
                    href={`https://www.google.com/maps?q=${customFields.gpsLocation || customFields.coordinates}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md hover:bg-blue-500/20 transition-colors"
                  >
                    <MapPin size={12} /> Open in Google Maps ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* AI Bot State & Flow Step */}
          <div className="bg-[#0e0e0e] border border-gray-800 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Bot size={14} className="text-purple-400" /> AI Assistant Status
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isAiPaused ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isAiPaused ? 'Paused' : 'Active'}
              </span>
            </div>

            <button 
              onClick={handleToggleAi}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-colors border ${
                isAiPaused 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500' 
                  : 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border-amber-500/30'
              }`}
            >
              {isAiPaused ? '▶️ Resume AI Assistant' : '⏸️ Pause AI (Human Takeover)'}
            </button>
          </div>

          {/* Quick CRM Notes */}
          <div className="bg-[#0e0e0e] border border-gray-800 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <FileText size={13} /> Staff CRM Notes
              </label>
            </div>
            <textarea 
              rows="3"
              value={leadNotes}
              onChange={(e) => setLeadNotes(e.target.value)}
              placeholder="Add key notes, negotiation notes, customer preferences..."
              className="w-full bg-[#161616] border border-gray-700 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500 resize-none"
            />
            <button 
              onClick={handleSaveLeadNotes}
              disabled={isUpdatingLead}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-lg transition-colors border border-gray-700 flex items-center justify-center gap-1"
            >
              <CheckCircle2 size={13} /> Save Notes
            </button>
          </div>

        </aside>
      )}

      <DashboardAIAssistant />
    </main>
  );
}
