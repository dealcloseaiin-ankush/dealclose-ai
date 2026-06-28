import { useAuth } from '../hooks/useAuth';
import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [dbWorkspaces, setDbWorkspaces] = useState([]);
  const [localWorkspaceName, setLocalWorkspaceName] = useState('');

  // 1. Data pull aur localStorage sync tracker loop
  useEffect(() => {
    // Fresh profile load karein
    api.get('/users/profile')
      .then(({ data }) => {
        const savedData = data.user || data.data || data;
        if (savedData && savedData.workspaces) {
          setDbWorkspaces(savedData.workspaces);
        }
      })
      .catch(err => console.error("➡️ [Navbar Debug] Profile fetch failed:", err));

    // Ek interval lagayein jo check karega ki user ne settings ya dashboard me firm to nahi badli
    const interval = setInterval(() => {
      const activeName = localStorage.getItem('active_workspace_name');
      if (activeName) {
        setLocalWorkspaceName(activeName);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // 2. 🚀 LIVE RESOLVER: URL query params ya local storage dono se dynamic readout map karein
  const activeFirmName = useMemo(() => {
    const urlParams = new URLSearchParams(location.search);
    const wsParam = urlParams.get('ws'); 

    // Category A: Agar URL me ?ws= parameters maujood hain (Settings page)
    if (wsParam !== null && wsParam !== undefined) {
      const idx = parseInt(wsParam, 10);
      if (dbWorkspaces[idx]?.name) {
        localStorage.setItem('active_workspace_name', dbWorkspaces[idx].name); // Backup click track node
        return dbWorkspaces[idx].name; 
      }
      if (user?.workspaces?.[idx]?.name) {
        localStorage.setItem('active_workspace_name', user.workspaces[idx].name);
        return user.workspaces[idx].name;
      }
    }

    // Category B: Agar hum kisi aur page par hain par storage me name save hai
    if (localWorkspaceName) {
      return localWorkspaceName;
    }

    // Category C: Default Core Fallback
    return user?.businessName && user.businessName !== 'Main Business' 
      ? user.businessName 
      : 'DealClose AI';
  }, [location.search, dbWorkspaces, user, localWorkspaceName]);

  return (
    <nav className="p-4 bg-[#050505] border-b border-gray-800 flex justify-between items-center z-10 select-none">
      <div>
        {/* Left balance block layout framework space */}
      </div>
      
      {/* 🚀 FIXED LOGIC COMPILER TAG: Ab ye dynamic firm name ko strictly force ke sath screen par bind rakhega */}
      <div className="font-semibold text-gray-300 text-sm md:text-base flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
        Welcome, <span className="text-white font-bold">{activeFirmName}</span>
      </div>
    </nav>
  );
}