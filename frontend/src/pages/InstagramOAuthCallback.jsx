import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ✅ FIX: Check for parameters outside the component to set initial state correctly.
// This avoids a cascading render and resolves the ESLint warning.
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const storedWorkspaceId = localStorage.getItem('instagramLoginWorkspaceId');
const storedRedirectUri = localStorage.getItem('instagramLoginRedirectUri');
const initialError = (!code || !storedWorkspaceId || !storedRedirectUri)
  ? 'Missing authorization code or session data. Please try connecting again from Settings.'
  : null;

export default function InstagramOAuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Connecting your Instagram account...');
  const [error, setError] = useState(initialError);

  useEffect(() => {
    // If there was an initial error, don't proceed with the API call.
    if (initialError) return;

    localStorage.removeItem('instagramLoginWorkspaceId');
    localStorage.removeItem('instagramLoginRedirectUri');

    api.post('/users/settings/instagram-business-login-connect', {
      authCode: code,
      workspaceId: storedWorkspaceId,
      redirectUri: storedRedirectUri,
    })
      .then(res => {
        if (res.data.success) {
          setMessage('🎉 Instagram Business account connected successfully!');
          if (res.data.webhookWarning) {
            setMessage(prev => prev + `\n\n⚠️ Warning: ${res.data.webhookWarning}`);
          }
          setTimeout(() => navigate('/settings'), 3000); // Redirect to settings page
        } else {
          setError(res.data.message || 'Failed to connect Instagram.');
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || err.message || 'An unexpected error occurred.');
      });
  }, [navigate]); // The dependencies are correct as they don't change.

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-gray-100">
      <div className="text-center p-8 rounded-lg shadow-xl bg-[#111] border border-gray-800">
        {error ? (
          <p className="text-red-500 text-lg">❌ Error: {error}</p>
        ) : (
          <p className="text-green-400 text-lg">{message}</p>
        )}
        <p className="mt-4 text-sm text-gray-500">You will be redirected shortly.</p>
      </div>
    </div>
  );
}