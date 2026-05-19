import { useState, useEffect } from 'react';
import api from '../services/api'; // Import our Axios instance
import { Eye, EyeOff, Shield, Plus, Trash2, Briefcase } from 'lucide-react'; // Icons for viewing tokens

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
    businessDescription: ''
  });
  
  const [igConnected, setIgConnected] = useState(false);
  const [userId, setUserId] = useState('demo-business'); // Used for QR code link
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFbSdkLoaded, setIsFbSdkLoaded] = useState(false);
  
  const [passData, setPassData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Fetch saved settings on page load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/users/settings');
        const savedData = data.data || data; // Handle different backend response structures
        
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
            businessDescription: savedData.businessDescription || ''
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

  // Load Facebook SDK for 1-Click Instagram Login
  useEffect(() => {
    window.fbAsyncInit = function() {
      window.FB.init({
        appId      : import.meta.env.VITE_META_APP_ID || 'YOUR_META_APP_ID',
        cookie     : true,
        xfbml      : true,
        version    : 'v19.0'
      });
      setIsFbSdkLoaded(true);
    };
    (function(d, s, id){
       var js, fjs = d.getElementsByTagName(s)[0];
       if (d.getElementById(id)) {return;}
       js = d.createElement(s); js.id = id;
       js.src = "https://connect.facebook.net/en_US/sdk.js";
       fjs.parentNode.insertBefore(js, fjs);
     }(document, 'script', 'facebook-jssdk'));
  }, []);

  const handleInstagramConnect = () => {
    if (!isFbSdkLoaded || !window.FB) {
      alert("Facebook System is still loading. Please wait a second and try again.");
      return;
    }
    window.FB.login((response) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        console.log('IG System Access Token: ', accessToken);
        // In future: await api.post('/users/connect-ig', { accessToken });
        setIgConnected(true);
        alert('✅ Instagram Successfully Connected!');
      } else {
        alert('Login cancelled or not authorized.');
      }
    }, { scope: 'instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_read_engagement' });
  };

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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Transform data so backend overwrites (deletes) old keys completely
      const payload = {
        aiAgentEnabled: config.aiAgentEnabled,
        businessDescription: config.businessDescription,
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
        workspaces: config.workspaces // Send workspaces to backend
      };
      await api.post('/users/settings', payload);
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
                   <span className="text-xl">🧠</span> Smart AI Agent & Training
                </h2>
                <button type="button" onClick={() => setConfig({...config, aiAgentEnabled: !config.aiAgentEnabled})} className={`w-12 h-6 rounded-full transition-colors relative ${config.aiAgentEnabled ? 'bg-purple-600' : 'bg-gray-700'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.aiAgentEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-4 relative z-10">Turn this ON to let the AI automatically reply to your customers. Provide training data below so it knows how to answer accurately.</p>
              
              <div className="relative z-10">
                <label className="block text-sm font-medium text-gray-300 mb-2">Business Knowledge (AI Training Data) <span className="text-rose-500">*</span></label>
                <textarea name="businessDescription" value={config.businessDescription} onChange={handleChange} rows="3" placeholder="e.g. We are 'Shoe Mart'. We sell premium sports shoes. Delivery takes 3 days. No refunds on sale items..." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"></textarea>
                <p className="text-xs text-gray-500 mt-1">AI needs at least 1-2 sentences of training data to work properly. Otherwise, it will fallback to human support.</p>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-green-400 mb-6 flex items-center">
               WhatsApp (Meta API)
            </h2>
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
                      <input type="text" value={workspace.instagram || ''} onChange={(e) => handleWorkspaceChange(index, 'instagram', e.target.value)} placeholder="Instagram Profile Link" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                      <input type="text" value={workspace.facebook || ''} onChange={(e) => handleWorkspaceChange(index, 'facebook', e.target.value)} placeholder="Facebook Page Link" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                      <input type="text" value={workspace.website || ''} onChange={(e) => handleWorkspaceChange(index, 'website', e.target.value)} placeholder="Website / Catalog Link" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
                      <input type="text" value={workspace.googleReview || ''} onChange={(e) => handleWorkspaceChange(index, 'googleReview', e.target.value)} placeholder="Google Review Link" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2.5 text-white text-sm focus:border-blue-500 outline-none" />
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
              <button 
                onClick={handleInstagramConnect} 
                type="button" 
                disabled={!isFbSdkLoaded}
                className={`px-6 py-3 font-bold rounded-xl shadow-lg transition-all ${isFbSdkLoaded ? 'bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
              >
                {isFbSdkLoaded ? 'Connect via Meta (Facebook)' : 'Loading Meta SDK...'}
              </button>
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

          {/* QR Code & Digital Card Section */}
          <div className="bg-[#111111] p-6 rounded-2xl shadow-xl border border-purple-500/30 relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>
            <h2 className="text-xl font-semibold text-purple-400 mb-6 flex items-center gap-2">
               📱 Smart QR & Digital Business Card
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="bg-white p-4 rounded-xl shadow-lg shrink-0">
                {/* Using a free reliable API to generate QR Code without installing extra packages */}
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/card/' + userId)}`} alt="Business QR Code" className="w-32 h-32" />
              </div>
              <div className="flex-1">
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">Print this QR code and place it at your store counter or share it online. When customers scan it, they can leave their Name/Number (saved directly to your CRM) and easily follow your Instagram, Facebook, and Google profiles.</p>
                
                {/* Social Links Setup for QR Card */}
                <div className="space-y-3 mb-6 bg-[#1a1a1a] p-4 rounded-xl border border-gray-800">
                  <h3 className="text-sm font-bold text-gray-400 mb-2">Configure Digital Card Links</h3>
                  <input type="text" name="instagramLink" value={config.instagramLink} onChange={handleChange} placeholder="Instagram Profile URL" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none" />
                  <input type="text" name="facebookLink" value={config.facebookLink} onChange={handleChange} placeholder="Facebook Page URL" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none" />
                  <input type="text" name="youtubeLink" value={config.youtubeLink} onChange={handleChange} placeholder="YouTube Channel URL" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none" />
                  <input type="text" name="googleReviewLink" value={config.googleReviewLink} onChange={handleChange} placeholder="Google Review / Maps Link" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none" />
                  <input type="text" name="websiteLink" value={config.websiteLink} onChange={handleChange} placeholder="Your Custom Website or Catalog Link" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none" />
                </div>

                <a href={`/card/${userId}`} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20">
                  Preview My Digital Card ↗
                </a>
              </div>
            </div>
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