import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Assuming you have this hook
import { useInboxStore } from '../store/inboxStore';
import { ChevronLeft, Menu } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth() || { user: { role: 'owner', fullName: 'Admin User', businessName: 'DealClose AI', workspaces: [] } }; // Fallback for MVP
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const { unreadCount } = useInboxStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Real Workspaces Data from Auth Context
  const workspaces = useMemo(() => {
    const mainBusiness = { _id: 'main_business', name: (user?.businessName && user.businessName !== 'Main Business') ? user.businessName : 'DealClose AI (Main)' };
    const otherWorkspaces = user?.workspaces || [];
    return [mainBusiness, ...otherWorkspaces];
  }, [user]);

  const [activeWorkspaceId, setActiveWorkspaceId] = useState(workspaces[0]?._id);

  const handleLogout = (e) => {
    e.preventDefault();
    if (logout) logout();
    window.location.href = '/login';
  };

  const navCategories = [
    {
      title: 'MAIN',
      items: [
        { name: 'Website Home', path: '/home', icon: '🏠' },
        { name: 'Dashboard', path: '/dashboard', icon: '📊' },
        { name: 'Inbox (Chats)', path: '/chats', icon: '💬', badge: unreadCount },
        { name: 'Contacts', path: '/contacts', icon: '👥' },
        { name: 'Catalog', path: '/catalog', icon: '🛍️' },
        { name: 'CRM', path: '/crm', icon: '🗂️' },
        { name: 'Campaigns', path: '/campaigns', icon: '📢' },
        { name: 'Templates', path: '/templates', icon: '📄' }
      ]
    },
    {
      title: 'AUTOMATION',
      items: [
        { name: 'Flow Builder', path: '/flow-builder', icon: '🤖' },
        { name: 'Automations', path: '/automations', icon: '🔁' },
        { name: 'Instagram', path: '/instagram-automation', icon: '📸' }
      ]
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { name: 'AI Agent', path: '/ai-agent', icon: '🧠' },
        { name: 'Pixel Analytics', path: '/tracking-analytics', icon: '📈' },
        { name: 'Order Dispatch', path: '/dispatch', icon: '📦' },
        { name: 'Calls', path: '/calls', icon: '📞' },
        { name: 'Analytics', path: '/monthly-report', icon: '📈' }
      ]
    },
    {
      title: 'TOOLS',
      items: [
        { name: 'Staff & Team', path: '/staff', icon: '👨‍💼' }, // 'requireOwner' hata diya, ab sabko dikhega
        { name: 'Forms', path: '/forms', icon: '📋' },
        { name: 'Wallet', path: '/wallet', icon: '💰', requireOwner: true },
        { name: 'Settings', path: '/settings', icon: '⚙️' }
      ]
    }
  ];

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#0a0a0a] border-r border-gray-800 h-screen flex flex-col text-gray-300 font-sans transition-all duration-300 relative`}>
      
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-[#111] border border-gray-700 rounded-full p-1 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors z-50 shadow-md"
      >
        {isCollapsed ? <Menu size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`pt-6 pb-4 ${isCollapsed ? 'px-4' : 'px-6'} border-b border-gray-800`}>
        <Link to="/dashboard" className={`text-xl font-bold text-white flex items-center ${isCollapsed ? 'justify-center' : 'gap-2'} mb-6`}>
          <span className="text-purple-500 text-2xl">⚡</span> {!isCollapsed && "DealClose"}
        </Link>
        
        {/* Workspace Switcher */}
        {!isCollapsed && (
        <div className="animate-fade-in">
          <label className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider mb-1 block">Active Workspace</label>
          <select 
            className="w-full bg-[#111] border border-gray-700 text-white text-sm font-semibold rounded-lg p-2.5 outline-none focus:border-purple-500 cursor-pointer appearance-none shadow-sm"
            value={activeWorkspaceId}
            onChange={(e) => setActiveWorkspaceId(e.target.value)}
          >
            {workspaces.map(ws => (
              <option key={ws._id} value={ws._id}>{ws.name}</option>
            ))}
          </select>
        </div>
        )}
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 overflow-x-hidden">
        {navCategories.map((category, idx) => (
          <div key={idx} className="mb-6">
            {!isCollapsed ? (
              <p className="px-8 mb-2 text-xs font-extrabold text-gray-500 tracking-wider whitespace-nowrap">{category.title}</p>
            ) : (
              <div className="w-full flex justify-center mb-2">
                <div className="w-4 h-px bg-gray-800"></div>
              </div>
            )}
            <ul className={`space-y-1 ${isCollapsed ? 'px-3' : 'px-4'}`}>
              {category.items.map((item) => {
                if (item.requireOwner && !isOwner) return null;
                
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.name}>
                    <Link
                    to={item.comingSoon ? '#' : item.path}
                    title={isCollapsed ? item.name : ""}
                    className={`relative flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive && !item.comingSoon
                        ? 'bg-gradient-to-r from-purple-500/10 to-transparent text-purple-400 font-bold border border-purple-500/20' 
                        : 'text-gray-400 hover:bg-gray-900 hover:text-gray-100 font-medium'
                    } ${item.comingSoon ? 'opacity-50 cursor-default' : ''} ${isCollapsed ? 'px-0 h-11 w-11 mx-auto' : ''}`}
                    onClick={(e) => item.comingSoon && e.preventDefault()}
                    >
                      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                        <span className="text-lg opacity-80">{item.icon}</span>
                        {!isCollapsed && (
                          <div className="whitespace-nowrap flex items-center">
                            {item.name}
                            {item.comingSoon && <span className="bg-gray-800 text-gray-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ml-2">Soon</span>}
                          </div>
                        )}
                      </div>
                      {item.badge > 0 && !isCollapsed && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/30">
                          {item.badge}
                        </span>
                      )}
                      {item.badge > 0 && isCollapsed && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 border-2 border-[#0a0a0a] rounded-full"></span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      
      <div className={`p-4 border-t border-gray-800 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center p-0 bg-transparent border-none' : 'gap-3 px-3 py-2.5 rounded-xl bg-[#111] border border-gray-800'}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/30 shrink-0">
            {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'SA'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white leading-tight truncate">{user?.fullName || 'User'}</p>
              <p className="text-xs text-gray-400 capitalize truncate">{user?.role || 'owner'}</p>
              <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-rose-400 transition-colors bg-transparent border-none p-0 cursor-pointer">Logout</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}