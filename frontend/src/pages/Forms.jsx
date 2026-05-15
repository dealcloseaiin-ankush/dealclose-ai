import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Share2, Copy } from 'lucide-react';
import api from '../services/api'; // Use main api service

export default function Forms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch forms or mock the default Digital Card Form
    api.get('/forms')
      .then(res => {
        if (res.data && res.data.length > 0) {
          setForms(res.data);
        } else {
          // Default form if none exist in DB yet
          setForms([
            { _id: 'digital-card-form', title: 'Digital Business Card Capture', submissions: 12, status: 'Active', type: 'QR Code' },
            { _id: 'website-contact', title: 'Website Contact Form', submissions: 45, status: 'Active', type: 'Website Embedding' }
          ]);
        }
      })
      .catch(err => console.error("Failed to fetch forms", err))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = (id) => {
    const link = `${window.location.origin}/card/${id}`;
    navigator.clipboard.writeText(link);
    alert("Form Link Copied!");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 bg-[#050505] text-gray-100 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Lead Capture Forms</h1>
          <p className="text-gray-400">Manage your Digital Card and Website embedding forms.</p>
        </div>
        <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all">
          + Create New Form
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && <div className="text-gray-500">Loading forms...</div>}
        {!loading && forms.map(form => (
          <div key={form._id} className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-xl relative group hover:border-blue-500/50 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                {form.status}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-1">{form.title}</h3>
            <p className="text-sm text-gray-500 mb-6">{form.type}</p>
            
            <div className="flex items-center gap-2 mb-6">
              <Users size={16} className="text-gray-400" />
              <span className="text-sm text-gray-300 font-semibold">{form.submissions || 0} Submissions</span>
            </div>

            <div className="flex gap-3 border-t border-gray-800 pt-4">
              <button onClick={() => copyLink(form._id)} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#1a1a1a] hover:bg-gray-800 text-gray-300 rounded-lg text-sm font-semibold transition-colors">
                <Copy size={16} /> Copy Link
              </button>
              <Link to="/crm" className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-semibold transition-colors">
                View Leads
              </Link>
            </div>
          </div>
        ))}
        {!loading && forms.length === 0 && <div className="text-gray-500 col-span-full">No forms created yet.</div>}
      </div>
    </div>
  );
}