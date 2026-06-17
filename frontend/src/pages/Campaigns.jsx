import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Users, Zap, MessageCircle, DollarSign, Eye, ShoppingCart, Sliders, Sparkles, ArrowRight, Mic, Play, PhoneCall } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Campaigns() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
    }).catch(console.error);
  }, []);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAd, setGeneratedAd] = useState(null);
  
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

  // 🚀 Voice Campaign States
  const [ivrTab, setIvrTab] = useState('meta'); // 'meta' or 'ivr'
  const [ivrName, setIvrName] = useState('');
  const [ivrText, setIvrText] = useState('');
  const [isIvrGenerating, setIsIvrGenerating] = useState(false);
  
  const [ivrCampaigns, setIvrCampaigns] = useState([]);
  const [testPhone, setTestPhone] = useState('');
  const [testingId, setTestingId] = useState(null);

  // 🚀 NEW: AI Chatbot for Ad Creation
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: "Hi! I'm your Ad Strategist. What kind of campaign should we create today?" }]);

  const handleGenerateAd = async (e) => {
    e.preventDefault();
    if (!aiPrompt) return;
    setIsGenerating(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/campaigns/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          mode: campaignMode,
          targeting: { country, state: stateLoc, city, ageMin, ageMax, gender, interests, retargetType },
          workspaceId: activeWorkspace
        })
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedAd(data.campaign.generatedAd);
      } else {
        alert(data.message || 'Failed to generate ad strategy.');
      }
    } catch (error) {
      console.error('Error generating campaign:', error);
      alert('Something went wrong connecting to the AI.');
    } finally {
      setIsGenerating(false);
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
    try {
      const commandMsg = `{"action": "create_ivr", "campaignName": "${ivrName || 'My Voice Campaign'}", "ttsText": "${ivrText.replace(/"/g, "'")}", "menuOptions": {"1": {"action": "connect_to_ai"}}}`;
      const res = await api.post('/ai/dashboard-assistant', { message: commandMsg });
      if (res.data.actionTaken === 'ivr_created') {
        alert("🎉 Success! Your AI Voice Campaign is ready and saved permanently at Zero Cost.");
        setIvrName('');
        setIvrText('');
        fetchIvrCampaigns(); // Refresh the list
      } else {
        alert("Error: " + res.data.reply);
      }
    } catch { alert('Failed to generate Voice Campaign.'); }
    finally { setIsIvrGenerating(false); }
  };

  // 🚀 Test IVR Call
  const handleTestCall = async (campaignId) => {
    if (!testPhone || testPhone.length < 10) {
      return alert("Please enter a valid phone number to receive the test call.");
    }
    setTestingId(campaignId);
    try {
      let formattedPhone = testPhone;
      if (!formattedPhone.startsWith('+')) formattedPhone = '+91' + formattedPhone; // Assuming India default
      
      const res = await api.post(`/campaigns/ivr/${campaignId}/test`, { testNumber: formattedPhone });
      if (res.data.success) alert("📞 " + res.data.message);
      else alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to initiate test call. Check your Twilio settings.');
    } finally {
      setTestingId(null);
    }
  };

  // 🚀 Bulk Auto-Dialer
  const handleBulkDial = async (campaignId) => {
    if (!window.confirm("Start Bulk Auto-Dialer? AI will call up to 50 new/unconverted leads. Leads called 3 times won't be called again (Loop Prevention).")) return;
    try {
      const res = await api.post(`/campaigns/ivr/${campaignId}/bulk-dial`);
      alert("🚀 " + res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start bulk dialer.');
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/wallet" className="block bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-lg hover:border-rose-500/50 transition-colors cursor-pointer group">
            <p className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><DollarSign size={14} className="text-rose-400"/> Ad Spend</p>
            <p className="text-2xl font-black text-white group-hover:text-rose-400 transition-colors">₹5,000</p>
          </Link>
          
          <Link to="/tracking-analytics" className="block bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-lg hover:border-blue-500/50 transition-colors cursor-pointer group">
            <p className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Eye size={14} className="text-blue-400"/> Impressions</p>
            <p className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">10,240</p>
          </Link>
          
          <Link to="/crm" className="block bg-[#111] p-5 rounded-2xl border border-gray-800 shadow-lg hover:border-green-500/50 transition-colors cursor-pointer group">
            <p className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-1"><MessageCircle size={14} className="text-green-400"/> WhatsApp Leads</p>
            <p className="text-2xl font-black text-green-400">200</p>
            <p className="text-[10px] text-gray-500 mt-1">Cost Per Lead: ₹25</p>
          </Link>
          
          <Link to="/dispatch" className="block bg-gradient-to-br from-indigo-900/20 to-[#111] p-5 rounded-2xl border border-indigo-500/30 shadow-lg relative overflow-hidden hover:border-indigo-500/60 transition-colors cursor-pointer group">
            <p className="text-indigo-300 text-xs font-bold uppercase mb-1 flex items-center gap-1"><ShoppingCart size={14}/> Actual Sales</p>
            <p className="text-2xl font-black text-white group-hover:text-indigo-300 transition-colors">20</p>
            <p className="text-[10px] text-indigo-400 mt-1 font-semibold">Cost Per Sale: ₹250</p>
          </Link>
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
            <p className="text-gray-400 text-sm mb-6">Just tell the AI what you want to sell, and it will write the ad copy and target the best audience.</p>
            
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
                      <input type="file" accept=".csv, application/vnd.ms-excel" className="w-full bg-[#111] border border-gray-700 rounded-lg p-2 text-sm text-gray-400 focus:border-blue-500 outline-none animate-fade-in file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-500/20 file:text-blue-400" />
                    )}
                    <p className="text-[10px] text-gray-500 mt-1">Target people who already know your brand for higher conversion rates.</p>
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
                  <p className="text-xs text-gray-400"><strong className="text-gray-300">📸 Image Idea:</strong> {generatedAd.imageIdea}</p>
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
                
                <button className="w-full mt-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/20">
                  Launch on Facebook & Instagram 🚀
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
            <button className="w-full py-3 border border-green-500/50 hover:bg-green-500/10 text-green-400 font-bold rounded-xl transition-all">
              Generate Lookalike Audience
            </button>
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
                <p className="text-xs text-gray-500"><span className="bg-gray-800 text-white px-2 py-1 rounded font-mono mr-2">Press 1</span> ➔ Connects to your Smart AI Agent</p>
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
                  <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <input 
                      type="text" 
                      placeholder="Enter Mobile No." 
                      value={testPhone} 
                      onChange={e => setTestPhone(e.target.value)} 
                      className="bg-[#111] border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-green-500 outline-none w-full md:w-40" 
                    />
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