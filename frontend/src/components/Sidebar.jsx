import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Assuming you have this hook
import useWorkspaceStore from '../store/workspaceStore'; // 🚀 NEW: Import useWorkspaceStore
import { useInboxStore } from '../store/inboxStore';
import { ChevronLeft, Menu, LayoutDashboard, MessageSquare, Users, ShoppingBag, Briefcase, Megaphone, FileText, Bot, Repeat, Instagram, TrendingUp, Package, Phone, BarChart2, Settings, Wallet, UserCog, Clipboard, ScanEye, Shield, DollarSign, CreditCard, Lock, Code } from 'lucide-react'; // 🚀 NEW: More icons for new pages
import { FaInstagram, FaFacebookF } from 'react-icons/fa'; // For Instagram/Facebook specific icons

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth() || { user: { role: 'owner', fullName: 'Admin User', businessName: 'DealClose AI', workspaces: [] } }; // Fallback for MVP
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const { unreadCount } = useInboxStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore(); // 🚀 NEW: Use global workspace state
  const workspaces = useMemo(() => { // 🚀 NEW: Derive workspaces from user data
    const mainBusiness = { _id: 'main_business', name: (user?.businessName && user.businessName !== 'Main Business') ? user.businessName : 'DealClose AI (Main)' };
    const otherWorkspaces = user?.workspaces || [];
    return [mainBusiness, ...otherWorkspaces];
  }, [user]);

  const handleLogout = async (e) => {
    e.preventDefault();
    if (logout) await logout();
    window.location.href = '/login';
  };

  const navCategories = [
    {
      title: 'MAIN',
      items: [
        { name: 'Website Home', path: '/home', icon: <Home size={18} /> },
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
        { name: 'Inbox (Chats)', path: '/chats', icon: <MessageSquare size={18} />, badge: unreadCount },
        { name: 'Contacts', path: '/contacts', icon: <Users size={18} /> },
        { name: 'Catalog', path: '/catalog', icon: <ShoppingBag size={18} /> },
        { name: 'CRM', path: '/crm', icon: <Briefcase size={18} /> },
        { name: 'Campaigns', path: '/campaigns', icon: <Megaphone size={18} /> },
        { name: 'Templates', path: '/templates', icon: <FileText size={18} /> }
      ]
    },
    {
      title: 'AUTOMATION',
      items: [
        { name: 'Flow Builder', path: '/flow-builder', icon: <Bot size={18} /> },
        { name: 'Automations', path: '/automations', icon: <Repeat size={18} /> },
        { name: 'Instagram', path: '/instagram-automation', icon: <Instagram size={18} /> },
        { name: 'Auto-Marketer', path: '/auto-marketer', icon: <TrendingUp size={18} /> },
        { name: 'Publish Post', path: '/publish-post', icon: <FileText size={18} /> },
        { name: 'Publisher', path: '/publisher', icon: <Calendar size={18} /> }
      ]
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { name: 'AI Agent', path: '/ai-agent', icon: <Bot size={18} /> },
        { name: 'ScanIQ', path: '/scaniq', icon: <ScanEye size={18} /> }, // 🚀 NEW
        { name: 'Meta Ads', path: '/meta-ads', icon: <FaFacebookF size={18} /> }, // 🚀 NEW
        { name: 'Pixel Analytics', path: '/tracking-analytics', icon: <BarChart2 size={18} /> },
        { name: 'Order Dispatch', path: '/dispatch', icon: <Package size={18} /> },
        { name: 'Calls', path: '/calls', icon: <Phone size={18} /> },
        { name: 'Analytics', path: '/monthly-report', icon: <BarChart2 size={18} /> }
      ]
    },
    {
      title: 'TOOLS',
      items: [
        { name: 'Staff & Team', path: '/staff', icon: <UserCog size={18} /> },
        { name: 'Forms', path: '/forms', icon: <Clipboard size={18} /> },
        { name: 'Wallet', path: '/wallet', icon: <Wallet size={18} />, requireOwner: true },
        { name: 'Billing', path: '/billing', icon: <CreditCard size={18} />, requireOwner: true }, // 🚀 NEW
        { name: 'Settings', path: '/settings', icon: <Settings size={18} /> },
        { name: 'Change Password', path: '/change-password', icon: <Lock size={18} /> } // 🚀 NEW
      ]
    },
    // 🚀 NEW: Admin-only section
    {
      title: 'ADMIN',
      requireSuperAdmin: true,
      items: [
        { name: 'Template Manager', path: '/admin/templates', icon: <FileText size={18} /> },
        { name: 'Super Admin', path: '/super-admin', icon: <Shield size={18} /> }, // 🚀 NEW
        { name: 'WhatsApp Rules', path: '/whatsapp-rules', icon: <Code size={18} /> } // 🚀 NEW
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
            {category.requireSuperAdmin && user?.role !== 'superadmin' ? null : ( <>
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
                      isActive && !item.comingSoon && location.pathname.startsWith(item.path) // 🚀 FIX: Ensure active state is based on path prefix for nested routes
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
            </>)}
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
