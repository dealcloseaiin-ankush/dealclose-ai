import React, { useState, useEffect } from 'react';
import KanbanBoard from '../components/crm/KanbanBoard';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Filter, Plus, FileDown, Printer, KanbanSquare, List, BarChart3 } from 'lucide-react';
import ContactDrawer from '../components/crm/ContactDrawer';
import CrmList from '../components/crm/CrmList';
import CrmAnalytics from '../components/crm/CrmAnalytics';
import { useAuth } from '../hooks/useAuth';

export default function CrmPage() {
  const [pipelineData, setPipelineData] = useState(null);
  const [flatContacts, setFlatContacts] = useState([]); // For list view
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('pipeline'); // pipeline, list, analytics
  const [selectedContact, setSelectedContact] = useState(null);
  const [leadFilter, setLeadFilter] = useState('me'); // 'me' or 'all'
  const [activeWorkspace, setActiveWorkspace] = useState('main'); // Workspace filter
  const [searchTerm, setSearchTerm] = useState(''); // Global Search
  
  const { user } = useAuth() || { user: { role: 'owner' } }; // Fallback
  const isOwner = user?.role === 'owner' || user?.role === 'superadmin';
  
  // Get workspaces list from user object
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);

  useEffect(() => {
    fetchPipeline();
    
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
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

  const handlePrint = () => {
    window.print();
  };

  // 🔥 Filter data based on selected Workspace
  const getFilteredPipeline = () => {
    if (!pipelineData) return null;
    const filtered = {};
    Object.keys(pipelineData).forEach(key => {
      filtered[key] = pipelineData[key].filter(lead => {
        const ws = lead.lastSelectedWorkspaceId || 'main';
        const matchWs = activeWorkspace === 'main' ? (ws === 'main' || ws === 'default') : ws === activeWorkspace;
        const term = searchTerm.toLowerCase();
        const dateStr = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString().toLowerCase() : '';
        const matchSearch = searchTerm === '' || (lead.name || '').toLowerCase().includes(term) || (lead.phoneNumber || lead.phone || '').includes(term) || (lead.city || '').toLowerCase().includes(term) || dateStr.includes(term);
        return matchWs && matchSearch;
      });
    });
    return filtered;
  };
  const filteredFlatContacts = flatContacts.filter(lead => {
    const ws = lead.lastSelectedWorkspaceId || 'main';
    const matchWs = activeWorkspace === 'main' ? (ws === 'main' || ws === 'default') : ws === activeWorkspace;
    const term = searchTerm.toLowerCase();
    const dateStr = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString().toLowerCase() : '';
    const matchSearch = searchTerm === '' || (lead.name || '').toLowerCase().includes(term) || (lead.phoneNumber || lead.phone || '').includes(term) || (lead.city || '').toLowerCase().includes(term) || dateStr.includes(term);
    return matchWs && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-sky-500"></div>
      </div>
    );
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
          <button className="bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-md flex items-center gap-2 text-white shadow-lg transition-colors">
            <Plus size={16} /> 
            <span className="text-sm font-medium">Add Lead</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'pipeline' && <KanbanBoard initialData={getFilteredPipeline()} onContactClick={(contact) => setSelectedContact(contact)} />}
      {viewMode === 'list' && <CrmList contacts={filteredFlatContacts} onContactClick={(contact) => setSelectedContact(contact)} />}
      {viewMode === 'analytics' && <CrmAnalytics contacts={filteredFlatContacts} />}

      {/* Right Side Drawer */}
      <ContactDrawer 
        isOpen={!!selectedContact} 
        contact={selectedContact} 
        onClose={() => setSelectedContact(null)} 
      />
    </div>
  );
}