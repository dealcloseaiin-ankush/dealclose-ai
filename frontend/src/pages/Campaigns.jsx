import React, { useState } from 'react';
import { useCampaignStore } from '../store/campaignStore';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

export default function Campaigns() {
  const { campaigns, addCampaign } = useCampaignStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const columns = [
    { header: 'Campaign Name', accessor: 'name' },
    { header: 'Target Audience', accessor: 'target' },
    { header: 'Platform', render: (row) => <span className="text-gray-300">{row.platform}</span> },
    { 
      header: 'Status', 
      render: (row) => (
        <Badge variant={row.status === 'Running' ? 'success' : row.status === 'Draft' ? 'neutral' : 'info'}>
          {row.status}
        </Badge>
      ) 
    }
  ];

  // Mock campaigns if store is empty
  const displayData = campaigns.length > 0 ? campaigns : [
    { name: 'Diwali Offer Blast', target: 'High Intent Electronics', platform: 'WhatsApp', status: 'Completed' },
    { name: 'Cart Recovery (Drip)', target: 'Window Shoppers', platform: 'WhatsApp', status: 'Running' }
  ];

  const handleCreate = (e) => {
    e.preventDefault();
    addCampaign({
      name: e.target.campaignName.value,
      target: 'All Contacts',
      platform: 'WhatsApp',
      status: 'Running'
    });
    setIsModalOpen(false);
    alert('Campaign Started Successfully!');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 bg-[#050505] text-gray-100 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Campaign Broadcasts</h1>
          <p className="text-gray-400">Send bulk WhatsApp templates or initiate bulk AI Voice Calls.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="gradient">+ New Campaign</Button>
      </div>

      <DataTable columns={columns} data={displayData} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Campaign">
        <form className="space-y-5" onSubmit={handleCreate}>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Campaign Name</label>
            <input type="text" name="campaignName" required className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none" placeholder="e.g., Summer Sale 2024" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Select Channel</label>
            <select className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white outline-none">
              <option>WhatsApp Message</option>
              <option>AI Voice Call</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Upload CSV Data</label>
            <input type="file" accept=".csv" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/10 file:text-purple-400" />
          </div>
          <Button type="submit" variant="gradient" className="w-full py-3">Launch Campaign 🚀</Button>
        </form>
      </Modal>
    </div>
  );
}