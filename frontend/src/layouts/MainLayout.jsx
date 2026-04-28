import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

export default function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#050505] text-white">
      
      {/* Mobile Overlay Background */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Mobile Header with Hamburger Icon */}
        <div className="md:hidden flex items-center justify-between p-4 bg-[#0a0a0a] border-b border-gray-800">
          <span className="text-xl font-bold flex items-center gap-2">
            <span className="text-blue-500">⚡</span> Scalio AI
          </span>
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-300 hover:text-white p-2">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
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