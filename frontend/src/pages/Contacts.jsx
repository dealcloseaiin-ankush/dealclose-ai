import React, { useState, useEffect } from 'react';
import DataTable from '../components/ui/DataTable';
import api from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../hooks/useAuth';
import { Search, Share2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Contacts() {
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [contacts, setContacts] = useState([]);
  const [smartSegments, setSmartSegments] = useState([]);
  
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await api.get('/users/profile').catch(() => null);
        const u = profileRes?.data?.user || profileRes?.data;
        if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);

        const [pipelineRes, segmentsRes] = await Promise.all([
          api.get('/crm/pipeline').catch(() => ({ data: { data: {} } })),
          api.get('/contacts/segments').catch(() => ({ data: [] }))
        ]);
        
        const allContacts = [];
        if (pipelineRes.data && pipelineRes.data.data) {
          Object.values(pipelineRes.data.data).forEach(arr => {
            if (Array.isArray(arr)) allContacts.push(...arr);
          });
        }
        setContacts(allContacts);
        setSmartSegments(Array.isArray(segmentsRes.data) ? segmentsRes.data : []);
      } catch (error) {
        console.error("Failed to load contacts", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredContacts = contacts.filter(c => {
    const ws = c.lastSelectedWorkspaceId || 'main';
    const matchesWs = activeWorkspace === 'main' ? (ws === 'main' || ws === 'default') : ws === activeWorkspace;
    const term = searchTerm.toLowerCase();
    const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString().toLowerCase() : '';
    const matchesSearch = searchTerm === '' || (c.name || '').toLowerCase().includes(term) || (c.phoneNumber || c.phone || '').includes(term) || (c.city || '').toLowerCase().includes(term) || dateStr.includes(term);
    const matchPlatform = platformFilter === 'all' || c.platform === platformFilter || (!c.platform && platformFilter === 'whatsapp');
    return matchesWs && matchesSearch && matchPlatform;
  });

  // 🚀 NEW: Bulk Export Functionality
  const handleBulkExport = () => {
    if (filteredContacts.length === 0) return toast.error("No contacts to export");
    const csvContent = "Name,Phone,City,Status,Source\n" + 
      filteredContacts.map(c => `"${c.name || 'Unknown'}","${c.phoneNumber || c.phone || ''}","${c.city || ''}","${c.status || ''}","${c.source || ''}"`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "DealClose_Contacts_Backup.csv");
    document.body.appendChild(link);
    link.click();
    toast.success("Contacts Exported Successfully! 🎉");
  };

  // Mobile/PC Native Share API for Enterprise Feel
  const handleNativeShare = async (row) => {
    const shareData = {
      title: 'Lead Details',
      text: `Name: ${row.name}\nPhone: ${row.phoneNumber || row.phone}\nCity: ${row.city || 'N/A'}\nStatus: ${row.status}`
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } 
      catch (err) { console.log('Share error', err); }
    } else {
      navigator.clipboard.writeText(shareData.text);
      toast.success('Details Copied!');
    }
  };

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'WhatsApp Number', render: (row) => row.phoneNumber || row.phone },
    { header: 'City', render: (row) => row.city || <span className="text-gray-600">-</span> },
    { header: 'Source', accessor: 'source' },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.status === 'interested' ? 'success' : row.status === 'new' ? 'info' : 'danger'}>
          {row.status}
        </Badge>
      ) 
    },
    { 
      header: 'Actions', 
      render: (row) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleNativeShare(row)} className="text-blue-400 hover:text-blue-300 px-3 py-1.5 bg-blue-500/10 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold" title="Share Lead">
            <Share2 size={14}/> Share
          </button>
        </div>
      ) 
    }
  ];

  if (loading) {
    return <div className="p-10 text-white flex justify-center mt-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 bg-[#050505] text-gray-100 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-white">Contacts & CRM</h1>
            <select 
              value={activeWorkspace} 
              onChange={(e) => setActiveWorkspace(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
            <select 
              value={platformFilter} 
              onChange={(e) => setPlatformFilter(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              <option value="all">🌐 All Platforms</option>
              <option value="whatsapp">🟩 WhatsApp</option>
              <option value="instagram">🟪 Instagram</option>
            </select>
          </div>
          <p className="text-gray-400">Manage your address book and AI smart segments.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input type="text" placeholder="Search contacts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#111] border border-gray-800 text-white text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-500 shadow-sm" />
          </div>
          <Button onClick={handleBulkExport} variant="secondary" className="whitespace-nowrap flex items-center gap-2">
            <Download size={16} /> Backup All
          </Button>
          <Button onClick={() => setIsModalOpen(true)} variant="primary" className="whitespace-nowrap">+ Add Contact</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-6 mb-8 border-b border-gray-800 pb-px">
        <button onClick={() => setActiveTab('all')} className={`pb-3 font-semibold transition-all ${activeTab === 'all' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
          All Contacts
        </button>
        <button onClick={() => setActiveTab('segments')} className={`pb-3 font-semibold transition-all ${activeTab === 'segments' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
          AI Smart Segments
        </button>
      </div>

      {activeTab === 'all' ? (
        <DataTable columns={columns} data={filteredContacts} onRowClick={(row) => console.log('Clicked', row)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {smartSegments.map(segment => (
            <div key={segment.id} className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-blue-500/50 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">{segment.name}</h3>
                <Badge variant="primary">{segment.count} Users</Badge>
              </div>
              <p className="text-sm text-gray-400 mb-6"><strong>AI Filter:</strong> {segment.reason}</p>
              <Button variant="gradient" className="w-full">Create Campaign 🚀</Button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Contact">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }}>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Full Name</label>
            <input type="text" required className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" placeholder="e.g., Rahul Sharma" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">WhatsApp Number</label>
            <input type="text" required className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" placeholder="+91..." />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tags (Optional)</label>
            <input type="text" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" placeholder="VIP, Wholesale, etc." />
          </div>
          <div className="pt-4 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="flex-1">Save Contact</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}