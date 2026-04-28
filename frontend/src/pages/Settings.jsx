import { useState, useEffect } from 'react';
import api from '../services/api'; // Import our Axios instance

export default function Settings() {
  const [config, setConfig] = useState({
    whatsappToken: '',
    phoneNumberId: '',
    wabaId: '',
    twilioSid: '',
    twilioAuthToken: '',
    twilioPhone: ''
  });
  
  const [igConnected, setIgConnected] = useState(false);

  // Load Facebook SDK for 1-Click Instagram Login
  useEffect(() => {
    window.fbAsyncInit = function() {
      window.FB.init({
        appId      : 'YOUR_META_APP_ID', // TODO: Yahan apni Meta App ID dalein
        cookie     : true,
        xfbml      : true,
        version    : 'v19.0'
      });
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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/settings', config);
      alert('Settings saved successfully! AI is now connected to your accounts.');
    } catch (error) {
      alert('Error saving settings: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Integrations & Settings</h1>
        <p className="text-gray-600 mt-2">Connect your Meta WhatsApp and Calling APIs. The system will use these credentials for all AI interactions, ensuring a flexible SaaS experience.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* WhatsApp Meta Config */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-green-600 mb-4 flex items-center">
             WhatsApp (Meta API)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Access Token</label>
              <input type="password" name="whatsappToken" value={config.whatsappToken} onChange={handleChange} placeholder="EAAL..." className="w-full p-2 border rounded-lg focus:ring-green-500 focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
              <input type="text" name="phoneNumberId" value={config.phoneNumberId} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-green-500 focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WABA ID (Business Account ID)</label>
              <input type="text" name="wabaId" value={config.wabaId} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-green-500 focus:border-green-500" />
            </div>
          </div>
        </div>

        {/* Instagram Integration */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-pink-600 flex items-center gap-2">
               Instagram Business Account
            </h2>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${igConnected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
              {igConnected ? 'Connected ✅' : 'Not Connected'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">Connect your Instagram to enable Auto-DMs, Comment tracking, and AI Profile Growth Audits.</p>
          
          {!igConnected ? (
            <button onClick={handleInstagramConnect} type="button" className="px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white font-bold rounded-lg shadow-md transition-all">
              Connect via Meta (Facebook)
            </button>
          ) : (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
               <p className="text-sm text-green-700 font-semibold">Your Instagram account is actively monitored by AI.</p>
               <button type="button" onClick={() => setIgConnected(false)} className="mt-2 text-xs text-red-500 font-bold hover:underline">Disconnect</button>
            </div>
          )}
        </div>

        {/* Twilio / Calling Config */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-blue-600 mb-4 flex items-center">
             Voice Calling (Twilio Provider)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account SID</label>
              <input type="text" name="twilioSid" value={config.twilioSid} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
              <input type="password" name="twilioAuthToken" value={config.twilioAuthToken} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Twilio Phone Number</label>
              <input type="text" name="twilioPhone" value={config.twilioPhone} onChange={handleChange} placeholder="+1234567890" className="w-full p-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </div>

        <button type="submit" className="w-full md:w-auto px-8 py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors">
          Save Configurations
        </button>
      </form>
    </div>
  );
}