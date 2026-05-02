import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Assuming you have this hook
import { useInboxStore } from '../store/inboxStore';

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth() || { user: { role: 'owner', fullName: 'Admin User' } }; // Fallback for MVP
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  const { unreadCount } = useInboxStore();
  
  const navCategories = [
    {
      title: 'MAIN',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: '📊' },
        { name: 'Inbox (Chats)', path: '/chats', icon: '💬', badge: unreadCount },
        { name: 'Contacts', path: '/contacts', icon: '👥' },
        { name: 'Campaigns', path: '/campaigns', icon: '📢' },
        { name: 'Templates', path: '/templates', icon: '📄', requireOwner: true }
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
        { name: 'AI Agent', path: '/ai-agent', icon: '🧠', requireOwner: true },
        { name: 'Order Dispatch', path: '/dispatch', icon: '📦' },
        { name: 'Calls', path: '/calls', icon: '📞' },
        { name: 'Analytics', path: '/monthly-report', icon: '📈' }
      ]
    },
    {
      title: 'TOOLS',
      items: [
        { name: 'Forms', path: '/forms', icon: '📋' },
        { name: 'Wallet', path: '/wallet', icon: '💰', requireOwner: true },
        { name: 'Settings', path: '/settings', icon: '⚙️', requireOwner: true }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-gray-800 h-screen flex flex-col text-gray-300 font-sans">
      <div className="h-20 flex items-center px-6 border-b border-gray-800">
        <Link to="/dashboard" className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-purple-500">⚡</span> DealClose AI
        </Link>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6">
        {navCategories.map((category, idx) => (
          <div key={idx} className="mb-6">
            <p className="px-8 mb-2 text-xs font-extrabold text-gray-500 tracking-wider">{category.title}</p>
            <ul className="space-y-1 px-4">
              {category.items.map((item) => {
                if (item.requireOwner && !isOwner) return null;
                
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive 
                          ? 'bg-gradient-to-r from-purple-500/10 to-transparent text-purple-400 font-bold border border-purple-500/20' 
                          : 'text-gray-400 hover:bg-gray-900 hover:text-gray-100 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg opacity-80">{item.icon}</span>
                        {item.name}
                      </div>
                      {item.badge > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
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