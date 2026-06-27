import { useAuth } from '../hooks/useAuth';
import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [dbWorkspaces, setDbWorkspaces] = useState([]);

  // 1. Database se fresh profile data pull karenge branches ka naam sahi readout karne ke liye
  useEffect(() => {
    api.get('/users/profile')
      .then(({ data }) => {
        const savedData = data.user || data.data || data;
        if (savedData && savedData.workspaces) {
          setDbWorkspaces(savedData.workspaces);
        }
      })
      .catch(err => console.error("➡️ [Navbar Debug] Profile fetch failed:", err));
  }, []);

  // 2. 🚀 DYNAMIC FIRM NAME LOGIC: Jo branch settings dropdown me select hogi, wahi Welcome me dikhegi
  const activeFirmName = useMemo(() => {
    // Current URL check karo ki hum sub-branch section me hain ya nahi
    const urlParams = new URLSearchParams(location.search);
    const wsParam = urlParams.get('ws'); // Settings dropdown active index fetch karta hai

    if (wsParam !== null && wsParam !== undefined) {
      const idx = parseInt(wsParam, 10);
      if (dbWorkspaces[idx]?.name) {
        return dbWorkspaces[idx].name; // E.g., NewPropertyHub.in dikhayega
      }
      if (user?.workspaces?.[idx]?.name) {
        return user.workspaces[idx].name;
      }
    }

    // Fallback: Agar active workspace branch query nahi hai toh primary active company name
    return user?.businessName && user.businessName !== 'Main Business' 
      ? user.businessName 
      : 'DealClose AI';
  }, [location.search, dbWorkspaces, user]);

  return (
    // 🚀 FIXED: bg-white completely clean karke bg-[#050505] kiya taaki Chrome ki bich wali white patti permanent gayab ho jaye
    <nav className="p-4 bg-[#050505] border-b border-gray-800 flex justify-between items-center z-10 select-none">
      <div>
        {/* Left padding wrapper - layouts balance grid ke liye */}
      </div>
      
      {/* 🚀 DYNAMIC WELCOME FEATURE: Ab ye sirf static 'User' nahi, balki select kiye gaye Active Firm/Branch ko target karega */}
      <div className="font-semibold text-gray-300 text-sm md:text-base flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
        Welcome, <span className="text-white font-bold">{activeFirmName}</span>
      </div>
    </nav>
  );
}