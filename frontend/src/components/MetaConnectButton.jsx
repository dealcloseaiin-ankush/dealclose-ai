import React, { useEffect, useState } from 'react';
import api from '../services/api';

let globalIsSdkLoaded = false;
let globalIsSdkLoading = false;
const globalSdkLoadCallbacks = [];

const MetaConnectButton = ({ buttonText = 'Connect', platform = 'whatsapp', workspaceId = 'main', onSuccess, variant }) => {
  const [isSdkReady, setIsSdkReady] = useState(globalIsSdkLoaded);
  const [loading, setLoading] = useState(false);

  const APP_ID = import.meta.env.VITE_META_APP_ID;
  const CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID;
  // ✅ FIX: Use the correct environment variable name as set in Vercel.
  // The variable in Vercel is `VITE_INSTAGRAM_META_APP_ID`, not `VITE_META_INSTAGRAM_APP_ID`.
  const IG_APP_ID = import.meta.env.VITE_INSTAGRAM_META_APP_ID || import.meta.env.VITE_META_APP_ID;

  // 🚀 MEGA DEBUG (FRONTEND): Moved logs to the top level to ensure they always run when the component renders.
  // This will confirm if Vercel is serving the latest code and what environment variables are available.
  console.log('================== [VERCEL ENV DEBUG] ==================');
  console.log('Yeh Vercel se aa rahe variables hain (frontend):');
  console.log('VITE_META_APP_ID:', import.meta.env.VITE_META_APP_ID ? 'Present ✅' : 'MISSING ❌');
  console.log('VITE_INSTAGRAM_META_APP_ID:', import.meta.env.VITE_INSTAGRAM_META_APP_ID ? 'Present ✅' : 'MISSING ❌');
  console.log('VITE_META_CONFIG_ID:', import.meta.env.VITE_META_CONFIG_ID ? 'Present ✅' : 'MISSING ❌');
  console.log('Final IG_APP_ID jo use ho raha hai:', IG_APP_ID || 'None');
  console.log('========================================================');

  useEffect(() => {
    const onSdkReady = () => setIsSdkReady(true);
    if (globalIsSdkLoaded) { onSdkReady(); return; }

    if (!globalIsSdkLoading) {
      globalIsSdkLoading = true;

      window.fbAsyncInit = function () {
        window.FB.init({
          appId: APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
        globalIsSdkLoaded = true;
        globalIsSdkLoading = false;
        globalSdkLoadCallbacks.forEach(cb => cb());
        onSdkReady();
        globalSdkLoadCallbacks.length = 0;
      };

      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    } else {
      globalSdkLoadCallbacks.push(onSdkReady);
    }

    return () => {
      const index = globalSdkLoadCallbacks.indexOf(onSdkReady);
      if (index !== -1) globalSdkLoadCallbacks.splice(index, 1);
    };
  }, [APP_ID]);

  const handleMetaLogin = () => {
    // 🚀 FLOW 2: Instagram API with Instagram Login — Facebook SDK use nahi hota, seedha redirect
    if (platform === 'instagram' && variant === 'instagram') {
      if (!IG_APP_ID) {
        alert("Configuration Error: The VITE_INSTAGRAM_META_APP_ID or VITE_META_APP_ID is not set in your frontend hosting environment (e.g., Vercel). Please add it and redeploy.");
        return;
      }
      setLoading(true);

      const redirectUri = `${window.location.origin}/instagram-oauth-callback`;
      // Instagram API with Instagram Login (Business Login) — these 5 scopes are 
      // the ONLY valid scopes for this product. Do NOT change to user_profile/
      // user_media (that is the deprecated Basic Display API and will break this 
      // flow with "Invalid platform app").
      const scopes = [
        'instagram_business_basic',
        'instagram_business_content_publish',
        'instagram_business_manage_comments',
        'instagram_business_manage_messages',
        'instagram_business_manage_insights'
      ].join(',');
      const instagramOAuthUrl = `https://www.instagram.com/oauth/authorize?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}`;

      // 🚀 MEGA DEBUG: Log the exact URL being constructed to find the issue.
      console.log('================== [INSTAGRAM CONNECT DEBUG] ==================');
      console.log('1. Platform:', platform, 'Variant:', variant);
      console.log('2. VITE_META_APP_ID from .env:', APP_ID);
      console.log('3. Final IG_APP_ID being used:', IG_APP_ID);
      console.log('4. Final OAuth URL:', instagramOAuthUrl);
      console.log('===============================================================');

      localStorage.setItem('instagramLoginWorkspaceId', workspaceId);
      localStorage.setItem('instagramLoginRedirectUri', redirectUri);

      window.location.href = instagramOAuthUrl;
      return;
    }

    if (!window.FB) {
      alert('Meta SDK is loading, please wait a second...');
      return;
    }

    if (!APP_ID) {
      alert("⚠️ VITE_META_APP_ID is missing in .env file.");
      return;
    }

    setLoading(true);

    let fbLoginConfig = {
      return_scopes: true,
      auth_type: 'rerequest'
    };

    if (platform === 'whatsapp') {
      fbLoginConfig = {
        ...fbLoginConfig,
        scope: 'whatsapp_business_management,whatsapp_business_messaging',
        config_id: CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true
      };
    } else if (platform === 'instagram' && variant === 'facebook') {
      // FLOW 1: Facebook Login for Business (Page-linked IG) — bilkul waisa hi
      fbLoginConfig = {
        ...fbLoginConfig,
        scope: [
          'business_management',
          'instagram_basic',
          'instagram_content_publish', 'instagram_manage_comments', 'instagram_manage_insights', 'instagram_manage_messages',
          'pages_show_list', 'pages_read_engagement', 'pages_manage_metadata', 'pages_messaging'
        ].join(',')
      };
    }

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

  const isInstagram = platform === 'instagram';
  const isFacebookVariant = isInstagram && variant === 'facebook';

  const buttonClass = isFacebookVariant
    ? 'bg-[#1877F2] hover:bg-[#166FE5]'
    : isInstagram && variant === 'instagram'
    ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90'
    : 'bg-[#1877F2] hover:bg-[#166FE5]';

  const iconSrc = isFacebookVariant
    ? "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"
    : isInstagram
    ? "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg"
    : "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg";

  return (
    <button type="button"
      onClick={handleMetaLogin}
      disabled={loading || (platform !== 'instagram' && !isSdkReady) || (platform === 'instagram' && variant === 'facebook' && !isSdkReady)}
      className={`w-full flex items-center justify-center gap-2 ${buttonClass} text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all disabled:opacity-50`}
    >
      <img
        src={iconSrc}
        alt="Meta"
        className={`w-5 h-5 ${(platform === 'whatsapp' || isFacebookVariant) ? 'bg-white rounded-full p-0.5' : ''}`}
      />
      {loading ? 'Connecting...' : buttonText}
    </button>
  );
};

export default MetaConnectButton;