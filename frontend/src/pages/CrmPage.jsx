import React, { useState, useEffect } from 'react';
import KanbanBoard from '../components/crm/KanbanBoard';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, Filter, Plus, FileDown, KanbanSquare, List, BarChart3 } from 'lucide-react';
import ContactDrawer from '../components/crm/ContactDrawer';
import CrmList from '../components/crm/CrmList';
import CrmAnalytics from '../components/crm/CrmAnalytics';

export default function CrmPage() {
  const [pipelineData, setPipelineData] = useState(null);
  const [flatContacts, setFlatContacts] = useState([]); // For list view
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('pipeline'); // pipeline, list, analytics
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    fetchPipeline();
  }, []);

  const fetchPipeline = async () => {
    try {
      const res = await api.get('/api/crm/pipeline');
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
          <h1 className="text-2xl font-bold text-white mb-2">CRM Pipeline</h1>
          
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
        
        <div className="flex gap-3 items-center">
          <button className="bg-gray-800 hover:bg-gray-700 p-2 rounded-md border border-gray-700 transition-colors" title="Export CSV">
            <FileDown size={18} className="text-gray-400" />
          </button>
          <button className="bg-sky-500 hover:bg-sky-600 px-4 py-2 rounded-md flex items-center gap-2 text-white shadow-lg transition-colors">
            <Plus size={16} /> 
            <span className="text-sm font-medium">Add Lead</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'pipeline' && <KanbanBoard initialData={pipelineData} onContactClick={(contact) => setSelectedContact(contact)} />}
      {viewMode === 'list' && <CrmList contacts={flatContacts} onContactClick={(contact) => setSelectedContact(contact)} />}
      {viewMode === 'analytics' && <CrmAnalytics contacts={flatContacts} />}

      {/* Right Side Drawer */}
      <ContactDrawer 
        isOpen={!!selectedContact} 
        contact={selectedContact} 
        onClose={() => setSelectedContact(null)} 
      />
    </div>
  );
}