import React, { useState, useEffect } from 'react'; // 🚀 FIX: Import useEffect
import { Outlet } from 'react-router-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // 🚀 FIX: Import hooks
import { useAuth } from '../hooks/useAuth'; // 🚀 FIX: Import useAuth
import useWorkspaceStore from '../store/workspaceStore';
// 🚀 FIX: The 'Instagram' icon is not exported from the main entry point in this version of lucide-react.
// It must be imported directly from its own file to resolve the build error.
import { Home, MessageSquare, Phone, Settings, LogOut, Bot, BarChart2, Users, FileText, Wallet, Zap, Menu, X, LayoutDashboard, Briefcase, PlusCircle } from 'lucide-react';
import { Instagram } from 'lucide-react';
import Navbar from '../components/Navbar'; // 🚀 FIX: Import Navbar

const Sidebar = ({ isSidebarOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore(); // 🚀 NEW: Use global state
  const navigate = useNavigate();
  const location = useLocation();
  const [hasUnread, setHasUnread] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleWorkspaceChange = (e) => {
    setActiveWorkspaceId(e.target.value);
  };

  useEffect(() => {
    const handleUnreadUpdate = (event) => setHasUnread(event.detail.hasUnread);
    window.addEventListener('update_unread_badge', handleUnreadUpdate);
    return () => window.removeEventListener('update_unread_badge', handleUnreadUpdate);
  }, []);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Publisher', icon: Instagram, path: '/publisher' },
    { name: 'Auto-Marketer', icon: Zap, path: '/auto-marketer' },
    { name: 'Inbox', icon: MessageSquare, path: '/chats', badge: hasUnread },
    { name: 'CRM', icon: Users, path: '/crm' },
    { name: 'AI Calling', icon: Phone, path: '/calls' },
    { name: 'Flow Builder', icon: Bot, path: '/flow-builder' },
    { name: 'Analytics', icon: BarChart2, path: '/monthly-report' },
    { name: 'Wallet', icon: Wallet, path: '/wallet' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0a0a0a] border-r border-gray-800 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <Link to="/dashboard" className="text-xl font-bold flex items-center gap-2">
          <span className="text-blue-500">⚡</span> DealClose AI
        </Link>
        <button onClick={toggleSidebar} className="md:hidden text-gray-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div className="p-4">
        <select value={activeWorkspaceId} onChange={handleWorkspaceChange} className="w-full bg-[#1a1a1a] border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-purple-500 cursor-pointer">
          <option value="main">🏢 {user?.businessName || 'Main Business'}</option>
          {user?.workspaces?.map(ws => (
            <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
          ))}
        </select>
        <Link to="/settings?tab=workspaces" className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 justify-center">
          <PlusCircle size={14} /> Add New Business
        </Link>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <Link key={item.name} to={item.path} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${location.pathname.startsWith(item.path) ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'}`}>
            <item.icon size={18} />
            <span>{item.name}</span>
            {item.badge && <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <img src={user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${user?.fullName || 'User'}&background=random`} alt="User" className="w-10 h-10 rounded-full" />
          <div>
            <p className="text-sm font-semibold text-white">{user?.fullName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-[#050505] text-white">
      {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black/80 backdrop-blur-sm md:hidden" onClick={toggleSidebar} />}
      <Sidebar isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center justify-between p-4 bg-[#0a0a0a] border-b border-gray-800">
          <Link to="/dashboard" className="text-xl font-bold flex items-center gap-2">
            <span className="text-blue-500">⚡</span> DealClose AI
          </Link>
          <button onClick={toggleSidebar} className="text-gray-300 hover:text-white p-2">
            <Menu size={28} />
          </button>
        </div>
        <Navbar />
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}