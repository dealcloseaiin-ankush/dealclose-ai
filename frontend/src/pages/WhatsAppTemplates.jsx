import { useState, useEffect } from 'react';
import api from '../services/api'; // Assuming api service is set up

export default function WhatsAppTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', category: 'MARKETING', language: 'en_US', body: '' });
  const [creating, setCreating] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/whatsapp/templates');
      // Fallback mock data if API is empty
      setTemplates(data.length > 0 ? data : [
        { id: '1', name: 'abandoned_cart_10', language: 'en_US', status: 'APPROVED', category: 'MARKETING' },
        { id: '2', name: 'welcome_greeting', language: 'en_US', status: 'PENDING', category: 'UTILITY' }
      ]);
    } catch (error) {
      console.error("Failed to fetch templates", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Yeh Meta ke API endpoint ko hit karega backend ke through
      await api.post('/whatsapp/templates', newTemplate);
      setShowModal(false);
      fetchTemplates();
      alert("Template submitted for Meta approval!");
    } catch (error) {
      console.error("Creation failed", error);
      alert("Failed to create template. Check console.");
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'APPROVED') return 'bg-green-500/10 text-green-400 border border-green-500/20';
    if (status === 'REJECTED') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'; // PENDING
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#050505] text-gray-100 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
              WhatsApp Meta Templates
            </span>
          </h1>
          <p className="text-gray-400 text-lg">Manage and submit message templates for Meta's approval.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-green-500/30 transition-all"
        >
          + Create Template
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#1a1a1a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
              <th className="p-5 font-semibold">Template Name</th>
              <th className="p-5 font-semibold">Category</th>
              <th className="p-5 font-semibold">Language</th>
              <th className="p-5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan="4" className="text-center p-8 text-gray-500">Loading templates...</td></tr>
            ) : (
              templates.map(tpl => (
                <tr key={tpl.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="p-5 font-medium text-gray-200">{tpl.name}</td>
                  <td className="p-5 text-gray-400">{tpl.category || 'MARKETING'}</td>
                  <td className="p-5 text-gray-400">{tpl.language}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide ${getStatusBadge(tpl.status)}`}>
                      {tpl.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
            <h2 className="text-2xl font-bold text-white mb-6">New Template</h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Template Name (lowercase_with_underscores)</label>
                <input type="text" required value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value.toLowerCase().replace(/ /g, '_')})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="e.g., abandoned_cart_rescue" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Message Body</label>
                <textarea required rows="4" value={newTemplate.body} onChange={e => setNewTemplate({...newTemplate, body: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Hi {{1}}, you left items in your cart..."></textarea>
                <p className="text-xs text-gray-500 mt-1">Use {"{{1}}"}, {"{{2}}"} for variables like Name, Link, etc.</p>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold disabled:opacity-50">
                  {creating ? 'Submitting...' : 'Submit to Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}