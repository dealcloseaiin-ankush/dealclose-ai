import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

export default function Contacts() {
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock Data
  const [contacts] = useState([
    { id: 1, name: 'Rahul Sharma', phone: '+919876543210', source: 'Instagram DM', status: 'interested', lastActive: '2 mins ago' },
    { id: 2, name: 'Priya Verma', phone: '+918888888888', source: 'Website Form', status: 'new', lastActive: '1 hr ago' },
    { id: 3, name: 'Amit Singh', phone: '+917777777777', source: 'Direct WhatsApp', status: 'lost', lastActive: '2 days ago' }
  ]);

  const [smartSegments] = useState([
    { id: 1, name: 'High Intent Electronics', count: 24, reason: 'Asked for prices but did not buy' },
    { id: 2, name: 'Window Shoppers', count: 89, reason: 'Just browsed the catalog' }
  ]);

  const columns = [
    { header: 'Name', accessor: 'name' },
    { header: 'WhatsApp Number', accessor: 'phone' },
    { header: 'Source', accessor: 'source' },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.status === 'interested' ? 'success' : row.status === 'new' ? 'info' : 'danger'}>
          {row.status}
        </Badge>
      ) 
    },
    { header: 'Last Active', accessor: 'lastActive' }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 bg-[#050505] text-gray-100 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Contacts & CRM</h1>
          <p className="text-gray-400">Manage your address book and AI smart segments.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary">+ Add Contact</Button>
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
        <DataTable columns={columns} data={contacts} onRowClick={(row) => console.log('Clicked', row)} />
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