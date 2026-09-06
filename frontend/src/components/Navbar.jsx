import { useAuth } from '../hooks/useAuth';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, CheckCircle, ExternalLink, X } from 'lucide-react';
import { useInboxStore } from '../store/inboxStore';
import api from '../services/api';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dbWorkspaces, setDbWorkspaces] = useState([]);
  const [localWorkspaceName, setLocalWorkspaceName] = useState('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const { unreadCount, recentNotifications, clearNotifications } = useInboxStore();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Data pull and localStorage sync tracker loop
  useEffect(() => {
    api.get('/users/profile')
      .then(({ data }) => {
        const savedData = data.user || data.data || data;
        if (savedData && savedData.workspaces) {
          setDbWorkspaces(savedData.workspaces);
        }
      })
      .catch(err => console.error("➡️ [Navbar Debug] Profile fetch failed:", err));

    const interval = setInterval(() => {
      const activeName = localStorage.getItem('active_workspace_name');
      if (activeName) {
        setLocalWorkspaceName(activeName);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // 2. 🚀 LIVE RESOLVER: URL query params or local storage dynamic readout
  const activeFirmName = useMemo(() => {
    const urlParams = new URLSearchParams(location.search);
    const wsParam = urlParams.get('ws'); 

    if (wsParam !== null && wsParam !== undefined) {
      const idx = parseInt(wsParam, 10);
      if (dbWorkspaces[idx]?.name) {
        localStorage.setItem('active_workspace_name', dbWorkspaces[idx].name);
        return dbWorkspaces[idx].name; 
      }
      if (user?.workspaces?.[idx]?.name) {
        localStorage.setItem('active_workspace_name', user.workspaces[idx].name);
        return user.workspaces[idx].name;
      }
    }

    if (localWorkspaceName) {
      return localWorkspaceName;
    }

    return user?.businessName && user.businessName !== 'Main Business' 
      ? user.businessName 
      : 'DealClose AI';
  }, [location.search, dbWorkspaces, user, localWorkspaceName]);

  const handleOpenChat = (notif) => {
    setIsNotifOpen(false);
    if (notif?.customerPhone) {
      api.post('/chats/mark-read', { customerPhone: notif.customerPhone }).catch(() => {});
    }
    navigate('/chats');
  };

  const handleClearAll = async () => {
    clearNotifications();
    try {
      await api.post('/chats/mark-all-read');
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  return (
    <nav className="px-4 py-3 bg-[#0a0a0f] border-b border-gray-800 flex justify-between items-center z-30 select-none relative">
      {/* Dynamic firm banner */}
      <div className="font-semibold text-gray-300 text-xs md:text-sm flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Active Workspace:</span>
        <span className="text-white font-black bg-gray-900 border border-gray-700/60 px-2.5 py-1 rounded-lg shadow-sm">
          {activeFirmName}
        </span>
      </div>

      {/* Right controls: Notification center */}
      <div className="flex items-center gap-3 relative" ref={notifRef}>
        <button
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          className={`relative p-2 rounded-xl transition-all duration-200 border ${
            isNotifOpen 
              ? 'bg-purple-600/20 border-purple-500/50 text-purple-400' 
              : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
          }`}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border-2 border-[#0a0a0f] shadow-lg shadow-rose-500/40 animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* 🚀 NON-INTRUSIVE NOTIFICATION DROPDOWN */}
        {isNotifOpen && (
          <div className="absolute right-0 top-12 w-80 md:w-96 bg-[#0e0e14] border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in backdrop-blur-xl">
            <div className="p-3.5 bg-gray-900/60 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {recentNotifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[11px] text-gray-400 hover:text-purple-400 transition-colors font-medium px-2 py-1 rounded-lg hover:bg-gray-800"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="text-gray-500 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-gray-800/50">
              {recentNotifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-600">
                    <CheckCircle size={20} />
                  </div>
                  <span className="font-semibold text-gray-400">All caught up!</span>
                  <span>No new incoming alerts.</span>
                </div>
              ) : (
                recentNotifications.map((n, idx) => (
                  <div
                    key={n._id || n.id || idx}
                    onClick={() => handleOpenChat(n)}
                    className="p-3.5 hover:bg-gray-900/60 transition-colors cursor-pointer flex items-start gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-white truncate">
                          {n.customerName || n.customerPhone || 'Customer'}
                        </span>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 truncate">
                        {n.messageText || n.text || 'New message received'}
                      </p>
                    </div>
                    <ExternalLink size={12} className="text-gray-600 group-hover:text-purple-400 shrink-0 mt-1 transition-colors" />
                  </div>
                ))
              )}
            </div>

            <div className="p-2.5 bg-gray-900/40 border-t border-gray-800 text-center">
              <button
                onClick={() => {
                  setIsNotifOpen(false);
                  navigate('/chats');
                }}
                className="text-xs text-purple-400 hover:text-purple-300 font-bold transition-colors w-full py-1"
              >
                Go to Inbox (All Chats) →
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}