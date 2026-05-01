import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // Centralized Supabase client

export default function Setup() {
  const [previewUrl, setPreviewUrl] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [businessUrls, setBusinessUrls] = useState(['']); // Dynamic Array for URLs
  const [aiRules, setAiRules] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [whatsappToken, setWhatsappToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');

  // Backend API URL (Vercel se lega, nahi toh local par 5000 use karega)
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Google Login se wapas aane ke baad backend me user create/sync karne ka logic
  useEffect(() => {
    const syncUserWithBackend = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.user) {
        const { user } = session;
        try {
          // Backend ko bata rahe hain ki naya user aaya hai
          const res = await fetch(`${backendUrl}/api/users/supabase-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              supabaseId: user.id,
              name: user.user_metadata?.full_name || user.email.split('@')[0]
            })
          });
          
          const data = await res.json();
          if (res.ok) {
            // Backend ne jo token diya, usko save kar lenge taaki aage ke requests me use ho
            localStorage.setItem('token', data.token);
            
            // Fix: Agar user pehle se setup kar chuka hai (uske paas whatsapp token hai)
            // toh usko wapas form dikhane ki jagah seedha Dashboard par bhej do
            if (data.user && data.user.whatsappConfig && data.user.whatsappConfig.accessToken) {
              window.location.href = '/dashboard';
            }
          }
        } catch (error) {
          console.error('Error syncing user with backend:', error);
        }
      }
    };
    syncUserWithBackend();
  }, [backendUrl]);

  const handlePreview = (urlToPreview) => {
    if (!urlToPreview) return;
    let validUrl = urlToPreview;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    setPreviewUrl(validUrl);
  };

  const handleGenerateRules = async () => {
    if (!businessDesc) return alert("Please describe your business first!");
    
    setIsGenerating(true);
    // Mocking an AI API Call - In future, this will hit your backend aiService
    setTimeout(() => {
      setAiRules([
        "Rule 1: Always greet the customer politely and mention the business name.",
        "Rule 2: If the customer asks something outside the provided description, use the 'Ask Owner' tool.",
        "FAQ 1: Return Policy -> Based on your description, inform them about the 7-day policy.",
        "Action: Confirm the final order and send the summary to the owner's WhatsApp."
      ]);
      setIsGenerating(false);
    }, 2500);
  };

  const handleSaveSetup = async () => {
    try {
      // Token se User authenticate hoga
      const token = localStorage.getItem('token'); 
      if (!token) {
        alert('You are not logged in. Please log in to save settings.');
        return;
      }

      const settingsPayload = {
        whatsappToken,
        phoneNumberId,
        wabaId,
        ownerPhone,
        pinCode,
        businessDesc,
        businessUrls: businessUrls.filter(url => url.trim() !== '') // Khali URLs ko hata kar bhejenge
      };

      const res = await fetch(`${backendUrl}/api/users/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Protect middleware ke liye
        },
        body: JSON.stringify(settingsPayload)
      });
      
      const data = await res.json();

      if (res.ok) {
        alert('Setup saved successfully! Your AI Assistant is now configured.');
        // Fix: navigate() ki jagah window.location.href use karenge taaki page reload ho aur ProtectedRoute naya token padh le
        window.location.href = '/dashboard';
      } else {
        alert(`Failed to save settings: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(error);
      alert('Error saving setup. Check console.');
    }
  };

  const handleSendOtp = () => {
    if(!ownerPhone) return alert("Enter phone number");
    setOtpSent(true);
    alert("OTP sent to your WhatsApp!");
  };

  const handleAddUrl = () => {
    if (businessUrls.length < 5) setBusinessUrls([...businessUrls, '']);
  };
  const handleUrlChange = (index, value) => {
    const newUrls = [...businessUrls];
    newUrls[index] = value;
    setBusinessUrls(newUrls);
  };
  const handleRemoveUrl = (index) => {
    setBusinessUrls(businessUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-[#050505] text-gray-100 font-sans">
      
      {/* Left Panel: AI Setup & Configuration */}
      <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto border-r border-gray-800">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              AI Setup Assistant
            </span>
          </h1>
          <p className="text-gray-400">Tell us about your business, and our AI will automatically configure your WhatsApp automations.</p>
        </div>

        <div className="space-y-8">
          {/* Owner & Location Setup */}
          <div className="bg-[#111111] p-6 rounded-2xl border border-gray-800 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">1. Owner Identity & Location</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Master WhatsApp Number (You can text AI to update catalog)</label>
                <div className="flex gap-3 mt-1">
                  <input type="text" placeholder="+91..." value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white outline-none" />
                  {!otpSent ? (
                    <button onClick={handleSendOtp} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold">Verify</button>
                  ) : (
                    <input type="text" placeholder="OTP" className="w-24 bg-[#0a0a0a] border border-green-500 rounded-xl p-3 text-white text-center outline-none" />
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400">Business Pincode (For Local Reach)</label>
                <input type="text" placeholder="e.g. 400001" value={pinCode} onChange={e => setPinCode(e.target.value)} className="w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white outline-none" />
              </div>
            </div>
          </div>

          {/* WhatsApp API Configuration */}
          <div className="bg-[#111111] p-6 rounded-2xl border border-gray-800 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">1.5 Meta API Configuration</h2>
            <p className="text-sm text-gray-400 mb-4">Enter your Meta Developer app details here to connect the Bot.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">WhatsApp Access Token</label>
                <input type="text" placeholder="EAAIxxxx..." value={whatsappToken} onChange={e => setWhatsappToken(e.target.value)} className="w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400">Phone Number ID (Bot Number ID)</label>
                <input type="text" placeholder="e.g. 1234567890" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} className="w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white outline-none" />
              </div>
              <div>
                <label className="text-sm text-gray-400">WABA ID (Business Account ID)</label>
                <input type="text" placeholder="e.g. 0987654321" value={wabaId} onChange={e => setWabaId(e.target.value)} className="w-full mt-1 bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white outline-none" />
              </div>
            </div>
          </div>

          {/* Dynamic Websites Section */}
          <div className="bg-[#111111] p-6 rounded-2xl border border-gray-800 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">2. Link Your Business Websites</h2>
            <p className="text-sm text-gray-400 mb-4">Add up to 5 websites. Click Preview to see them on the mobile screen.</p>
            <div className="space-y-3">
              {businessUrls.map((siteUrl, index) => (
                <div key={index} className="flex gap-2">
                  <input 
                    type="text" 
                    value={siteUrl} 
                    onChange={(e) => handleUrlChange(index, e.target.value)} 
                    placeholder="e.g., www.yourwebsite.com" 
                    className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                  />
                  <button onClick={() => handlePreview(siteUrl)} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors">
                    Preview
                  </button>
                  {businessUrls.length > 1 && (
                    <button onClick={() => handleRemoveUrl(index)} className="px-4 py-3 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white font-semibold rounded-xl transition-colors">
                      X
                    </button>
                  )}
                </div>
              ))}
              {businessUrls.length < 5 && (
                <button onClick={handleAddUrl} className="text-purple-400 text-sm font-bold mt-2 hover:text-purple-300">
                  + Add Another Website
                </button>
              )}
            </div>
          </div>

          {/* Business Description for AI */}
          <div className="bg-[#111111] p-6 rounded-2xl border border-gray-800 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white flex items-center gap-2">
              3. Train Your AI Agent (Optional for now)
            </h2>
            <textarea 
              rows="4" 
              value={businessDesc}
              onChange={(e) => setBusinessDesc(e.target.value)}
              placeholder="Describe your business... e.g., 'Meri kapde ki dukan hai, return policy 7 days hai. COD available hai.'"
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none mb-4"
            ></textarea>
            <button 
              onClick={handleGenerateRules}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all disabled:opacity-50"
            >
              {isGenerating ? '🧠 AI is analyzing and generating rules...' : '✨ Generate AI Rules & FAQs'}
            </button>
          </div>

          {/* Generated Rules Output */}
          {aiRules.length > 0 && (
            <div className="bg-green-900/10 p-6 rounded-2xl border border-green-500/20 shadow-lg">
              <h3 className="text-lg font-bold text-green-400 mb-3">Generated Automations</h3>
              <ul className="space-y-3 mb-6 text-sm text-gray-300">
                {aiRules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span> {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Always Visible Save Button */}
          <div className="pt-4 border-t border-gray-800 mt-4">
            <button onClick={handleSaveSetup} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-extrabold text-lg rounded-xl shadow-lg shadow-green-600/30 transition-all">
              Save Setup & Go to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel: Iframe Preview */}
      <div className="w-full md:w-1/2 bg-[#0a0a0a] p-6 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4 font-medium uppercase tracking-widest text-sm">Live Platform Preview</p>
        
        {previewUrl ? (
          <div className="w-full max-w-[375px] h-[750px] bg-white rounded-[3rem] border-[8px] border-gray-800 overflow-hidden shadow-2xl relative">
            {/* Fake phone notch */}
            <div className="absolute top-0 inset-x-0 h-6 bg-gray-800 rounded-b-3xl w-1/2 mx-auto z-10"></div>
            
            <iframe 
              src={previewUrl} 
              title="Website Preview"
              className="w-full h-full border-0"
            />
          </div>
        ) : (
          <div className="w-full max-w-[375px] h-[750px] bg-[#111111] rounded-[3rem] border-[8px] border-gray-800 flex items-center justify-center text-gray-600 shadow-2xl text-center p-8">
            Enter a URL and click Preview to see your website here.
          </div>
        )}
      </div>

    </div>
  );
}