import React, { useEffect, useState } from 'react';
import api from '../services/api';

const MetaConnectButton = ({ buttonText = 'Connect WhatsApp', platform = 'whatsapp', workspaceId = 'main', onSuccess }) => {
  const [isSdkLoaded, setIsSdkLoaded] = useState(typeof window !== 'undefined' && !!window.FB);
  const [loading, setLoading] = useState(false);

  // 🔥 IMPORTANT: Sirf .env se hi aapki actual Meta App ID aani chahiye!
  const APP_ID = import.meta.env.VITE_META_APP_ID; 
  const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID;

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
      alert("⚠️ VITE_META_APP_ID is missing! Please add it to your frontend/.env file.");
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
    const handleLoginResponse = (response) => {
      console.log("➡️ [MetaConnect] FB.login response received:", response);
      
      // 🔥 Enhanced Error Detection
      if (response.status === 'unknown' || response.error || !response.authResponse) {
        console.error('❌ [MetaConnect] Meta Login Failed/Blocked. Full Response:', response);
        let userFriendlyError = 'Meta Login Failed! Please try again.';
        if (response.status === 'not_authorized') {
          userFriendlyError = 'Login Cancelled: You did not grant the required permissions in the Meta popup.';
        } else if (response.error) {
          userFriendlyError = `Meta Login Error: ${response.error_message || 'Please check browser console for details.'}`;
        }
        alert(userFriendlyError);
        setLoading(false);
        return;
      }
      
      if (response.status === 'connected' && response.authResponse) {
        // Tech Provider (Embedded Signup) me Meta 'code' bhejta hai, 'accessToken' nahi.
        // Is code ko backend secure tarike se Meta Graph API ko bhej kar System User Access Token nikalta hai.
        const authCode = response.authResponse.code || response.authResponse.accessToken;
        if (!authCode) {
          alert('Meta did not return an authorization code. Please try again and approve every requested permission.');
          setLoading(false);
          return;
        }
        
        console.log('✅ [MetaConnect] Meta Auth Success. Auth Code extracted:', authCode);
        
    // 3. Send Credentials to our Backend API
    // 🚀 FIX: Use separate, dedicated backend routes for WhatsApp and Instagram
    const backendRoute = `/users/settings/${platform}-connect`;

    console.log('➡️ [MetaConnect] Sending authCode to backend API...');
    api.post(backendRoute, {
      authCode: authCode,
      workspaceId: workspaceId
    })
    .then(res => {
      // 🚀 MODIFIED: For Instagram, the backend returns availableAccounts array
      if (platform === 'instagram' && res.data.availableAccounts) {
         if (onSuccess) {
           onSuccess({ availableAccounts: res.data.availableAccounts, authCode }); 
         }
         return;
      }
          const data = res.data;
          console.log('➡️ [MetaConnect] Backend API response:', data);
          if (data.success) {
            alert('🎉 Meta Accounts (WhatsApp & Instagram) Connected Successfully!');
            if (onSuccess) {
              onSuccess(); // Background data refresh
            } else {
              window.location.reload(); // Fallback
            }
          } else {
            alert('Failed to save Meta settings: ' + data.message);
          }
        })
        .catch(err => {
          console.error('❌ [MetaConnect] Backend Fetch Error:', err);
          alert('Error: ' + (err.response?.data?.message || 'Failed to connect. Please try again.'));
        })
        .finally(() => setLoading(false));
      }
    };

    const fbLoginConfig = {
      scopes: platform === 'whatsapp' 
        ? 'whatsapp_business_management,whatsapp_business_messaging' 
        : 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging',
      return_scopes: true,
      response_type: 'code',
      auth_type: 'rerequest',
      override_default_response_type: true
    };

    // Sirf WhatsApp ke case me config_id bhejna hai
    if (platform === 'whatsapp') {
      fbLoginConfig.config_id = CONFIG_ID;
    }

    window.FB.login(handleLoginResponse, fbLoginConfig);
  };

  return (
    <button type="button"
      onClick={handleMetaLogin}
      disabled={loading || !isSdkLoaded}
      className={`flex items-center justify-center gap-2 ${platform === 'instagram' ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90' : 'bg-[#1877F2] hover:bg-[#166FE5]'} text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all disabled:opacity-50`}
    >
      <img src={platform === 'whatsapp' ? "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" : "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg"} alt="Meta" className={`w-5 h-5 ${platform === 'whatsapp' ? 'bg-white rounded-full' : ''}`} />
      {loading ? 'Connecting...' : (!isSdkLoaded ? 'Loading Meta SDK...' : buttonText)}
    </button>
  );
};

export default MetaConnectButton;
