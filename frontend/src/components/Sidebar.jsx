import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Assuming you have this hook

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth() || { user: { role: 'owner', fullName: 'Admin User' } }; // Fallback for MVP
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  
  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: '📊' },
    { name: 'AI Insights', path: '/insights', icon: '💡' },
    { name: 'AI Setup', path: '/setup', icon: '🤖', requireOwner: true },
    { name: 'AI Training', path: '/training', icon: '🧠', requireOwner: true },
    { name: 'Live Chats', path: '/chats', icon: '💬' },
    { name: 'Leads CRM', path: '/leads', icon: '👥' },
    { name: 'Catalog & Listings', path: '/catalog', icon: '🛍️' },
    { name: 'Smart Groups', path: '/smart-groups', icon: '🎯' },
    { name: 'Campaigns (Bulk)', path: '/campaigns', icon: '📢' },
    { name: 'Omnichannel', path: '/automations', icon: '⚡' },
    { name: 'Monthly Report', path: '/monthly-report', icon: '📅' },
    { name: 'Meta Templates', path: '/templates', icon: '📝', requireOwner: true },
    { name: 'Forms', path: '/forms', icon: '📋' },
    { name: 'Voice Calls', path: '/calls', icon: '📞' },
    { name: 'Wallet & Billing', path: '/wallet', icon: '💳', requireOwner: true },
    { name: 'Staff Management', path: '/staff', icon: '👨‍💼', requireOwner: true },
    { name: 'Integrations', path: '/settings', icon: '⚙️', requireOwner: true },
    { name: 'Super Admin', path: '/admin', icon: '👑', requireOwner: true },
  ];

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-gray-800 h-screen flex flex-col text-gray-300 font-sans">
      <div className="h-20 flex items-center px-6 border-b border-gray-800">
        <Link to="/dashboard" className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-purple-500">⚡</span> CloseDeal AI
        </Link>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-1.5 px-4">
          {navItems.map((item) => {
            // If item requires owner role and user is not owner, skip rendering
            if (item.requireOwner && !isOwner) return null;
            
            const isActive = location.pathname === item.path;
            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-500/10 to-transparent text-purple-400 font-bold border border-purple-500/20' 
                      : 'hover:bg-gray-900 hover:text-white font-medium'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#111] border border-gray-800">
          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/30">
            SA
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white leading-tight">{user?.fullName || 'User'}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role || 'owner'}</p>
            <Link to="/login" className="text-xs text-gray-500 hover:text-rose-400 transition-colors">Logout</Link>
          </div>
        </div>
      </div>
    </aside>
  );
}