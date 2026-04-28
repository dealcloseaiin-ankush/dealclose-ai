import { useState, useEffect } from 'react';
import LeadCard from '../components/LeadCard';
import Button from '../components/Button';
import { getLeads, createLead } from '../services/leadService';
import { useAuth } from '../hooks/useAuth';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    getLeads()
      .then(setLeads)
      .catch(err => console.error("Failed to fetch leads", err))
      .finally(() => setLoading(false));
  }, []);

  const handleAddLead = async () => {
    try {
      const newLeadData = {
        name: `Sample Lead ${leads.length + 1}`,
        phoneNumber: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
        createdBy: user._id 
      };
      const createdLead = await createLead(newLeadData);
      setLeads([createdLead, ...leads]);
    } catch (error) {
      console.error("Failed to create lead", error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Button onClick={handleAddLead}>Add New Lead</Button>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading && <p>Loading leads...</p>}
        {!loading && leads.map(lead => <LeadCard key={lead._id} lead={lead} />)}
        {!loading && leads.length === 0 && <p>No leads found. Click 'Add New Lead' to get started.</p>}
      </div>
    </div>
  );
}