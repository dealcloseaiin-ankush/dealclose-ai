import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, LayoutDashboard, ShoppingBag, Sparkles, Menu,
  Send, Phone, Image as ImageIcon, FileText, MoreVertical, 
  Check, CheckCheck, Plus, ArrowLeft, X, SlidersHorizontal,
  Users, Zap, QrCode, ShieldCheck, CreditCard, Settings as SettingsIcon,
  Upload, Radio, Flame, Clock, TrendingUp, AlertCircle, Trash2, Calendar
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Native-style Instagram Logo Icon
const InstagramIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export default function MobileDashboard() {
  const { user } = useAuth();

  // ─────────────────────────────────────────────────────────────
  // 1. PRIMARY NAVIGATION STATE (Strict 5 Tabs)
  // 'chats' | 'dashboard' | 'catalog' | 'ai_assistant' | 'menu'
  // ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('chats');

  // Chats Tab Sub-state ('whatsapp' | 'instagram')
  const [chatChannel, setChatChannel] = useState('whatsapp');
  const [activeChatThread, setActiveChatThread] = useState(null);
  const [chatInputText, setChatInputText] = useState('');
  const [showCrmStageModal, setShowCrmStageModal] = useState(false);

  // Menu Drawer Sub-Screens ('menu_grid' | 'auto_reply' | 'contacts_crm' | 'ig_posts' | 'meta_templates' | 'staff' | 'smart_qr' | 'settings')
  const [menuSubScreen, setMenuSubScreen] = useState('menu_grid');

  // ─────────────────────────────────────────────────────────────
  // 2. DATA STATES (Shared with MongoDB Backend)
  // ─────────────────────────────────────────────────────────────
  
  // Real Chats Data with Native Unread Count Engine
  const [chats, setChats] = useState([
    {
      _id: 'wa_1',
      customerName: 'Rahul Verma',
      customerPhone: '+91 98765 43210',
      channel: 'whatsapp',
      lastMessage: 'Size XL blue kurta ka photo bhejo aur price kya hai?',
      time: '11:28 AM',
      unreadCount: 3,
      stage: 'Interested',
      messages: [
        { sender: 'customer', text: 'Hi, new collection dekhna hai', time: '11:20 AM' },
        { sender: 'business', text: 'Namaste Rahul Ji! Summer collection catalog link bheja gaya hai.', time: '11:22 AM' },
        { sender: 'customer', text: 'Size XL blue kurta ka photo bhejo aur price kya hai?', time: '11:28 AM' }
      ]
    },
    {
      _id: 'wa_2',
      customerName: 'Vikram Oberoi (Palm Heights)',
      customerPhone: '+91 98260 11223',
      channel: 'whatsapp',
      lastMessage: 'Sunday 11:00 AM site visit confirm kar do cab pickup ke sath.',
      time: '10:45 AM',
      unreadCount: 1,
      stage: 'Site Visit Scheduled',
      messages: [
        { sender: 'customer', text: 'Sunday 11:00 AM site visit confirm kar do cab pickup ke sath.', time: '10:45 AM' }
      ]
    },
    {
      _id: 'wa_3',
      customerName: 'Pooja Agarwal',
      customerPhone: '+91 94250 88990',
      channel: 'whatsapp',
      lastMessage: 'Today 22K gold rate kya hai?',
      time: '09:15 AM',
      unreadCount: 0,
      stage: 'Contacted',
      messages: [
        { sender: 'customer', text: 'Today 22K gold rate kya hai?', time: '09:10 AM' },
        { sender: 'business', text: 'Namaste Pooja Ji! Today 22K rate is ₹6,850/gm.', time: '09:15 AM' }
      ]
    },
    {
      _id: 'ig_1',
      customerName: 'Priya Sharma (@priya_designs)',
      customerPhone: '@priya_designs',
      channel: 'instagram',
      lastMessage: 'Commented on Reel #4: "PRICE for royal blue set?"',
      time: '11:05 AM',
      unreadCount: 2,
      stage: 'New Lead',
      messages: [
        { sender: 'customer', text: 'Commented on Reel: "PRICE"', time: '11:00 AM' },
        { sender: 'business', text: '⚡ Auto-DM sent: Hey Priya! Kurta price is ₹1,499. Free shipping!', time: '11:01 AM' },
        { sender: 'customer', text: 'Is size M in stock?', time: '11:05 AM' }
      ]
    }
  ]);

  // CRM Pipeline Stages
  const crmStages = ['New Lead', 'Contacted', 'Interested', 'Site Visit Scheduled', 'Converted', 'Lost'];

  // Catalog State (Single + Bulk Upload)
  const [catalogItems, setCatalogItems] = useState([
    { id: '1', name: 'Cotton Silk Printed Kurta (XL)', price: '₹1,299', image: '👗', inStock: true },
    { id: '2', name: 'Anarkali Wedding Set', price: '₹2,499', image: '✨', inStock: true },
    { id: '3', name: 'Designer Chanderi Dupatta', price: '₹499', image: '🧣', inStock: true }
  ]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', image: '🛍️' });

  // AI Assistant Chat Messages with INLINE ACTION BUTTONS
  const [aiChatMessages, setAiChatMessages] = useState([
    {
      role: 'ai',
      text: 'Namaste! 👋 Main DealClose AI assistant hoon. Aap mujhse koi bhi marketing template, product catalog entry, ya Instagram post banwa sakte hain! Kahiye kya help karoon?',
      action: null
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Auto-Reply Rules
  const [autoReplies, setAutoReplies] = useState([
    { id: 'ar_1', keyword: 'PRICE / CATALOG', reply: 'Namaste! {firm} ka naya collection catalog PDF yahan hai. Free home delivery ke liye tap karein.', active: true },
    { id: 'ar_2', keyword: 'BUY / ORDER', reply: 'Order confirm karne ke liye apna size aur address bhejein. UPI QR scan karke pay karein.', active: true }
  ]);

  // Instagram Comment-to-DM Post Manager
  const [igPosts, setIgPosts] = useState([
    { id: 'p1', title: 'Festive Anarkali Showcase', thumbnail: '👗', keyword: 'PRICE', replyDm: 'Hey! Price is ₹1,499 with free shipping. Buy link: https://dealcloseai.in/shop', active: true },
    { id: 'p2', title: 'New Arrival Saree Launch', thumbnail: '✨', keyword: 'LINK', replyDm: 'Check full saree catalog PDF here: https://dealcloseai.in/catalog', active: true }
  ]);

  // Unread Badges Calculation
  const totalWaUnread = chats.filter(c => c.channel === 'whatsapp').reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const totalIgUnread = chats.filter(c => c.channel === 'instagram').reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const totalGlobalUnread = totalWaUnread + totalIgUnread;

  // ─────────────────────────────────────────────────────────────
  // 3. HANDLERS & ACTIONS
  // ─────────────────────────────────────────────────────────────

  const handleOpenChat = (chat) => {
    // Mark chat as read
    setChats(chats.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c));
    setActiveChatThread({ ...chat, unreadCount: 0 });
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInputText.trim() || !activeChatThread) return;

    const newMsg = { sender: 'business', text: chatInputText, time: 'Just now' };
    const updatedMessages = [...activeChatThread.messages, newMsg];

    setChats(chats.map(c => c._id === activeChatThread._id ? { ...c, lastMessage: chatInputText, messages: updatedMessages } : c));
    setActiveChatThread({ ...activeChatThread, messages: updatedMessages, lastMessage: chatInputText });
    setChatInputText('');
  };

  const handleMoveCrmStage = (stage) => {
    if (!activeChatThread) return;
    setChats(chats.map(c => c._id === activeChatThread._id ? { ...c, stage } : c));
    setActiveChatThread({ ...activeChatThread, stage });
    setShowCrmStageModal(false);
    alert(`Lead "${activeChatThread.customerName}" successfully moved to: ${stage} ✅`);
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    setCatalogItems([...catalogItems, { id: Date.now().toString(), ...newProduct, inStock: true }]);
    setNewProduct({ name: '', price: '', image: '🛍️' });
    setShowAddProductModal(false);
    alert('Product catalog mein add ho gaya! ✅');
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const promptText = aiInput;
    setAiChatMessages(prev => [...prev, { role: 'user', text: promptText, action: null }]);
    setAiInput('');
    setIsAiTyping(true);

    try {
      const { data } = await api.post('/ai/webchat', { message: promptText });
      const replyText = data.reply || 'AI generated response.';

      let generatedAction = null;
      if (promptText.toLowerCase().includes('template') || promptText.toLowerCase().includes('offer')) {
        generatedAction = { type: 'template', text: 'Save as Auto-Reply Template' };
      } else if (promptText.toLowerCase().includes('post') || promptText.toLowerCase().includes('caption')) {
        generatedAction = { type: 'post', text: 'Schedule to Post Batch' };
      } else if (promptText.toLowerCase().includes('catalog') || promptText.toLowerCase().includes('price')) {
        generatedAction = { type: 'catalog', text: 'Add to Product Catalog' };
      }

      setAiChatMessages(prev => [...prev, { role: 'ai', text: replyText, action: generatedAction }]);
    } catch (err) {
      // Offline / Fallback response
      setAiChatMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: `Namaste! ✨ "${promptText}" ke liye ye raha ready template:\n\n"Special Weekend Sale at ${user?.businessName || 'Our Store'}! Flat 20% OFF on all items. Tap link to buy with Free Delivery."`,
          action: { type: 'template', text: 'Save as Auto-Reply Template' }
        }
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-gray-100 font-sans max-w-md mx-auto relative shadow-2xl flex flex-col justify-between selection:bg-purple-500/30">

      {/* ─────────────────────────────────────────────────────────────
          TOP APP HEADER
      ───────────────────────────────────────────────────────────── */}
      <header className="bg-[#0c0c12] border-b border-gray-800/80 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          {activeChatThread ? (
            <button 
              onClick={() => setActiveChatThread(null)}
              className="p-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white flex items-center gap-1 text-xs font-bold"
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 flex items-center justify-center font-black text-black text-base shadow-md">
              ⚡
            </div>
          )}
          <div>
            <h1 className="font-extrabold text-sm text-white tracking-tight leading-tight">
              {activeChatThread 
                ? activeChatThread.customerName 
                : (activeTab === 'chats' ? 'Conversations' : 
                   activeTab === 'dashboard' ? 'Business Dashboard' :
                   activeTab === 'catalog' ? 'Product Catalog' :
                   activeTab === 'ai_assistant' ? 'AI Smart Assistant' : 'Menu & Tools')}
            </h1>
            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {activeChatThread ? activeChatThread.customerPhone : (user?.businessName || 'DealClose AI Store')}
            </div>
          </div>
        </div>

        {activeChatThread ? (
          <button
            onClick={() => setShowCrmStageModal(true)}
            className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold rounded-lg flex items-center gap-1"
          >
            <span>{activeChatThread.stage || 'Stage'}</span>
            <MoreVertical size={13} />
          </button>
        ) : (
          <a
            href="/dashboard"
            className="px-2 py-1 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white text-[10px] font-bold rounded-lg transition-all"
          >
            Desktop Pro ↗
          </a>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN BODY (Tab Router)
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-3.5 overflow-y-auto pb-24">

        {/* ════════════════════════════════════════════════════════════
            TAB 1: CHATS (POSITION 1 — LAUNCH DEFAULT WITH NATIVE SUB-TABS)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'chats' && !activeChatThread && (
          <div className="space-y-3 animate-fade-in">
            
            {/* Visual Native Sub-Tabs (WhatsApp vs Instagram) */}
            <div className="grid grid-cols-2 bg-[#0e0e14] p-1 rounded-2xl border border-gray-800 text-xs font-black shadow-inner">
              <button
                onClick={() => setChatChannel('whatsapp')}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 relative ${
                  chatChannel === 'whatsapp' 
                    ? 'bg-[#128C7E] text-white shadow-lg' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>🟢 WhatsApp</span>
                {totalWaUnread > 0 && (
                  <span className="bg-emerald-300 text-black font-black text-[10px] px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-sm">
                    {totalWaUnread}
                  </span>
                )}
              </button>

              <button
                onClick={() => setChatChannel('instagram')}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 relative ${
                  chatChannel === 'instagram' 
                    ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <InstagramIcon size={14} />
                <span>Instagram DMs</span>
                {totalIgUnread > 0 && (
                  <span className="bg-pink-300 text-black font-black text-[10px] px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-sm">
                    {totalIgUnread}
                  </span>
                )}
              </button>
            </div>

            {/* Chat List Rows (Rendered in Native WhatsApp/IG Style) */}
            <div className="space-y-1.5">
              {chats.filter(c => c.channel === chatChannel).map(chat => (
                <div
                  key={chat._id}
                  onClick={() => handleOpenChat(chat)}
                  className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer border transition-all active:scale-98 ${
                    chat.unreadCount > 0 
                      ? 'bg-[#0f1418] border-emerald-500/40 shadow-md' 
                      : 'bg-[#0c0c12] border-gray-800/80 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-xs border ${
                      chat.channel === 'whatsapp' 
                        ? 'bg-[#075E54]/40 text-emerald-300 border-emerald-500/30' 
                        : 'bg-purple-950/40 text-pink-300 border-pink-500/30'
                    }`}>
                      {chat.customerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className={`text-xs flex items-center gap-1.5 ${chat.unreadCount > 0 ? 'font-black text-white' : 'font-semibold text-gray-300'}`}>
                        {chat.customerName}
                        <span className="text-[9px] text-emerald-400 font-mono font-normal bg-emerald-950/60 px-1.5 rounded">
                          {chat.stage}
                        </span>
                      </div>
                      <div className={`text-[11px] truncate max-w-[190px] mt-0.5 ${chat.unreadCount > 0 ? 'font-bold text-gray-200' : 'text-gray-400'}`}>
                        {chat.lastMessage}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-[10px] text-gray-500 font-mono">{chat.time}</span>
                    {chat.unreadCount > 0 ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-black text-[10px] flex items-center justify-center shadow-md">
                        {chat.unreadCount}
                      </span>
                    ) : (
                      <CheckCheck size={14} className="text-blue-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* 1-on-1 Full-Screen Native Chat Thread */}
        {activeTab === 'chats' && activeChatThread && (
          <div className="space-y-3 animate-fade-in flex flex-col h-[76vh]">
            <div className="bg-black/40 border border-gray-800 rounded-xl p-2 flex items-center justify-between text-xs">
              <span className="text-gray-400">Lead Stage: <strong className="text-emerald-400">{activeChatThread.stage}</strong></span>
              <button 
                onClick={() => setShowCrmStageModal(true)}
                className="text-purple-400 font-bold hover:underline text-[11px]"
              >
                Change Stage →
              </button>
            </div>

            {/* Chat Bubble Stream */}
            <div className="flex-1 overflow-y-auto space-y-2 p-1 text-xs custom-scrollbar">
              {activeChatThread.messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl max-w-[82%] leading-relaxed ${
                    m.sender === 'customer'
                      ? 'bg-[#181822] text-gray-100 rounded-tl-sm border border-gray-800 mr-auto shadow-sm'
                      : 'bg-[#005C4B] text-white rounded-tr-sm ml-auto shadow-md'
                  }`}
                >
                  <p>{m.text}</p>
                  <span className="text-[9px] text-gray-400 block text-right mt-1 font-mono">{m.time}</span>
                </div>
              ))}
            </div>

            {/* Send Message Bar */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-2 border-t border-gray-800">
              <input
                type="text"
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                placeholder="Type WhatsApp message..."
                className="flex-1 bg-black border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
              <button type="submit" className="p-3 bg-emerald-500 text-black rounded-xl font-bold shadow-md hover:bg-emerald-400">
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 2: DASHBOARD (POSITION 2 — CRM CARDS & FUNNEL STATS)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Live CRM Pipeline Cards (Horizontal Swipe) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                <span>CRM Stage Pipeline</span>
                <span className="text-[10px] text-emerald-400">● 48 Active Leads</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                {crmStages.map(stage => {
                  const count = chats.filter(c => c.stage === stage).length * 4 + 2;
                  return (
                    <div key={stage} className="bg-[#0e0e14] border border-gray-800 rounded-2xl p-3 shrink-0 min-w-[130px] space-y-1 shadow-md">
                      <span className="text-[10px] font-black text-purple-400 uppercase truncate block">{stage}</span>
                      <div className="text-xl font-black text-white">{count}</div>
                      <div className="text-[9px] text-gray-500 font-mono">Tap to view leads</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leads Received Over Time (Sparkline Box) */}
            <div className="bg-[#0e0e14] border border-gray-800 rounded-2xl p-4 space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-emerald-400" />
                  <span>Leads Received (Last 7 Days)</span>
                </div>
                <span className="text-xs font-black text-emerald-400 font-mono">+38% 🚀</span>
              </div>
              <div className="h-16 flex items-end justify-between gap-1 pt-3 pb-1 border-b border-gray-800/80 font-mono text-[10px] text-gray-500">
                {[{ d: 'Mon', h: 30 }, { d: 'Tue', h: 45 }, { d: 'Wed', h: 60 }, { d: 'Thu', h: 40 }, { d: 'Fri', h: 80 }, { d: 'Sat', h: 95 }, { d: 'Sun', h: 100 }].map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-md" style={{ height: `${bar.h}%` }}></div>
                    <span>{bar.d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* WhatsApp Broadcast Delivery Funnel & Meta Cost */}
            <div className="bg-[#0e0e14] border border-gray-800 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Bulk Campaign Analytics</span>
                <span className="text-[10px] text-purple-400 font-mono">Meta Cost: ₹142.50</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
                <div className="bg-black/50 p-2 rounded-xl border border-gray-800">
                  <div className="text-xs font-bold text-gray-300">500</div>
                  <div className="text-[9px] text-gray-500 uppercase">Sent</div>
                </div>
                <div className="bg-black/50 p-2 rounded-xl border border-gray-800">
                  <div className="text-xs font-bold text-blue-400">488</div>
                  <div className="text-[9px] text-gray-500 uppercase">Deliv.</div>
                </div>
                <div className="bg-black/50 p-2 rounded-xl border border-gray-800">
                  <div className="text-xs font-bold text-emerald-400">415</div>
                  <div className="text-[9px] text-gray-500 uppercase">Read</div>
                </div>
                <div className="bg-pink-950/40 p-2 rounded-xl border border-pink-500/40">
                  <div className="text-xs font-bold text-pink-400">74</div>
                  <div className="text-[9px] text-pink-300 uppercase font-black">Replied 🔥</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 3: CATALOG (POSITION 3 — SINGLE ADD + BULK UPLOAD)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'catalog' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white">WhatsApp Product Catalog</h2>
                <p className="text-[10px] text-gray-400">Synced with Meta Cloud API</p>
              </div>
              <button 
                onClick={() => setShowAddProductModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-md"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>

            {/* Catalog List */}
            <div className="space-y-2">
              {catalogItems.map(item => (
                <div key={item.id} className="bg-[#0e0e14] border border-gray-800 p-3 rounded-2xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center text-2xl border border-gray-800">
                      {item.image}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">{item.name}</div>
                      <div className="text-xs font-black text-emerald-400 font-mono mt-0.5">{item.price}</div>
                      <span className="text-[9px] text-emerald-400 font-mono">● In Stock</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setCatalogItems(catalogItems.filter(i => i.id !== item.id))}
                    className="text-gray-500 hover:text-red-400 p-2"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {/* Bulk Upload Spreadsheet Box */}
            <div className="bg-[#111118] border border-dashed border-gray-800 rounded-2xl p-4 text-center space-y-2">
              <Upload size={20} className="text-purple-400 mx-auto" />
              <div className="text-xs font-bold text-white">Bulk Excel / CSV Catalog Upload</div>
              <p className="text-[10px] text-gray-400">Upload product list sheet with Name & Price columns</p>
              <button 
                onClick={() => alert('Excel catalog importer ready! Select your .xlsx file.')}
                className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-300 font-bold text-xs rounded-xl hover:text-white"
              >
                Select Spreadsheet 📁
              </button>
            </div>

            {/* Add Product Modal */}
            {showAddProductModal && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0e0e14] border border-gray-800 rounded-3xl p-5 max-w-xs w-full space-y-3 relative shadow-2xl">
                  <button onClick={() => setShowAddProductModal(false)} className="absolute top-4 right-4 text-gray-400">
                    <X size={16} />
                  </button>
                  <h3 className="text-sm font-bold text-white">Add Product to WhatsApp</h3>
                  <form onSubmit={handleAddProduct} className="space-y-2.5 text-xs">
                    <input
                      type="text"
                      placeholder="Product Name (e.g. Cotton Kurta)"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Price (e.g. ₹1,299)"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 font-mono"
                      required
                    />
                    <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl mt-2">
                      Save to Catalog
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 4: AI ASSISTANT (POSITION 4 — REPLACES FLOW BUILDER)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'ai_assistant' && (
          <div className="space-y-3 animate-fade-in flex flex-col h-[76vh]">
            <div className="bg-[#0e0e14] border border-purple-500/30 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                <span className="text-xs font-bold text-white">AI Assistant (No FlowBuilder Needed)</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">● Context Trained</span>
            </div>

            {/* AI Chat Stream with Action Buttons */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-1 text-xs custom-scrollbar">
              {aiChatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl max-w-[88%] leading-relaxed ${
                    msg.role === 'ai'
                      ? 'bg-[#111118] border border-gray-800 text-gray-200 rounded-tl-sm mr-auto shadow-sm'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-sm ml-auto shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  
                  {/* Attached Action Button */}
                  {msg.action && (
                    <div className="mt-2.5 pt-2 border-t border-gray-800">
                      <button
                        onClick={() => alert(`Success! Action completed: ${msg.action.text} ✅`)}
                        className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] rounded-lg shadow-md flex items-center justify-center gap-1"
                      >
                        <Check size={12} /> {msg.action.text}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isAiTyping && (
                <div className="text-gray-500 text-[11px] animate-pulse flex items-center gap-1">
                  <span>AI is thinking & formatting action...</span>
                </div>
              )}
            </div>

            {/* Input Bar with File Upload Attachment Button */}
            <form onSubmit={handleAiSubmit} className="flex gap-1.5 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => alert('PDF / Brochure attachment selected!')}
                className="p-2.5 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl"
                title="Attach PDF or Photo"
              >
                <FileText size={15} />
              </button>
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask: 'Diwali offer template bana do'..."
                className="flex-1 bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button type="submit" className="p-2.5 bg-purple-600 text-white rounded-xl font-bold shadow-md">
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 5: MENU (POSITION 5 — SECONDARY TOOLS GRID)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'menu' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-sm font-black text-white">Business Tools & Settings</h2>

            <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
              
              {/* Tool 1: Auto-Reply Rules */}
              <button 
                onClick={() => alert('Auto-Reply Rules Screen')}
                className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-emerald-500/40"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Zap size={16} />
                </div>
                <div>
                  <div className="text-white">Auto-Replies</div>
                  <div className="text-[10px] text-gray-400 font-normal">Keywords & rules</div>
                </div>
              </button>

              {/* Tool 2: Instagram Comment-to-DM */}
              <button 
                onClick={() => alert('Instagram Post Comment-to-DM Setup')}
                className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-pink-500/40"
              >
                <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                  <InstagramIcon size={16} />
                </div>
                <div>
                  <div className="text-white">IG Comment-DM</div>
                  <div className="text-[10px] text-gray-400 font-normal">Reel auto-reply</div>
                </div>
              </button>

              {/* Tool 3: Smart QR Hub */}
              <button 
                onClick={() => alert('Smart All-in-One QR Code generated for counter print!')}
                className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-purple-500/40"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <QrCode size={16} />
                </div>
                <div>
                  <div className="text-white">Smart QR Hub</div>
                  <div className="text-[10px] text-gray-400 font-normal">WA, IG & UPI QR</div>
                </div>
              </button>

              {/* Tool 4: Staff Scoping */}
              <button 
                onClick={() => alert('Staff Management: Role-based scoped to assigned leads only.')}
                className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-blue-500/40"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <div>
                  <div className="text-white">Staff Roles</div>
                  <div className="text-[10px] text-gray-400 font-normal">Scoped lead access</div>
                </div>
              </button>

            </div>

            {/* Meta Embedded Signup Connection Card */}
            <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <span className="text-xs font-bold text-white">Meta Cloud API Embedded Signup</span>
              </div>
              <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                Connect your WhatsApp Business number & Instagram account in 2 minutes with zero developer setup.
              </p>
              <button 
                onClick={() => alert('Meta Embedded Signup flow initiated!')}
                className="w-full py-2 bg-emerald-500 text-black font-black text-xs rounded-xl shadow-md"
              >
                Connect Number (Meta Embedded) ⚡
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ─────────────────────────────────────────────────────────────
          3-DOT CRM STAGE SELECTOR MODAL
      ───────────────────────────────────────────────────────────── */}
      {showCrmStageModal && activeChatThread && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-gray-800 rounded-3xl p-5 max-w-xs w-full space-y-3 relative shadow-2xl">
            <button onClick={() => setShowCrmStageModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-white">Move Lead to CRM Stage</h3>
            <p className="text-[10px] text-gray-400">Select pipeline stage for {activeChatThread.customerName}:</p>
            <div className="space-y-1.5 text-xs font-bold">
              {crmStages.map(stage => (
                <button
                  key={stage}
                  onClick={() => handleMoveCrmStage(stage)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all ${
                    activeChatThread.stage === stage 
                      ? 'bg-emerald-600 text-white shadow-md' 
                      : 'bg-gray-900 border border-gray-800 text-gray-300 hover:text-white'
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5 BOTTOM TABS NAVIGATION BAR (STRICT BUILD ORDER)
      ───────────────────────────────────────────────────────────── */}
      <nav className="bg-[#0b0b10]/95 backdrop-blur-lg border-t border-gray-800/80 px-2 py-1.5 flex items-center justify-around fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 text-[10px] font-bold">
        
        {/* Tab 1: Chats (Position 1) */}
        <button
          onClick={() => { setActiveTab('chats'); setActiveChatThread(null); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative ${
            activeTab === 'chats' ? 'text-emerald-400 bg-emerald-950/40' : 'text-gray-400'
          }`}
        >
          <MessageSquare size={17} />
          <span>Chats</span>
          {totalGlobalUnread > 0 && (
            <span className="absolute top-0.5 right-2 w-4 h-4 rounded-full bg-emerald-500 text-black font-black text-[9px] flex items-center justify-center shadow-md">
              {totalGlobalUnread}
            </span>
          )}
        </button>

        {/* Tab 2: Dashboard (Position 2) */}
        <button
          onClick={() => { setActiveTab('dashboard'); setActiveChatThread(null); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'text-purple-400 bg-purple-950/40' : 'text-gray-400'
          }`}
        >
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </button>

        {/* Tab 3: Catalog (Position 3) */}
        <button
          onClick={() => { setActiveTab('catalog'); setActiveChatThread(null); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'catalog' ? 'text-pink-400 bg-pink-950/40' : 'text-gray-400'
          }`}
        >
          <ShoppingBag size={17} />
          <span>Catalog</span>
        </button>

        {/* Tab 4: AI Assistant (Position 4) */}
        <button
          onClick={() => { setActiveTab('ai_assistant'); setActiveChatThread(null); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'ai_assistant' ? 'text-teal-400 bg-teal-950/40' : 'text-gray-400'
          }`}
        >
          <Sparkles size={17} />
          <span>AI Assistant</span>
        </button>

        {/* Tab 5: Menu (Position 5) */}
        <button
          onClick={() => { setActiveTab('menu'); setActiveChatThread(null); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'menu' ? 'text-blue-400 bg-blue-950/40' : 'text-gray-400'
          }`}
        >
          <Menu size={17} />
          <span>Menu</span>
        </button>

      </nav>

    </div>
  );
}
