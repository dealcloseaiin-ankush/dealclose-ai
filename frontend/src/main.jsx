import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { AuthProvider } from './hooks/useAuth'
import App from './App.jsx'

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
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
