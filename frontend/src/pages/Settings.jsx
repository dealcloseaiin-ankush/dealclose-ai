import { useState, useEffect } from 'react';
import api from '../services/api'; // Import our Axios instance
import { Eye, EyeOff, Shield, Plus, Trash2, Briefcase, CheckCircle, Edit, Zap } from 'lucide-react'; // Icons for viewing tokens
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
    customWebhooks: []
  });
  
  const [igConnected, setIgConnected] = useState(false);
  const [userId, setUserId] = useState('demo-business'); // Used for QR code link
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showExternalToken, setShowExternalToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState('main');
  
  const [passData, setPassData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [expandedWebhooks, setExpandedWebhooks] = useState({});

  // --- Custom Webhook Functions ---
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
    const updated = [...config.customWebhooks];
    updated[index][field] = value;
    setConfig({ ...config, customWebhooks: updated });
  };

  // Fetch saved settings on page load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/users/profile');
        const savedData = data.user || data.data || data; // CRITICAL FIX: Restored data.user to load DB values
        
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
            workspaces: savedData.workspaces || [], // Fetch saved workspaces
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
            customWebhooks: savedData.customWebhooks || []
          });
          if (savedData._id) setUserId(savedData._id);
        }
      } catch (error) {
        console.error('Failed to load settings. It might be empty currently.', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

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
    setConfig({ ...config, workspaces: [...config.workspaces, { name: '', description: '' }] });
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
        externalApiUrl: config.externalApiUrl,
        externalApiToken: config.externalApiToken,
        externalApiSearchUrl: config.externalApiSearchUrl,
        externalApiPostUrl: config.externalApiPostUrl,
        externalApiBlogUrl: config.externalApiBlogUrl,
        externalApiVisitUrl: config.externalApiVisitUrl,
        workspaces: config.workspaces,
        customWebhooks: config.customWebhooks
      };
      await api.put('/users/profile', payload);
      alert('Settings saved successfully! AI is now connected to your accounts.');
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

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#050505] text-gray-100 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
              Integrations & Settings
            </span>
          </h1>
          <p className="text-gray-400 text-lg">Connect your Meta WhatsApp and Calling APIs. The system will use these credentials for all AI interactions.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div></div>
        ) : (
          <>
          <form onSubmit={handleSave} className="space-y-8">
          {/* WhatsApp Meta Config */}
          <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800">
            
            {/* NEW: AI Agent Configuration */}
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
              <p className="text-sm text-gray-400 mb-4 relative z-10">This is your primary business profile. Turn the switch ON to let AI auto-reply to your customers.</p>
              
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
                    <div>
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
                    <div>
                      <div className="flex bg-[#0a0a0a] border border-gray-700 rounded-lg overflow-hidden focus-within:border-purple-500">
                        <span className="px-3 py-2 text-gray-500 bg-[#111] text-sm flex items-center border-r border-gray-700">yt.com/@</span>
                        <input type="text" value={getUsername(config.youtubeLink, 'https://youtube.com/@')} onChange={(e) => handleSocialLinkChange('youtubeLink', 'https://youtube.com/@', e)} placeholder="channel" className="w-full bg-transparent p-2 text-white text-sm outline-none" />
                      </div>
                    </div>
                    <input type="text" name="googleReviewLink" value={config.googleReviewLink} onChange={handleChange} placeholder="⭐ Google Review / Maps Link" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-purple-500 outline-none" />
                  </div>
                </div>

                <label className="block text-sm font-medium text-gray-300 mb-2">Business Knowledge (AI Training Data) <span className="text-rose-500">*</span></label>
                <textarea name="businessDescription" value={config.businessDescription} onChange={handleChange} rows="3" placeholder="e.g. We are 'Shoe Mart'. We sell premium sports shoes. Delivery takes 3 days. No refunds on sale items..." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"></textarea>
                <p className="text-xs text-gray-500 mt-1">AI needs at least 1-2 sentences of training data to work properly. Otherwise, it will fallback to human support.</p>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Custom AI Rules (Limit Response & Behavior)</label>
                  <textarea name="aiRules" value={config.aiRules} onChange={handleChange} rows="3" placeholder="e.g. Maximum response length is 2 sentences. Talk in Hinglish. Never offer discounts without asking." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"></textarea>
                  <div className="bg-purple-500/10 p-3 rounded-lg border border-purple-500/20 mt-2">
                    <p className="text-xs text-purple-300 font-bold mb-1">💡 What to put here?</p>
                    <ul className="text-xs text-gray-400 list-disc pl-4 space-y-1">
                      <li>Set max response length (e.g. "Do not reply in more than 2 lines").</li>
                      <li>Define tone & language (e.g. "Be very polite, use emojis, speak Hinglish").</li>
                      <li>Set boundaries (e.g. "Focus strictly on selling, don't give free advice").</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-green-400 flex items-center">
                 WhatsApp (Meta API)
              </h2>
              <MetaConnectButton buttonText="1-Click Connect Meta" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-gray-400 mb-2">Permanent Access Token</label>
                  <div className="relative">
                    <input type={showWhatsappToken ? "text" : "password"} name="whatsappToken" value={config.whatsappToken} onChange={handleChange} placeholder="EAAL..." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none pr-10" />
                    <button 
                      type="button" 
                      onClick={() => setShowWhatsappToken(!showWhatsappToken)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none"
                    >
                      {showWhatsappToken ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number ID</label>
                <input type="text" name="phoneNumberId" value={config.phoneNumberId} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none" placeholder="e.g. 1234567890" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">WABA ID (Business Account ID)</label>
                <input type="text" name="wabaId" value={config.wabaId} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none" placeholder="e.g. 1234567890" />
              </div>
            </div>
          </div>

          {/* Meta Ads Conversions API Config */}
          <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-blue-500/20 mt-8">
            <h2 className="text-xl font-semibold text-blue-400 mb-6 flex items-center gap-2">
               🎯 Meta Ads Conversions API
            </h2>
            <p className="text-sm text-gray-400 mb-6">Connect your Meta Pixel to automatically send "Converted" WhatsApp leads back to Facebook. This reduces ad costs and improves targeting.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Meta Pixel ID</label>
                <input type="text" name="metaPixelId" value={config.metaPixelId} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" placeholder="e.g. 123456789012345" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Conversions API Access Token</label>
                <input type="password" name="metaAccessToken" value={config.metaAccessToken} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" placeholder="EAAL..." />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">You can generate these in your Facebook Business Manager &gt; Events Manager &gt; Settings.</p>
          </div>

          {/* Multiple Businesses (Workspaces) Config */}
          <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-blue-500/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                 <Briefcase size={20}/> Business Profiles (Workspaces)
              </h2>
              <button type="button" onClick={addWorkspace} className="flex items-center gap-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                <Plus size={16} /> Add Business
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-6">Add your different businesses, branches, or divisions here. These will automatically appear as a <b>Menu</b> when a customer messages you "Hi" on WhatsApp.</p>
            
            <div className="space-y-4">
              {config.workspaces.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-gray-700 rounded-xl text-gray-500">No additional businesses added yet. Your default business profile will be used.</div>
              ) : (
                config.workspaces.map((workspace, index) => (
                  <div key={index} className="flex flex-col gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-gray-800 relative group">
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business / Branch Name</label>
                        <input type="text" required value={workspace.name} onChange={(e) => handleWorkspaceChange(index, 'name', e.target.value)} placeholder="e.g. DealClose Electronics" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none" maxLength={24} />
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Short Description (Appears in Menu)</label>
                        <input type="text" required value={workspace.description} onChange={(e) => handleWorkspaceChange(index, 'description', e.target.value)} placeholder="e.g. Buy latest laptops and mobiles" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white focus:border-blue-500 outline-none" maxLength={72} />
                      </div>
                      <button type="button" onClick={() => removeWorkspace(index)} className="md:mt-6 p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors h-fit" title="Remove Business">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    {/* Specific Social/Web Links for this Workspace */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 pt-4 border-t border-gray-800">
                      <input type="text" value={workspace.website || ''} onChange={(e) => handleWorkspaceChange(index, 'website', e.target.value)} placeholder="🌐 Website / Catalog URL" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none md:col-span-2" />
                      <div>
                        <div className="flex bg-[#0a0a0a] border border-gray-700 rounded-lg overflow-hidden focus-within:border-blue-500">
                          <span className="px-2 py-2 text-gray-500 bg-[#111] text-xs flex items-center border-r border-gray-700">ig.com/</span>
                          <input type="text" value={getUsername(workspace.instagram, 'https://instagram.com/')} onChange={(e) => handleWorkspaceSocialChange(index, 'instagram', 'https://instagram.com/', e)} placeholder="username" className="w-full bg-transparent p-2 text-white text-xs outline-none" />
                        </div>
                        {workspace.instagram && <a href={workspace.instagram} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline mt-1 inline-block">Preview: {workspace.instagram} ↗</a>}
                      </div>
                      <div>
                        <div className="flex bg-[#0a0a0a] border border-gray-700 rounded-lg overflow-hidden focus-within:border-blue-500">
                          <span className="px-2 py-2 text-gray-500 bg-[#111] text-xs flex items-center border-r border-gray-700">fb.com/</span>
                          <input type="text" value={getUsername(workspace.facebook, 'https://facebook.com/')} onChange={(e) => handleWorkspaceSocialChange(index, 'facebook', 'https://facebook.com/', e)} placeholder="pagename" className="w-full bg-transparent p-2 text-white text-xs outline-none" />
                        </div>
                        {workspace.facebook && <a href={workspace.facebook} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline mt-1 inline-block">Preview: {workspace.facebook} ↗</a>}
                      </div>
                      <input type="text" value={workspace.website || ''} onChange={(e) => handleWorkspaceChange(index, 'website', e.target.value)} placeholder="Website / Catalog Link" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                      <input type="text" value={workspace.googleReview || ''} onChange={(e) => handleWorkspaceChange(index, 'googleReview', e.target.value)} placeholder="Google Review Link" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                    </div>

                    {/* Specific Meta API Keys for this Workspace (For independent automation) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-800">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">IG Access Token (For Specific Bot)</label>
                        <input type="password" value={workspace.igAccessToken || ''} onChange={(e) => handleWorkspaceChange(index, 'igAccessToken', e.target.value)} placeholder="IG...Token" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:border-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">FB Page / IG Account ID</label>
                        <input type="text" value={workspace.fbPageId || ''} onChange={(e) => handleWorkspaceChange(index, 'fbPageId', e.target.value)} placeholder="123456789" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:border-blue-500 outline-none" />
                      </div>
                    </div>

                    {/* Separate AI Brain for this Workspace */}
                    <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Knowledge (AI Training)</label>
                          <textarea value={workspace.businessDescription || ''} onChange={(e) => handleWorkspaceChange(index, 'businessDescription', e.target.value)} rows="2" placeholder="e.g. We sell 2BHK flats in Mumbai..." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none"></textarea>
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Custom AI Rules</label>
                          <textarea value={workspace.aiRules || ''} onChange={(e) => handleWorkspaceChange(index, 'aiRules', e.target.value)} rows="2" placeholder="e.g. Always ask for budget first. Talk in Hinglish." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none"></textarea>
                       </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instagram Integration */}
          <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-pink-400 flex items-center gap-2">
                 Instagram Business Account
              </h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${igConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                {igConnected ? 'Connected ✅' : 'Not Connected'}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-6">Connect your Instagram to enable Auto-DMs, Comment tracking, and AI Profile Growth Audits.</p>
            
            {!igConnected ? (
              <MetaConnectButton buttonText="Connect Instagram via Meta" />
            ) : (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                 <p className="text-sm text-green-400 font-semibold">Your Instagram account is actively monitored by AI.</p>
                 <button type="button" onClick={() => setIgConnected(false)} className="mt-3 text-sm text-red-400 font-bold hover:underline">Disconnect</button>
              </div>
            )}
          </div>

          {/* Twilio / Calling Config */}
          <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800">
            <h2 className="text-xl font-semibold text-blue-400 mb-6 flex items-center">
               Voice Calling (Twilio Provider)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Account SID</label>
                <input type="text" name="twilioSid" value={config.twilioSid} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
              </div>
                <div className="relative">
                <label className="block text-sm font-medium text-gray-400 mb-2">Auth Token</label>
                  <div className="relative">
                    <input type={showTwilioToken ? "text" : "password"} name="twilioAuthToken" value={config.twilioAuthToken} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none pr-10" />
                    <button 
                      type="button" 
                      onClick={() => setShowTwilioToken(!showTwilioToken)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none"
                    >
                      {showTwilioToken ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">Twilio Phone Number</label>
                <input type="text" name="twilioPhone" value={config.twilioPhone} onChange={handleChange} placeholder="+1234567890" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
              </div>
            </div>
          </div>

          {/* External Website Integration (NewPropertyHub etc.) */}
          <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-teal-500/20 mt-8">
            <h2 className="text-xl font-semibold text-teal-400 mb-6 flex items-center gap-2">
               🔗 External Website API Integration
            </h2>
            <p className="text-sm text-gray-400 mb-6">Connect your external website (like newpropertyhub.in) to allow DealClose AI to fetch catalog items, properties, post quick items, and publish blogs automatically directly via WhatsApp.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Website Base URL (Fallback)</label>
                  <input type="url" name="externalApiUrl" value={config.externalApiUrl} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-teal-500 outline-none" placeholder="https://newpropertyhub.in" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">API Secret Token / Key</label>
                  <div className="relative">
                    <input type={showExternalToken ? "text" : "password"} name="externalApiToken" value={config.externalApiToken} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-teal-500 outline-none pr-10" placeholder="Your secret key" />
                    <button type="button" onClick={() => setShowExternalToken(!showExternalToken)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none">
                      {showExternalToken ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-800">
                 <p className="text-sm text-teal-400 font-bold mb-4">Specific Custom API Endpoints (Optional but Recommended)</p>
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
              
              {/* Dynamic SaaS Webhooks */}
              <div className="mt-6 pt-6 border-t border-teal-500/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm text-teal-400 font-bold">Dynamic AI Actions (Custom Webhooks)</h3>
                  <button type="button" onClick={addCustomWebhook} className="text-xs bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 px-3 py-1.5 rounded-lg font-bold transition-colors">
                    + Add Custom Action
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">Teach AI to hit your specific URLs when a customer asks for it. (Limit: {(config.customWebhooks || []).length}/10)</p>
                <div className="space-y-4">
                  {(config.customWebhooks || []).map((webhook, index) => {
                    const isExpanded = expandedWebhooks[index] || (!webhook.name && !webhook.url);
                    return (
                    <div key={index} className="bg-[#1a1a1a] border border-gray-700 p-4 rounded-xl relative group transition-all">
                      {isExpanded ? (
                        <>
                          <button type="button" onClick={() => removeCustomWebhook(index)} className="absolute top-3 right-10 text-gray-500 hover:text-rose-500 transition-colors p-1" title="Delete Action">
                            <Trash2 size={16} />
                          </button>
                          <button type="button" onClick={() => setExpandedWebhooks({...expandedWebhooks, [index]: false})} className="absolute top-3 right-3 text-emerald-500 hover:text-emerald-400 transition-colors p-1" title="Save/Collapse">
                            <CheckCircle size={16} />
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">Action Name</label>
                              <input type="text" value={webhook.name} onChange={e => handleCustomWebhookChange(index, 'name', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-teal-500 outline-none" placeholder="e.g. cancel_order" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-1">API URL</label>
                              <input type="url" value={webhook.url} onChange={e => handleCustomWebhookChange(index, 'url', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-teal-500 outline-none" placeholder="https://api.domain.com/endpoint" />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Description (When should AI use this?)</label>
                              <input type="text" value={webhook.description} onChange={e => handleCustomWebhookChange(index, 'description', e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-teal-500 outline-none" placeholder="e.g. Use this when the user wants to cancel their pending order." />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <Zap size={14} className="text-teal-400"/> {webhook.name}
                            </h4>
                            <p className="text-xs text-gray-400 mt-1">{webhook.url}</p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setExpandedWebhooks({...expandedWebhooks, [index]: true})} className="text-gray-400 hover:text-blue-400 transition-colors p-2 bg-gray-800 hover:bg-gray-700 rounded-lg" title="Edit">
                              <Edit size={14} />
                            </button>
                            <button type="button" onClick={() => removeCustomWebhook(index)} className="text-gray-400 hover:text-rose-400 transition-colors p-2 bg-gray-800 hover:bg-gray-700 rounded-lg" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            </div>
          </div>

          {/* QR Code & Digital Card Section */}
          <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-purple-500/30 relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
            <h2 className="text-xl font-semibold text-purple-400 mb-6 flex items-center gap-2">
               📱 Smart QR & Digital Business Card
            </h2>
            
            <div className="mb-6 relative z-10">
              <label className="block text-sm font-medium text-gray-400 mb-2">Select Business to Configure & View QR</label>
              <select 
                value={selectedCardId} 
                onChange={(e) => setSelectedCardId(e.target.value)} 
                className="w-full md:w-1/2 bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-lg p-3 outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="main">{config.businessName || 'Main Business'} (Default)</option>
                {config.workspaces.map((ws, index) => (
                  <option key={index} value={`ws_${index}`}>{ws.name || `Workspace ${index + 1}`}</option>
                ))}
              </select>
            </div>

            {(() => {
              const isMainCard = selectedCardId === 'main';
              const wsIndex = isMainCard ? -1 : parseInt(selectedCardId.replace('ws_', ''));
              const activeWs = wsIndex >= 0 ? config.workspaces[wsIndex] : null;
              const qrUrl = isMainCard 
                ? `${window.location.origin}/card/${userId}` 
                : `${window.location.origin}/card/${userId}?ws=${wsIndex}`;
              
              return (
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                  <div className="bg-white p-4 rounded-xl shadow-lg shrink-0">
                    {/* Using a free reliable API to generate QR Code without installing extra packages */}
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`} alt="Business QR Code" className="w-32 h-32" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                      {isMainCard 
                        ? "Print this QR code and place it at your store counter or share it online. When customers scan it, they can leave their Name/Number (saved directly to your CRM) and easily follow your main profiles."
                        : `This QR code is specific to ${activeWs?.name || 'this workspace'}. When scanned, it will show the links configured for this branch.`}
                    </p>
                    
                    <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-8 py-4 mt-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20">
                      Preview {isMainCard ? 'Main Business' : activeWs?.name} Digital Card ↗
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Automated Offers & Discounts */}
          <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-green-500/30 relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
            <h2 className="text-xl font-semibold text-green-400 mb-6 flex items-center gap-2">
               🎁 Auto-Discount & Loyalty Offer
            </h2>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              When AI asks for a review/follow, or when you load the Offer message in Chats, it will automatically send this discount code to bring the customer back for their next visit.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Discount %</label>
                <input type="number" name="discountPercentage" value={config.discountPercentage} onChange={handleChange} placeholder="e.g. 10" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Referral / Offer Code</label>
                <input type="text" name="discountCode" value={config.discountCode} onChange={handleChange} placeholder="e.g. SAVE10" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Valid For (Days)</label>
                <input type="number" name="validityDays" value={config.validityDays} onChange={handleChange} placeholder="e.g. 30" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-green-500 outline-none" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full md:w-auto px-8 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-colors shadow-lg shadow-green-600/20">
            Save Configurations
          </button>
          </form>

          {/* Security & Password Section (Separate Form) */}
          <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-gray-800 mt-12">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
               <Shield className="text-blue-400" /> Security & Password
            </h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
                <input type="password" required value={passData.oldPassword} onChange={e => setPassData({...passData, oldPassword: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
                <p className="text-xs text-gray-500 mt-1">Enter the temporary password if AI generated your account.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                <input type="password" required minLength="6" value={passData.newPassword} onChange={e => setPassData({...passData, newPassword: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                <input type="password" required minLength="6" value={passData.confirmPassword} onChange={e => setPassData({...passData, confirmPassword: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-blue-500 outline-none" />
              </div>
              
              <button type="submit" disabled={isChangingPass} className="w-full py-3 mt-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20">
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
          </>

        )}
      </div>
    </div>
  );
}