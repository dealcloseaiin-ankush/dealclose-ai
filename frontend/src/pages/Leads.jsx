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
    const name = window.prompt("Enter Customer/Lead Name:");
    if (!name) return;
    
    const phone = window.prompt("Enter WhatsApp Number (e.g. +91...):");
    if (!phone) return;

    try {
      const newLeadData = {
        name: name,
        phoneNumber: phone,
        createdBy: user?._id || 'manual'
      };
      // Jab backend API ready hogi tab actual createLead hit karenge. 
      // Abhi frontend par turant dikhane ke liye mock ID de rahe hain
      const newLead = { _id: Date.now().toString(), ...newLeadData, status: 'new', source: 'Manual Entry' };
      setLeads([newLead, ...leads]);
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