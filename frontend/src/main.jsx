import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { AuthProvider } from './hooks/useAuth'
import App from './App.jsx'

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Global Error Caught by Boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '24px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#ef444420', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>DealClose AI</h2>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '6px', maxWidth: '350px' }}>
            A temporary screen refresh is needed. Tap below to reload seamlessly.
          </p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => {
                window.location.reload();
              }}
              style={{ padding: '10px 20px', background: '#10b981', color: '#000', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
            >
              🔄 Reload Screen
            </button>
            <button
              onClick={() => {
                window.location.href = '/mobile';
              }}
              style={{ padding: '10px 20px', background: '#374151', color: '#fff', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '12px' }}
            >
              📱 Mobile Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 🚀 AUTO-RECOVERY: Automatically reload on new deployments when old chunk hashes change
window.addEventListener('error', (e) => {
  const msg = e?.message || '';
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('MIME type of "text/html"') || msg.includes('Loading chunk')) {
    if (!sessionStorage.getItem('chunk_reload_lock')) {
      sessionStorage.setItem('chunk_reload_lock', 'true');
      window.location.reload();
    }
  }
});

window.addEventListener('unhandledrejection', (e) => {
  const reason = e?.reason?.message || String(e?.reason || '');
  if (reason.includes('Failed to fetch dynamically imported module') || reason.includes('MIME type of "text/html"') || reason.includes('Loading chunk')) {
    if (!sessionStorage.getItem('chunk_reload_lock')) {
      sessionStorage.setItem('chunk_reload_lock', 'true');
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GlobalErrorBoundary>
  </StrictMode>,
)
