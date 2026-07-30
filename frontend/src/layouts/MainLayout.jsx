import React, { useState, useEffect } from 'react'; // 🚀 FIX: Import useEffect
import { Outlet } from 'react-router-dom';
import { Link, useNavigate } from 'react-router-dom'; // 🚀 FIX: Import hooks
import { useAuth } from '../hooks/useAuth'; // 🚀 FIX: Import useAuth
import Sidebar from '../components/Sidebar'; // 🚀 NEW: Import the actual Sidebar component
import Navbar from '../components/Navbar'; // 🚀 FIX: Import Navbar

const MainLayoutSidebar = ({ isSidebarOpen, toggleSidebar }) => { // Renamed to avoid conflict
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleUnreadUpdate = (event) => setHasUnread(event.detail.hasUnread);
    window.addEventListener('update_unread_badge', handleUnreadUpdate);
    return () => window.removeEventListener('update_unread_badge', handleUnreadUpdate);
  }, []);

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

      {/* 🚀 NEW: Render the actual Sidebar component */}
      <Sidebar isCollapsed={!isSidebarOpen} /> {/* Pass isCollapsed based on isSidebarOpen */}

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

export default function MainLayout() { // 🚀 NEW: MainLayout now uses the imported Sidebar
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
        <Navbar toggleSidebar={toggleSidebar} /> {/* 🚀 NEW: Pass toggleSidebar to Navbar */}
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}