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
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>DealClose AI Recovery Mode</h2>
          <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '6px', maxWidth: '350px' }}>
            A temporary session error occurred. Tap the button below to recover immediately.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/login';
            }}
            style={{ marginTop: '20px', padding: '12px 24px', background: '#10b981', color: '#000', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
          >
            Reset Session & Launch App
          </button>
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
