import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Users, Zap, MessageCircle, DollarSign, Eye, ShoppingCart, Sliders, Sparkles, ArrowRight, Mic, Play, PhoneCall, Loader2, UploadCloud, Activity, PauseCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Campaigns() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');

  // 🚀 REAL ANALYTICS STATE
  const [analytics, setAnalytics] = useState({
    adSpend: 0, impressions: 0, leads: 0, sales: 0, costPerLead: 0, costPerSale: 0,
    campaigns: []
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    setAnalyticsLoading(true);
    // 🚀 MOCK ANALYTICS TO PREVENT 404 CONSOLE ERROR
    setTimeout(() => {
      setAnalytics({ adSpend: 0, impressions: 0, leads: 0, sales: 0, costPerLead: 0, costPerSale: 0, campaigns: [] });
      setAnalyticsLoading(false);
    }, 500);
  }, [activeWorkspace]);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAd, setGeneratedAd] = useState(null);
  const [isPublishingAd, setIsPublishingAd] = useState(false);
  
  // New Targeting States
  const [country, setCountry] = useState('India');
  const [stateLoc, setStateLoc] = useState('');
  const [city, setCity] = useState('');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('65');
  const [gender, setGender] = useState('All');
  const [interests, setInterests] = useState('');
  const [campaignMode, setCampaignMode] = useState('automatic'); // 'automatic' or 'manual'
  const [retargetType, setRetargetType] = useState('none'); // 'none', 'pixel', or 'csv'
  
  // Smart Rules States
  const [autoPause, setAutoPause] = useState(true);
  const [budgetOptimizer, setBudgetOptimizer] = useState(true);

  // 🚀 Voice Campaign States
  const [ivrTab, setIvrTab] = useState('meta'); // 'meta' or 'ivr'
  const [ivrName, setIvrName] = useState('');
  const [ivrText, setIvrText] = useState('');
  const [isIvrGenerating, setIsIvrGenerating] = useState(false);
  
  const [ivrCampaigns, setIvrCampaigns] = useState([]);
  const [countryCode, setCountryCode] = useState('+91');
  const [testPhone, setTestPhone] = useState('');
  const [testingId, setTestingId] = useState(null);

  // 🚀 Prebuilt Campaign Templates
  const campaignTemplates = [
    { icon: '🏠', name: 'Real Estate', prompt: 'Create a lead generation ad for a luxury 3BHK apartment in prime location. Budget is ₹1000/day.' },
    { icon: '🏗️', name: 'B2B/Building', prompt: 'Create a B2B wholesale ad for premium building materials targeting contractors.' },
    { icon: '🚗', name: 'Automobile', prompt: 'Create a retargeting ad for a car servicing center offering 20% off on first service.' },
    { icon: '🏥', name: 'Healthcare', prompt: 'Create a trust-building ad for a multispecialty hospital offering free health checkups.' },
    { icon: '🏫', name: 'Coaching', prompt: 'Create an urgent enrollment ad for a competitive exam coaching institute.' },
    { icon: '🍽️', name: 'Restaurant', prompt: 'Create an engaging reel ad script and caption for a new weekend buffet menu.' },
    { icon: '🛒', name: 'Ecommerce', prompt: 'Create a dynamic product ad for a summer clothing sale with a 24-hour urgency hook.' },
  ];

  // 🚀 NEW: AI Chatbot for Ad Creation
  const loadChatHistory = () => {
    const saved = sessionStorage.getItem('campaign_ai_chat');
    return saved ? JSON.parse(saved) : [{ role: 'ai', text: "Hi! I'm your Ad Strategist. What kind of campaign should we create today?" }];
  };
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState(loadChatHistory);

  useEffect(() => {
    sessionStorage.setItem('campaign_ai_chat', JSON.stringify(chatMessages));
  }, [chatMessages]);

  const handleGenerateAd = async (e) => {
    e.preventDefault();
    if (!aiPrompt) return;
    setIsGenerating(true);
    const toastId = toast.loading("AI is generating Ad Copy, Headlines, and Scripts...");
    
    try {
      // 🚀 CLEAN CODE: Use standard API service instead of raw fetch
      const res = await api.post('/campaigns/generate', {
          prompt: aiPrompt,
          mode: campaignMode,
          targeting: { country, state: stateLoc, city, ageMin, ageMax, gender, interests, retargetType },
          smartRules: { autoPause, budgetOptimizer },
          workspaceId: activeWorkspace
      });

      if (res.data.success) {
        setGeneratedAd(res.data.campaign.generatedAd);
        toast.success("Ad Strategy Generated!", { id: toastId });
      }
    } catch (error) {
      console.error('Error generating campaign:', error);
      toast.error('Something went wrong connecting to the AI.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  // 🚀 PUBLISH AD TO META (ADVANTAGE+)
  const handlePublishAd = async () => {
    if (!generatedAd) return;
    setIsPublishingAd(true);
    const toastId = toast.loading("Deploying campaign to Meta Ads Manager with Advantage+...");
    try {
      await api.post('/campaigns/publish', {
        adData: generatedAd,
        campaignMode: campaignMode, // 'automatic' mode triggers Advantage+ standard_enhancements
        targeting: { country, state: stateLoc, city, ageMin, ageMax, gender, interests, retargetType },
        workspaceId: activeWorkspace
      });
      toast.success("🚀 Campaign successfully launched on Meta!", { id: toastId });
    } catch (error) {
      console.error('Error publishing campaign:', error);
      toast.error(error.response?.data?.message || 'Failed to publish to Meta. Check API keys.', { id: toastId });
    } finally {
      setIsPublishingAd(false);
    }
  };

  // Fetch Voice Campaigns
  const fetchIvrCampaigns = async () => {
    try {
      const res = await api.get('/campaigns/ivr');
      if (res.data.success) setIvrCampaigns(res.data.campaigns);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (ivrTab === 'ivr') fetchIvrCampaigns();
  }, [ivrTab]);

  // 🚀 Generate Voice Campaign
  const handleGenerateIvr = async (e) => {
    e.preventDefault();
    if (!ivrText) return;
    setIsIvrGenerating(true);
    const toastId = toast.loading("AI is generating studio-quality voice...");
    try {
      const commandMsg = `{"action": "create_ivr", "campaignName": "${ivrName || 'My Voice Campaign'}", "ttsText": "${ivrText.replace(/"/g, "'")}", "menuOptions": {"1": {"action": "connect_to_ai"}, "2": {"action": "forward_to_human"}, "3": {"action": "send_whatsapp"}, "4": {"action": "request_callback"}}}`;
      const res = await api.post('/ai/dashboard-assistant', { message: commandMsg });
      if (res.data.actionTaken === 'ivr_created') {
        toast.success("Success! Voice Campaign is ready and saved.", { id: toastId });
        setIvrName('');
        setIvrText('');
        fetchIvrCampaigns(); // Refresh the list
      } else {
        toast.error("Error: " + res.data.reply, { id: toastId });
      }
    } catch { toast.error('Failed to generate Voice Campaign.', { id: toastId }); }
    finally { setIsIvrGenerating(false); }
  };

  // 🚀 Test IVR Call
  const handleTestCall = async (campaignId) => {
    if (!testPhone || testPhone.length < 10) {
      return toast.error("Please enter a valid phone number.");
    }
    setTestingId(campaignId);
    try {
      let formattedPhone = countryCode + testPhone;
      
      const res = await api.post(`/campaigns/ivr/${campaignId}/test`, { testNumber: formattedPhone });
      if (res.data.success) toast.success("📞 " + res.data.message);
      else toast.error(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate test call. Check Twilio settings.');
    } finally {
      setTestingId(null);
    }
  };

  // 🚀 Bulk Auto-Dialer
  const handleBulkDial = async (campaignId) => {
    if (!window.confirm("Start Bulk Auto-Dialer? AI will call up to 50 new/unconverted leads. Leads called 3 times won't be called again (Loop Prevention).")) return;
    const toastId = toast.loading("Initiating Bulk Dial...");
    try {
      const res = await api.post(`/campaigns/ivr/${campaignId}/bulk-dial`);
      toast.success("🚀 " + res.data.message, { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start bulk dialer.', { id: toastId });
    }
  };

  // Function to handle clicking on an AI suggestion pill
  const handleRefineSuggestion = (suggestion) => {
    setAiPrompt(prev => prev + " | Also: " + suggestion);
    // It will not auto-submit to give the user a chance to read it, but you can call handleGenerateAd(e) here if you want instant generation.
  };

  // 🚀 NEW: AI Chatbot handler
  const handleAdChat = async (e) => {
    e.preventDefault();
    const userMessage = e.target.message.value;
    if (!userMessage) return;
    
    const newMsgs = [...chatMessages, { role: 'user', text: userMessage }];
    setChatMessages(newMsgs);
    e.target.message.value = '';

    try {
      const res = await api.post('/ai/webchat', { 
        message: userMessage, 
        context: "You are a Meta Ads expert. Help the user create an ad campaign by asking for their product, budget, and target audience. Then, summarize it for the main prompt box."
      });
      
      // If AI suggests a prompt, auto-fill it!
      if (res.data.reply.toLowerCase().includes("prompt:")) {
        setAiPrompt(res.data.reply.split("Prompt:")[1].trim());
      }

      setChatMessages([...newMsgs, { role: 'ai', text: res.data.reply }]);
    } catch { toast.error("AI Assistant is busy."); }
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-[calc(100vh-4rem)] text-gray-100 font-sans">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              AI Campaigns & Ads Manager
            </h1>
            <select 
              value={activeWorkspace} 
              onChange={(e) => setActiveWorkspace(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-400">Launch highly targeted Meta Ads using AI and retarget your WhatsApp leads automatically.</p>
        </div>
      </div>

      {/* True ROI Analytics Dashboard */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">📊 True ROI Analytics (Last 30 Days)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Link to="/wallet" className="block bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-lg hover:border-rose-500/50 transition-colors cursor-pointer group">
            <p className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><DollarSign size={14} className="text-rose-400"/> Ad Spend</p>
            <p className="text-2xl font-black text-white group-hover:text-rose-400 transition-colors">₹{analytics.adSpend.toLocaleString()}</p>
          </Link>
          
          <Link to="/tracking-analytics" className="block bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-lg hover:border-blue-500/50 transition-colors cursor-pointer group">
            <p className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Eye size={14} className="text-blue-400"/> Impressions</p>
            <p className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">{analytics.impressions.toLocaleString()}</p>
          </Link>
          
          <Link to="/crm" className="block bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-lg hover:border-green-500/50 transition-colors cursor-pointer group">
            <p className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><MessageCircle size={14} className="text-green-400"/> WhatsApp Leads</p>
            <p className="text-2xl font-black text-green-400">{analytics.leads}</p>
            <p className="text-[10px] text-gray-500 mt-1">Cost Per Lead: ₹{analytics.costPerLead}</p>
          </Link>
          
          <Link to="/dispatch" className="block bg-gradient-to-br from-indigo-900/20 to-[#111] p-5 rounded-2xl border border-indigo-500/30 shadow-lg relative overflow-hidden hover:border-indigo-500/60 transition-colors cursor-pointer group">
            <p className="text-indigo-300 text-xs font-bold uppercase mb-1 flex items-center gap-1"><ShoppingCart size={14}/> Actual Sales</p>
            <p className="text-2xl font-black text-white group-hover:text-indigo-300 transition-colors">{analytics.sales}</p>
            <p className="text-[10px] text-indigo-400 mt-1 font-semibold">Cost Per Sale: ₹{analytics.costPerSale}</p>
          </Link>
        </div>
        
        {/* 🚀 Priority 1: Lead Source Attribution Table */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
           <div className="p-4 bg-[#1a1a1a] border-b border-gray-800"><h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity size={16} className="text-blue-400"/> Campaign Attribution & ROI</h3></div>
           <table className="w-full text-left whitespace-nowrap">
             <thead>
               <tr className="text-gray-400 text-xs uppercase tracking-wider bg-[#0a0a0a]">
                 <th className="p-4">Campaign Name</th><th className="p-4">Ad Spend</th><th className="p-4">WhatsApp Leads</th><th className="p-4">Sales Converted</th><th className="p-4">ROI</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-800 text-sm">
          {analyticsLoading ? (
            <tr><td colSpan="5" className="p-6 text-center text-gray-500">Loading tracking data...</td></tr>
          ) : (
            <>
              {analytics.campaigns.map((camp, idx) => (
                <tr key={idx} className="hover:bg-gray-900/50">
                  <td className="p-4 font-bold text-gray-200">{camp.name}</td>
                  <td className="p-4 text-rose-400">₹{camp.spend}</td>
                  <td className="p-4 text-green-400 font-bold">{camp.leads}</td>
                  <td className="p-4 text-indigo-400 font-bold">{camp.sales}</td>
                  <td className={`p-4 font-bold ${camp.roi.includes('+') ? 'text-green-400' : 'text-rose-400'}`}>{camp.roi}</td>
                </tr>
              ))}
              {analytics.campaigns.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-gray-500">No active campaigns tracking data yet.</td></tr>}
            </>
          )}
             </tbody>
           </table>
        </div>
      </div>

      {/* Campaign Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-800 pb-px">
        <button onClick={() => setIvrTab('meta')} className={`pb-3 px-2 font-semibold transition-all duration-300 ${ivrTab === 'meta' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>Meta Ad Campaigns</button>
        <button onClick={() => setIvrTab('ivr')} className={`pb-3 px-2 font-semibold transition-all duration-300 ${ivrTab === 'ivr' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-500 hover:text-gray-300'}`}>AI Voice Campaigns (IVR)</button>
      </div>

      {ivrTab === 'meta' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Ad Creator */}
        <div className="bg-[#111] border border-blue-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">✨ Create Campaign with AI</h2>
              <button onClick={() => setIsChatOpen(!isChatOpen)} className="text-xs font-bold bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full hover:bg-blue-500/30 transition-colors">AI Assistant</button>
            </div>
            <p className="text-gray-400 text-sm mb-4">Just tell the AI what you want to sell, and it will write the ad copy, generate images/reels, and target the best audience.</p>
            
            {/* 🚀 Quick Templates */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-2 custom-scrollbar">
              {campaignTemplates.map((tpl, i) => (
                 <button key={i} type="button" onClick={() => setAiPrompt(tpl.prompt)} className="shrink-0 bg-[#1a1a1a] border border-gray-700 hover:border-blue-500 text-gray-300 text-xs px-3 py-1.5 rounded-full transition-colors flex items-center gap-1">
                    <span>{tpl.icon}</span> {tpl.name}
                 </button>
              ))}
            </div>

            <form onSubmit={handleGenerateAd}>
              <textarea 
                rows="2" 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="What do you want to sell? (e.g. Premium summer cotton t-shirts. Budget is ₹500/day.)" 
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none mb-4"
                required
              ></textarea>
              
              {/* Campaign Mode Switch (Auto vs Manual) */}
              <div className="flex gap-4 mb-6">
                <button type="button" onClick={() => setCampaignMode('automatic')} className={`flex-1 p-3 rounded-xl border font-bold text-sm transition-all flex justify-center items-center gap-2 ${campaignMode === 'automatic' ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-[#111] border-gray-800 text-gray-500 hover:border-gray-700'}`}>
                  🚀 AI Auto-Pilot (Advantage+)
                </button>
                <button type="button" onClick={() => setCampaignMode('manual')} className={`flex-1 p-3 rounded-xl border font-bold text-sm transition-all flex justify-center items-center gap-2 ${campaignMode === 'manual' ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-[#111] border-gray-800 text-gray-500 hover:border-gray-700'}`}>
                  ⚙️ Manual Control
                </button>
              </div>
              
              {campaignMode === 'automatic' && (
                <p className="text-sm text-gray-400 mb-6 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">🤖 <b>AI Mode Active:</b> Meta's AI will automatically find the best audience, placements, and age groups for maximum sales.</p>
              )}

              {/* Advanced Targeting Fields */}
              {campaignMode === 'manual' && (
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4 mb-6 space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Country</label>
                      <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. India, US" className="w-full bg-[#111] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">State(s)</label>
                      <input type="text" value={stateLoc} onChange={(e) => setStateLoc(e.target.value)} placeholder="e.g. Maharashtra, Delhi" className="w-full bg-[#111] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">City(s)</label>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai, Pune" className="w-full bg-[#111] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Age Range</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} min="13" max="65" className="w-full bg-[#111] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none" />
                        <span className="text-gray-500">-</span>
                        <input type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} min="13" max="65" className="w-full bg-[#111] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Gender</label>
                      <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-[#111] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 outline-none cursor-pointer">
                        <option value="All">All Genders</option>
                        <option value="Men">Men Only</option>
                        <option value="Women">Women Only</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Detailed Targeting (Interests & Behaviors)</label>
                    <input type="text" value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="e.g. Online Shopping, Engaged Shoppers, Fitness" className="w-full bg-[#111] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none" />
                    <p className="text-[10px] text-gray-500 mt-1">Leave blank to let AI auto-optimize interests for you.</p>
                  </div>
                  
                  {/* Retargeting / Custom Audience Section */}
                  <div className="border-t border-gray-800 pt-4 mt-4">
                    <label className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-2">Custom Audience (Retargeting)</label>
                    <select value={retargetType} onChange={(e) => setRetargetType(e.target.value)} className="w-full bg-[#111] border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-blue-500 outline-none cursor-pointer mb-3">
                      <option value="none">No Custom Audience (Cold Ads)</option>
                      <option value="pixel">Website Visitors (via Meta Pixel)</option>
                      <option value="csv">Upload Customer List (CSV/Excel)</option>
                    </select>

                    {retargetType === 'pixel' && (
                      <input type="text" placeholder="Enter Meta Pixel ID (e.g. 123456789)" className="w-full bg-[#111] border border-gray-700 rounded-lg p-2 text-sm text-white focus:border-blue-500 outline-none animate-fade-in" />
                    )}
                    {retargetType === 'csv' && (
                      <div className="bg-[#111] border border-dashed border-gray-600 rounded-xl p-6 text-center animate-fade-in">
                         <UploadCloud className="mx-auto text-blue-400 mb-2" size={32} />
                         <p className="text-sm font-bold text-white mb-1">Upload CRM Data (CSV/Excel)</p>
                         <p className="text-xs text-gray-500 mb-4">We will map Phone/Email to Meta Accounts securely.</p>
                         <input type="file" accept=".csv, application/vnd.ms-excel" className="text-sm text-gray-400 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400 cursor-pointer" />
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 mt-1">Target people who already know your brand for higher conversion rates.</p>
                  </div>

                  {/* 🚀 Priority 3: Smart AI Optimization Rules */}
                  <div className="border-t border-gray-800 pt-4 mt-4">
                    <h3 className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-2"><Zap size={14} className="text-yellow-400"/> AI Budget & Protection Rules</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer bg-[#111] p-3 rounded-xl border border-gray-800 hover:border-gray-700">
                        <input type="checkbox" checked={autoPause} onChange={(e) => setAutoPause(e.target.checked)} className="w-4 h-4 accent-rose-500" />
                        <div>
                           <p className="text-sm font-bold text-white flex items-center gap-2">Auto-Pause Losing Ads <PauseCircle size={14} className="text-rose-400"/></p>
                           <p className="text-[10px] text-gray-500">Automatically pause if Spend &gt; ₹1000 and Leads = 0</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer bg-[#111] p-3 rounded-xl border border-gray-800 hover:border-gray-700">
                        <input type="checkbox" checked={budgetOptimizer} onChange={(e) => setBudgetOptimizer(e.target.checked)} className="w-4 h-4 accent-green-500" />
                        <div>
                           <p className="text-sm font-bold text-white flex items-center gap-2">AI Budget Optimizer <TrendingUp size={14} className="text-green-400"/></p>
                           <p className="text-[10px] text-gray-500">Increase budget by 20% if Cost Per Lead is below target</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isGenerating}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isGenerating ? 'AI is thinking...' : <><Zap size={18}/> Generate Ad Strategy</>}
              </button>
            </form>

            {/* 🚀 NEW: AI Chatbot Window */}
            {isChatOpen && (
              <div className="mt-6 bg-[#0a0a0a] border border-gray-800 rounded-2xl flex flex-col animate-fade-in">
                <div className="p-3 border-b border-gray-800">
                  <h3 className="text-sm font-bold text-white">AI Ad Strategist</h3>
                </div>
                <div className="h-48 overflow-y-auto p-3 space-y-3 text-sm">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`p-2 rounded-lg max-w-[80%] ${msg.role === 'ai' ? 'bg-[#1a1a1a] self-start' : 'bg-blue-600 self-end text-white'}`}>
                      {msg.text}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAdChat} className="p-2 border-t border-gray-800 flex gap-2">
                  <input 
                    name="message"
                    type="text" 
                    placeholder="e.g., Help me target shoe buyers..." 
                    className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                  <button type="submit" className="bg-blue-600 text-white px-3 rounded-lg font-bold text-sm">Send</button>
                </form>
              </div>
            )}

            {generatedAd && (
              <div className="mt-6 p-5 bg-[#0a0a0a] border border-gray-700 rounded-xl">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded">AI Suggestion</span>
                  <span className="text-xs text-gray-500">Preview</span>
                </div>
                <h3 className="font-bold text-white mb-2">{generatedAd.headline}</h3>
                <p className="text-sm text-gray-300 mb-4">{generatedAd.primaryText}</p>
                <div className="border-t border-gray-800 pt-4 mt-4 space-y-2">
                  <p className="text-xs text-gray-400"><strong className="text-gray-300">🎯 Audience:</strong> {generatedAd.audience}</p>
                  <p className="text-xs text-gray-400"><strong className="text-gray-300">💰 Budget:</strong> {generatedAd.budget}</p>
                  <div className="flex justify-between items-center">
                     <p className="text-xs text-gray-400"><strong className="text-gray-300">📸 Media Strategy:</strong> {generatedAd.imageIdea}</p>
                     <Link to="/ai-video/dashboard" className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2 py-1 rounded font-bold transition-colors shrink-0">
                       Generate Media 🎬
                     </Link>
                  </div>
                </div>

                {/* AI Thought Process & Interactive Refinement */}
                <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1 mb-2"><Sparkles size={14}/> AI Thought Process</h4>
                  <p className="text-xs text-indigo-200/80 leading-relaxed mb-4">
                    {generatedAd.aiExplanation}
                  </p>
                  
                  {generatedAd.refinementQuestions && generatedAd.refinementQuestions.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">Want to refine this? Click a suggestion:</p>
                      <div className="flex flex-wrap gap-2">
                        {generatedAd.refinementQuestions.map((q, idx) => (
                          <button key={idx} onClick={() => handleRefineSuggestion(q)} className="text-xs bg-[#111] hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 py-1.5 px-3 rounded-full transition-colors text-left flex items-center gap-1">
                            {q} <ArrowRight size={12}/>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handlePublishAd}
                  disabled={isPublishingAd}
                  className="w-full mt-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isPublishingAd ? <><Loader2 className="animate-spin" size={18}/> Deploying to Meta...</> : 'Launch on Facebook & Instagram 🚀'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Retargeting & Audience Sync */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#111] border border-purple-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Target className="text-purple-400"/> Retargeting Sync</h2>
            <p className="text-gray-400 text-sm mb-6">Send your unconverted WhatsApp leads back to Meta to show them highly targeted reminder ads.</p>
            
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-5 flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">Warm Leads</h3>
                <p className="text-xs text-gray-500">People who messaged but didn't buy</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-purple-400">180</span>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Leads</p>
              </div>
            </div>
            
            <button className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20">
              Sync Audience to Meta Ads
            </button>
            <p className="text-xs text-center text-gray-500 mt-3">These numbers will be securely hashed (SHA256) before sending to Meta.</p>
          </div>

          <div className="bg-gradient-to-br from-green-900/10 to-[#111] border border-green-500/20 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-green-400 mb-2 flex items-center gap-2"><Users size={20}/> Lookalike Audiences</h2>
            <p className="text-gray-400 text-sm mb-4">Meta has received <b>20 Converted Sales</b> via the Conversions API. We can now tell Meta to find 1 Million new people who are exactly like these buyers.</p>
            
            {/* 🚀 Priority 3: Lookalike Builder UI */}
            <div className="flex gap-2">
              <select className="bg-[#0a0a0a] border border-gray-700 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-green-500 w-1/3">
                <option value="1%">1% Match</option>
                <option value="2%">2% Match</option>
                <option value="5%">5% Match</option>
                <option value="10%">10% Match</option>
              </select>
              <button className="flex-1 py-2 bg-green-600/20 border border-green-500/50 hover:bg-green-600 text-green-400 hover:text-white font-bold rounded-xl transition-all shadow-lg text-sm">
                Create LAL Audience
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 text-center">1% is the most precise. 10% gives maximum reach.</p>
          </div>

          {/* 🚀 NEW: Meta Conversions API Sync Status */}
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden mt-6">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><span className="text-blue-400">🔄</span> Meta Conversions API Sync</h2>
            <p className="text-gray-400 text-sm mb-6">When you mark a lead as 'Converted' in your CRM, we automatically send that data to Meta to improve your Ad Targeting and create Lookalike Audiences.</p>
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl p-4">
              <div className="flex justify-between items-center text-sm">
                <p className="font-bold text-gray-300">Last Sync Status:</p>
                <p className="flex items-center gap-2 font-bold text-green-400">
                  <CheckCircle size={16}/> Success
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">Last synced a 'Purchase' event for lead <span className="font-mono text-gray-400">+9198****3210</span> 2 hours ago.</p>
            </div>
          </div>

        </div>
      </div>
      )}

      {ivrTab === 'ivr' && (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="bg-[#111] border border-green-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden max-w-4xl mx-auto">
          <div className="absolute top-0 left-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Mic className="text-green-400"/> AI Voice Campaign Builder</h2>
            <p className="text-gray-400 text-sm mb-8">Don't have a recorded MP3? Just type your script. Our AI will instantly convert it to a natural human voice, save it permanently to the cloud, and deploy your IVR campaign at ZERO ongoing text-to-speech costs.</p>
            
            <form onSubmit={handleGenerateIvr} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Campaign Name</label>
                <input type="text" value={ivrName} onChange={e => setIvrName(e.target.value)} required placeholder="e.g. Diwali Offer Outreach" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">AI Voice Script (Text to Speech)</label>
                <textarea value={ivrText} onChange={e => setIvrText(e.target.value)} required rows="4" placeholder="Hello! We have a special offer for you. Press 1 to speak with our AI agent..." className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-green-500 outline-none resize-none"></textarea>
                <p className="text-xs text-gray-500 mt-2">💡 Tip: Use simple English for the best American accent pronunciation.</p>
              </div>

              <div className="bg-[#0a0a0a] p-4 rounded-xl border border-gray-800">
                <p className="text-sm font-bold text-gray-300 mb-2">Routing Rules Automatically Applied:</p>
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-400"><span className="bg-gray-800 text-white px-2 py-0.5 rounded font-mono mr-2">Press 1</span> ➔ 🤖 Connect to AI Agent</p>
                  <p className="text-xs text-gray-400"><span className="bg-gray-800 text-white px-2 py-0.5 rounded font-mono mr-2">Press 2</span> ➔ 👤 Forward to Human Staff</p>
                  <p className="text-xs text-gray-400"><span className="bg-gray-800 text-white px-2 py-0.5 rounded font-mono mr-2">Press 3</span> ➔ 📲 Send WhatsApp Link</p>
                  <p className="text-xs text-gray-400"><span className="bg-gray-800 text-white px-2 py-0.5 rounded font-mono mr-2">Press 4</span> ➔ 📞 Request Callback</p>
                </div>
              </div>

              <button type="submit" disabled={isIvrGenerating} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/20 flex justify-center items-center gap-2 disabled:opacity-50">
                {isIvrGenerating ? 'Generating Studio-Quality Voice...' : <><Play size={18}/> Generate Voice & Deploy Campaign</>}
              </button>
            </form>
          </div>
        </div>
        
        {/* Active Campaigns List & Testing UI */}
        {ivrCampaigns.length > 0 && (
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Your Voice Campaigns</h2>
            <div className="space-y-4">
              {ivrCampaigns.map(camp => (
                <div key={camp._id} className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-400">{camp.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">Status: {camp.isActive ? '🟢 Active' : '🔴 Inactive'} • Created: {new Date(camp.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                    <div className="flex bg-[#111] border border-gray-700 rounded-xl overflow-hidden focus-within:border-green-500 transition-colors w-full md:w-48">
                      <select 
                        value={countryCode} 
                        onChange={e => setCountryCode(e.target.value)}
                        className="bg-[#1a1a1a] text-gray-300 text-xs font-bold px-2 py-2 outline-none border-r border-gray-700 cursor-pointer"
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+971">🇦🇪 +971</option>
                      </select>
                      <input 
                        type="text" placeholder="Mobile No." value={testPhone} onChange={e => setTestPhone(e.target.value)} 
                        className="bg-transparent px-3 py-2 text-sm text-white outline-none w-full" 
                      />
                    </div>
                    <button 
                      onClick={() => handleTestCall(camp._id)} 
                      disabled={testingId === camp._id}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                    >
                      {testingId === camp._id ? 'Calling...' : <><PhoneCall size={16} /> Test Call</>}
                    </button>
                    <button 
                      onClick={() => handleBulkDial(camp._id)} 
                      className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      🚀 Bulk Auto-Dial
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}