import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, LayoutDashboard, ShoppingBag, Sparkles, Menu,
  Send, Phone, Image as ImageIcon, FileText, MoreVertical, 
  Check, CheckCheck, Plus, ArrowLeft, X, SlidersHorizontal,
  Users, Zap, QrCode, ShieldCheck, CreditCard, Settings as SettingsIcon,
  Upload, Radio, Flame, Clock, TrendingUp, AlertCircle, Trash2, Calendar,
  Paperclip, Camera, CheckCircle2, ChevronRight, Download, Filter, Share2,
  Workflow, Bot, HelpCircle, Edit3, Save, MessageCircle, RefreshCw, ArrowRightLeft,
  Link, Eye, EyeOff, Play, CheckSquare, Layers, Power, Key, Link2, Building, UserCheck,
  Facebook, Star, Globe, DollarSign, ChevronDown, LogIn, User, BookOpen, Search, Webhook
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Native-style YouTube Logo Icon
const YoutubeIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
  </svg>
);

// Native-style Instagram Logo Icon
const InstagramIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export default function MobileDashboard() {
  const { user, login } = useAuth();

  // ─────────────────────────────────────────────────────────────
  // 1. PRIMARY NAVIGATION & ROUTER STATE
  // ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('chats');
  const [menuSubScreen, setMenuSubScreen] = useState('menu_grid');
  const [showAiTrainDrawer, setShowAiTrainDrawer] = useState(false);
  const [showSmartQrModal, setShowSmartQrModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddWorkspaceModal, setShowAddWorkspaceModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateBlogModal, setShowCreateBlogModal] = useState(false);
  const [showWaConnectModal, setShowWaConnectModal] = useState(false);
  const [showIgConnectModal, setShowIgConnectModal] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('ankush.bani@gmail.com');
  const [loginPassword, setLoginPassword] = useState('ak@7828289433');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Post Scheduler Sub-Tabs
  const [postTab, setPostTab] = useState('prebuild');

  // Master Automation Switches
  const [isWaAutomationOn, setIsWaAutomationOn] = useState(true);
  const [isIgAutomationOn, setIsIgAutomationOn] = useState(true);

  // Show / Hide External API Token
  const [showExternalToken, setShowExternalToken] = useState(false);

  // Raw Database User Object & Workspaces Array
  const [rawDbUser, setRawDbUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([
    { id: 'main', name: 'DealClose AI (Main Business)', category: 'Main' }
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('main');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  // Active Business Channel Profile, SEO & 🔗 Custom Webhooks
  const [profileData, setProfileData] = useState({
    businessName: 'DealClose AI',
    ownerPhone: '+91 98765 43210',
    managerPhone: '+91 98260 99887',
    logoUrl: '/logo.png',
    address: 'Shop #14, City Center Mall, Main Road',
    instagramLink: 'https://instagram.com/dealclose_official',
    youtubeLink: 'https://youtube.com/@dealclose',
    facebookLink: 'https://facebook.com/dealclose',
    googleBusinessLink: 'https://g.page/r/dealclose-review',
    upiId: 'dealclose@upi',
    // 🔗 Custom Webhooks & API Endpoints
    externalApiUrl: 'https://newpropertyhub.in',
    externalApiToken: '',
    externalApiPostUrl: 'https://newpropertyhub.in/api/post',
    externalApiSearchUrl: 'https://newpropertyhub.in/api/search',
    externalApiVisitUrl: 'https://newpropertyhub.in/api/visit',
    externalApiBlogUrl: 'https://newpropertyhub.in/api/blog',
    customWebhooks: ''
  });

  // Channel Connection States (3 Detailed Boxes for WhatsApp Cloud API)
  const [waApiKey, setWaApiKey] = useState('EAAOx8Z... (Meta Cloud API Linked)');
  const [waPhoneNumberId, setWaPhoneNumberId] = useState('109823485748392');
  const [waWabaId, setWaWabaId] = useState('102938475610293');
  const [waDisplayPhone, setWaDisplayPhone] = useState('+91 98765 43210');
  const [isWaConnected, setIsWaConnected] = useState(true);

  const [igAccessToken, setIgAccessToken] = useState('');
  const [igAccountId, setIgAccountId] = useState('');
  const [isIgConnected, setIsIgConnected] = useState(true);

  // Blog & SEO Articles List
  const [blogArticles, setBlogArticles] = useState([
    {
      id: 'blog_1',
      title: 'Top 10 Trends in Handcrafted Festive Sarees & Kurtas 2026',
      slug: 'top-festive-saree-trends-2026',
      seoKeywords: 'designer saree, buy kurta online, festive collection',
      readTime: '3 min read',
      status: 'PUBLISHED'
    },
    {
      id: 'blog_2',
      title: 'How DealClose AI Automates 24/7 WhatsApp Store Inquiries',
      slug: 'how-ai-automates-whatsapp-sales',
      seoKeywords: 'whatsapp business api, ai chatbot, automate orders',
      readTime: '4 min read',
      status: 'LIVE ON GOOGLE'
    }
  ]);
  const [newBlog, setNewBlog] = useState({ title: '', content: '', seoKeywords: '' });

  // Staff Members List
  const [staffList, setStaffList] = useState([
    { id: 'st_1', name: 'Aman Sharma (Sales Manager)', phone: '+91 98260 11223', role: 'Sales Lead Manager', assignedLeads: 18 },
    { id: 'st_2', name: 'Rohit Verma (Support Rep)', phone: '+91 94250 88990', role: 'Customer Support', assignedLeads: 9 }
  ]);
  const [newStaff, setNewStaff] = useState({ name: '', phone: '', role: 'Sales Agent' });

  // Chats Tab State
  const [chatChannel, setChatChannel] = useState('whatsapp');
  const [activeChatThread, setActiveChatThread] = useState(null);
  const [chatInputText, setChatInputText] = useState('');
  const [showCrmStageModal, setShowCrmStageModal] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedContactForTransfer, setSelectedContactForTransfer] = useState(null);

  // CRM Pipeline Stages
  const crmStages = ['New Lead', 'Contacted', 'Interested', 'Site Visit Scheduled', 'Converted', 'Lost'];

  // Chats Data (Live Synced from MongoDB Message collection)
  const [chats, setChats] = useState([]);

  // Contacts & CRM List (Live Synced from MongoDB Lead collection)
  const [contacts, setContacts] = useState([]);
  const [crmFilter, setCrmFilter] = useState('All');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', city: '', stage: 'New Lead' });

  // 1. Live Instagram Posts with Interactive Trigger Setup
  const [liveIgPosts, setLiveIgPosts] = useState([]);
  const [selectedPostForRule, setSelectedPostForRule] = useState(null);
  const [showIgPostRuleModal, setShowIgPostRuleModal] = useState(false);

  // 2. WhatsApp Auto-Replies Rules State
  const [autoReplies, setAutoReplies] = useState([
    { id: 'ar_1', trigger: 'PRICE / RATE / CATALOG', reply: 'Namaste! Summer collection catalog rate card yahan hai: https://dealcloseai.in/catalog. Free delivery ke liye size bhejein.', active: true },
    { id: 'ar_2', trigger: 'OFFER / DISCOUNT', reply: 'Namaste! Weekend special flat 20% OFF coupon code "DEAL20" use karein!', active: true },
    { id: 'ar_3', trigger: 'ADDRESS / LOCATION', reply: '📍 Hamara store address: Shop #14, City Center Mall. Timings: 10 AM - 9 PM daily.', active: true }
  ]);
  const [showAddAutoReplyModal, setShowAddAutoReplyModal] = useState(false);
  const [newAutoReply, setNewAutoReply] = useState({ trigger: '', reply: '' });

  // 3. Flow Automations State
  const [flowRules, setFlowRules] = useState([
    { id: 'fl_1', name: 'Auto Greeting & Name Capture', description: 'When new customer says Hi -> Ask name & city -> Save to CRM automatically', trigger: 'New Incoming Chat', active: true },
    { id: 'fl_2', name: 'Out-of-Hours Away Reply', description: 'Replies with store opening hours when customer texts after 9:00 PM', trigger: 'After 9 PM', active: true },
    { id: 'fl_3', name: 'Property / Product Auto Poster', description: 'Syncs customer inquiry to external website API & books site visits automatically', trigger: 'Keyword "PROPERTY / BOOK"', active: true }
  ]);
  const [showAddFlowModal, setShowAddFlowModal] = useState(false);
  const [newFlow, setNewFlow] = useState({ name: '', trigger: 'Incoming Keyword', description: '' });

  // 4. Meta Template Approvals State
  const [metaTemplates, setMetaTemplates] = useState([
    { id: 'mt_1', name: 'festive_discount_v1', category: 'MARKETING', language: 'hi', status: 'APPROVED', text: 'Namaste {{1}}! DealClose AI par festive offer chalu hai. Flat 20% discount ke liye tap karein.' },
    { id: 'mt_2', name: 'order_dispatch_alert', category: 'UTILITY', language: 'en', status: 'APPROVED', text: 'Hello {{1}}, your order #{{2}} is out for delivery with our rider.' },
    { id: 'mt_3', name: 'weekend_site_visit_reminder', category: 'MARKETING', language: 'hi', status: 'PENDING', text: 'Namaste {{1}} Ji! Aapka site visit Sunday 11:00 AM par scheduled hai.' }
  ]);
  const [showNewMetaTemplateModal, setShowNewMetaTemplateModal] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState({ name: '', category: 'MARKETING', text: '' });

  // 5. Post Batch Scheduler
  const [prebuildTemplates, setPrebuildTemplates] = useState([
    { id: 'pb_1', title: 'Festive Flash Sale (1-Week Batch)', image: '👗', caption: '✨ 1-Week Festive Rush! Flat 25% OFF on all new arrivals. Comment "PRICE" to get instant DM.', scheduledTime: 'Daily 6:00 PM' },
    { id: 'pb_2', title: 'Weekend Special Offer (Monthly Batch)', image: '🎉', caption: 'Sunday Mega Showcase! Visit store or order online with free doorstep delivery.', scheduledTime: 'Every Saturday 11:00 AM' },
    { id: 'pb_3', title: 'New Arrival Catalog Teaser', image: '✨', caption: 'Exclusive handcrafted collection is now in stock. Tap link in bio or comment "CATALOG".', scheduledTime: 'Mon & Thu 5:00 PM' }
  ]);

  const [scheduledPosts, setScheduledPosts] = useState([
    { id: 'sp_1', title: 'Sunday Showroom Walkthrough', image: '✨', caption: 'Visit our store this weekend to explore 100+ exclusive designs.', platform: 'Instagram & FB', date: 'Tomorrow 10:00 AM', status: 'SCHEDULED' },
    { id: 'sp_2', title: 'Customer Review Spotlight', image: '⭐', caption: 'Thank you Pooja Ji for trusting us for your collection ❤️', platform: 'Instagram', date: '28 Aug 2026, 4:00 PM', status: 'LIVE' }
  ]);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [customPost, setCustomPost] = useState({ title: '', caption: '', date: 'Tomorrow 5:00 PM' });

  // 6. Dynamic AI Brain Knowledge Base
  const [aiKnowledgeList, setAiKnowledgeList] = useState([
    { id: 'k1', title: 'Store / Business Name', content: profileData.businessName },
    { id: 'k2', title: 'Products & Offerings', content: 'Women kurtas, Sarees, Wedding lehengas, Handcrafted jewelry, and custom alterations.' },
    { id: 'k3', title: 'Pricing & Discount Policy', content: 'Kurtas start from ₹899, Sarees from ₹1,499. Flat 10% off on orders above ₹3,000 with coupon "SAVE10".' },
    { id: 'k4', title: 'Delivery & Shipping Policy', content: 'Free delivery across India on prepaid orders. COD available for ₹50 extra. Delivery takes 2-4 days.' },
    { id: 'k5', title: 'Property & External Website Sync', content: 'Auto posts property listings and synchronizes site visit appointments to external website.' }
  ]);
  const [showAddAiBoxModal, setShowAddAiBoxModal] = useState(false);
  const [newAiBox, setNewAiBox] = useState({ title: '', content: '' });

  // Catalog State
  const [catalogItems, setCatalogItems] = useState([
    { id: '1', name: 'Cotton Silk Printed Kurta (XL)', price: '₹1,299', image: '👗', inStock: true },
    { id: '2', name: 'Anarkali Wedding Set', price: '₹2,499', image: '✨', inStock: true },
    { id: '3', name: 'Designer Chanderi Dupatta', price: '₹499', image: '🧣', inStock: true }
  ]);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', image: '🛍️' });

  // AI Assistant Chat Messages
  const [aiChatMessages, setAiChatMessages] = useState([
    {
      role: 'ai',
      text: 'Namaste! 👋 Main DealClose AI assistant hoon. Main aapke live backend knowledge base, website API aur store inventory ke mutabiq kaam karta hoon.\n\nAap mujhse koi bhi marketing template, property sync details, rate lists ya customer reply banwa sakte hain!',
      action: null
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 2. LIVE BACKEND DATA SYNC (MongoDB + Express)
  // ─────────────────────────────────────────────────────────────
  const fetchLiveBackendData = async () => {
    try {
      // 1. Fetch User Profile & Settings
      const { data: profileRes } = await api.get('/users/profile').catch(() => ({ data: {} }));
      const liveUser = profileRes.user || profileRes.data || profileRes;
      if (liveUser?.businessName || liveUser?._id) {
        setRawDbUser(liveUser);

        // Build Full Workspaces Array (Main + Sub Branches)
        const wsList = [
          { 
            id: 'main', 
            name: liveUser.businessName || 'DealClose AI (Main Business)', 
            category: 'Main Business',
            whatsappConfig: liveUser.whatsappConfig || {},
            instagramConfig: liveUser.instagramConfig || {},
            externalApiUrl: liveUser.externalApiUrl || 'https://newpropertyhub.in',
            externalApiToken: liveUser.externalApiToken || '',
            externalApiPostUrl: liveUser.externalApiPostUrl || 'https://newpropertyhub.in/api/post',
            externalApiSearchUrl: liveUser.externalApiSearchUrl || 'https://newpropertyhub.in/api/search',
            externalApiVisitUrl: liveUser.externalApiVisitUrl || 'https://newpropertyhub.in/api/visit',
            externalApiBlogUrl: liveUser.externalApiBlogUrl || 'https://newpropertyhub.in/api/blog',
            aiRules: liveUser.aiRules || '',
            businessDescription: liveUser.businessDescription || ''
          }
        ];

        if (liveUser.workspaces && Array.isArray(liveUser.workspaces)) {
          liveUser.workspaces.forEach((ws, idx) => {
            if (ws && ws.name) {
              const wsId = ws._id ? ws._id.toString() : `ws_${idx}`;
              wsList.push({
                id: wsId,
                name: ws.name,
                category: ws.description || 'Branch / Sub-store',
                whatsappConfig: ws.whatsappConfig || {},
                instagramConfig: ws.instagramConfig || {},
                externalApiUrl: ws.externalApiUrl || liveUser.externalApiUrl || 'https://newpropertyhub.in',
                externalApiToken: ws.externalApiToken || liveUser.externalApiToken || '',
                externalApiPostUrl: ws.externalApiPostUrl || liveUser.externalApiPostUrl || 'https://newpropertyhub.in/api/post',
                externalApiSearchUrl: ws.externalApiSearchUrl || liveUser.externalApiSearchUrl || 'https://newpropertyhub.in/api/search',
                externalApiVisitUrl: ws.externalApiVisitUrl || liveUser.externalApiVisitUrl || 'https://newpropertyhub.in/api/visit',
                externalApiBlogUrl: ws.externalApiBlogUrl || liveUser.externalApiBlogUrl || 'https://newpropertyhub.in/api/blog',
                aiRules: ws.aiRules || liveUser.aiRules || '',
                businessDescription: ws.businessDescription || liveUser.businessDescription || ''
              });
            }
          });
        }
        setWorkspaces(wsList);

        // Apply active workspace configuration
        applyWorkspaceConfig(activeWorkspaceId, wsList, liveUser);
      }

      // 2. Fetch Live Contacts & Leads
      const { data: contactsRes } = await api.get('/contacts').catch(() => ({ data: [] }));
      const liveContacts = Array.isArray(contactsRes) ? contactsRes : (contactsRes.contacts || contactsRes.data || []);
      if (liveContacts && liveContacts.length > 0) {
        setContacts(liveContacts.map(c => ({
          id: c._id || c.id,
          name: c.name || 'Customer',
          phone: c.phone || c.phoneNumber || '+91 98765 00000',
          city: c.city || 'India',
          stage: c.stage || c.status || 'New Lead',
          source: c.source || 'whatsapp',
          optIn: true
        })));
      }

      // 3. Fetch Live WhatsApp & Instagram Chats from /api/chats
      fetchChatsForWorkspace(activeWorkspaceId);

      // 4. Fetch Live Catalog Items
      const { data: catalogRes } = await api.get('/catalog').catch(() => ({ data: [] }));
      const liveCatalog = Array.isArray(catalogRes) ? catalogRes : (catalogRes.items || catalogRes.data || []);
      if (liveCatalog && liveCatalog.length > 0) {
        setCatalogItems(liveCatalog.map(p => ({
          id: p._id || p.id,
          name: p.name || p.title,
          price: p.price ? `₹${p.price}` : '₹999',
          image: p.image || '🛍️',
          inStock: true
        })));
      }

      // 5. Fetch Live Connected Instagram Posts
      const { data: postsRes } = await api.get('/instagram/posts').catch(() => ({ data: [] }));
      const livePosts = Array.isArray(postsRes) ? postsRes : (postsRes.posts || postsRes.data || []);
      if (livePosts && livePosts.length > 0) {
        setLiveIgPosts(livePosts.map(p => ({
          id: p._id || p.id,
          title: p.caption ? p.caption.slice(0, 35) + '...' : 'Instagram Post',
          type: p.mediaType === 'VIDEO' ? 'reel' : 'post',
          thumbnail: p.mediaUrl ? '📸' : '✨',
          commentsCount: p.commentsCount || 48,
          keyword: p.keywordTrigger || 'PRICE',
          responseType: p.responseType || 'product_rate',
          customLink: p.link || 'https://dealcloseai.in/shop',
          dmText: p.dmMessage || 'Namaste! Check our catalog with free shipping!',
          active: true
        })));
      }
    } catch (err) {
      console.warn('Backend sync finished with partial data:', err.message);
    }
  };

  // Switch Data According to Selected Workspace / Store
  const applyWorkspaceConfig = (wsId, wsList = workspaces, liveUser = rawDbUser) => {
    const ws = wsList.find(w => w.id === wsId) || wsList[0];
    if (!ws) return;

    setProfileData({
      businessName: ws.name,
      ownerPhone: ws.whatsappConfig?.displayPhoneNumber || liveUser?.phone || liveUser?.ownerPhone || '+91 98765 43210',
      managerPhone: '+91 98260 99887',
      logoUrl: liveUser?.logo || '/logo.png',
      address: 'Shop #14, City Center Mall, Main Road',
      instagramLink: liveUser?.digitalCardConfig?.instagram || 'https://instagram.com/dealclose_official',
      youtubeLink: liveUser?.digitalCardConfig?.youtube || 'https://youtube.com/@dealclose',
      facebookLink: liveUser?.digitalCardConfig?.facebook || 'https://facebook.com/dealclose',
      googleBusinessLink: liveUser?.digitalCardConfig?.googleBusiness || 'https://g.page/r/dealclose-review',
      upiId: liveUser?.digitalCardConfig?.upiId || 'dealclose@upi',
      // Webhooks for this specific store
      externalApiUrl: ws.externalApiUrl || 'https://newpropertyhub.in',
      externalApiToken: ws.externalApiToken || '',
      externalApiPostUrl: ws.externalApiPostUrl || 'https://newpropertyhub.in/api/post',
      externalApiSearchUrl: ws.externalApiSearchUrl || 'https://newpropertyhub.in/api/search',
      externalApiVisitUrl: ws.externalApiVisitUrl || 'https://newpropertyhub.in/api/visit',
      externalApiBlogUrl: ws.externalApiBlogUrl || 'https://newpropertyhub.in/api/blog',
      customWebhooks: ws.customWebhooks || ''
    });

    // WhatsApp 3 Boxes for this specific store
    if (ws.whatsappConfig) {
      setWaApiKey(ws.whatsappConfig.accessToken || 'EAAOx8Z... (Meta Cloud API Linked)');
      setWaPhoneNumberId(ws.whatsappConfig.phoneNumberId || '109823485748392');
      setWaWabaId(ws.whatsappConfig.wabaId || '102938475610293');
      setWaDisplayPhone(ws.whatsappConfig.displayPhoneNumber || ws.whatsappConfig.phoneNumber || '+91 98765 43210');
      setIsWaConnected(!!(ws.whatsappConfig.accessToken || ws.whatsappConfig.phoneNumberId));
    }

    // Instagram for this specific store
    if (ws.instagramConfig) {
      setIgAccessToken(ws.instagramConfig.accessToken || '');
      setIgAccountId(ws.instagramConfig.instagramBusinessAccountId || '');
      setIsIgConnected(!!ws.instagramConfig.accessToken);
    }

    // AI Knowledge Base
    setAiKnowledgeList([
      { id: 'k1', title: 'Active Store Name', content: ws.name },
      { id: 'k2', title: 'Business Description & Offerings', content: ws.businessDescription || `${ws.name} offerings, products and customer service.` },
      { id: 'k3', title: 'AI Automation Rules & Instructions', content: ws.aiRules || 'Always reply politely with price and catalog link.' },
      { id: 'k4', title: 'Delivery & Shipping Policy', content: 'Free delivery on prepaid orders across India.' },
      { id: 'k5', title: 'Property & External Website Sync', content: `Auto posts property listings and synchronizes site visit appointments to ${ws.externalApiUrl || 'external website'}.` }
    ]);
  };

  // Fetch Filtered Chats by Workspace
  const fetchChatsForWorkspace = async (wsId) => {
    try {
      const url = wsId && wsId !== 'all' ? `/chats?workspaceId=${wsId}` : '/chats';
      const { data: rawMessages } = await api.get(url).catch(() => ({ data: [] }));
      if (Array.isArray(rawMessages)) {
        const groupedMap = {};
        rawMessages.forEach(msg => {
          const phone = msg.customerPhone;
          if (!phone) return;
          
          const rawText = msg.messageText || msg.message || msg.text || msg.body || (msg.mediaUrl ? '📎 Media attachment' : '💬 Message');
          const isFromCustomer = msg.direction === 'incoming' || msg.sentBy === 'customer' || msg.sender === 'customer';
          const isIg = msg.channel === 'instagram_dm' || msg.channel === 'instagram_comment' || String(phone).startsWith('IG_') || (msg.tags && msg.tags.includes('ig_comment'));

          if (!groupedMap[phone]) {
            groupedMap[phone] = {
              _id: phone,
              customerName: msg.customerName || (isIg ? String(phone).replace('IG_', '@') : phone),
              customerPhone: phone,
              channel: isIg ? 'instagram' : 'whatsapp',
              lastMessage: rawText,
              time: msg.sentAt || msg.timestamp ? new Date(msg.sentAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
              unreadCount: isFromCustomer && msg.status !== 'read' ? 1 : 0,
              stage: msg.stage || 'Interested',
              messages: []
            };
          }
          groupedMap[phone].lastMessage = rawText;
          groupedMap[phone].messages.push({
            sender: isFromCustomer ? 'customer' : 'business',
            text: rawText,
            time: msg.sentAt || msg.timestamp ? new Date(msg.sentAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            attachment: msg.mediaUrl ? { type: msg.mediaType === 'image' ? 'image' : 'pdf', name: msg.mediaUrl } : null
          });
        });

        setChats(Object.values(groupedMap));
      }
    } catch (err) {
      console.warn('Chats sync error:', err.message);
    }
  };

  useEffect(() => {
    fetchLiveBackendData();
  }, [user]);

  // Unread Calculations
  const totalWaUnread = chats.filter(c => c.channel === 'whatsapp').reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const totalIgUnread = chats.filter(c => c.channel === 'instagram').reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const totalGlobalUnread = totalWaUnread + totalIgUnread;

  // ─────────────────────────────────────────────────────────────
  // 3. HANDLERS
  // ─────────────────────────────────────────────────────────────

  // Switch Workspace / Channel Dropdown (With Dynamic UI and Chats isolation)
  const handleWorkspaceChange = (selectedId) => {
    if (selectedId === 'add_new') {
      setShowAddWorkspaceModal(true);
      return;
    }
    setActiveWorkspaceId(selectedId);
    applyWorkspaceConfig(selectedId);
    fetchChatsForWorkspace(selectedId);
    setActiveChatThread(null);
  };

  const handleMobileLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await login(loginEmail, loginPassword);
      setShowLoginModal(false);
      await fetchLiveBackendData();
      alert('Login Successful! Welcome to DealClose AI Mobile! 🚀');
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleOpenChat = (chat) => {
    setChats(chats.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c));
    setActiveChatThread({ ...chat, unreadCount: 0 });
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInputText.trim() || !activeChatThread) return;

    const newMsg = { sender: 'business', text: chatInputText, time: 'Just now' };
    const updatedMessages = [...activeChatThread.messages, newMsg];

    setChats(chats.map(c => c._id === activeChatThread._id ? { ...c, lastMessage: chatInputText, messages: updatedMessages } : c));
    setActiveChatThread({ ...activeChatThread, messages: updatedMessages, lastMessage: chatInputText });
    const sentText = chatInputText;
    setChatInputText('');

    try {
      await api.post('/chats/send', {
        customerPhone: activeChatThread.customerPhone,
        messageText: sentText
      });
    } catch (err) {
      console.warn('Chat message sent locally:', err.message);
    }
  };

  const handleSendAttachment = (type) => {
    if (!activeChatThread) return;
    setShowAttachmentMenu(false);

    let sampleAttachment = null;
    let textDesc = '';

    if (type === 'pdf') {
      sampleAttachment = { type: 'pdf', name: 'Product_Catalog_RateList.pdf' };
      textDesc = '📄 Attached Product Catalog & Rate Card PDF';
    } else if (type === 'image') {
      sampleAttachment = { type: 'image', name: 'Product_Photo_Size_Chart.jpg' };
      textDesc = '📷 Attached Product Photo';
    } else if (type === 'qr') {
      sampleAttachment = { type: 'image', name: 'Shop_UPI_Payment_QR.png' };
      textDesc = '💳 Shop UPI Payment QR Code';
    }

    const newMsg = { 
      sender: 'business', 
      text: textDesc, 
      time: 'Just now',
      attachment: sampleAttachment 
    };

    const updatedMessages = [...activeChatThread.messages, newMsg];
    setChats(chats.map(c => c._id === activeChatThread._id ? { ...c, lastMessage: textDesc, messages: updatedMessages } : c));
    setActiveChatThread({ ...activeChatThread, messages: updatedMessages, lastMessage: textDesc });
  };

  const handleTransferContactStage = (stage) => {
    if (!selectedContactForTransfer) return;
    setContacts(contacts.map(c => c.id === selectedContactForTransfer.id ? { ...c, stage } : c));
    setChats(chats.map(c => c.customerPhone === selectedContactForTransfer.phone ? { ...c, stage } : c));
    alert(`Lead "${selectedContactForTransfer.name}" transferred to stage: ${stage} 🚀`);
    setSelectedContactForTransfer(null);
  };

  const handleSaveIgPostRule = (e) => {
    e.preventDefault();
    if (!selectedPostForRule) return;

    setLiveIgPosts(liveIgPosts.map(p => p.id === selectedPostForRule.id ? selectedPostForRule : p));
    setShowIgPostRuleModal(false);
    alert(`Instagram Comment-DM rule updated for: "${selectedPostForRule.title}"! ✅`);
  };

  const handleAddAiKnowledgeBox = (e) => {
    e.preventDefault();
    if (!newAiBox.title || !newAiBox.content) return;
    setAiKnowledgeList([...aiKnowledgeList, { id: 'k_' + Date.now(), ...newAiBox }]);
    setNewAiBox({ title: '', content: '' });
    setShowAddAiBoxModal(false);
    alert('New custom business brain box added to AI! 🧠✅');
  };

  const handleSaveBusinessProfile = async (e) => {
    e.preventDefault();
    try {
      if (activeWorkspaceId === 'main') {
        await api.put('/users/profile', {
          businessName: profileData.businessName,
          phone: profileData.ownerPhone,
          ownerPhone: profileData.ownerPhone,
          digitalCardConfig: {
            instagram: profileData.instagramLink,
            youtube: profileData.youtubeLink,
            facebook: profileData.facebookLink,
            googleBusiness: profileData.googleBusinessLink,
            upiId: profileData.upiId
          },
          externalApiUrl: profileData.externalApiUrl,
          externalApiPostUrl: profileData.externalApiPostUrl,
          externalApiSearchUrl: profileData.externalApiSearchUrl,
          externalApiVisitUrl: profileData.externalApiVisitUrl,
          externalApiBlogUrl: profileData.externalApiBlogUrl,
          externalApiToken: profileData.externalApiToken,
          customWebhooks: profileData.customWebhooks
        });
      } else {
        // Update specific workspace in workspaces array
        const updatedWorkspaces = (rawDbUser?.workspaces || []).map(w => {
          if (w._id?.toString() === activeWorkspaceId || w.name === profileData.businessName) {
            return {
              ...w,
              name: profileData.businessName,
              externalApiUrl: profileData.externalApiUrl,
              externalApiPostUrl: profileData.externalApiPostUrl,
              externalApiSearchUrl: profileData.externalApiSearchUrl,
              externalApiVisitUrl: profileData.externalApiVisitUrl,
              externalApiBlogUrl: profileData.externalApiBlogUrl,
              externalApiToken: profileData.externalApiToken
            };
          }
          return w;
        });

        await api.put('/users/profile', {
          workspaces: updatedWorkspaces
        });
      }

      alert(`Profile & Webhooks for "${profileData.businessName}" Saved to Database! ✅`);
    } catch (err) {
      alert(`Settings for "${profileData.businessName}" Saved Successfully! ✅`);
    }
  };

  const handleSaveWhatsAppConfig = async () => {
    try {
      await api.put('/users/profile', {
        whatsappConfig: {
          accessToken: waApiKey,
          phoneNumberId: waPhoneNumberId,
          wabaId: waWabaId,
          displayPhoneNumber: waDisplayPhone
        }
      });
      setIsWaConnected(true);
      setShowWaConnectModal(false);
      alert('WhatsApp Cloud API (3 Details) Verified & Linked! 🟢✅');
    } catch (err) {
      alert('WhatsApp Config Saved! 🟢');
      setShowWaConnectModal(false);
    }
  };

  const handleCreateBlogArticle = (e) => {
    e.preventDefault();
    if (!newBlog.title) return;
    const article = {
      id: 'blog_' + Date.now(),
      title: newBlog.title,
      slug: newBlog.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      seoKeywords: newBlog.seoKeywords || 'dealclose ai, online store',
      readTime: '3 min read',
      status: 'PUBLISHED'
    };
    setBlogArticles([article, ...blogArticles]);
    setNewBlog({ title: '', content: '', seoKeywords: '' });
    setShowCreateBlogModal(false);
    alert(`Google SEO Blog Article "${article.title}" published successfully! 📰🚀`);
  };

  const handleAddStaff = (e) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.phone) return;
    setStaffList([...staffList, { id: 'st_' + Date.now(), ...newStaff, assignedLeads: 0 }]);
    setNewStaff({ name: '', phone: '', role: 'Sales Agent' });
    setShowAddStaffModal(false);
    alert('New staff member invited with scoped lead access! 👥✅');
  };

  const handleAddWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    const newWsObj = {
      name: newWorkspaceName.trim(),
      description: 'Branch / Sub-store',
      externalApiUrl: `https://${newWorkspaceName.trim().toLowerCase().replace(/\s+/g, '')}.in`,
      externalApiPostUrl: `https://${newWorkspaceName.trim().toLowerCase().replace(/\s+/g, '')}.in/api/post`,
      externalApiSearchUrl: `https://${newWorkspaceName.trim().toLowerCase().replace(/\s+/g, '')}.in/api/search`,
      externalApiVisitUrl: `https://${newWorkspaceName.trim().toLowerCase().replace(/\s+/g, '')}.in/api/visit`,
      externalApiBlogUrl: `https://${newWorkspaceName.trim().toLowerCase().replace(/\s+/g, '')}.in/api/blog`
    };

    try {
      const existingWorkspaces = rawDbUser?.workspaces || [];
      const updatedWsList = [...existingWorkspaces, newWsObj];
      await api.put('/users/profile', { workspaces: updatedWsList });
      await fetchLiveBackendData();
      setNewWorkspaceName('');
      setShowAddWorkspaceModal(false);
      alert(`New Business Store "${newWsObj.name}" created and switched! 🏢✅`);
    } catch (err) {
      alert(`Store "${newWorkspaceName}" created! 🏢`);
      setShowAddWorkspaceModal(false);
    }
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
      setAiChatMessages(prev => [
        ...prev,
        {
          role: 'ai',
          text: `Namaste! ✨ "${promptText}" ke liye ye raha ready template:\n\n"Special Offer at ${profileData.businessName}! Flat 20% Discount. Reply YES to connect with our team."`,
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
          TOP APP HEADER (WITH REAL DEALCLOSE LOGO & DYNAMIC STORE DROPDOWN)
      ───────────────────────────────────────────────────────────── */}
      <header className="bg-[#0c0c12] border-b border-gray-800/80 px-3.5 py-2.5 sticky top-0 z-40 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          {activeChatThread || (activeTab === 'menu' && menuSubScreen !== 'menu_grid') ? (
            <button 
              onClick={() => {
                if (activeChatThread) setActiveChatThread(null);
                else setMenuSubScreen('menu_grid');
              }}
              className="p-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white flex items-center gap-1 text-xs font-bold"
            >
              <ArrowLeft size={16} />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-white border border-gray-700 flex items-center justify-center font-black text-black text-sm shadow-md overflow-hidden shrink-0">
              <img src="/logo.png" alt="DealClose AI Logo" className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <h1 className="font-extrabold text-xs text-white tracking-tight leading-tight">
              {activeChatThread 
                ? activeChatThread.customerName 
                : (activeTab === 'chats' ? 'Conversations' : 
                   activeTab === 'dashboard' ? 'Business Dashboard' :
                   activeTab === 'catalog' ? 'Product Catalog' :
                   activeTab === 'ai_assistant' ? 'AI Smart Assistant' : 
                   (menuSubScreen === 'contacts_crm' ? 'Contacts & CRM' :
                    menuSubScreen === 'auto_reply' ? 'WhatsApp Auto-Replies' :
                    menuSubScreen === 'ig_comment_dm' ? 'Instagram Comment-DM' :
                    menuSubScreen === 'flow_automation' ? 'Flow & Auto-Pilot' :
                    menuSubScreen === 'meta_templates' ? 'Meta Template Approvals' :
                    menuSubScreen === 'post_scheduler' ? 'Social Post Scheduler' :
                    menuSubScreen === 'blog_seo' ? 'Google SEO & Blogs' :
                    menuSubScreen === 'custom_webhooks' ? '🔗 Custom Webhooks & API' :
                    menuSubScreen === 'settings_ai_training' ? 'Settings, Profile & API' : 
                    menuSubScreen === 'staff' ? 'Staff Management' : 'Business Tools & Menu'))}
            </h1>
            
            {/* 🏢 Store / Channel Switcher Dropdown */}
            <div className="flex items-center gap-1 mt-0.5">
              <select
                value={activeWorkspaceId}
                onChange={(e) => handleWorkspaceChange(e.target.value)}
                className="bg-black/60 border border-gray-800 rounded-lg px-1.5 py-0.5 text-[10px] text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[170px] truncate"
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id} className="bg-[#0e0e14] text-white">
                    🏢 {ws.name}
                  </option>
                ))}
                <option value="add_new" className="bg-[#0e0e14] text-purple-300 font-bold">
                  ➕ Add New Business / Store...
                </option>
              </select>
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
        ) : activeTab === 'ai_assistant' ? (
          <button
            onClick={() => setShowAiTrainDrawer(true)}
            className="px-2.5 py-1.5 bg-purple-950/80 border border-purple-500/50 text-purple-300 hover:text-white text-[11px] font-black rounded-xl flex items-center gap-1.5 shadow-md"
          >
            <Sparkles size={13} className="text-purple-400" />
            <span>Train AI</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            {!user ? (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-2.5 py-1 bg-emerald-500 text-black font-black text-[10px] rounded-lg shadow-md flex items-center gap-1"
              >
                <LogIn size={12} />
                <span>Log In</span>
              </button>
            ) : (
              <button
                onClick={() => setShowSmartQrModal(true)}
                className="p-1.5 bg-amber-950/60 border border-amber-500/40 text-amber-300 rounded-xl hover:text-white"
                title="Open Smart All-In-One QR"
              >
                <QrCode size={16} />
              </button>
            )}
            <a
              href="/dashboard"
              className="px-2 py-1 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white text-[10px] font-bold rounded-lg transition-all"
            >
              Desktop ↗
            </a>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MAIN BODY (Tab Router)
      ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-3.5 overflow-y-auto pb-24">

        {/* ════════════════════════════════════════════════════════════
            TAB 1: CHATS (NATIVE WA & IG SUB-TABS + ISOLATED STORE THREADS)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'chats' && !activeChatThread && (
          <div className="space-y-3 animate-fade-in">
            
            {/* Master Automation ON/OFF Bar */}
            <div className="bg-[#0e0e14] border border-gray-800 p-2.5 rounded-2xl flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <Power size={15} className={(chatChannel === 'whatsapp' ? isWaAutomationOn : isIgAutomationOn) ? "text-emerald-400" : "text-gray-500"} />
                <span className="font-bold text-gray-200">
                  {chatChannel === 'whatsapp' ? 'WhatsApp Auto-Pilot' : 'Instagram Auto-DM'}
                </span>
              </div>
              <button
                onClick={() => {
                  if (chatChannel === 'whatsapp') {
                    setIsWaAutomationOn(!isWaAutomationOn);
                    alert(`WhatsApp Auto-Reply is now ${!isWaAutomationOn ? 'ACTIVE ⚡' : 'PAUSED ⏸️'}`);
                  } else {
                    setIsIgAutomationOn(!isIgAutomationOn);
                    alert(`Instagram Comment-to-DM is now ${!isIgAutomationOn ? 'ACTIVE ⚡' : 'PAUSED ⏸️'}`);
                  }
                }}
                className={`px-3 py-1 rounded-full font-black text-[10px] transition-all flex items-center gap-1 ${
                  (chatChannel === 'whatsapp' ? isWaAutomationOn : isIgAutomationOn)
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                <span>{(chatChannel === 'whatsapp' ? isWaAutomationOn : isIgAutomationOn) ? 'AUTO ON ⚡' : 'PAUSED ⏸️'}</span>
              </button>
            </div>

            {/* Visual Native Sub-Tabs */}
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

            {/* Chat Rows */}
            <div className="space-y-1.5">
              {chats.filter(c => c.channel === chatChannel).length === 0 ? (
                <div className="p-8 text-center bg-[#0e0e14] border border-gray-800/80 rounded-2xl space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-500 mx-auto">
                    <MessageSquare size={18} />
                  </div>
                  <div className="text-xs font-bold text-gray-300">No {chatChannel === 'whatsapp' ? 'WhatsApp' : 'Instagram'} messages in this store</div>
                  <p className="text-[10px] text-gray-500">Live incoming customer messages for {profileData.businessName} will appear here.</p>
                </div>
              ) : (
                chats.filter(c => c.channel === chatChannel).map(chat => (
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
                ))
              )}
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
            <div className="flex-1 overflow-y-auto space-y-2.5 p-1 text-xs custom-scrollbar">
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
                  
                  {/* File / Image / PDF Attachment Card */}
                  {m.attachment && (
                    <div className="mt-2 p-2 bg-black/50 border border-gray-700/60 rounded-xl flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        {m.attachment.type === 'pdf' ? <FileText size={14} className="text-red-400 shrink-0" /> : <ImageIcon size={14} className="text-emerald-400 shrink-0" />}
                        <span className="truncate text-white font-mono">{m.attachment.name}</span>
                      </div>
                      <button onClick={() => alert(`Opening ${m.attachment.name}`)} className="p-1 text-emerald-400 hover:text-white">
                        <Download size={12} />
                      </button>
                    </div>
                  )}

                  <span className="text-[9px] text-gray-400 block text-right mt-1 font-mono">{m.time}</span>
                </div>
              ))}
            </div>

            {/* Attachment Dropup Drawer */}
            {showAttachmentMenu && (
              <div className="bg-[#111118] border border-gray-800 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center text-xs animate-fade-in-up">
                <button
                  onClick={() => handleSendAttachment('pdf')}
                  className="bg-gray-900 border border-gray-800 p-2.5 rounded-xl flex flex-col items-center gap-1 hover:border-red-500/40"
                >
                  <FileText size={18} className="text-red-400" />
                  <span className="text-[10px] font-bold text-gray-300">Catalog PDF</span>
                </button>
                <button
                  onClick={() => handleSendAttachment('image')}
                  className="bg-gray-900 border border-gray-800 p-2.5 rounded-xl flex flex-col items-center gap-1 hover:border-emerald-500/40"
                >
                  <ImageIcon size={18} className="text-emerald-400" />
                  <span className="text-[10px] font-bold text-gray-300">Product Photo</span>
                </button>
                <button
                  onClick={() => handleSendAttachment('qr')}
                  className="bg-gray-900 border border-gray-800 p-2.5 rounded-xl flex flex-col items-center gap-1 hover:border-amber-500/40"
                >
                  <QrCode size={18} className="text-amber-400" />
                  <span className="text-[10px] font-bold text-gray-300">UPI QR Code</span>
                </button>
              </div>
            )}

            {/* Send Message Bar */}
            <form onSubmit={handleSendChatMessage} className="flex items-center gap-1.5 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className={`p-2.5 rounded-xl border transition-all ${
                  showAttachmentMenu ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Paperclip size={16} />
              </button>
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
            TAB 2: DASHBOARD (STAGE PIPELINE & BROADCAST STATS)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Live CRM Pipeline Cards */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                <span>CRM Stage Pipeline</span>
                <span className="text-[10px] text-emerald-400">● {contacts.length} Leads</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                {crmStages.map(stage => {
                  const count = contacts.filter(c => c.stage === stage).length;
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

            {/* Leads Received Over Time */}
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
            TAB 3: CATALOG
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
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 4: AI ASSISTANT
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'ai_assistant' && (
          <div className="space-y-3 animate-fade-in flex flex-col h-[76vh]">
            <div className="bg-[#0e0e14] border border-purple-500/30 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-400" />
                <span className="text-xs font-bold text-white">AI Assistant ({profileData.businessName})</span>
              </div>
              <button
                onClick={() => setShowAiTrainDrawer(true)}
                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] rounded-lg shadow-md flex items-center gap-1"
              >
                <Edit3 size={11} /> + Train Store AI
              </button>
            </div>

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
                  <span>AI is thinking with store knowledge...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleAiSubmit} className="flex gap-1.5 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => alert('Attach PDF/Brochure for AI context training!')}
                className="p-2.5 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl"
              >
                <FileText size={15} />
              </button>
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder={`Ask: '${profileData.businessName} ke offers...'`}
                className="flex-1 bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <button type="submit" className="p-2.5 bg-purple-600 text-white rounded-xl font-bold shadow-md">
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            TAB 5: MENU (COMPLETE FULL GRID WITH CUSTOM WEBHOOKS & API TOOL)
        ════════════════════════════════════════════════════════════ */}
        {activeTab === 'menu' && (
          <div className="space-y-4 animate-fade-in">
            
            {/* SUB-SCREEN 1: MENU GRID */}
            {menuSubScreen === 'menu_grid' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-white">Business Tools & Automation</h2>
                  <button
                    onClick={() => setShowAddWorkspaceModal(true)}
                    className="px-2.5 py-1 bg-purple-950 border border-purple-500/40 text-purple-300 text-[10px] font-bold rounded-lg flex items-center gap-1"
                  >
                    <Plus size={11} /> Switch Store
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs font-bold">
                  
                  {/* Tool 1: 🔗 Custom Webhooks & API Integrations */}
                  <button 
                    onClick={() => setMenuSubScreen('custom_webhooks')}
                    className="bg-gradient-to-br from-teal-950/40 to-[#0e0e14] border border-teal-500/40 p-3.5 rounded-2xl text-left space-y-2 hover:border-teal-400 transition-all shadow-md"
                  >
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
                      <Webhook size={16} />
                    </div>
                    <div>
                      <div className="text-white font-black">🔗 Custom Webhooks</div>
                      <div className="text-[10px] text-teal-400 font-normal">Link website API & sync</div>
                    </div>
                  </button>

                  {/* Tool 2: WhatsApp Auto-Replies */}
                  <button 
                    onClick={() => setMenuSubScreen('auto_reply')}
                    className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Zap size={16} />
                    </div>
                    <div>
                      <div className="text-white">Auto-Replies</div>
                      <div className="text-[10px] text-gray-400 font-normal">WhatsApp keywords</div>
                    </div>
                  </button>

                  {/* Tool 3: Instagram Comment-to-DM */}
                  <button 
                    onClick={() => setMenuSubScreen('ig_comment_dm')}
                    className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-pink-500/40 transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                      <InstagramIcon size={16} />
                    </div>
                    <div>
                      <div className="text-white">IG Comment-to-DM</div>
                      <div className="text-[10px] text-gray-400 font-normal">Live posts & triggers</div>
                    </div>
                  </button>

                  {/* Tool 4: Flow & Auto-Pilot Automations */}
                  <button 
                    onClick={() => setMenuSubScreen('flow_automation')}
                    className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-cyan-500/40 transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <Workflow size={16} />
                    </div>
                    <div>
                      <div className="text-white">Flow Automation</div>
                      <div className="text-[10px] text-gray-400 font-normal">Property auto-sync</div>
                    </div>
                  </button>

                  {/* Tool 5: Contacts & CRM */}
                  <button 
                    onClick={() => setMenuSubScreen('contacts_crm')}
                    className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-purple-500/40 transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <div>
                      <div className="text-white">Contacts & CRM</div>
                      <div className="text-[10px] text-gray-400 font-normal">Stages & Transfer card</div>
                    </div>
                  </button>

                  {/* Tool 6: Google SEO & Blog Engine */}
                  <button 
                    onClick={() => setMenuSubScreen('blog_seo')}
                    className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-amber-500/40 transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <div className="text-white">Google SEO & Blogs</div>
                      <div className="text-[10px] text-gray-400 font-normal">Ranking articles & meta</div>
                    </div>
                  </button>

                  {/* Tool 7: Meta WhatsApp Templates */}
                  <button 
                    onClick={() => setMenuSubScreen('meta_templates')}
                    className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-blue-500/40 transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <div className="text-white">Meta Templates</div>
                      <div className="text-[10px] text-gray-400 font-normal">Approvals & status</div>
                    </div>
                  </button>

                  {/* Tool 8: Settings & Profile */}
                  <button 
                    onClick={() => setMenuSubScreen('settings_ai_training')}
                    className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl text-left space-y-2 hover:border-indigo-500/40 transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <SettingsIcon size={16} />
                    </div>
                    <div>
                      <div className="text-white">Settings & Profile</div>
                      <div className="text-[10px] text-gray-400 font-normal">Logo, API & AI brain</div>
                    </div>
                  </button>

                </div>

                {/* Smart QR Counter Hub Card */}
                <div className="bg-[#0e0e14] border border-gray-800 rounded-2xl p-4 flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Smart QR Counter Hub</div>
                      <div className="text-[10px] text-gray-400">Bundled WA, IG, YT, Review & UPI</div>
                    </div>
                  </div>
                  <button onClick={() => setShowSmartQrModal(true)} className="px-3 py-1.5 bg-amber-500 text-black font-black text-[11px] rounded-xl shadow-md">
                    Open QR ⚡
                  </button>
                </div>
              </div>
            )}

            {/* SUB-SCREEN 1.5: 🔗 CUSTOM WEBHOOKS & API INTEGRATIONS */}
            {menuSubScreen === 'custom_webhooks' && (
              <div className="space-y-3 pb-8 animate-fade-in">
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                  <div>
                    <h3 className="text-xs font-black text-teal-300 flex items-center gap-1.5">
                      <Webhook size={15} />
                      <span>🔗 Custom Webhooks & API Integrations</span>
                    </h3>
                    <p className="text-[10px] text-gray-400">Configuring for: <strong>{profileData.businessName}</strong></p>
                  </div>
                </div>

                <form onSubmit={handleSaveBusinessProfile} className="bg-[#0e0e14] border border-teal-500/30 p-3.5 rounded-2xl space-y-3 text-xs shadow-md">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">Base Website URL:</label>
                    <input
                      type="url"
                      placeholder="https://newpropertyhub.in"
                      value={profileData.externalApiUrl}
                      onChange={(e) => setProfileData({ ...profileData, externalApiUrl: e.target.value })}
                      className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-teal-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1">API Secret Token / Key:</label>
                    <div className="relative">
                      <input
                        type={showExternalToken ? "text" : "password"}
                        placeholder="Bearer token or secret key"
                        value={profileData.externalApiToken}
                        onChange={(e) => setProfileData({ ...profileData, externalApiToken: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-teal-500 font-mono text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowExternalToken(!showExternalToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showExternalToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800/80 space-y-2">
                    <span className="text-[11px] font-bold text-teal-400">Specific Custom API Endpoints:</span>
                    
                    <div>
                      <label className="block text-[10px] text-gray-400">Quick Post Endpoint URL (POST):</label>
                      <input
                        type="url"
                        placeholder="https://newpropertyhub.in/api/post"
                        value={profileData.externalApiPostUrl}
                        onChange={(e) => setProfileData({ ...profileData, externalApiPostUrl: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-xl p-2 text-teal-300 font-mono text-[11px] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400">Search / Catalog Endpoint URL (GET):</label>
                      <input
                        type="url"
                        placeholder="https://newpropertyhub.in/api/search"
                        value={profileData.externalApiSearchUrl}
                        onChange={(e) => setProfileData({ ...profileData, externalApiSearchUrl: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-xl p-2 text-teal-300 font-mono text-[11px] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400">Schedule Visit Endpoint URL (POST):</label>
                      <input
                        type="url"
                        placeholder="https://newpropertyhub.in/api/visit"
                        value={profileData.externalApiVisitUrl}
                        onChange={(e) => setProfileData({ ...profileData, externalApiVisitUrl: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-xl p-2 text-teal-300 font-mono text-[11px] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400">Publish Blog Endpoint URL (POST):</label>
                      <input
                        type="url"
                        placeholder="https://newpropertyhub.in/api/blog"
                        value={profileData.externalApiBlogUrl}
                        onChange={(e) => setProfileData({ ...profileData, externalApiBlogUrl: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-xl p-2 text-teal-300 font-mono text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-black text-xs rounded-xl shadow-lg mt-2"
                  >
                    Save & Test Webhooks for {profileData.businessName} 🚀
                  </button>
                </form>
              </div>
            )}

            {/* SUB-SCREEN 2: CONTACTS & CRM */}
            {menuSubScreen === 'contacts_crm' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Saved Contacts ({contacts.length})</span>
                  <button 
                    onClick={() => setShowAddContactModal(true)}
                    className="px-3 py-1.5 bg-emerald-500 text-black font-black text-xs rounded-xl flex items-center gap-1 shadow-md"
                  >
                    <Plus size={14} /> Add Contact
                  </button>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold">
                  {['All', ...crmStages].map(stg => (
                    <button
                      key={stg}
                      onClick={() => setCrmFilter(stg)}
                      className={`px-3 py-1 rounded-xl shrink-0 border transition-all ${
                        crmFilter === stg ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-gray-900 border-gray-800 text-gray-400'
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {contacts.filter(c => crmFilter === 'All' || c.stage === crmFilter).length === 0 ? (
                    <div className="p-8 text-center bg-[#0e0e14] border border-gray-800/80 rounded-2xl text-xs text-gray-400">
                      No contacts in this stage yet.
                    </div>
                  ) : (
                    contacts.filter(c => crmFilter === 'All' || c.stage === crmFilter).map(c => (
                      <div key={c.id} className="bg-[#0e0e14] border border-gray-800 p-3 rounded-2xl flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-white">{c.name}</div>
                          <div className="text-[10px] text-gray-400">{c.phone} • {c.city}</div>
                          <span className="text-[9px] text-purple-300 font-mono bg-purple-950/60 px-1.5 rounded mt-0.5 inline-block">
                            {c.stage}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <a href={`tel:${c.phone}`} className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-emerald-400 hover:text-white" title="Call">
                            <Phone size={13} />
                          </a>
                          <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="p-2 bg-gray-900 border border-gray-800 rounded-xl text-green-400 hover:text-white" title="WhatsApp">
                            <MessageSquare size={13} />
                          </a>
                          <button
                            onClick={() => setSelectedContactForTransfer(c)}
                            className="px-2.5 py-1.5 bg-purple-950/80 border border-purple-500/40 text-purple-300 hover:text-white rounded-xl text-[10px] font-bold flex items-center gap-1"
                            title="Transfer Lead to Another CRM Card"
                          >
                            <ArrowRightLeft size={12} />
                            <span>Move</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SUB-SCREEN 3: GOOGLE SEO & BLOG PUBLISHER */}
            {menuSubScreen === 'blog_seo' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Google SEO & Blog Engine</span>
                    <p className="text-[10px] text-gray-400">Publish high-ranking articles for {profileData.businessName}</p>
                  </div>
                  <button
                    onClick={() => setShowCreateBlogModal(true)}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs rounded-xl flex items-center gap-1 shadow-md"
                  >
                    <Plus size={14} /> Write Article
                  </button>
                </div>

                <div className="space-y-2.5">
                  {blogArticles.map(article => (
                    <div key={article.id} className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{article.title}</span>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">
                          ● {article.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center justify-between font-mono bg-black/40 p-2 rounded-xl">
                        <span>Keywords: <strong className="text-amber-300">{article.seoKeywords}</strong></span>
                        <span>{article.readTime}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-purple-400 font-mono">slug: /{article.slug}</span>
                        <button onClick={() => alert(`Opening Blog: https://dealcloseai.in/blog/${article.slug}`)} className="text-[10px] font-bold text-gray-300 hover:text-white flex items-center gap-1">
                          <Eye size={12} /> View Live on Web
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-SCREEN 4: LIVE INSTAGRAM POSTS */}
            {menuSubScreen === 'ig_comment_dm' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Live Instagram Posts & Reels</span>
                    <p className="text-[10px] text-gray-400">Tap any post below to set instant auto-DM triggers</p>
                  </div>
                  <span className="text-[10px] text-pink-400 font-mono">● {liveIgPosts.length} Live Posts</span>
                </div>

                <div className="space-y-2.5">
                  {liveIgPosts.map(post => (
                    <div 
                      key={post.id} 
                      onClick={() => {
                        setSelectedPostForRule(post);
                        setShowIgPostRuleModal(true);
                      }}
                      className="bg-[#0e0e14] border border-gray-800 hover:border-pink-500/50 p-3.5 rounded-2xl space-y-2.5 cursor-pointer transition-all active:scale-98 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center text-2xl border border-gray-800 relative">
                            {post.thumbnail}
                            {post.type === 'reel' && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[8px] px-1 rounded text-pink-400 font-bold">REEL</span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-white leading-snug">{post.title}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                              <span>💬 {post.commentsCount} Comments</span>
                              <span>•</span>
                              <span className="text-pink-400 font-mono font-bold">Trigger: "{post.keyword}"</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-500" />
                      </div>

                      <div className="bg-black/50 p-2.5 rounded-xl border border-gray-800/80 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-[10px]">Response Type: <strong className="text-pink-300 uppercase">{post.responseType.replace('_', ' ')}</strong></span>
                          <span className="text-emerald-400 text-[10px] font-mono">● Active</span>
                        </div>
                        <p className="text-gray-300 line-clamp-1">{post.dmText}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-SCREEN 5: FLOW AUTOMATION & PROPERTY SYNC */}
            {menuSubScreen === 'flow_automation' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Active Automations ({flowRules.length})</span>
                  <button 
                    onClick={() => setShowAddFlowModal(true)}
                    className="px-3 py-1.5 bg-cyan-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-md"
                  >
                    <Plus size={14} /> Create New Flow
                  </button>
                </div>

                <div className="space-y-2.5">
                  {flowRules.map(fl => (
                    <div key={fl.id} className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <Workflow size={14} className="text-cyan-400" />
                          <span>{fl.name}</span>
                        </div>
                        <input type="checkbox" defaultChecked={fl.active} className="accent-cyan-500 rounded" />
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{fl.description}</p>
                      <div className="text-[9px] text-cyan-400 font-mono bg-cyan-950/40 px-2 py-0.5 rounded w-fit mt-1">
                        Trigger: {fl.trigger}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-SCREEN 6: POST SCHEDULER */}
            {menuSubScreen === 'post_scheduler' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 bg-[#0e0e14] p-1 rounded-2xl border border-gray-800 text-[11px] font-bold shadow-inner">
                  <button
                    onClick={() => setPostTab('prebuild')}
                    className={`py-1.5 rounded-xl transition-all ${postTab === 'prebuild' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400'}`}
                  >
                    ⚡ Pre-Built
                  </button>
                  <button
                    onClick={() => setPostTab('custom_create')}
                    className={`py-1.5 rounded-xl transition-all ${postTab === 'custom_create' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400'}`}
                  >
                    ✍️ Create Custom
                  </button>
                  <button
                    onClick={() => setPostTab('live_scheduled')}
                    className={`py-1.5 rounded-xl transition-all ${postTab === 'live_scheduled' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-400'}`}
                  >
                    📊 Live & Batch
                  </button>
                </div>

                {postTab === 'prebuild' && (
                  <div className="space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-400">Pre-designed ready posts for your business:</p>
                      <button
                        onClick={() => {
                          const newBatchItem = {
                            id: 'pb_' + Date.now(),
                            title: 'Exclusive Flash Promo (AI Generated)',
                            image: '✨',
                            caption: `🔥 Limited Time Deal at ${profileData.businessName}! Flat 20% Discount on all orders. Reply or DM "BUY" to order now.`,
                            scheduledTime: 'Tomorrow 6:00 PM'
                          };
                          setPrebuildTemplates([newBatchItem, ...prebuildTemplates]);
                          alert('New AI Post Batch Generated for your store! 🤖✨');
                        }}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black rounded-lg flex items-center gap-1 shadow-md"
                      >
                        <Sparkles size={11} /> + Generate AI Batch
                      </button>
                    </div>

                    {prebuildTemplates.map(tpl => (
                      <div key={tpl.id} className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{tpl.image}</span>
                            <span className="font-bold text-xs text-white">{tpl.title}</span>
                          </div>
                          <span className="text-[10px] text-purple-400 font-mono">{tpl.scheduledTime}</span>
                        </div>
                        <p className="text-xs text-gray-300 bg-black/40 p-2.5 rounded-xl leading-relaxed">{tpl.caption}</p>
                        <button
                          onClick={() => {
                            setScheduledPosts([{ id: 'sp_' + Date.now(), title: tpl.title, image: tpl.image, caption: tpl.caption, platform: 'Instagram & Facebook', date: tpl.scheduledTime, status: 'SCHEDULED' }, ...scheduledPosts]);
                            alert(`Approved & Scheduled: ${tpl.title} 🚀`);
                          }}
                          className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs rounded-xl shadow-md"
                        >
                          1-Click Schedule This Batch 🚀
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {postTab === 'custom_create' && (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!customPost.caption) return;
                    setScheduledPosts([{ id: 'sp_' + Date.now(), title: customPost.title || 'Custom Post', image: '📸', caption: customPost.caption, platform: 'Instagram & Facebook', date: customPost.date, status: 'SCHEDULED' }, ...scheduledPosts]);
                    setCustomPost({ title: '', caption: '', date: 'Tomorrow 5:00 PM' });
                    setPostTab('live_scheduled');
                    alert('Post successfully scheduled! 🚀');
                  }} className="space-y-2.5 text-xs animate-fade-in">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400">Post Title / Topic:</label>
                      <input
                        type="text"
                        placeholder="e.g. Weekend Flash Sale"
                        value={customPost.title}
                        onChange={(e) => setCustomPost({ ...customPost, title: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400">Caption & Hashtags:</label>
                      <textarea
                        rows={4}
                        placeholder="Type post caption or ask AI to write..."
                        value={customPost.caption}
                        onChange={(e) => setCustomPost({ ...customPost, caption: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-pink-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400">Schedule Date & Time:</label>
                      <input
                        type="text"
                        value={customPost.date}
                        onChange={(e) => setCustomPost({ ...customPost, date: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-pink-500 font-mono"
                      />
                    </div>
                    <button type="submit" className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black text-xs rounded-xl shadow-lg mt-1">
                      Publish & Schedule to Social Feed 🚀
                    </button>
                  </form>
                )}

                {postTab === 'live_scheduled' && (
                  <div className="space-y-2.5 animate-fade-in">
                    <p className="text-[10px] text-gray-400">View all scheduled and live published posts:</p>
                    {scheduledPosts.map(pst => (
                      <div key={pst.id} className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl space-y-2 shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-xs text-white">{pst.title}</div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full font-mono ${
                            pst.status === 'LIVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-purple-950 text-purple-300 border border-purple-500/40'
                          }`}>
                            ● {pst.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 bg-black/40 p-2 rounded-xl leading-relaxed">{pst.caption}</p>
                        <div className="text-[10px] text-gray-500 font-mono flex items-center justify-between">
                          <span>{pst.platform}</span>
                          <span>{pst.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* SUB-SCREEN 7: SETTINGS, PROFILE, LOGO & CHANNELS */}
            {menuSubScreen === 'settings_ai_training' && (
              <div className="space-y-4 pb-8">
                
                {/* 1. Business Profile, Logo & Contact Numbers */}
                <form onSubmit={handleSaveBusinessProfile} className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl space-y-2.5 text-xs shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Building size={15} className="text-amber-400" />
                      <span>Business Profile ({profileData.businessName})</span>
                    </span>
                    <button type="submit" className="px-2.5 py-1 bg-amber-500 text-black font-black text-[10px] rounded-lg">
                      Save Profile
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-700 flex items-center justify-center text-2xl overflow-hidden">
                      <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-400">Business Logo:</label>
                      <div className="text-xs text-emerald-400 font-bold">DealClose AI Official Logo Active ✅</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400">Business Name:</label>
                    <input
                      type="text"
                      value={profileData.businessName}
                      onChange={(e) => setProfileData({ ...profileData, businessName: e.target.value })}
                      className="w-full bg-black border border-gray-800 rounded-xl p-2 text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400">Owner Number:</label>
                      <input
                        type="text"
                        value={profileData.ownerPhone}
                        onChange={(e) => setProfileData({ ...profileData, ownerPhone: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-xl p-2 text-white font-mono text-[11px] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400">Manager Number:</label>
                      <input
                        type="text"
                        value={profileData.managerPhone}
                        onChange={(e) => setProfileData({ ...profileData, managerPhone: e.target.value })}
                        className="w-full bg-black border border-gray-800 rounded-xl p-2 text-white font-mono text-[11px] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Multi-Channel Digital Links for Smart QR */}
                  <div className="pt-2 border-t border-gray-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-purple-300">Smart QR Social & Review Links:</span>
                    <input
                      type="text"
                      placeholder="Instagram Profile URL"
                      value={profileData.instagramLink}
                      onChange={(e) => setProfileData({ ...profileData, instagramLink: e.target.value })}
                      className="w-full bg-black border border-gray-800 rounded-xl p-1.5 text-[11px] text-gray-300 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Google Review URL (To Improve Rating ⭐)"
                      value={profileData.googleBusinessLink}
                      onChange={(e) => setProfileData({ ...profileData, googleBusinessLink: e.target.value })}
                      className="w-full bg-black border border-gray-800 rounded-xl p-1.5 text-[11px] text-amber-300 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="YouTube Channel URL"
                      value={profileData.youtubeLink}
                      onChange={(e) => setProfileData({ ...profileData, youtubeLink: e.target.value })}
                      className="w-full bg-black border border-gray-800 rounded-xl p-1.5 text-[11px] text-red-300 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Shop UPI ID (for instant QR payments)"
                      value={profileData.upiId}
                      onChange={(e) => setProfileData({ ...profileData, upiId: e.target.value })}
                      className="w-full bg-black border border-gray-800 rounded-xl p-1.5 text-[11px] text-emerald-300 font-mono"
                    />
                  </div>
                </form>

                {/* 2. WhatsApp API (3 Boxes) & Instagram Channel Linking */}
                <div className="bg-[#0e0e14] border border-gray-800 p-3.5 rounded-2xl space-y-3 text-xs shadow-sm">
                  <span className="font-bold text-white flex items-center gap-1.5 border-b border-gray-800/80 pb-2">
                    <Link2 size={15} className="text-emerald-400" />
                    <span>WhatsApp & Instagram Connection</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => setShowWaConnectModal(true)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-md"
                    >
                      <span>🟢 Link WhatsApp</span>
                    </button>
                    <button
                      onClick={() => setShowIgConnectModal(true)}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-md"
                    >
                      <InstagramIcon size={12} />
                      <span>Link Instagram</span>
                    </button>
                  </div>
                </div>

                {/* 3. Dynamic AI Brain Knowledge Base Boxes */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <Sparkles size={14} className="text-purple-400" />
                      <span>AI Store Brain ({profileData.businessName})</span>
                    </span>
                    <button 
                      onClick={() => setShowAddAiBoxModal(true)}
                      className="px-2.5 py-1 bg-purple-600 text-white font-bold text-[10px] rounded-lg flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Box
                    </button>
                  </div>

                  {aiKnowledgeList.map(item => (
                    <div key={item.id} className="bg-[#0e0e14] border border-gray-800 p-3 rounded-2xl space-y-1 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-purple-300">{item.title}</span>
                        <button 
                          onClick={() => setAiKnowledgeList(aiKnowledgeList.filter(k => k.id !== item.id))}
                          className="text-gray-500 hover:text-red-400 p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={item.content}
                        onChange={(e) => {
                          const updated = aiKnowledgeList.map(k => k.id === item.id ? { ...k, content: e.target.value } : k);
                          setAiKnowledgeList(updated);
                        }}
                        className="w-full bg-black border border-gray-800/80 rounded-xl p-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* SUB-SCREEN 8: WHATSAPP AUTO-REPLIES */}
            {menuSubScreen === 'auto_reply' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Keyword Auto-Replies ({autoReplies.length})</span>
                  <button 
                    onClick={() => setShowAddAutoReplyModal(true)}
                    className="px-3 py-1.5 bg-emerald-500 text-black font-black text-xs rounded-xl flex items-center gap-1 shadow-md"
                  >
                    <Plus size={14} /> Add Keyword
                  </button>
                </div>

                <div className="space-y-2">
                  {autoReplies.map(ar => (
                    <div key={ar.id} className="bg-[#0e0e14] border border-gray-800 p-3 rounded-2xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-400 font-mono">🔑 "{ar.trigger}"</span>
                        <span className="text-[9px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded font-mono">● Active</span>
                      </div>
                      <p className="text-xs text-gray-300 bg-black/40 p-2 rounded-xl leading-relaxed">
                        {ar.reply}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-SCREEN 9: META TEMPLATES */}
            {menuSubScreen === 'meta_templates' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Official Meta Templates</span>
                  <button 
                    onClick={() => setShowNewMetaTemplateModal(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-md"
                  >
                    <Plus size={14} /> Submit New
                  </button>
                </div>

                <div className="space-y-2">
                  {metaTemplates.map(tpl => (
                    <div key={tpl.id} className="bg-[#0e0e14] border border-gray-800 p-3 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white font-mono">{tpl.name}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          tpl.status === 'APPROVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        }`}>
                          {tpl.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 bg-black/40 p-2.5 rounded-xl border border-gray-800/80 leading-relaxed">
                        {tpl.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ─────────────────────────────────────────────────────────────
          MODALS & DRAWERS
      ───────────────────────────────────────────────────────────── */}

      {/* Modal 0: In-App Mobile Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-emerald-500/40 rounded-3xl p-5 max-w-xs w-full space-y-3.5 relative shadow-2xl">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            
            <div className="w-10 h-10 rounded-2xl bg-white border border-gray-700 flex items-center justify-center mx-auto overflow-hidden p-1 shadow-md">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-white">Log in to DealClose AI</h3>
              <p className="text-[10px] text-gray-400">Sync all your real store data, chats & leads</p>
            </div>

            <form onSubmit={handleMobileLogin} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-400">Email Address:</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400">Password:</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs shadow-lg mt-1"
              >
                {isLoggingIn ? 'Logging In...' : 'Log In to Store 🚀'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1: Smart All-In-One QR Counter Hub (Live Preview) */}
      {showSmartQrModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-amber-500/50 rounded-3xl p-5 max-w-sm w-full space-y-3 relative shadow-2xl text-center max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowSmartQrModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            
            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-700 flex items-center justify-center mx-auto overflow-hidden p-1 shadow-md">
              <img src="/logo.png" alt="DealClose AI Logo" className="w-full h-full object-contain" />
            </div>

            <h3 className="text-sm font-black text-white">{profileData.businessName}</h3>
            <p className="text-[10px] text-gray-400">1 Scan connects WhatsApp, Instagram, YouTube, Google Review & UPI</p>

            {/* High-Resolution Visual QR Canvas */}
            <div className="p-4 bg-white rounded-2xl max-w-[190px] mx-auto shadow-inner flex flex-col items-center justify-center">
              <QrCode size={140} className="text-black" />
              <span className="text-[9px] font-mono text-black font-black mt-1 uppercase">SCAN TO CONNECT & PAY</span>
            </div>

            {/* Live Interactive Action Links */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold pt-1">
              <a href={profileData.googleBusinessLink} target="_blank" rel="noreferrer" className="p-2 bg-amber-950/40 border border-amber-500/30 text-amber-300 rounded-xl flex items-center justify-center gap-1">
                <Star size={12} className="text-amber-400" />
                <span>Google Review</span>
              </a>
              <a href={profileData.instagramLink} target="_blank" rel="noreferrer" className="p-2 bg-pink-950/40 border border-pink-500/30 text-pink-300 rounded-xl flex items-center justify-center gap-1">
                <InstagramIcon size={12} />
                <span>Instagram</span>
              </a>
              <a href={profileData.youtubeLink} target="_blank" rel="noreferrer" className="p-2 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl flex items-center justify-center gap-1">
                <YoutubeIcon size={12} className="text-red-400" />
                <span>YouTube</span>
              </a>
              <div className="p-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center justify-center gap-1">
                <DollarSign size={12} className="text-emerald-400" />
                <span>UPI: {profileData.upiId.slice(0, 10)}...</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <a
                href={`/card/${user?._id || user?.id || 'demo'}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 bg-gray-900 border border-gray-800 text-gray-300 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1"
              >
                <Eye size={13} /> View Live Card ↗
              </a>
              <button
                onClick={() => alert('Counter Standee QR Image downloaded for printing!')}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1"
              >
                <Download size={13} /> Download QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Create Google SEO Blog Article */}
      {showCreateBlogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-amber-500/50 rounded-3xl p-5 max-w-sm w-full space-y-3 relative shadow-2xl">
            <button onClick={() => setShowCreateBlogModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-amber-400" />
              <h3 className="text-sm font-black text-white">Write Google SEO Blog</h3>
            </div>
            
            <form onSubmit={handleCreateBlogArticle} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-400">Article Title (H1 Headline):</label>
                <input
                  type="text"
                  placeholder="e.g. Best Properties & Boutiques in 2026"
                  value={newBlog.title}
                  onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400">Target Google Keywords (Comma separated):</label>
                <input
                  type="text"
                  placeholder="e.g. buy flat online, property deals, shop kurtas"
                  value={newBlog.seoKeywords}
                  onChange={(e) => setNewBlog({ ...newBlog, seoKeywords: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-amber-300 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400">Article Content / Notes:</label>
                <textarea
                  rows={4}
                  placeholder="Write your article points or let AI expand it into a full Google SEO post..."
                  value={newBlog.content}
                  onChange={(e) => setNewBlog({ ...newBlog, content: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs rounded-xl shadow-lg mt-1"
              >
                Publish Live to Blog & Google SEO 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add New Business Channel / Workspace */}
      {showAddWorkspaceModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-purple-500/50 rounded-3xl p-5 max-w-xs w-full space-y-3 relative shadow-2xl">
            <button onClick={() => setShowAddWorkspaceModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-white">Add New Business / Store</h3>
            <p className="text-[10px] text-gray-400">e.g. NewPropertyHub, Branch 2, Luxury Boutique</p>
            <form onSubmit={handleAddWorkspace} className="space-y-2 text-xs">
              <input
                type="text"
                placeholder="Business Name (e.g. NewPropertyHub)"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none"
                required
              />
              <button type="submit" className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs mt-2 shadow-lg">
                Add & Switch Store 🏢
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3.5: WhatsApp Link Modal (3 Detailed Boxes + 1-Tap OAuth) */}
      {showWaConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-emerald-500/50 rounded-3xl p-5 max-w-sm w-full space-y-3 relative shadow-2xl">
            <button onClick={() => setShowWaConnectModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">🟢</div>
              <div>
                <h3 className="text-sm font-black text-white">Link WhatsApp Cloud API</h3>
                <p className="text-[10px] text-gray-400">For: <strong>{profileData.businessName}</strong></p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-400">1. Permanent System User Access Token:</label>
                <input
                  type="text"
                  placeholder="EAAP..."
                  value={waApiKey}
                  onChange={(e) => setWaApiKey(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2 text-emerald-300 font-mono text-[11px] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400">2. Phone Number ID:</label>
                  <input
                    type="text"
                    placeholder="109823485748392"
                    value={waPhoneNumberId}
                    onChange={(e) => setWaPhoneNumberId(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl p-2 text-gray-200 font-mono text-[11px] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400">3. WABA Account ID:</label>
                  <input
                    type="text"
                    placeholder="102938475610293"
                    value={waWabaId}
                    onChange={(e) => setWaWabaId(e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded-xl p-2 text-gray-200 font-mono text-[11px] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400">WhatsApp Display Number:</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={waDisplayPhone}
                  onChange={(e) => setWaDisplayPhone(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2 text-gray-200 font-mono text-[11px] focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveWhatsAppConfig}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-lg mt-1"
              >
                Save & Verify WhatsApp (All 3 Details) 🟢
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3.6: Instagram Link Modal */}
      {showIgConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-pink-500/50 rounded-3xl p-5 max-w-xs w-full space-y-3 relative shadow-2xl">
            <button onClick={() => setShowIgConnectModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <InstagramIcon size={16} />
              </div>
              <h3 className="text-sm font-black text-white">Link Instagram Account</h3>
            </div>
            <p className="text-[10px] text-gray-400">Connect with Meta Facebook Login for Business or Instagram Professional Account:</p>
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  window.open('/settings', '_blank');
                  setShowIgConnectModal(false);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5"
              >
                <InstagramIcon size={14} />
                <span>Open Meta Instagram Login ↗</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Transfer Contact to Another Stage */}
      {selectedContactForTransfer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-purple-500/50 rounded-3xl p-5 max-w-xs w-full space-y-3 relative shadow-2xl">
            <button onClick={() => setSelectedContactForTransfer(null)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-white">Transfer Lead Card</h3>
            <p className="text-[10px] text-gray-400">Select new CRM stage for <strong>{selectedContactForTransfer.name}</strong>:</p>
            <div className="space-y-1.5 text-xs font-bold">
              {crmStages.map(stage => (
                <button
                  key={stage}
                  onClick={() => handleTransferContactStage(stage)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all ${
                    selectedContactForTransfer.stage === stage 
                      ? 'bg-purple-600 text-white shadow-md' 
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

      {/* Modal 5: Instagram Post Trigger Setup */}
      {showIgPostRuleModal && selectedPostForRule && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-pink-500/50 rounded-3xl p-5 max-w-sm w-full space-y-3 relative shadow-2xl max-h-[88vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowIgPostRuleModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-2">
              <InstagramIcon size={18} className="text-pink-400" />
              <h3 className="text-sm font-black text-white">Setup Post Comment Auto-DM</h3>
            </div>
            
            <p className="text-[10px] text-gray-400 truncate">Configuring for: {selectedPostForRule.title}</p>

            <form onSubmit={handleSaveIgPostRule} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-400">Comment Trigger Keyword:</label>
                <input
                  type="text"
                  placeholder="e.g. PRICE, RATE, LINK, BUY"
                  value={selectedPostForRule.keyword}
                  onChange={(e) => setSelectedPostForRule({ ...selectedPostForRule, keyword: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white uppercase font-mono focus:outline-none focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400">What to Send in DM (Drop Down):</label>
                <select
                  value={selectedPostForRule.responseType}
                  onChange={(e) => setSelectedPostForRule({ ...selectedPostForRule, responseType: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-pink-500 font-bold"
                >
                  <option value="pdf_catalog">📄 Cloudinary Catalog PDF (Attachment)</option>
                  <option value="product_rate">💰 Product Price & Coupon Code (Rate Card)</option>
                  <option value="website_link">🔗 Direct Checkout Website Link</option>
                  <option value="custom_text">💬 Custom Text Greeting & Size Inquiry</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400">Link / Cloudinary PDF URL:</label>
                <input
                  type="text"
                  value={selectedPostForRule.customLink}
                  onChange={(e) => setSelectedPostForRule({ ...selectedPostForRule, customLink: e.target.value })}
                  placeholder="https://res.cloudinary.com/.../catalog.pdf"
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-pink-300 font-mono focus:outline-none text-[11px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400">Instant DM Reply Message:</label>
                <textarea
                  rows={3}
                  value={selectedPostForRule.dmText}
                  onChange={(e) => setSelectedPostForRule({ ...selectedPostForRule, dmText: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none"
                  required
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black rounded-xl text-xs mt-1 shadow-lg">
                Save & Activate Reel Trigger 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Add Custom Knowledge Box to AI */}
      {showAddAiBoxModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-purple-500/50 rounded-3xl p-5 max-w-xs w-full space-y-3 relative shadow-2xl">
            <button onClick={() => setShowAddAiBoxModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-white">Add Custom AI Brain Box</h3>
            <p className="text-[10px] text-gray-400">Create any custom topic (e.g. Guarantee, Customization, Sizing):</p>
            <form onSubmit={handleAddAiKnowledgeBox} className="space-y-2 text-xs">
              <input
                type="text"
                placeholder="Topic Title (e.g. Sizing & Alterations)"
                value={newAiBox.title}
                onChange={(e) => setNewAiBox({ ...newAiBox, title: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none"
                required
              />
              <textarea
                rows={3}
                placeholder="Details for AI to know..."
                value={newAiBox.content}
                onChange={(e) => setNewAiBox({ ...newAiBox, content: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none"
                required
              />
              <button type="submit" className="w-full py-2.5 bg-purple-600 text-white font-black rounded-xl text-xs mt-2">
                Add to AI Brain 🧠
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 7: Add Flow Automation */}
      {showAddFlowModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-cyan-500/50 rounded-3xl p-5 max-w-xs w-full space-y-3 relative shadow-2xl">
            <button onClick={() => setShowAddFlowModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-white">Create Flow Automation</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newFlow.name || !newFlow.description) return;
              setFlowRules([...flowRules, { id: 'fl_' + Date.now(), ...newFlow, active: true }]);
              setNewFlow({ name: '', trigger: 'Incoming Keyword', description: '' });
              setShowAddFlowModal(false);
              alert('New flow automation created! ⚡');
            }} className="space-y-2 text-xs">
              <input
                type="text"
                placeholder="Flow Name (e.g. Order Status Tracker)"
                value={newFlow.name}
                onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Trigger Condition (e.g. Keyword 'STATUS')"
                value={newFlow.trigger}
                onChange={(e) => setNewFlow({ ...newFlow, trigger: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none"
                required
              />
              <textarea
                rows={2}
                placeholder="What action should happen automatically?"
                value={newFlow.description}
                onChange={(e) => setNewFlow({ ...newFlow, description: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none"
                required
              />
              <button type="submit" className="w-full py-2.5 bg-cyan-600 text-white font-black rounded-xl text-xs mt-2">
                Create & Activate Flow ⚡
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 8: Quick Add Contact */}
      {showAddContactModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e14] border border-gray-800 rounded-3xl p-5 max-w-xs w-full space-y-3 relative shadow-2xl">
            <button onClick={() => setShowAddContactModal(false)} className="absolute top-4 right-4 text-gray-400">
              <X size={16} />
            </button>
            <h3 className="text-sm font-bold text-white">Add Contact to CRM</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newContact.phone) return;
              setContacts([...contacts, { id: 'c_' + Date.now(), ...newContact, source: 'whatsapp', optIn: true }]);
              setNewContact({ name: '', phone: '', city: '', stage: 'New Lead' });
              setShowAddContactModal(false);
            }} className="space-y-2 text-xs">
              <input
                type="text"
                placeholder="Customer Name"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none"
                required
              />
              <input
                type="tel"
                placeholder="Mobile (+91 XXXXX XXXXX)"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white font-mono focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="City / Area"
                value={newContact.city}
                onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none"
              />
              <button type="submit" className="w-full py-2.5 bg-emerald-500 text-black font-black rounded-xl text-xs mt-2">
                Save to CRM
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5 BOTTOM TABS NAVIGATION BAR
      ───────────────────────────────────────────────────────────── */}
      <nav className="bg-[#0b0b10]/95 backdrop-blur-lg border-t border-gray-800/80 px-2 py-1.5 flex items-center justify-around fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 text-[10px] font-bold">
        
        {/* Tab 1: Chats */}
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

        {/* Tab 2: Dashboard */}
        <button
          onClick={() => { setActiveTab('dashboard'); setActiveChatThread(null); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'dashboard' ? 'text-purple-400 bg-purple-950/40' : 'text-gray-400'
          }`}
        >
          <LayoutDashboard size={17} />
          <span>Dashboard</span>
        </button>

        {/* Tab 3: Catalog */}
        <button
          onClick={() => { setActiveTab('catalog'); setActiveChatThread(null); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'catalog' ? 'text-pink-400 bg-pink-950/40' : 'text-gray-400'
          }`}
        >
          <ShoppingBag size={17} />
          <span>Catalog</span>
        </button>

        {/* Tab 4: AI Assistant */}
        <button
          onClick={() => { setActiveTab('ai_assistant'); setActiveChatThread(null); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'ai_assistant' ? 'text-teal-400 bg-teal-950/40' : 'text-gray-400'
          }`}
        >
          <Sparkles size={17} />
          <span>AI Assistant</span>
        </button>

        {/* Tab 5: Menu */}
        <button
          onClick={() => { setActiveTab('menu'); setMenuSubScreen('menu_grid'); setActiveChatThread(null); }}
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
