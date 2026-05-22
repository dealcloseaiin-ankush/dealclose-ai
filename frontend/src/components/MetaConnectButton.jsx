import React, { useEffect, useState } from 'react';

const MetaConnectButton = () => {
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Load Facebook SDK for Meta Embedded Signup
  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: 'YOUR_META_APP_ID', // Apna Meta App ID yahan dalein
        cookie: true,
        xfbml: true,
        version: 'v19.0'
      });
      setIsSdkLoaded(true);
    };

    (function (d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) { return; }
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  // 2. Handle the Embedded Signup Click
  const handleMetaLogin = () => {
    if (!isSdkLoaded) {
      alert('Meta SDK is loading, please wait a second...');
      return;
    }

    setLoading(true);

    // Trigger Meta Oauth Popup
    window.FB.login((response) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        
        // Note: For full Tech Provider flow, Meta sends a 'code' that you exchange for a system user token.
        // But for standard setup, we can use the short-lived accessToken to fetch WABA and Phone IDs.
        
        console.log('Meta Auth Success:', response);
        
        // 3. Send Credentials to our Backend API
        const token = localStorage.getItem('token'); // Get user session token
        
        fetch('http://localhost:5000/api/users/settings/meta-connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            accessToken: accessToken,
            // In actual flow, you fetch these from Meta Graph API using the code/token
            wabaId: 'FETCHED_WABA_ID', 
            phoneNumberId: 'FETCHED_PHONE_ID'
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert('🎉 WhatsApp API Connected Successfully!');
          } else {
            alert('Failed to save Meta settings: ' + data.message);
          }
        })
        .catch(err => console.error('Backend Error:', err))
        .finally(() => setLoading(false));
        
      } else {
        console.log('User cancelled login or did not fully authorize.');
        setLoading(false);
      }
    }, {
      // config_id: 'YOUR_CONFIG_ID', // Tech Provider ke liye Meta portal se config_id yahan dalna hoga
      scopes: 'whatsapp_business_management,whatsapp_business_messaging',
      return_scopes: true
    });
  };

  return (
    <button 
      onClick={handleMetaLogin}
      disabled={loading}
      className="flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all disabled:opacity-50"
    >
      <img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg" alt="Meta" className="w-5 h-5 bg-white rounded-full" />
      {loading ? 'Connecting...' : 'Connect WhatsApp via Meta'}
    </button>
  );
};

export default MetaConnectButton;