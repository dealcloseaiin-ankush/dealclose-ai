import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Users, Zap, Instagram, Sparkles, Phone, 
  Send, Plus, Upload, CheckCircle2, ChevronRight, ArrowLeft,
  Flame, HelpCircle, Bell, Search, Image as ImageIcon, Calendar,
  ShieldCheck, RefreshCw, X, SlidersHorizontal, Layers
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const InstagramIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export default function MobileDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active View State: 'home' | 'chats' | 'crm' | 'automations' | 'posts' | 'ai-assistant'
  const [activeTab, setActiveTab] = useState('home');

  // Sub-tab states
  const [chatChannel, setChatChannel] = useState('whatsapp'); // 'whatsapp' | 'instagram'
  const [crmPlatformFilter, setCrmPlatformFilter] = useState('all'); // 'all' | 'whatsapp' | 'instagram'

  // Data states
  const [stats, setStats] = useState({ todayLeads: 12, hotReplied: 5, activeOrders: 3 });
  const [chatsList, setChatsList] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Quick Add Contact Modal State
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', city: '' });

  // AI Assistant Chat State
  const [aiChatMessages, setAiChatMessages] = useState([
    { role: 'ai', text: 'Namaste! 👋 Main DealClose AI assistant hoon. Aap mujhse WhatsApp templates, Instagram post captions, ya business ideas banwa sakte hain!' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Automation Rule Card States
  const [waAutoReplyOn, setWaAutoReplyOn] = useState(true);
  const [igAutoReplyOn, setIgAutoReplyOn] = useState(true);
  const [igKeyword, setIgKeyword] = useState('PRICE');
  const [igPublicReply, setIgPublicReply] = useState('Check your DM! Details sent. 📩');
  const [igDmBody, setIgDmBody] = useState('Hey! Here is our latest catalog & direct order link. Tap below to buy!');

  // Instagram Post Details State
  const [selectedPost, setSelectedPost] = useState(null);
  const [postCaption, setPostCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchQuickData();
  }, []);

  const fetchQuickData = async () => {
    try {
      setLoading(true);
      const [chatsRes, contactsRes] = await Promise.allSettled([
        api.get('/chats'),
        api.get('/contacts')
      ]);

      if (chatsRes.status === 'fulfilled' && chatsRes.value.data) {
        setChatsList(chatsRes.value.data.chats || chatsRes.value.data || []);
      }
      if (contactsRes.status === 'fulfilled' && contactsRes.value.data) {
        setContactsList(contactsRes.value.data.contacts || contactsRes.value.data || []);
      }
    } catch (err) {
      console.error('Quick data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.phone) return alert('Phone number zaroori hai!');

    try {
      await api.post('/contacts', {
        name: newContact.name || 'New Lead',
        phone: newContact.phone,
        city: newContact.city || 'India',
        source: 'manual_mobile_add'
      });
      alert('Contact CRM mein save ho gaya! ✅');
      setNewContact({ name: '', phone: '', city: '' });
      setShowAddContactModal(false);
      fetchQuickData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving contact');
    }
  };

  const handleAiChatSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userText = aiInput;
    setAiChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setAiInput('');
    setIsAiTyping(true);

    try {
      const { data } = await api.post('/ai/webchat', { message: userText });
      setAiChatMessages(prev => [...prev, { role: 'ai', text: data.reply || 'AI responded.' }]);
    } catch (err) {
      setAiChatMessages(prev => [...prev, { role: 'ai', text: 'Error connecting to AI. Please try again!' }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 font-sans pb-20">
      
      {/* Top Mobile App Header */}
      <header className="bg-[#0e0e13] border-b border-gray-800/80 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-emerald-400 flex items-center justify-center font-black text-black text-base shadow-md">
            ⚡
          </div>
          <div>
            <div className="font-extrabold text-sm text-white tracking-tight leading-tight">
              DealClose <span className="text-purple-400">Mobile</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {user?.businessName || 'My Business'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch to Desktop Pro Mode */}
          <Link
            to="/dashboard"
            className="px-2.5 py-1 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
          >
            <SlidersHorizontal size={11} /> Pro Studio
          </Link>
        </div>
      </header>

      {/* Main View Switcher */}
      <div className="max-w-md mx-auto p-4 space-y-4">

        {/* ════════════════════════════════════════════════════════════════
            VIEW 1: HOME (THE 5 MAIN TILES)
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Quick Status Bar */}
            <div className="bg-gradient-to-r from-purple-950/40 via-gray-950 to-emerald-950/30 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[10px] font-black text-purple-400 uppercase">Today's Snapshot</span>
                <div className="text-lg font-black text-white mt-0.5">14 Inquiries • 5 Hot Leads</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ● Auto-Pilot ON
                </span>
              </div>
            </div>

            {/* 5 Main Tiles Grid */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Tile 1: Chats Hub */}
              <button
                onClick={() => setActiveTab('chats')}
                className="bg-[#0e0e13] border border-gray-800 hover:border-emerald-500/50 p-4 rounded-2xl text-left flex flex-col justify-between transition-all shadow-md active:scale-95"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                    <MessageSquare size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-white leading-tight">Live Chats Hub</h3>
                  <p className="text-[11px] text-gray-400 mt-1">WhatsApp & Instagram separate tabs</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-emerald-400 pt-2 border-t border-gray-800/80">
                  <span>Open Inbox</span>
                  <ChevronRight size={13} />
                </div>
              </button>

              {/* Tile 2: Unified CRM */}
              <button
                onClick={() => setActiveTab('crm')}
                className="bg-[#0e0e13] border border-gray-800 hover:border-blue-500/50 p-4 rounded-2xl text-left flex flex-col justify-between transition-all shadow-md active:scale-95"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2.5">
                    <Users size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-white leading-tight">Unified CRM</h3>
                  <p className="text-[11px] text-gray-400 mt-1">All contacts, Excel & broadcast funnel</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-blue-400 pt-2 border-t border-gray-800/80">
                  <span>View Contacts</span>
                  <ChevronRight size={13} />
                </div>
              </button>

              {/* Tile 3: Automations Hub */}
              <button
                onClick={() => setActiveTab('automations')}
                className="bg-[#0e0e13] border border-gray-800 hover:border-purple-500/50 p-4 rounded-2xl text-left flex flex-col justify-between transition-all shadow-md active:scale-95"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5">
                    <Zap size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-white leading-tight">Automations</h3>
                  <p className="text-[11px] text-gray-400 mt-1">WhatsApp & IG Comment-to-DM rules</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-purple-400 pt-2 border-t border-gray-800/80">
                  <span>Manage Rules</span>
                  <ChevronRight size={13} />
                </div>
              </button>

              {/* Tile 4: Instagram Post Details */}
              <button
                onClick={() => setActiveTab('posts')}
                className="bg-[#0e0e13] border border-gray-800 hover:border-pink-500/50 p-4 rounded-2xl text-left flex flex-col justify-between transition-all shadow-md active:scale-95"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-2.5">
                    <InstagramIcon size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-white leading-tight">Post Publisher</h3>
                  <p className="text-[11px] text-gray-400 mt-1">Write captions & publish to Instagram</p>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-pink-400 pt-2 border-t border-gray-800/80">
                  <span>Create Post</span>
                  <ChevronRight size={13} />
                </div>
              </button>

              {/* Tile 5: AI Business Assistant (Full Width) */}
              <button
                onClick={() => setActiveTab('ai-assistant')}
                className="col-span-2 bg-gradient-to-r from-purple-950/40 via-[#0e0e13] to-pink-950/40 border border-purple-500/40 p-4 rounded-2xl text-left flex items-center justify-between transition-all shadow-md active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Chat with AI Assistant</h3>
                    <p className="text-[11px] text-gray-400">Ask AI to write templates, captions & offers</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-purple-400 shrink-0" />
              </button>

            </div>

            {/* Quick Actions Tray */}
            <div className="bg-[#0e0e13] border border-gray-800 rounded-2xl p-4 space-y-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Fast Actions</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowAddContactModal(true)}
                  className="bg-gray-900 border border-gray-800 hover:border-gray-700 p-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} className="text-emerald-400" /> Add Contact
                </button>
                <Link
                  to="/industries"
                  className="bg-gray-900 border border-gray-800 hover:border-gray-700 p-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                >
                  <Layers size={14} className="text-purple-400" /> Industry Flow
                </Link>
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            VIEW 2: CHATS HUB (SEPARATE WHATSAPP & INSTAGRAM TABS)
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'chats' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => setActiveTab('home')} className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <ArrowLeft size={14} /> Back
              </button>
              <h2 className="text-sm font-bold text-white">Live Chats</h2>
              <span className="text-[10px] text-gray-500 font-mono">Real-time sync</span>
            </div>

            {/* Channel Tabs */}
            <div className="grid grid-cols-2 bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs font-bold">
              <button
                onClick={() => setChatChannel('whatsapp')}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  chatChannel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400'
                }`}
              >
                <span>🟢 WhatsApp Chats</span>
              </button>
              <button
                onClick={() => setChatChannel('instagram')}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  chatChannel === 'instagram' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400'
                }`}
              >
                <span>🟣 Instagram DMs</span>
              </button>
            </div>

            {/* Chats List */}
            <div className="space-y-2">
              {chatChannel === 'whatsapp' ? (
                <div className="space-y-2">
                  <div className="bg-[#0e0e13] border border-gray-800 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-emerald-500/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-700/30 text-emerald-400 font-bold flex items-center justify-center text-xs">
                        RV
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">Rahul Verma</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">"Please send size XL catalog"</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500">2m ago</span>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 ml-auto mt-1"></div>
                    </div>
                  </div>

                  <div className="bg-[#0e0e13] border border-gray-800 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-emerald-500/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-700/30 text-purple-400 font-bold flex items-center justify-center text-xs">
                        PA
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">Pooja Agarwal</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">"What is today gold rate?"</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500">14m ago</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-[#0e0e13] border border-gray-800 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-pink-500/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pink-700/30 text-pink-400 font-bold flex items-center justify-center text-xs">
                        IG
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">@priya_designs</div>
                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">"Commented: PRICE on Reel #4"</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-pink-400 font-bold bg-pink-950/60 px-2 py-0.5 rounded-full">Reel DM Sent</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            VIEW 3: UNIFIED CRM & BROADCAST
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'crm' && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => setActiveTab('home')} className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <ArrowLeft size={14} /> Back
              </button>
              <h2 className="text-sm font-bold text-white">Unified CRM & Broadcast</h2>
              <button onClick={() => setShowAddContactModal(true)} className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <Plus size={13} /> Add
              </button>
            </div>

            {/* Platform Dropdown Filter */}
            <div className="flex items-center justify-between gap-2 bg-gray-900 border border-gray-800 p-2 rounded-xl text-xs">
              <span className="text-gray-400 font-bold">Filter By Source:</span>
              <select
                value={crmPlatformFilter}
                onChange={(e) => setCrmPlatformFilter(e.target.value)}
                className="bg-black text-white font-bold text-xs px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-none"
              >
                <option value="all">🌐 All Platforms (WhatsApp + IG)</option>
                <option value="whatsapp">🟢 WhatsApp Inquiries Only</option>
                <option value="instagram">🟣 Instagram Reel/DM Leads</option>
              </select>
            </div>

            {/* Broadcast Delivery Funnel Box */}
            <div className="bg-[#0e0e13] border border-gray-800 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-purple-400 uppercase">Recent Broadcast Funnel</span>
                <span className="text-[10px] text-gray-500">500 Targeted</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
                <div className="bg-black/50 p-2 rounded-xl border border-gray-800">
                  <div className="text-xs font-bold text-gray-300">490</div>
                  <div className="text-[9px] text-gray-500 uppercase">Sent</div>
                </div>
                <div className="bg-black/50 p-2 rounded-xl border border-gray-800">
                  <div className="text-xs font-bold text-blue-400">475</div>
                  <div className="text-[9px] text-gray-500 uppercase">Deliv.</div>
                </div>
                <div className="bg-black/50 p-2 rounded-xl border border-gray-800">
                  <div className="text-xs font-bold text-emerald-400">410</div>
                  <div className="text-[9px] text-gray-500 uppercase">Read</div>
                </div>
                <div className="bg-purple-950/40 p-2 rounded-xl border border-purple-500/40">
                  <div className="text-xs font-bold text-pink-400">68</div>
                  <div className="text-[9px] text-pink-300 uppercase font-black">Replied 🔥</div>
                </div>
              </div>
            </div>

            {/* Contacts Table List */}
            <div className="bg-[#0e0e13] border border-gray-800 rounded-2xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-gray-400 uppercase">Saved Leads ({contactsList.length || 24})</div>
              <div className="space-y-1.5 text-xs">
                <div className="bg-black/40 p-2.5 rounded-xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">Vikram Oberoi</div>
                    <div className="text-[10px] text-gray-400">Raipur • 3BHK Lead</div>
                  </div>
                  <div className="flex gap-1.5">
                    <a href="tel:+919876543210" className="p-1.5 bg-gray-900 border border-gray-800 rounded-lg text-emerald-400">
                      <Phone size={12} />
                    </a>
                    <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="p-1.5 bg-gray-900 border border-gray-800 rounded-lg text-green-400">
                      <MessageSquare size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            VIEW 4: AUTOMATIONS HUB (INSTAGRAM + WHATSAPP RULES)
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'automations' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => setActiveTab('home')} className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <ArrowLeft size={14} /> Back
              </button>
              <h2 className="text-sm font-bold text-white">Automations Hub</h2>
              <span className="text-[10px] text-emerald-400 font-mono">Live</span>
            </div>

            {/* Instagram Comment-to-DM Setup Card */}
            <div className="bg-[#0e0e13] border-2 border-purple-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <InstagramIcon size={16} className="text-pink-400" />
                  <h3 className="text-xs font-bold text-white">Instagram Reel Comment-to-DM</h3>
                </div>
                <button
                  onClick={() => setIgAutoReplyOn(!igAutoReplyOn)}
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    igAutoReplyOn ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {igAutoReplyOn ? 'ACTIVE' : 'OFF'}
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-gray-400">Trigger Keyword:</label>
                  <input
                    type="text"
                    value={igKeyword}
                    onChange={(e) => setIgKeyword(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                    placeholder="e.g. PRICE, LINK"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400">Public Comment Reply:</label>
                  <input
                    type="text"
                    value={igPublicReply}
                    onChange={(e) => setIgPublicReply(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400">Private DM Body:</label>
                  <textarea
                    rows={2}
                    value={igDmBody}
                    onChange={(e) => setIgDmBody(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp Auto-Reply Card */}
            <div className="bg-[#0e0e13] border border-gray-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-emerald-400" />
                  <h3 className="text-xs font-bold text-white">WhatsApp Auto-Greeting & City Extractor</h3>
                </div>
                <button
                  onClick={() => setWaAutoReplyOn(!waAutoReplyOn)}
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    waAutoReplyOn ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {waAutoReplyOn ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                When a new customer says "Hi", AI automatically asks for Name & City and saves them to CRM.
              </p>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            VIEW 5: INSTAGRAM POST PUBLISHER & CAPTION DETAILS
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'posts' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => setActiveTab('home')} className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <ArrowLeft size={14} /> Back
              </button>
              <h2 className="text-sm font-bold text-white">Post Publisher</h2>
              <span className="text-[10px] text-pink-400 font-mono">Instagram Live</span>
            </div>

            <div className="bg-[#0e0e13] border border-gray-800 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <ImageIcon size={16} className="text-pink-400" /> Write Post Details
              </div>

              <textarea
                rows={4}
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                placeholder="Type your post caption, festival discount, or hashtags..."
                className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => alert('Post scheduled for Instagram & Facebook! 🚀')}
                  className="py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs rounded-xl shadow-md"
                >
                  Post Now 🚀
                </button>
                <button
                  onClick={() => alert('Post scheduled for next 7 days! 📅')}
                  className="py-2.5 bg-gray-900 border border-gray-800 text-gray-300 font-bold text-xs rounded-xl hover:text-white"
                >
                  Schedule (1 Week)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            VIEW 6: AI BUSINESS ASSISTANT CHAT
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ai-assistant' && (
          <div className="space-y-3 animate-fade-in flex flex-col h-[calc(100vh-140px)]">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
              <button onClick={() => setActiveTab('home')} className="text-xs font-bold text-gray-400 flex items-center gap-1">
                <ArrowLeft size={14} /> Back
              </button>
              <h2 className="text-sm font-bold text-white flex items-center gap-1">
                <Sparkles size={14} className="text-purple-400" /> AI Business Assistant
              </h2>
              <span className="text-[10px] text-emerald-400 font-mono">Ready</span>
            </div>

            {/* Chat Bubble Stream */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-1 text-xs">
              {aiChatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-2xl max-w-[85%] ${
                    msg.role === 'ai'
                      ? 'bg-[#111118] border border-gray-800 text-gray-200 rounded-tl-sm'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white ml-auto rounded-tr-sm'
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              ))}
              {isAiTyping && (
                <div className="text-gray-500 text-[11px] animate-pulse flex items-center gap-1">
                  <span>AI is typing template...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleAiChatSubmit} className="flex gap-2 pt-2 border-t border-gray-800">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask AI: 'Make a discount WhatsApp template'..."
                className="flex-1 bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Quick Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e13] border border-gray-800 rounded-2xl p-5 max-w-xs w-full space-y-3 relative">
            <button
              onClick={() => setShowAddContactModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-white">Quick Add Contact to CRM</h3>
            <form onSubmit={handleQuickAddContact} className="space-y-2.5 text-xs">
              <input
                type="text"
                placeholder="Customer Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2 text-white focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Mobile Number (with +91)"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2 text-white focus:outline-none font-mono"
                required
              />
              <input
                type="text"
                placeholder="City / Area"
                value={newContact.city}
                onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2 text-white focus:outline-none"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs mt-2"
              >
                Save Contact to CRM
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Sticky Mobile Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c10]/95 backdrop-blur-md border-t border-gray-800/80 px-2 py-1.5 flex items-center justify-around text-[10px] font-bold">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'home' ? 'text-purple-400 bg-purple-950/40' : 'text-gray-400'
          }`}
        >
          <Layers size={16} />
          <span>Home</span>
        </button>

        <button
          onClick={() => setActiveTab('chats')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'chats' ? 'text-emerald-400 bg-emerald-950/40' : 'text-gray-400'
          }`}
        >
          <MessageSquare size={16} />
          <span>Chats</span>
        </button>

        <button
          onClick={() => setActiveTab('crm')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'crm' ? 'text-blue-400 bg-blue-950/40' : 'text-gray-400'
          }`}
        >
          <Users size={16} />
          <span>CRM</span>
        </button>

        <button
          onClick={() => setActiveTab('automations')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'automations' ? 'text-purple-400 bg-purple-950/40' : 'text-gray-400'
          }`}
        >
          <Zap size={16} />
          <span>Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('ai-assistant')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'ai-assistant' ? 'text-pink-400 bg-pink-950/40' : 'text-gray-400'
          }`}
        >
          <Sparkles size={16} />
          <span>AI Chat</span>
        </button>
      </nav>

    </div>
  );
}
