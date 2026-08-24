import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Users, Share2, Copy, Eye, Download, X, Calendar, User, Phone, Mail } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Forms() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  
  // Submission Viewer Modal State
  const [selectedFormForSubmissions, setSelectedFormForSubmissions] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');

  const fetchForms = () => {
    setLoading(true);
    api.get('/forms', { params: { workspaceId: activeWorkspace } })
      .then(res => {
        if (res.data && res.data.length > 0) {
          setForms(res.data);
        } else {
          setForms([
            { _id: 'digital-card-form', title: 'Digital Business Card Capture', submissions: [], status: 'Active', type: 'QR Code' },
            { _id: 'website-contact', title: 'Website Contact Form', submissions: [], status: 'Active', type: 'Website Embedding' }
          ]);
        }
      })
      .catch(err => console.error("Failed to fetch forms", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
    }).catch(console.error);

    fetchForms();
  }, [activeWorkspace]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/forms', {
        title: newForm.title,
        description: newForm.description,
        fields: [{ label: 'Name', inputType: 'text', required: true }, { label: 'Phone', inputType: 'text', required: true }, { label: 'City', inputType: 'text', required: false }, { label: 'Requirement', inputType: 'textarea', required: false }],
        workspaceId: activeWorkspace
      });
      toast.success('New lead capture form created!');
      const currentForms = forms[0]?._id === 'digital-card-form' ? [] : forms;
      setForms([res.data, ...currentForms]);
      setShowModal(false);
      setNewForm({ title: '', description: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create form');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = (id) => {
    const link = `${window.location.origin}/card/${user?._id || id}`;
    navigator.clipboard.writeText(link);
    toast.success('Form & QR Link Copied to clipboard! 📋');
  };

  const handleOpenSubmissions = async (form) => {
    setSelectedFormForSubmissions(form);
    setLoadingSubmissions(true);
    try {
      if (form._id === 'digital-card-form' || form._id === 'website-contact') {
        // Fallback for default forms
        setSubmissionsList(Array.isArray(form.submissions) ? form.submissions : []);
      } else {
        const res = await api.get(`/forms/${form._id}/submissions`);
        setSubmissionsList(res.data?.submissions || []);
      }
    } catch (err) {
      console.error('Fetch submissions error:', err);
      toast.error('Failed to load submissions.');
      setSubmissionsList(Array.isArray(form.submissions) ? form.submissions : []);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleExportCSV = () => {
    if (!submissionsList || submissionsList.length === 0) {
      return toast.error('No submissions to export.');
    }

    // Extract all unique headers across all submissions
    const allKeys = new Set(['Submitted At']);
    submissionsList.forEach(sub => {
      if (sub.data) {
        Object.keys(sub.data).forEach(k => allKeys.add(k));
      }
    });

    const headers = Array.from(allKeys);
    const rows = submissionsList.map(sub => {
      return headers.map(header => {
        if (header === 'Submitted At') {
          return `"${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'N/A'}"`;
        }
        const val = sub.data?.[header] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedFormForSubmissions?.title || 'Form'}_Submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Submissions downloaded as CSV! 📊');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 bg-[#050505] text-gray-100 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-white">Lead Capture Forms</h1>
            <select 
              value={activeWorkspace} 
              onChange={(e) => setActiveWorkspace(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-400 text-sm">
            All submitted form leads automatically sync to CRM Kanban under &quot;New Lead&quot; with all custom questions &amp; notes.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all text-sm">
          + Create New Form
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && <div className="text-gray-500 col-span-full">Loading forms...</div>}
        {!loading && forms.map(form => {
          const subCount = Array.isArray(form.submissions) ? form.submissions.length : (form.submissions || 0);
          return (
            <div key={form._id} className="bg-[#111111] border border-gray-800 rounded-3xl p-6 shadow-xl relative group hover:border-blue-500/50 transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    {form.status || 'Active'}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-1">{form.title}</h3>
                <p className="text-xs text-gray-500 mb-4">{form.type || 'Custom Form'}</p>
                
                <div className="flex items-center gap-2 mb-6 bg-[#1a1a1a] px-3.5 py-2 rounded-xl w-fit">
                  <Users size={16} className="text-indigo-400" />
                  <span className="text-xs text-gray-300 font-bold">{subCount} Form Responses</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-gray-800/80 pt-4">
                <div className="flex gap-2">
                  <button onClick={() => copyLink(form._id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#1a1a1a] hover:bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold transition-colors">
                    <Copy size={14} /> Copy Link
                  </button>
                  <button onClick={() => handleOpenSubmissions(form)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl text-xs font-semibold transition-colors">
                    <Eye size={14} /> View All Data
                  </button>
                </div>
                <Link to="/crm" className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-xl text-xs font-semibold transition-colors">
                  Open in CRM Kanban ➡️
                </Link>
              </div>
            </div>
          );
        })}
        {!loading && forms.length === 0 && <div className="text-gray-500 col-span-full">No forms created yet.</div>}
      </div>

      {/* Create Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
            <h2 className="text-xl font-bold text-white mb-1">Create Lead Capture Form</h2>
            <p className="text-xs text-gray-400 mb-4">Captures Name, Phone, City, Requirements &amp; pushes directly to CRM.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Form Title</label>
                <input type="text" required value={newForm.title} onChange={e => setNewForm({...newForm, title: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none" placeholder="e.g. Instagram Bio Lead Form" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Description (Optional)</label>
                <textarea value={newForm.description} onChange={e => setNewForm({...newForm, description: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none" placeholder="What offer or services does this form promote?"></textarea>
              </div>
              <button type="submit" disabled={submitting} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm">
                {submitting ? 'Creating Form...' : 'Create Form & Generate Link'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Submissions Modal */}
      {selectedFormForSubmissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="text-blue-400" size={22} />
                  {selectedFormForSubmissions.title} &mdash; Submissions
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Full list of customer responses with all custom fields &amp; timestamps.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExportCSV} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <Download size={14} /> Export CSV
                </button>
                <button onClick={() => setSelectedFormForSubmissions(null)} className="p-1.5 text-gray-500 hover:text-white rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {loadingSubmissions ? (
                <div className="text-center text-gray-500 py-12">Loading full responses...</div>
              ) : submissionsList.length === 0 ? (
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-10 text-center text-gray-500">
                  No submissions recorded yet for this form. Share your form link to start capturing leads!
                </div>
              ) : (
                submissionsList.map((sub, idx) => (
                  <div key={idx} className="bg-[#161616] border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition-all">
                    <div className="flex justify-between items-center mb-3 border-b border-gray-800/80 pb-2.5">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-md">
                        # Submission {submissionsList.length - idx}
                      </span>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Recent'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {sub.data && Object.entries(sub.data).map(([field, value]) => (
                        <div key={field} className="bg-[#0f0f0f] border border-gray-800 p-2.5 rounded-xl">
                          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">{field}</p>
                          <p className="text-xs font-semibold text-gray-200 break-words">{String(value || 'N/A')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}