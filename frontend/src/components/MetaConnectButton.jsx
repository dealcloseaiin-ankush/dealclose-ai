import React, { useEffect, useState } from 'react';

const MetaConnectButton = ({ buttonText = 'Connect WhatsApp via Meta' }) => {
  const [isSdkLoaded, setIsSdkLoaded] = useState(typeof window !== 'undefined' && !!window.FB);
  const [loading, setLoading] = useState(false);

  // 🔥 SAFE FALLBACK: Agar Render environment variables kaam na karein, toh yahan direct paste kar dein!
  const APP_ID = import.meta.env.VITE_META_APP_ID || '1611867760088959'; 
  const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID || '1559471809111797';

  // 1. Load Facebook SDK for Meta Embedded Signup
  useEffect(() => {
    console.log("➡️ [Meta SDK] Checking SDK status...");
    // Interval to check if FB is loaded by the other button on the same page
    const checkInterval = setInterval(() => {
      if (window.FB && window.isFbInitialized) {
        console.log("✅ [Meta SDK] Found globally initialized FB SDK.");
        setIsSdkLoaded(true);
        clearInterval(checkInterval);
      }
    }, 500);

    // Script ko safely inject karo
    if (!document.getElementById('facebook-jssdk')) {
      console.log("➡️ [Meta SDK] Injecting Facebook SDK script...");
      window.fbAsyncInit = function () {
        console.log("➡️ [Meta SDK] fbAsyncInit called, initializing...");
        window.FB.init({
          appId: APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0' 
        });
        window.isFbInitialized = true;
        setIsSdkLoaded(true);
        console.log("✅ [Meta SDK] Initialization complete.");
      };

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    return () => clearInterval(checkInterval);
  }, [APP_ID]);

  // 2. Handle the Embedded Signup Click
  const handleMetaLogin = () => {
    console.log("➡️ [MetaConnect] Button clicked. isSdkLoaded status:", isSdkLoaded);
    if (!window.FB) {
      console.warn("⚠️ [MetaConnect] window.FB is not available yet.");
      alert('Meta SDK is loading, please wait a second...');
      return;
    }

    if (!APP_ID) {
      alert("⚠️ Meta App ID is missing! Please paste your actual App ID in MetaConnectButton.jsx");
      return;
    }

    // Failsafe Initialization just in case it missed it
    if (!window.isFbInitialized) {
      console.log("➡️ [MetaConnect] Failsafe: Initializing FB SDK now...");
      window.FB.init({
        appId: APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v19.0' 
      });
      window.isFbInitialized = true;
    }

    setLoading(true);
    console.log("➡️ [MetaConnect] Triggering FB.login popup...");

    // Trigger Meta Oauth Popup
    window.FB.login((response) => {
      console.log("➡️ [MetaConnect] FB.login response received:", response);
      
      // 🔥 Enhanced Error Detection
      if (response.status === 'unknown' || response.error || !response.authResponse) {
        console.error('❌ [MetaConnect] Meta Login Failed/Blocked. Full Response:', response);
        console.warn('💡 [DEBUG TIP]: If popup says "JSSDK Option is Not Toggled", you MUST enable it in Meta Developer Dashboard.');
        alert('Meta Login Failed!\n\nIf you saw a JSSDK error, you MUST enable "Login with Javascript SDK" in developers.facebook.com -> Facebook Login -> Settings.\n\nCheck Console (F12) for detailed logs.');
        setLoading(false);
        return;
      }
      
      if (response.status === 'connected' && response.authResponse) {
        // Tech Provider (Embedded Signup) me Meta 'code' bhejta hai, 'accessToken' nahi.
        // Is code ko backend secure tarike se Meta Graph API ko bhej kar System User Access Token nikalta hai.
        const authCode = response.authResponse.code || response.authResponse.accessToken; 
        
        console.log('✅ [MetaConnect] Meta Auth Success. Auth Code extracted:', authCode);
        
        // 3. Send Credentials to our Backend API
        const token = localStorage.getItem('token'); // Get user session token
        
        console.log('➡️ [MetaConnect] Sending authCode to backend API...');
        fetch('https://dealclose-ai.onrender.com/api/users/settings/meta-connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            authCode: authCode, // Backend ko code bhejein
            // Client ki WABA ID aur Phone ID aapko backend me token exchange karne ke baad
            // 'GET /debug_token' ya 'GET /client_waba' API se nikalni hogi.
            // Frontend se directly bhejna safe/reliable nahi hota Tech Provider flow me.
          })
        })
        .then(res => res.json())
        .then(data => {
          console.log('➡️ [MetaConnect] Backend API response:', data);
          if (data.success) {
            alert('🎉 Meta Accounts (WhatsApp & Instagram) Connected Successfully!');
          } else {
            alert('Failed to save Meta settings: ' + data.message);
          }
        })
        .catch(err => console.error('❌ [MetaConnect] Backend Fetch Error:', err))
        .finally(() => setLoading(false));
      }
    }, {
      config_id: CONFIG_ID,
      scopes: 'whatsapp_business_management,whatsapp_business_messaging,instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_manage_metadata',
      return_scopes: true,
      response_type: 'code', // 🔥 IMPORTANT: Meta ko batana hai ki hume 'code' chahiye, token nahi (Tech Provider Requirement)
      override_default_response_type: true
    });
  };

  return (
    <button 
      onClick={handleMetaLogin}
      disabled={loading}
      className="flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all disabled:opacity-50"
    >
      <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Meta" className="w-5 h-5 bg-white rounded-full" />
      {loading ? 'Connecting...' : buttonText}
    </button>
  );
};

export default MetaConnectButton;