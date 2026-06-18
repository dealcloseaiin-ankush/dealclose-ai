import React, { useState, useEffect } from 'react';
import KanbanBoard from '../components/crm/KanbanBoard';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Plus, FileDown, Printer, KanbanSquare, List, BarChart3, Share2, AlertTriangle, CloudLightning, Wand2, UserCheck, Combine, FileSignature, PhoneCall } from 'lucide-react';
import ContactDrawer from '../components/crm/ContactDrawer';
import CrmList from '../components/crm/CrmList';
import CrmAnalytics from '../components/crm/CrmAnalytics';
import { useAuth } from '../hooks/useAuth';
import InfluencerCRM from './InfluencerCRM';

export default function CrmPage() {
  const [pipelineData, setPipelineData] = useState(null);
  const [flatContacts, setFlatContacts] = useState([]); // For list view
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('pipeline'); // pipeline, list, analytics
  const [selectedContact, setSelectedContact] = useState(null);
  const [leadFilter, setLeadFilter] = useState('me'); // 'me' or 'all'
  const [activeWorkspace, setActiveWorkspace] = useState('main'); // Workspace filter
  const [searchTerm, setSearchTerm] = useState(''); // Global Search
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all', 'whatsapp', 'instagram'
  const [statusFilter, setStatusFilter] = useState('all'); // Smart CRM Status filter
  const [showAITools, setShowAITools] = useState(false); // Enterprise Tools Dropdown
  
  const [isGoogleSynced, setIsGoogleSynced] = useState(false);
  const { user } = useAuth() || { user: { role: 'owner' } }; // Fallback
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  
  // Get workspaces list from user object
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);

  useEffect(() => {
    fetchPipeline();
    
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) {
         setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
         setIsGoogleSynced(!!(u.googleSheetsConfig && u.googleSheetsConfig.accessToken));
      }
    }).catch(console.error);
  }, []);

  const fetchPipeline = async () => {
    try {
      const res = await api.get('/crm/pipeline');
      setPipelineData(res.data.data);
      // Flatten data for list view
      const allContacts = [];
      Object.values(res.data.data).forEach(arr => allContacts.push(...arr));
      setFlatContacts(allContacts);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  };

  // Function to Export Data to Excel (CSV)
  const handleExportCSV = async () => {
    try {
      const response = await api.get('/leads/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'crm_leads_export.csv');
      document.body.appendChild(link);
      link.click();
      toast.success("Excel/CSV Downloaded Successfully!");
    } catch (error) {
      console.error("Export Error:", error);
      toast.error("Failed to export leads.");
    }
  };

  // Function to Share Backup directly to WhatsApp
  const handleShareWhatsApp = async () => {
    // 🚀 SMART UPGRADE: No manual typing. Auto-detect from settings!
    if (!user?.ownerPhone) {
      toast.error("⚠️ Please add your 'Owner Phone' in Settings to receive backups automatically!");
      return;
    }
    
    const toastId = toast.loading('Sending backup to your WhatsApp...');
    try {
      const res = await api.post('/leads/share-whatsapp', {});
      if (res.data.success) {
        toast.success('✅ Backup successfully sent to your WhatsApp!', { id: toastId });
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('❌ Failed to share: ' + (err.response?.data?.message || err.message));
    }
  };

  // 🚀 NEW: Permanent Delete Functionality for Single Lead
  const handleDeleteContact = async (contactId) => {
    if (!window.confirm("🚨 Are you sure you want to permanently delete this lead? This action cannot be undone.")) return;
    
    // 🚀 Optimistic UI Update: Hide instantly to prevent double-clicks and make UI blazing fast
    setFlatContacts(prev => prev.filter(c => c._id !== contactId && c.id !== contactId));
    setPipelineData(prev => {
      if (!prev) return prev;
      const newData = { ...prev };
      Object.keys(newData).forEach(key => {
        newData[key] = newData[key].filter(c => c._id !== contactId && c.id !== contactId);
      });
      return newData;
    });

    try {
      const res = await api.delete(`/crm/contacts/${contactId}`);
      if (res.data.success) {
        toast.success("✅ Lead deleted permanently.");
        fetchPipeline(); // Refresh the board/list automatically
        if (selectedContact && selectedContact.id === contactId) setSelectedContact(null);
      }
    } catch (err) {
      // If 404, it means it's already deleted (double click). Don't show red error.
      if (err.response?.status === 404) {
        fetchPipeline(); // Just sync silently
      } else {
        toast.error("❌ Failed to delete lead: " + (err.response?.data?.message || err.message));
        fetchPipeline(); // Revert UI if there's a real server error
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // 🔥 Filter data based on selected Workspace
  const filteredPipeline = React.useMemo(() => {
    if (!pipelineData) return null;
    const filtered = {};
    Object.keys(pipelineData).forEach(key => {
      filtered[key] = pipelineData[key].filter(lead => {
        const ws = lead.lastSelectedWorkspaceId || 'main';
        const matchWs = activeWorkspace === 'main' ? (ws === 'main' || ws === 'default') : ws === activeWorkspace;
        
        let matchLeadFilter = true;
        if (isOwner && leadFilter === 'me' && user?._id) {
          matchLeadFilter = !lead.createdBy || lead.createdBy === user._id || lead.userId === user._id;
        }

        const term = searchTerm.toLowerCase();
        const dateStr = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString().toLowerCase() : '';
        const matchSearch = searchTerm === '' || (lead.name || '').toLowerCase().includes(term) || (lead.phoneNumber || lead.phone || '').includes(term) || (lead.city || '').toLowerCase().includes(term) || dateStr.includes(term);
        const matchPlatform = platformFilter === 'all' || lead.platform === platformFilter;
        const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
        return matchWs && matchSearch && matchLeadFilter && matchPlatform && matchStatus;
      });
    });
    return filtered;
  }, [pipelineData, activeWorkspace, leadFilter, searchTerm, isOwner, user, platformFilter, statusFilter]);

  // 🚀 PERFORMANCE FIX: Memoized the flat contacts array to prevent lagging when typing in Search with 10k+ leads
  const filteredFlatContacts = React.useMemo(() => {
    return flatContacts.filter(lead => {
    const ws = lead.lastSelectedWorkspaceId || 'main';
    const matchWs = activeWorkspace === 'main' ? (ws === 'main' || ws === 'default') : ws === activeWorkspace;
    
    let matchLeadFilter = true;
    if (isOwner && leadFilter === 'me' && user?._id) {
      matchLeadFilter = !lead.createdBy || lead.createdBy === user._id || lead.userId === user._id;
    }

    const term = searchTerm.toLowerCase();
    const dateStr = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString().toLowerCase() : '';
    const matchSearch = searchTerm === '' || (lead.name || '').toLowerCase().includes(term) || (lead.phoneNumber || lead.phone || '').includes(term) || (lead.city || '').toLowerCase().includes(term) || dateStr.includes(term);
    const matchPlatform = platformFilter === 'all' || lead.platform === platformFilter;
    const matchStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchWs && matchSearch && matchLeadFilter && matchPlatform && matchStatus;
  });
  }, [flatContacts, activeWorkspace, leadFilter, searchTerm, isOwner, user, platformFilter, statusFilter]);

  // Logic for the Expiry Warning Banner
  const expiringLeadsCount = flatContacts.filter(l => {
     if (!l.expiresAt) return false;
     const diffDays = (new Date(l.expiresAt) - new Date()) / (1000 * 60 * 60 * 24);
     return diffDays > 0 && diffDays <= 3;
  }).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-sky-500"></div>
      </div>
    );
  }

  // 🚀 SMART ROUTING: Agar user ek Influencer/Creator hai (Settings se ON kiya hai)
  if (user?.acceptCollabs) {
    return <InfluencerCRM />;
  }

  return (
    <div className="p-6 bg-gray-950 min-h-screen text-gray-100">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-2xl font-bold text-white">CRM Pipeline</h1>
            
            {/* Workspace / Business Dropdown */}
            <select 
              value={activeWorkspace} 
              onChange={(e) => setActiveWorkspace(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-sky-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>

            {/* 🚀 NEW: Platform Dropdown Filter */}
            <select 
              value={platformFilter} 
              onChange={(e) => setPlatformFilter(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-sky-500 cursor-pointer shadow-sm"
            >
              <option value="all">🌐 All Platforms</option>
              <option value="whatsapp">🟩 WhatsApp</option>
              <option value="instagram">🟪 Instagram</option>
            </select>

            {/* 🚀 NEW: Smart Status Dropdown Filter */}
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-amber-500 cursor-pointer shadow-sm"
            >
              <option value="all">📊 All Stages</option>
              <option value="hot">🔥 Hot Leads</option>
              <option value="warm">🌟 Warm Leads</option>
              <option value="cold">❄️ Cold Leads</option>
              <option value="existing">💼 Existing</option>
              <option value="vip">👑 VIP</option>
            </select>

            {/* Team vs My Leads Filter (Only for Owners/Managers) */}
            {isOwner && (
              <div className="flex bg-[#111] p-1 rounded-lg border border-gray-800 text-xs font-bold">
                <button onClick={() => setLeadFilter('me')} className={`px-3 py-1 rounded transition-colors ${leadFilter === 'me' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-white'}`}>
                  My Leads
                </button>
                <button onClick={() => setLeadFilter('all')} className={`px-3 py-1 rounded transition-colors ${leadFilter === 'all' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-white'}`}>
                  All Team Leads
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar for CRM */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input type="text" placeholder="Search by name, city, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#111] border border-gray-800 text-white text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:border-sky-500 shadow-sm" />
            </div>
            
            {/* View Toggles */}
            <div className="flex bg-[#111] p-1 rounded-lg border border-gray-800 w-fit">
              <button onClick={() => setViewMode('pipeline')} className={`px-4 py-1.5 rounded-md font-semibold text-sm transition-all flex items-center gap-2 ${viewMode === 'pipeline' ? 'bg-sky-500/20 text-sky-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                <KanbanSquare size={16}/> Kanban
              </button>
              <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-md font-semibold text-sm transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-sky-500/20 text-sky-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                <List size={16}/> List
              </button>
              <button onClick={() => setViewMode('analytics')} className={`px-4 py-1.5 rounded-md font-semibold text-sm transition-all flex items-center gap-2 ${viewMode === 'analytics' ? 'bg-sky-500/20 text-sky-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}>
                <BarChart3 size={16}/> Analytics
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
          <button onClick={handlePrint} className="bg-gray-800 hover:bg-gray-700 p-2 rounded-md border border-gray-700 transition-colors" title="Print Leads">
            <Printer size={18} className="text-gray-400" />
          </button>
          <button onClick={handleExportCSV} className="bg-gray-800 hover:bg-gray-700 p-2 rounded-md border border-gray-700 transition-colors" title="Download Excel">
            <FileDown size={18} className="text-green-400" />
          </button>
          <button onClick={handleShareWhatsApp} className="bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600 hover:text-white px-3 py-2 rounded-md flex items-center gap-2 shadow-lg transition-colors" title="Share via WhatsApp">
            <Share2 size={16} /> <span className="hidden sm:inline text-sm font-medium">Backup</span>
          </button>
          {isGoogleSynced && (
            <div className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-md flex items-center gap-2 shadow-lg" title="Live Auto-Syncing to Google Sheets">
              <CloudLightning size={16} /> <span className="hidden sm:inline text-sm font-medium">Cloud Synced</span>
            </div>
          )}
          <button className="bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-md flex items-center gap-2 text-white shadow-lg transition-colors">
            <Plus size={16} /> 
            <span className="text-sm font-medium">Add Lead</span>
          </button>

          {/* 🚀 NEW: Enterprise AI Tools Dropdown */}
          <div className="relative">
            <button onClick={() => setShowAITools(!showAITools)} className="bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white px-4 py-2 rounded-md flex items-center gap-2 shadow-lg transition-colors" title="Enterprise AI Tools">
              <Wand2 size={16} /> <span className="hidden sm:inline text-sm font-bold">AI Tools</span>
            </button>
            {showAITools && (
              <div className="absolute right-0 mt-2 w-64 bg-[#111] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden text-sm animate-fade-in">
                <div className="p-3 border-b border-gray-800 bg-[#1a1a1a]">
                  <h4 className="font-bold text-gray-300 text-[10px] uppercase tracking-wider">Enterprise Features</h4>
                </div>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors text-gray-200">
                  <UserCheck size={16} className="text-sky-400"/> <span>Assign Leads to Staff</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors text-gray-200">
                  <Combine size={16} className="text-emerald-400"/> <span>Smart Merge (WA + IG)</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors text-gray-200">
                  <FileSignature size={16} className="text-orange-400"/> <span>Create Quotation / PDF</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors text-gray-200">
                  <PhoneCall size={16} className="text-pink-400"/> <span>View AI Call Transcripts</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Expiring Leads Banner */}
      {expiringLeadsCount > 0 && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg"><AlertTriangle size={20} /></div>
            <div>
              <h3 className="text-rose-400 font-bold">Data Expiry Warning</h3>
              <p className="text-gray-400 text-sm">You have <b>{expiringLeadsCount} Leads</b> expiring in less than 3 days. Please upgrade to a Premium Plan for 30-day retention or export them now.</p>
            </div>
          </div>
          <button onClick={handleShareWhatsApp} className="whitespace-nowrap px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-lg transition-colors">
            Share Backup to WA
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'pipeline' && <KanbanBoard key={`${activeWorkspace}-${searchTerm}`} pipelineData={filteredPipeline} initialData={filteredPipeline} onContactClick={(contact) => setSelectedContact(contact)} onStageChange={fetchPipeline} />}
      {viewMode === 'list' && <CrmList contacts={filteredFlatContacts} onContactClick={(contact) => setSelectedContact(contact)} onDeleteContact={handleDeleteContact} />}
      {viewMode === 'analytics' && <CrmAnalytics contacts={filteredFlatContacts} />}

      {/* Right Side Drawer */}
      {selectedContact && (
        <ContactDrawer 
          isOpen={!!selectedContact} 
          contact={selectedContact} 
          onClose={() => setSelectedContact(null)} 
        />
      )}
    </div>
  );
}