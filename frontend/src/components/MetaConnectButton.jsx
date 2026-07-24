import React, { useEffect, useState } from 'react';
import api from '../services/api';

// 🚀 FIX: Global flags to ensure SDK is loaded only once across the entire application.
// This prevents the "overriding current access token" warning.
let globalIsSdkLoaded = false;
let globalIsSdkLoading = false;
const globalSdkLoadCallbacks = [];

const MetaConnectButton = ({ buttonText = 'Connect', platform = 'whatsapp', workspaceId = 'main', onSuccess, variant }) => {
  // Use local state to reflect global SDK load status
  const [isSdkReady, setIsSdkReady] = useState(globalIsSdkLoaded);
  const [loading, setLoading] = useState(false);

  const APP_ID = import.meta.env.VITE_META_APP_ID; 
  const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID;

  // 1. Load Facebook SDK Safely and only once
  useEffect(() => {
    // Add current component's readiness setter to callbacks
    globalSdkLoadCallbacks.push(() => setIsSdkReady(true));

    // If SDK is not currently loading, initiate loading
    if (!globalIsSdkLoading) {
      globalIsSdkLoading = true;

      // Define fbAsyncInit globally before the script loads
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0' 
        });
        globalIsSdkLoaded = true;
        globalIsSdkLoading = false;
        // Call all pending callbacks
        globalSdkLoadCallbacks.forEach(cb => cb());
        // Clear callbacks after execution
        globalSdkLoadCallbacks.length = 0; 
      };

      // Inject the SDK script if it's not already there
      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    }
  }, [APP_ID]);

  // 2. Handle Login Flow
  const handleMetaLogin = () => {
    if (!window.FB) {
      alert('Meta SDK is loading, please wait a second...');
      return;
    }

    if (!APP_ID) {
      alert("⚠️ VITE_META_APP_ID is missing in .env file.");
      return;
    }

    setLoading(true);

    // Dynamic Login Configuration Base
    let fbLoginConfig = {
      return_scopes: true,
      auth_type: 'rerequest'
    };

    // 🚀 PLATFORM BASED CONDITIONAL CONFIGURATION
    if (platform === 'whatsapp') {
      // WhatsApp Embedded Signup uses Code Flow
      fbLoginConfig = {
        ...fbLoginConfig,
        scope: 'whatsapp_business_management,whatsapp_business_messaging',
        config_id: CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true
      };
    } else {
      // Instagram uses Standard Access Token Flow (Cleaned Scopes)
      fbLoginConfig = {
        ...fbLoginConfig,
        // ✅ NEW: Comprehensive scope for the independent Instagram Business Login.
        // This requests all permissions needed for publishing, insights, comments, messaging, and business management.
        scope: [
          'business_management',
          'instagram_basic',
          'instagram_content_publish', 'instagram_manage_comments', 'instagram_manage_insights', 'instagram_manage_messages',
          'pages_show_list', 'pages_read_engagement', 'pages_manage_metadata', 'pages_messaging'
        ].join(',')
      };
    }

    // Trigger Meta Popup
    window.FB.login((response) => {
      console.log(`➡️ [MetaConnect] ${platform} FB.login response:`, response);
      
      if (response.status === 'unknown' || response.error || !response.authResponse) {
        let userFriendlyError = 'Meta Login Failed! Please allow popups and try again.';
        if (response.status === 'not_authorized') {
          userFriendlyError = 'Login Cancelled: Permissions not granted.';
        }
        alert(userFriendlyError);
        setLoading(false);
        return;
      }
      
      if (response.status === 'connected' && response.authResponse) {
        // WhatsApp ke liye code uthayega, Instagram ke liye accessToken
        const authCode = platform === 'whatsapp' 
          ? (response.authResponse.code || response.authResponse.accessToken)
          : response.authResponse.accessToken; 
        
        console.log('✅ [MetaConnect] Auth Success. Token/Code extracted:', authCode);
        
        const backendRoute = `/users/settings/${platform}-connect`;

        api.post(backendRoute, {
          authCode: authCode,
          workspaceId: workspaceId
        })
        .then(res => {
          console.log(`INSTAGRAM RESPONSE =>`, res.data);
          
          // Agar Instagram accounts select karne ke liye array aa raha hai
          if (platform === 'instagram' && res.data.availableAccounts && res.data.availableAccounts.length > 0) {
             if (onSuccess) {
               onSuccess({ availableAccounts: res.data.availableAccounts, authCode }); 
             }
             return;
          }

          if (res.data.success) {
            alert('🎉 Meta Account Connected Successfully!');
            if (onSuccess) {
              onSuccess();
            } else {
              window.location.reload();
            }
          } else {
            alert('Failed to save settings: ' + res.data.message);
          }
        })
        .catch(err => {
          console.error('❌ Backend Fetch Error:', err);
          alert('Error: ' + (err.response?.data?.message || 'Failed to connect.'));
        })
        .finally(() => setLoading(false));
      }
    }, fbLoginConfig);
  };

  // Determine button style and icon based on platform and variant
  const isInstagram = platform === 'instagram';
  const isFacebookVariant = isInstagram && variant === 'facebook';
  
  const buttonClass = isFacebookVariant
    ? 'bg-[#1877F2] hover:bg-[#166FE5]'
    : isInstagram
    ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90'
    : 'bg-[#1877F2] hover:bg-[#166FE5]'; // Default to Facebook blue for WhatsApp

  const iconSrc = isFacebookVariant
    ? "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"
    : isInstagram
    ? "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg"
    : "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"; // Default to Facebook icon

  return (
    <button type="button"
      onClick={handleMetaLogin}
      disabled={loading || !isSdkReady}
      className={`w-full flex items-center justify-center gap-2 ${buttonClass} text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all disabled:opacity-50`}
    >
      <img 
        src={iconSrc}
        alt="Meta" 
        className={`w-5 h-5 ${(platform === 'whatsapp' || isFacebookVariant) ? 'bg-white rounded-full p-0.5' : ''}`} 
      />
      {loading ? 'Connecting...' : (!isSdkReady ? 'Loading Meta SDK...' : buttonText)}
    </button>
  );
};

export default MetaConnectButton;