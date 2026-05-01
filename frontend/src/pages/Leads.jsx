import { useState, useEffect } from 'react';
import LeadCard from '../components/LeadCard';
import { getLeads } from '../services/leadService';
import { useAuth } from '../hooks/useAuth';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');

  useEffect(() => {
    getLeads()
      .then(setLeads)
      .catch(err => console.error("Failed to fetch leads", err))
      .finally(() => setLoading(false));
  }, []);

  const handleAddLeadSubmit = async (e) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone) return;
    
    try {
      const newLeadData = {
        name: newLeadName,
        phoneNumber: newLeadPhone,
        createdBy: user?._id || 'manual'
      };
      // Jab backend API ready hogi tab actual createLead hit karenge. 
      // Abhi frontend par turant dikhane ke liye mock ID de rahe hain
      const newLead = { _id: Date.now().toString(), ...newLeadData, status: 'new', source: 'Manual Entry' };
      setLeads([newLead, ...leads]);
      
      // Close modal & reset form
      setIsModalOpen(false);
      setNewLeadName('');
      setNewLeadPhone('');
    } catch (error) {
      console.error("Failed to create lead", error);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-[calc(100vh-4rem)] text-gray-100 font-sans">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Leads CRM</h1>
          <p className="text-gray-400">Manage all your potential customers here.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30">+ Add New Lead</button>
      </div>
      
      {/* Add Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl">✕</button>
            <h2 className="text-2xl font-bold text-white mb-6">Add New Lead</h2>
            <form onSubmit={handleAddLeadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Full Name</label>
                <input type="text" required value={newLeadName} onChange={e => setNewLeadName(e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" placeholder="e.g., Rahul Sharma" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">WhatsApp Number</label>
                <input type="text" required value={newLeadPhone} onChange={e => setNewLeadPhone(e.target.value)} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" placeholder="e.g., +919876543210" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">Save Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading && <p>Loading leads...</p>}
        {!loading && leads.map(lead => <LeadCard key={lead._id} lead={lead} />)}
        {!loading && leads.length === 0 && <p>No leads found. Click 'Add New Lead' to get started.</p>}
      </div>
    </div>
  );
}