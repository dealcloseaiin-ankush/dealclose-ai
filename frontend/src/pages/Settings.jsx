import { useState, useEffect } from 'react';
import api from '../services/api'; // Import our Axios instance
import { Eye, EyeOff, Shield, Plus, Trash2, Briefcase, CheckCircle, Edit, Zap, Database } from 'lucide-react';
import MetaConnectButton from '../components/MetaConnectButton';

export default function Settings() {
  const [config, setConfig] = useState({
    whatsappToken: '',
    phoneNumberId: '',
    wabaId: '',
    twilioSid: '',
    twilioAuthToken: '',
    twilioPhone: '',
    instagramLink: '',
    facebookLink: '',
    youtubeLink: '',
    googleReviewLink: '',
    websiteLink: '',
    discountPercentage: '',
    discountCode: '',
    validityDays: '30',
    workspaces: [], // Store multiple businesses here
    aiAgentEnabled: true,
    acceptCollabs: false,
    businessDescription: '',
    businessName: '',
    aiRules: '',
    ownerPhone: '',
    metaPixelId: '',
    metaAccessToken: '',
    externalApiUrl: '',
    externalApiToken: '',
    externalApiSearchUrl: '',
    externalApiPostUrl: '',
    externalApiBlogUrl: '',
    externalApiVisitUrl: '',
    customWebhooks: [],
    igAccessToken: '',
    igAccountId: '',
    fbPageId: ''
  });
  
  const [devApiKey, setDevApiKey] = useState('');
  
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConnectedEmail, setGoogleConnectedEmail] = useState(''); // 🚀 FIXED STATE
  const [userId, setUserId] = useState('demo-business'); // Used for QR code link
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [showExternalToken, setShowExternalToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState('main');
  
  const [passData, setPassData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [expandedWebhooks, setExpandedWebhooks] = useState({});
  const [instagramPicker, setInstagramPicker] = useState(null);
  const [isSavingInstagramSelection, setIsSavingInstagramSelection] = useState(false);

  // --- Functions ---
  const addCustomWebhook = () => {
    if (config.customWebhooks && config.customWebhooks.length >= 10) return alert("Maximum 10 custom actions allowed.");
    const currentWebhooks = config.customWebhooks || [];
    setConfig({ ...config, customWebhooks: [...currentWebhooks, { name: '', url: '', description: '', method: 'POST' }] });
    setExpandedWebhooks({ ...expandedWebhooks, [currentWebhooks.length]: true });
  };
  
  const removeCustomWebhook = (index) => {
    const updated = config.customWebhooks.filter((_, i) => i !== index);
    setConfig({ ...config, customWebhooks: updated });
  };
  
  const handleCustomWebhookChange = (index, field, value) => {
    const updated = [...(config.customWebhooks || [])];
    updated[index][field] = value;
    setConfig({ ...config, customWebhooks: updated });
  };

  // --- Google Sheets OAuth Handlers ---
  useEffect(() => {
    // Catch Google OAuth Redirect Code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setIsLoading(true);
      
      // 🚀 CRITICAL FIX: Clean URL instantly to prevent React StrictMode from sending the code twice (causes 400 Error)
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const currentUri = `${window.location.origin}${window.location.pathname}`;
      api.post('/settings/google/connect', { code, redirectUri: currentUri })
        .then(() => {
          alert('🎉 Google Sheets Connected Successfully! Auto-sync is now ACTIVE.');
          fetchSettings();
        })
        .catch(err => {
          const errMsg = err.response?.status === 404
            ? 'Backend API Route Not Found (404). Please ensure /api/settings/google/connect is properly mapped in your server routes.'
            : (err.response?.data?.message || err.message);
            
          alert(`❌ Google Connection Failed: ${errMsg}`);
          setIsLoading(false);
        });
    }
  }, []);

  const handleGoogleAuth = async () => {
    try {
      const currentUri = `${window.location.origin}${window.location.pathname}`;
      const res = await api.get(`/settings/google/auth-url?redirectUri=${encodeURIComponent(currentUri)}`);
      if (res.data.success) window.location.href = res.data.url; // Redirect to Google Login
    } catch (err) { alert(err.response?.data?.message || 'Error generating Auth URL.'); }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/users/profile');
      const savedData = data.user || data.data || data; // CRITICAL FIX: Restored data.user to load DB values
      
      console.log("➡️ [Settings Debug] Data fetched from DB:", savedData);
      console.log("➡️ [Settings Debug] IG Token status (root):", (savedData.instagramConfig?.accessToken || savedData.instagramConfig?.accessToken) ? "Exists ✅" : "Missing ❌");
      console.log("➡️ [Settings Debug] Workspaces loaded:", (savedData.workspaces || []).map((ws, i) => ({ index: i, name: ws.name, _id: ws._id, hasInstagramConfig: !!(ws.instagramConfig?.accessToken || ws.instagramConfig?.accessToken) })));
      
      // 🔥 DETAILED DEBUG LOGS
      console.log("🔍 WORKSPACES FULL DATA:", JSON.stringify(savedData.workspaces, null, 2));
      (savedData.workspaces || []).forEach((ws, i) => {
        console.log(`🔍 WS ${i}: name="${ws.name}", _id="${ws._id}"`);
        console.log(`    📦 instagramConfig:`, ws.instagramConfig);
        console.log(`    ✅ Has accessToken: ${!!(ws.instagramConfig?.accessToken)}`);
        console.log(`    ✅ Has instagramAccountId: ${!!(ws.instagramConfig?.instagramAccountId)}`);
        console.log(`    ✅ Has facebookPageId: ${!!(ws.instagramConfig?.facebookPageId)}`);
      });
      
      if (savedData) {
        setConfig({
          whatsappToken: savedData.whatsappToken || savedData.whatsappConfig?.accessToken || '',
          phoneNumberId: savedData.phoneNumberId || savedData.whatsappConfig?.phoneNumberId || '',
          wabaId: savedData.wabaId || savedData.whatsappConfig?.wabaId || '',
          twilioSid: savedData.twilioSid || savedData.twilioConfig?.sid || '',
          twilioAuthToken: savedData.twilioAuthToken || savedData.twilioConfig?.authToken || '',
          twilioPhone: savedData.twilioPhone || savedData.twilioConfig?.phone || '',
          instagramLink: savedData.digitalCardConfig?.instagram || '',
          facebookLink: savedData.digitalCardConfig?.facebook || '',
          youtubeLink: savedData.digitalCardConfig?.youtube || '',
          googleReviewLink: savedData.digitalCardConfig?.googleReview || '',
          websiteLink: savedData.digitalCardConfig?.website || '',
          discountPercentage: savedData.discountConfig?.percentage || '',
          discountCode: savedData.discountConfig?.code || '',
          validityDays: savedData.discountConfig?.validityDays || '30',
          workspaces: (savedData.workspaces || []).map((ws) => ({
            ...ws,
            instagramConfig: ws.instagramConfig || {},
          })),
          aiAgentEnabled: savedData.aiAgentEnabled !== false,
          acceptCollabs: savedData.acceptCollabs || false,
          businessDescription: savedData.businessDescription || '',
          businessName: savedData.businessName || '',
          aiRules: savedData.aiRules || '',
          ownerPhone: savedData.ownerPhone || '',
          metaPixelId: savedData.metaAdsConfig?.pixelId || '',
          metaAccessToken: savedData.metaAdsConfig?.accessToken || '',
          externalApiUrl: savedData.externalApiUrl || '',
          externalApiToken: savedData.externalApiToken || '',
          externalApiSearchUrl: savedData.externalApiSearchUrl || '',
          externalApiPostUrl: savedData.externalApiPostUrl || '',
          externalApiBlogUrl: savedData.externalApiBlogUrl || '',
          externalApiVisitUrl: savedData.externalApiVisitUrl || '',
          customWebhooks: savedData.customWebhooks || [],
          igAccessToken: savedData.instagramConfig?.accessToken || '',
          igAccountId: savedData.instagramConfig?.instagramAccountId || '',
          fbPageId: savedData.instagramConfig?.facebookPageId || ''
        });
        if (savedData._id) setUserId(savedData._id);
        if (savedData._id) setDevApiKey(savedData._id);
        // Derive IG connected state from saved config when rendering instead of relying on multiple setState calls
        setGoogleConnected(!!(savedData.googleSheetsConfig && savedData.googleSheetsConfig.accessToken));
        setGoogleConnectedEmail(savedData.googleSheetsConfig?.connectedEmail || ''); // 🚀 Extract email
      }
    } catch (error) {
      console.error('Failed to load settings. It might be empty currently.', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch saved settings on page load
  useEffect(() => {
    fetchSettings();
  }, []);

  // Debug: log active workspace mapping to detect mismatch between DB and UI
  useEffect(() => {
    const isMain = activeWorkspace === 'main';
    const wsIndex = isMain ? -1 : parseInt(activeWorkspace.replace('ws_', ''));
    const aw = !isMain ? config.workspaces?.[wsIndex] : null;
    console.log('[Settings Debug] activeWorkspace id:', activeWorkspace, 'wsIndex:', wsIndex, 'activeWorkspace config found:', !!aw, aw ? `{name: ${aw.name}, _id: ${aw._id}}` : 'N/A');
  }, [config.workspaces, activeWorkspace]);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  // Workspace Management Functions
  const handleWorkspaceChange = (index, field, value) => {
    const updatedWorkspaces = [...config.workspaces];
    updatedWorkspaces[index][field] = value;
    setConfig({ ...config, workspaces: updatedWorkspaces });
  };

  const addWorkspace = () => {
    if (config.workspaces && config.workspaces.length >= 5) {
      return alert("Business limit reached! Please upgrade your plan to add more branches.");
    }
    setConfig({ ...config, workspaces: [...(config.workspaces || []), { name: 'New Branch', description: '', email: '' }] });
    setActiveWorkspace(`ws_${(config.workspaces || []).length}`);
  };

  const removeWorkspace = (index) => {
    const updatedWorkspaces = config.workspaces.filter((_, i) => i !== index);
    setConfig({ ...config, workspaces: updatedWorkspaces });
  };

  // --- Smart Social Links Helpers ---
  const getUsername = (url, prefix) => {
    if (!url) return '';
    let val = url.trim();
    val = val.replace(/^https?:\/\/(www\.)?/, '');
    const domainPrefix = prefix.replace(/^https?:\/\/(www\.)?/, '');
    if (val.startsWith(domainPrefix)) val = val.substring(domainPrefix.length);
    return val.replace(/^\//, '');
  };

  const handleSocialLinkChange = (field, prefix, e) => {
    let val = e.target.value.trim();
    val = val.replace(/^https?:\/\/(www\.)?/, '');
    const domainPrefix = prefix.replace(/^https?:\/\/(www\.)?/, '');
    if (val.startsWith(domainPrefix)) val = val.substring(domainPrefix.length);
    val = val.replace(/^\//, '');
    const fullUrl = val ? `${prefix}${val}` : '';
    setConfig({ ...config, [field]: fullUrl });
  };

  const handleWorkspaceSocialChange = (index, field, prefix, e) => {
    let val = e.target.value.trim();
    val = val.replace(/^https?:\/\/(www\.)?/, '');
    const domainPrefix = prefix.replace(/^https?:\/\/(www\.)?/, '');
    if (val.startsWith(domainPrefix)) val = val.substring(domainPrefix.length);
    val = val.replace(/^\//, '');
    const fullUrl = val ? `${prefix}${val}` : '';
    handleWorkspaceChange(index, field, fullUrl);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Transform data so backend overwrites (deletes) old keys completely
      const payload = {
        aiAgentEnabled: config.aiAgentEnabled,
        acceptCollabs: config.acceptCollabs,
        businessDescription: config.businessDescription,
        aiRules: config.aiRules,
        businessName: config.businessName,
        ownerPhone: config.ownerPhone,
        whatsappConfig: {
          accessToken: config.whatsappToken,
          phoneNumberId: config.phoneNumberId,
          wabaId: config.wabaId
        },
        twilioConfig: {
          sid: config.twilioSid,
          authToken: config.twilioAuthToken,
          phone: config.twilioPhone
        },
        digitalCardConfig: {
          instagram: config.instagramLink,
          facebook: config.facebookLink,
          youtube: config.youtubeLink,
          googleReview: config.googleReviewLink,
          website: config.websiteLink
        },
        discountConfig: {
          percentage: config.discountPercentage,
          code: config.discountCode,
          validityDays: config.validityDays
        },
        metaAdsConfig: {
          pixelId: config.metaPixelId,
          accessToken: config.metaAccessToken
        },
      instagramConfig: {
        accessToken: config.igAccessToken,
        instagramAccountId: config.igAccountId,
        facebookPageId: config.fbPageId
      },
        externalApiUrl: config.externalApiUrl,
        externalApiToken: config.externalApiToken,
        externalApiSearchUrl: config.externalApiSearchUrl,
        externalApiPostUrl: config.externalApiPostUrl,
        externalApiBlogUrl: config.externalApiBlogUrl,
        externalApiVisitUrl: config.externalApiVisitUrl,
        workspaces: config.workspaces,
        customWebhooks: config.customWebhooks
      };

      console.log("➡️ [DEBUG] Sending this payload to backend on Save:", payload);

      await api.put('/users/profile', payload);
      alert('Settings saved successfully! AI is now connected to your accounts.');
      await fetchSettings(); // 🔥 Refresh background IDs instantly so Meta Connect doesn't fail
    } catch (error) {
      alert('Error saving settings: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) return alert("New passwords do not match!");
    
    setIsChangingPass(true);
    try {
      await api.post('/users/change-password', { oldPassword: passData.oldPassword, newPassword: passData.newPassword });
      alert("Password changed successfully!");
      setPassData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      alert(error.response?.data?.message || "Failed to change password. Please check your old password.");
    } finally {
      setIsChangingPass(false);
    }
  };

  const openInstagramPicker = (data, workspaceId = 'main') => {
    if (!data?.availableAccounts?.length) return fetchSettings();
    setInstagramPicker({ workspaceId, accounts: data.availableAccounts });
  };

  const saveInstagramSelection = async (account) => {
    console.log('[Instagram Picker] selected account:', account);
    setIsSavingInstagramSelection(true);
    try {
      const { data } = await api.post('/users/settings/instagram-connect-selected', {
        selectedAccountId: account.accountId,
        selectedPageId: account.pageId
      });
      console.log('[Instagram Picker] backend response for selection:', data);
      setInstagramPicker(null);
      await fetchSettings();
      if (data.webhookWarning) {
        alert(`Instagram connected, but webhook setup needs Meta permissions: ${data.webhookWarning}`);
      }
    } catch (error) {
      console.error('[Instagram Picker] save selection error:', error.response?.data || error.message);
      alert(error.response?.data?.message || 'Could not save the selected Instagram account.');
    } finally {
      setIsSavingInstagramSelection(false);
    }
  };

  // --- Dynamic View Setup ---
  const isMain = activeWorkspace === 'main';
  const wsIndex = isMain ? -1 : parseInt(activeWorkspace.replace('ws_', ''));
  const activeWs = !isMain ? config.workspaces[wsIndex] : null;
  const mainIgConnected = !!(config.igAccessToken && config.igAccountId);
  const qrUrl = isMain ? `${window.location.origin}/card/${userId}` : `${window.location.origin}/card/${userId}?ws=${wsIndex}`;

  // 🔥 WORKSPACE DEBUG LOGS
  if (!isMain) {
    console.log(`🔍 [Settings] Active Workspace:
      - activeWorkspace id: ${activeWorkspace}
      - wsIndex: ${wsIndex}
      - activeWs object:`, activeWs);
    if (activeWs?.instagramConfig) {
      console.log(`🔍 [Settings] Workspace instagramConfig:
        - accessToken: ${activeWs.instagramConfig.accessToken ? '✅ Present' : '❌ Missing'}
        - instagramAccountId: ${activeWs.instagramConfig.instagramAccountId}
        - facebookPageId: ${activeWs.instagramConfig.facebookPageId}
        - Full Config:`, JSON.stringify(activeWs.instagramConfig, null, 2));
    } else {
      console.log(`🔍 [Settings] NO instagramConfig found in activeWs!`);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#050505] text-gray-100 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* TOP BAR & WORKSPACE SWITCHER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-2">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                  Integrations & Settings
                </span>
              </h1>
              <select 
                value={activeWorkspace} 
                onChange={(e) => setActiveWorkspace(e.target.value)} 
                className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-green-500 cursor-pointer shadow-sm"
              >
                <option value="main">🏢 {config.businessName || 'Main Business'}</option>
                {config.workspaces.map((ws, index) => (
                  <option key={index} value={`ws_${index}`}>🏢 {ws.name || `Branch ${index + 1}`}</option>
                ))}
              </select>
            </div>
            <p className="text-gray-400 md:text-lg">Manage your APIs, AI Rules, and Branches securely.</p>
          </div>
          <button onClick={handleSave} className="w-full md:w-auto px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-colors shadow-lg shadow-green-600/20 flex items-center justify-center gap-2">
            <CheckCircle size={18}/> Save Settings
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div></div>
        ) : (
          <>
            {/* DYNAMIC RENDERING: MAIN WORKSPACE OR SUB-WORKSPACE */}
            
            {/* ======================================= */}
            {/* VIEW 1: MAIN BUSINESS (GLOBAL SETTINGS) */}
            {/* ======================================= */}
            {isMain && (
              <form onSubmit={handleSave} className="space-y-8 animate-fade-in">
                {/* AI Agent Configuration (Main) */}
                <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800">
                  <div className="bg-gradient-to-r from-purple-900/10 to-[#111] p-5 rounded-xl border border-purple-500/30 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-center mb-4 relative z-10">
                      <h2 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                        <span className="text-xl">🏢</span> {config.businessName || 'Main Business'} Profile & AI
                      </h2>
                      <button type="button" onClick={() => setConfig({...config, aiAgentEnabled: !config.aiAgentEnabled})} className={`w-12 h-6 rounded-full transition-colors relative ${config.aiAgentEnabled ? 'bg-purple-600' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.aiAgentEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
                      </button>
                    </div>
                    <div className="flex justify-between items-center mb-6 relative z-10 border-t border-purple-500/20 pt-4 mt-2">
                      <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                        🤝 Accept Free Collaborations (For Influencers)
                      </h2>
                      <button type="button" onClick={() => setConfig({...config, acceptCollabs: !config.acceptCollabs})} className={`w-12 h-6 rounded-full transition-colors relative ${config.acceptCollabs ? 'bg-green-600' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.acceptCollabs ? 'translate-x-7' : 'translate-x-1'}`}></div>
                      </button>
                    </div>
                    
                    <div className="relative z-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Primary Business Name</label>
                          <input type="text" name="businessName" value={config.businessName} onChange={handleChange} placeholder="e.g. DealClose AI" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Owner WhatsApp (For AI Alerts) <span className="text-rose-500">*</span></label>
                          <input type="text" name="ownerPhone" value={config.ownerPhone} onChange={handleChange} placeholder="e.g. 919876543210" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none" required />
                        </div>
                      </div>

                      {/* Social Links for Main Business */}
                      <div className="mb-6 p-4 bg-[#1a1a1a] border border-gray-800 rounded-xl">
                        <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Main Business Links</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input type="text" name="websiteLink" value={config.websiteLink} onChange={handleChange} placeholder="🌐 Website / Catalog URL" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-purple-500 outline-none md:col-span-2" />
                          <div className="md:col-span-2">
                            <div className="flex bg-[#0a0a0a] border border-gray-700 rounded-lg overflow-hidden focus-within:border-purple-500">
                              <span className="px-3 py-2 text-gray-500 bg-[#111] text-sm flex items-center border-r border-gray-700">ig.com/</span>
                              <input type="text" value={getUsername(config.instagramLink, 'https://instagram.com/')} onChange={(e) => handleSocialLinkChange('instagramLink', 'https://instagram.com/', e)} placeholder="username" className="w-full bg-transparent p-2 text-white text-sm outline-none" />
                            </div>
                          </div>
                          <div>
                            <div className="flex bg-[#0a0a0a] border border-gray-700 rounded-lg overflow-hidden focus-within:border-purple-500">
                              <span className="px-3 py-2 text-gray-500 bg-[#111] text-sm flex items-center border-r border-gray-700">fb.com/</span>
                              <input type="text" value={getUsername(config.facebookLink, 'https://facebook.com/')} onChange={(e) => handleSocialLinkChange('facebookLink', 'https://facebook.com/', e)} placeholder="page_name" className="w-full bg-transparent p-2 text-white text-sm outline-none" />
                            </div>
                          </div>
                          <input type="text" name="googleReviewLink" value={config.googleReviewLink} onChange={handleChange} placeholder="⭐ Google Review / Maps Link" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-purple-500 outline-none" />
                        </div>
                      </div>

                      <label className="block text-sm font-medium text-gray-300 mb-2">Business Knowledge (AI Training Data) <span className="text-rose-500">*</span></label>
                      <textarea name="businessDescription" value={config.businessDescription} onChange={handleChange} rows="3" placeholder="e.g. We are 'Shoe Mart'. We sell sports shoes. Delivery takes 3 days..." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"></textarea>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Custom AI Rules (Limit Response & Behavior)</label>
                        <textarea name="aiRules" value={config.aiRules} onChange={handleChange} rows="3" placeholder="e.g. Talk in Hinglish. Never offer discounts without asking." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"></textarea>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Meta Config */}
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-green-400 flex items-center">WhatsApp (Meta API)</h2>
                  <MetaConnectButton buttonText="Connect WhatsApp" platform="whatsapp" workspaceId="main" onSuccess={fetchSettings} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 relative">
                      <label className="block text-sm font-medium text-gray-400 mb-2">Permanent Access Token</label>
                        <div className="relative">
                          <input type={showWhatsappToken ? "text" : "password"} name="whatsappToken" value={config.whatsappToken} onChange={handleChange} placeholder="EAAL..." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none pr-10" />
                          <button type="button" onClick={() => setShowWhatsappToken(!showWhatsappToken)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none">
                            {showWhatsappToken ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number ID</label>
                      <input type="text" name="phoneNumberId" value={config.phoneNumberId} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none" placeholder="1234567890" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">WABA ID (Business Account ID)</label>
                      <input type="text" name="wabaId" value={config.wabaId} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none" placeholder="1234567890" />
                    </div>
                  </div>
                </div>

                {/* Google Sheets Integration (Premium) */}
                <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-emerald-500/30 relative overflow-hidden mt-8">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="flex justify-between items-center mb-4 relative z-10">
                    <h2 className="text-xl font-semibold text-emerald-400 flex items-center gap-2"><Database size={20}/> Google Sheets Auto-Sync</h2>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${googleConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{googleConnected ? 'Connected & Active ✅' : 'Not Connected'}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-6 relative z-10">Automatically backup every new Lead (from WhatsApp & Instagram) directly into your Google Sheets to save data forever (BYOS).</p>
                  
                  {!googleConnected ? (
                    <button type="button" onClick={handleGoogleAuth} className="px-6 py-3 bg-white hover:bg-gray-100 text-gray-800 font-bold rounded-xl transition-all flex items-center gap-3 shadow-lg border border-gray-200 relative z-10 hover:-translate-y-1">
                       <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                         <path fill="#4285F4" d="M22.56 12.25 c0-.78-.07-1.53-.2-2.25 H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31 v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                         <path fill="#34A853" d="M12 23 c2.97 0 5.46-.98 7.28-2.66 l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                         <path fill="#FBBC05" d="M5.84 14.09 c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                         <path fill="#EA4335" d="M12 5.38 c1.62 0 3.06.56 4.21 1.64 l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07 l3.66 2.84 c.87-2.6 3.3-4.53 6.16-4.53z" />
                       </svg>
                       <span>Connect Google Sheets</span>
                    </button>
                  ) : (
                    <div className="relative z-10">
                      <p className="text-sm font-semibold text-emerald-500 mb-1">✅ Connected to: <span className="text-white font-bold">{googleConnectedEmail || 'Your Google Account'}</span></p>
                      <p className="text-xs text-emerald-600 font-medium">Your leads are automatically syncing to this Drive.</p>
                    </div>
                  )}
                </div>

                {/* Branch Management Section */}
                <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg md:text-xl font-semibold text-blue-400 flex items-center gap-2">
                       <Briefcase size={20}/> Managed Branches / Businesses
                    </h2>
                    <button type="button" onClick={addWorkspace} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                      <Plus size={16} /> Add New Business
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mb-6">Add sub-businesses. These appear automatically as a menu when customers say "Hi" on WhatsApp.</p>
                  
                  {!config.workspaces || config.workspaces.length === 0 ? (
                    <div className="text-center p-6 border border-dashed border-gray-700 rounded-xl text-gray-500">No secondary branches added.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {config.workspaces.map((ws, i) => (
                         <div key={i} className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700 flex justify-between items-center group hover:border-blue-500 transition-all">
                           <div className="overflow-hidden pr-4">
                             <p className="font-bold text-white truncate">{ws.name || 'Unnamed Branch'}</p>
                             <p className="text-xs text-gray-500 truncate">{ws.description || 'No description'}</p>
                           </div>
                           <button type="button" onClick={() => setActiveWorkspace(`ws_${i}`)} className="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 font-bold shrink-0">Edit Config</button>
                         </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meta Ads, IG, Twilio & Webhooks Group */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Instagram Integration */}
                  <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-pink-400">Instagram Automation</h2>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${mainIgConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>{mainIgConnected ? 'Connected ✅' : 'Not Connected'}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target IG Access Token</label>
                    <input type="password" name="igAccessToken" value={config.igAccessToken} onChange={handleChange} placeholder="IG Token (Auto-filled or Paste here)" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-purple-500" />
                      </div>
                      <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target IG Account ID</label>
                    <input type="text" name="igAccountId" value={config.igAccountId} onChange={handleChange} placeholder="Target Account ID" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-purple-500" />
                      </div>
                    </div>
                    <p className="text-xs text-blue-400 font-medium mb-4">💡 Note: Instagram tokens are automatically fetched securely from Meta when you connect.</p>

                    {!mainIgConnected ? (
                  <MetaConnectButton 
                    buttonText="Connect Instagram via Meta" 
                    platform="instagram" 
                    workspaceId="main" 
                    onSuccess={(data) => openInstagramPicker(data, 'main')} 
                  />
                    ) : (
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                         <p className="text-sm text-green-400 font-semibold">Instagram is actively monitored by AI.</p>
                         <button type="button" onClick={() => { /* Graceful disconnect UI - user can clear token manually */ alert('Disconnect via Settings: paste blank IG token and save.'); }} className="mt-3 text-sm text-red-400 font-bold hover:underline">Disconnect</button>
                      </div>
                    )}
                  </div>

                  {/* Meta Ads Conversions API */}
                  <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800">
                    <h2 className="text-xl font-semibold text-blue-400 mb-4">🎯 Meta Pixel & Ads API</h2>
                    <div className="space-y-4">
                      <input type="text" name="metaPixelId" value={config.metaPixelId} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="Pixel ID" />
                      <input type="password" name="metaAccessToken" value={config.metaAccessToken} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="CAPI Access Token" />
                    </div>
                  </div>
                </div>
                
                {/* Automated Offers & Discounts */}
                <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-green-500/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  <h2 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2 relative z-10">
                     🎁 Auto-Discount & Loyalty Offer
                  </h2>
                  <p className="text-gray-400 text-sm mb-6 relative z-10">When AI asks for a review/follow, it will automatically send this discount code to bring the customer back.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Discount %</label>
                      <input type="number" name="discountPercentage" value={config.discountPercentage} onChange={handleChange} placeholder="10" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Referral / Offer Code</label>
                      <input type="text" name="discountCode" value={config.discountCode} onChange={handleChange} placeholder="SAVE10" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Valid For (Days)</label>
                      <input type="number" name="validityDays" value={config.validityDays} onChange={handleChange} placeholder="30" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none" />
                    </div>
                  </div>
                </div>

                {/* Twilio & External Webhooks */}
                <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800">
                  <h2 className="text-xl font-semibold text-teal-400 mb-6 flex items-center gap-2">🔗 Custom Webhooks & API Integrations</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Base Website URL</label>
                        <input type="url" name="externalApiUrl" value={config.externalApiUrl} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-teal-500 outline-none" placeholder="https://yourdomain.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">API Secret Token / Key</label>
                        <div className="relative">
                          <input type={showExternalToken ? "text" : "password"} name="externalApiToken" value={config.externalApiToken} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-teal-500 outline-none pr-10" />
                          <button type="button" onClick={() => setShowExternalToken(!showExternalToken)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                            {showExternalToken ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-800">
                       <p className="text-sm text-teal-400 font-bold mb-4">Specific Custom API Endpoints</p>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <label className="block text-xs font-medium text-gray-400 mb-1">Search/Catalog Endpoint URL</label>
                           <input type="url" name="externalApiSearchUrl" value={config.externalApiSearchUrl} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-teal-500 outline-none" placeholder="https://yourwebsite.com/api/search" />
                         </div>
                         <div>
                           <label className="block text-xs font-medium text-gray-400 mb-1">Quick Post Endpoint URL</label>
                           <input type="url" name="externalApiPostUrl" value={config.externalApiPostUrl} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-teal-500 outline-none" placeholder="https://yourwebsite.com/api/post" />
                         </div>
                         <div>
                           <label className="block text-xs font-medium text-gray-400 mb-1">Publish Blog Endpoint URL</label>
                           <input type="url" name="externalApiBlogUrl" value={config.externalApiBlogUrl} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-teal-500 outline-none" placeholder="https://yourwebsite.com/api/blog" />
                         </div>
                         <div>
                           <label className="block text-xs font-medium text-gray-400 mb-1">Schedule Visit Endpoint URL</label>
                           <input type="url" name="externalApiVisitUrl" value={config.externalApiVisitUrl} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-teal-500 outline-none" placeholder="https://yourwebsite.com/api/visit" />
                         </div>
                       </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-800">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm text-teal-400 font-bold">Dynamic AI Actions (Limit: {(config.customWebhooks || []).length}/10)</h3>
                        <button type="button" onClick={addCustomWebhook} className="text-xs bg-teal-600/20 text-teal-400 px-3 py-1.5 rounded-lg font-bold">
                          + Add Action
                        </button>
                      </div>
                      <div className="space-y-4">
                        {(config.customWebhooks || []).map((webhook, index) => {
                          const isExpanded = expandedWebhooks[index] || (!webhook.name && !webhook.url);
                          return (
                          <div key={index} className="bg-[#1a1a1a] border border-gray-700 p-4 rounded-xl relative">
                            {isExpanded ? (
                              <>
                                <button type="button" onClick={() => removeCustomWebhook(index)} className="absolute top-3 right-10 text-gray-500 hover:text-rose-500"><Trash2 size={16} /></button>
                                <button type="button" onClick={() => setExpandedWebhooks({...expandedWebhooks, [index]: false})} className="absolute top-3 right-3 text-emerald-500 hover:text-emerald-400"><CheckCircle size={16} /></button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                  <div><input type="text" value={webhook.name} onChange={e => handleCustomWebhookChange(index, 'name', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm" placeholder="Action Name" /></div>
                                  <div><input type="url" value={webhook.url} onChange={e => handleCustomWebhookChange(index, 'url', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm" placeholder="URL" /></div>
                                  <div className="md:col-span-2"><input type="text" value={webhook.description} onChange={e => handleCustomWebhookChange(index, 'description', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm" placeholder="Description of when AI should trigger this" /></div>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="text-sm font-bold text-white flex items-center gap-2"><Zap size={14} className="text-teal-400"/> {webhook.name}</h4>
                                  <p className="text-xs text-gray-400 mt-1">{webhook.url}</p>
                                </div>
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => setExpandedWebhooks({...expandedWebhooks, [index]: true})} className="text-gray-400 hover:text-blue-400 bg-gray-800 p-2 rounded-lg"><Edit size={14} /></button>
                                  <button type="button" onClick={() => removeCustomWebhook(index)} className="text-gray-400 hover:text-rose-400 bg-gray-800 p-2 rounded-lg"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security Section (Bottom of Main) */}
                <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800">
                  <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                     <Shield className="text-blue-400" /> Security & Password
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="password" required value={passData.oldPassword} onChange={e => setPassData({...passData, oldPassword: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" placeholder="Current Password" />
                    <input type="password" required minLength="6" value={passData.newPassword} onChange={e => setPassData({...passData, newPassword: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" placeholder="New Password" />
                    <button type="button" onClick={handlePasswordSubmit} disabled={isChangingPass || !passData.oldPassword} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-lg">
                      {isChangingPass ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>

                {/* 🚀 NEW: Developer API & Pabbly/Zapier Integration */}
                <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-blue-500/30 relative overflow-hidden mt-8">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  <h2 className="text-xl font-semibold text-blue-400 flex items-center gap-2 relative z-10"><Database size={20}/> Developer API & Webhooks (Zapier/Pabbly)</h2>
                  <p className="text-sm text-gray-400 mb-6 relative z-10">Connect JustDial, IndiaMart, Facebook Lead Ads, or any CRM. Send a POST request to this Webhook URL, and DealClose AI will auto-capture the lead and trigger a WhatsApp message.</p>
                  
                  <div className="bg-[#0a0a0a] border border-gray-700 p-4 rounded-xl relative z-10">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Your Webhook URL (POST)</label>
                    <code className="text-sm text-blue-300 break-all select-all">{window.location.origin}/api/webhooks/inbound/{devApiKey}</code>
                    <p className="text-xs text-gray-500 mt-4 font-mono">Payload Format: <br/>{`{ "name": "John Doe", "phone": "919876543210", "source": "IndiaMart", "customMessage": "Hi John, we got your inquiry!" }`}</p>
                  </div>
                </div>

              </form>
            )}

            {/* ======================================= */}
            {/* VIEW 2: SUB-BUSINESS (BRANCH SETTINGS)  */}
            {/* ======================================= */}
            {!isMain && activeWs && (
              <form onSubmit={handleSave} className="space-y-8 animate-fade-in">
                <div className="bg-[#111111] p-6 md:p-8 rounded-2xl shadow-xl border border-blue-500/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-800 pb-6 relative z-10 gap-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <Briefcase className="text-blue-500" /> {activeWs.name || 'Unnamed Branch'}
                    </h2>
                    <button type="button" onClick={() => { removeWorkspace(wsIndex); setActiveWorkspace('main'); }} className="text-rose-400 hover:text-white flex items-center gap-1 text-sm font-bold bg-rose-500/10 hover:bg-rose-600 px-4 py-2 rounded-xl transition-all shadow-md">
                      <Trash2 size={16}/> Delete This Branch
                    </button>
                  </div>
                  
                  {/* Basic Branch Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                    <div>
                      <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Branch Name <span className="text-rose-500">*</span></label>
                      <input type="text" required value={activeWs.name} onChange={(e) => handleWorkspaceChange(wsIndex, 'name', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Short Menu Description <span className="text-rose-500">*</span></label>
                      <input type="text" required value={activeWs.description} onChange={(e) => handleWorkspaceChange(wsIndex, 'description', e.target.value)} placeholder="e.g. Real Estate Sales" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-500 uppercase mb-2">Branch Email ID</label>
                      <input type="email" value={activeWs.email || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'email', e.target.value)} placeholder="branch@yourbusiness.com" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
                    </div>
                  </div>

                  {/* Branch Social Links */}
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 relative z-10">Branch Specific Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 relative z-10 bg-[#1a1a1a] p-5 rounded-xl border border-gray-800">
                     <input type="text" value={activeWs.website || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'website', e.target.value)} placeholder="🌐 Website / Catalog URL" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none md:col-span-2" />
                     <div className="md:col-span-2">
                       <div className="flex bg-[#0a0a0a] border border-gray-700 rounded-lg overflow-hidden focus-within:border-blue-500">
                         <span className="px-3 py-2 text-gray-500 bg-[#111] text-xs flex items-center border-r border-gray-700">ig.com/</span>
                         <input type="text" value={getUsername(activeWs.instagram, 'https://instagram.com/')} onChange={(e) => handleWorkspaceSocialChange(wsIndex, 'instagram', 'https://instagram.com/', e)} placeholder="username" className="w-full bg-transparent p-2 text-white text-xs outline-none" />
                       </div>
                     </div>
                     <div>
                       <div className="flex bg-[#0a0a0a] border border-gray-700 rounded-lg overflow-hidden focus-within:border-blue-500">
                         <span className="px-3 py-2 text-gray-500 bg-[#111] text-xs flex items-center border-r border-gray-700">fb.com/</span>
                         <input type="text" value={getUsername(activeWs.facebook, 'https://facebook.com/')} onChange={(e) => handleWorkspaceSocialChange(wsIndex, 'facebook', 'https://facebook.com/', e)} placeholder="pagename" className="w-full bg-transparent p-2 text-white text-xs outline-none" />
                       </div>
                     </div>
                  </div>

                  {/* Branch AI Knowledge */}
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 relative z-10">Branch AI Training</h3>
                  <div className="space-y-4 mb-8 relative z-10">
                    <textarea value={activeWs.businessDescription || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'businessDescription', e.target.value)} rows="3" placeholder="AI Training Data (What does this branch do?)" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none"></textarea>
                    <textarea value={activeWs.aiRules || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'aiRules', e.target.value)} rows="2" placeholder="Custom AI Rules (e.g. Be polite, redirect to main branch if unsure)" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none"></textarea>
                  </div>

                  {/* Branch Specific Discounts */}
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 relative z-10 mt-8">🎁 Auto-Discount & Offers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10 bg-[#1a1a1a] p-5 rounded-xl border border-gray-800">
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Discount %</label>
                       <input type="number" value={activeWs.discountPercentage || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'discountPercentage', e.target.value)} placeholder="10" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Offer Code</label>
                       <input type="text" value={activeWs.discountCode || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'discountCode', e.target.value)} placeholder="SAVE10" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valid Days</label>
                       <input type="number" value={activeWs.validityDays || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'validityDays', e.target.value)} placeholder="30" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                     </div>
                  </div>

                  {/* Branch Specific External API */}
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 relative z-10">🔗 External Website API</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative z-10 bg-[#1a1a1a] p-6 rounded-xl border border-gray-800 shadow-inner">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Base Website URL</label>
                      <input type="url" value={activeWs.externalApiUrl || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'externalApiUrl', e.target.value)} placeholder="https://branch-domain.com" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">API Secret Token / Key</label>
                      <input type="password" value={activeWs.externalApiToken || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'externalApiToken', e.target.value)} placeholder="API Secret" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search/Catalog Endpoint</label>
                      <input type="url" value={activeWs.externalApiSearchUrl || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'externalApiSearchUrl', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="API endpoint" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quick Post Endpoint</label>
                      <input type="url" value={activeWs.externalApiPostUrl || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'externalApiPostUrl', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="API endpoint" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Publish Blog Endpoint</label>
                       <input type="url" value={activeWs.externalApiBlogUrl || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'externalApiBlogUrl', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="API endpoint" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Schedule Visit Endpoint</label>
                       <input type="url" value={activeWs.externalApiVisitUrl || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'externalApiVisitUrl', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" placeholder="API endpoint" />
                    </div>
                  </div>

              {/* Branch Independent Meta API Connect (Target Specific Accounts) */}
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 relative z-10 mt-8">Target Meta Connections</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative z-10">
                    <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target WhatsApp Phone ID</label>
                  <input type="text" value={activeWs.whatsappConfig?.phoneNumberId || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'whatsappConfig', { ...activeWs.whatsappConfig, phoneNumberId: e.target.value })} placeholder="Target Phone ID" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target WABA ID</label>
                  <input type="text" value={activeWs.whatsappConfig?.wabaId || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'whatsappConfig', { ...activeWs.whatsappConfig, wabaId: e.target.value })} placeholder="Target WABA ID" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target IG Access Token</label>
                  <input type="password" value={activeWs.instagramConfig?.accessToken || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'instagramConfig', { ...activeWs.instagramConfig, accessToken: e.target.value })} placeholder="IG Token" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-blue-500" />
                    </div>
                    <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target IG Account ID</label>
                  <input type="text" value={activeWs.instagramConfig?.instagramAccountId || ''} onChange={(e) => handleWorkspaceChange(wsIndex, 'instagramConfig', { ...activeWs.instagramConfig, instagramAccountId: e.target.value })} placeholder="Target IG Account ID" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-800 relative z-10 items-center">
                     {activeWs?._id ? (
                       <>
                         <div className="w-full mb-2 flex flex-col md:flex-row gap-4">
                           <div className="flex-1 bg-gray-900 p-3 rounded-lg border border-gray-800">
                             <p className="text-xs text-gray-400 mb-1">WhatsApp Status</p>
                             {activeWs.whatsappConfig?.accessToken ? <span className="text-sm font-bold text-green-400">Dedicated Number Connected ✅</span> : <span className="text-sm font-bold text-blue-400">Using Main Number 🔀</span>}
                           </div>
                           <div className="flex-1 bg-gray-900 p-3 rounded-lg border border-gray-800">
                             <p className="text-xs text-gray-400 mb-1">Instagram Status</p>
                             {activeWs.instagramConfig?.accessToken ? <span className="text-sm font-bold text-pink-400">Dedicated Account Connected ✅</span> : <span className="text-sm font-bold text-gray-500">Not Connected</span>}
                           </div>
                         </div>
                         <p className="text-xs text-blue-400 font-medium w-full mb-2">💡 Tip: When connecting a secondary branch, click "Edit Settings" in the Facebook popup and select ONLY the specific page for this branch!</p>
                     <MetaConnectButton buttonText={activeWs.whatsappConfig?.accessToken ? "Reconnect WhatsApp" : "Connect WhatsApp"} platform="whatsapp" workspaceId={activeWs?._id} onSuccess={fetchSettings} />
                      <MetaConnectButton buttonText={(activeWs.instagramConfig?.accessToken || activeWs.intagramConfig?.accessToken) ? "Reconnect Instagram" : "Connect Instagram"} platform="instagram" workspaceId={activeWs?._id} onSuccess={(data) => openInstagramPicker(data, activeWs?._id)} />
                       </>
                     ) : (
                       <div className="w-full bg-orange-500/10 p-4 rounded-xl border border-orange-500/30 text-sm text-orange-400 font-bold flex items-center gap-2">
                         ⚠️ Please click "Save Settings" first to generate an ID for this branch before connecting Meta.
                       </div>
                     )}
                  </div>
                </div>
              </form>
            )}

            {/* ======================================= */}
            {/* QR CODE PREVIEW (Global to both views)  */}
            {/* ======================================= */}
            <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800 relative overflow-hidden mt-8 animate-fade-in">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gray-500/10 rounded-full blur-2xl"></div>
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
                 📱 Branch Specific QR & Digital Card
              </h2>
              
              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                <div className="bg-white p-4 rounded-xl shadow-lg shrink-0 hover:scale-105 transition-transform cursor-pointer">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="Business QR Code" className="w-32 h-32" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    {isMain 
                      ? "Print this QR code and place it at your store counter or share it online. When customers scan it, they can leave their Name/Number (saved directly to your CRM) and easily follow your main profiles."
                      : `This QR code is strictly routed to the ${activeWs?.name || 'current branch'}. When scanned, it will only show the links configured for this specific branch.`}
                  </p>
                  
                  <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all shadow-md">
                    Preview {isMain ? 'Main Business' : activeWs?.name} Digital Card ↗
                  </a>
                </div>
              </div>
            </div>

          </>
        )}
      </div>

      {instagramPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-pink-500/30 bg-[#111] p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-pink-400">Choose an Instagram account</h2>
            <p className="mt-2 text-sm text-gray-400">Select the Facebook Page and linked Instagram Business Account to connect. Nothing is saved until you choose one.</p>
            <div className="mt-5 space-y-3">
              {instagramPicker.accounts.map((account) => (
                <button
                  key={`${account.pageId}-${account.accountId}`}
                  type="button"
                  disabled={isSavingInstagramSelection}
                  onClick={() => saveInstagramSelection(account)}
                  className="w-full rounded-xl border border-gray-700 bg-[#0a0a0a] p-4 text-left transition hover:border-pink-500 disabled:opacity-50"
                >
                  <span className="block font-semibold text-white">{account.pageName}</span>
                  <span className="mt-1 block text-xs text-gray-400">Page ID: {account.pageId}</span>
                  <span className="block text-xs text-gray-400">Instagram Account ID: {account.accountId}</span>
                </button>
              ))}
            </div>
            <button type="button" disabled={isSavingInstagramSelection} onClick={() => setInstagramPicker(null)} className="mt-5 text-sm font-semibold text-gray-400 hover:text-white">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}