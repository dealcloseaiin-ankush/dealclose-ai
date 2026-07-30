import React, { useState, useEffect } from 'react'; // 🚀 FIX: Import useEffect
import { Outlet } from 'react-router-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // 🚀 FIX: Import hooks
import { useAuth } from '../hooks/useAuth';
import { Menu, X } from 'lucide-react';
import Sidebar from '../components/Sidebar'; // 🚀 NEW: Import the actual Sidebar component
import Navbar from '../components/Navbar'; // 🚀 FIX: Import Navbar

export default function MainLayout() { // 🚀 NEW: MainLayout now uses the imported Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen bg-[#050505] text-white">
      {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black/80 backdrop-blur-sm md:hidden" onClick={toggleSidebar} />}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0a0a0a] border-r border-gray-800 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:hidden`}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center justify-between p-4 bg-[#0a0a0a] border-b border-gray-800">
          <Link to="/dashboard" className="text-xl font-bold flex items-center gap-2">
            <span className="text-blue-500">⚡</span> DealClose AI
          </Link>
          <button onClick={toggleSidebar} className="text-gray-300 hover:text-white p-2">
            {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
        <Navbar toggleSidebar={toggleSidebar} /> {/* 🚀 NEW: Pass toggleSidebar to Navbar */}
        <main className="flex-1 overflow-y-auto relative p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}