import { useState, useEffect } from 'react';
import api from '../services/api'; // Assuming api service is set up

export default function WhatsAppTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'MARKETING', language: 'en_US', headerType: 'NONE', headerText: '', headerMediaUrl: '', body: '', footerText: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/whatsapp/templates');
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch templates", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSubmitToMeta = async () => {
    if(!form.name || !form.body) return alert("Template name and body are required!");
    
    setSubmitting(true);
    try {
      // Build Meta Components Array
      const components = [];
      if(form.headerType === 'TEXT' && form.headerText) {
        components.push({ type: "HEADER", format: "TEXT", text: form.headerText });
      } else if (form.headerType === 'IMAGE') {
        // For images, Meta usually requires an example handle or URL for review
        components.push({ type: "HEADER", format: "IMAGE", example: { header_handle: [form.headerMediaUrl || "https://example.com/image.jpg"] } });
      }

      components.push({ type: "BODY", text: form.body });
      if(form.footerText) components.push({ type: "FOOTER", text: form.footerText });

      const payload = {
        templateData: { name: form.name, category: form.category, language: form.language, components }
      };

      await api.post('/whatsapp/templates', payload);
      
      setIsBuilding(false);
      fetchTemplates();
      alert("Template submitted for Meta approval!");
    } catch (error) {
      console.error("Submission failed", error);
      alert("Failed to create template. Check console.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (templateName) => {
    if (!window.confirm(`Are you sure you want to delete '${templateName}'?`)) return;
    try {
      await api.delete(`/whatsapp/templates/${templateName}`);
      fetchTemplates();
      alert("Template deleted successfully!");
    } catch (error) {
      alert("Failed to delete template. Make sure your backend supports DELETE /whatsapp/templates/:name");
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'APPROVED') return 'bg-green-500/10 text-green-400 border border-green-500/20';
    if (status === 'REJECTED') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'; // PENDING
  };

  // Mock preview formatter to highlight {{1}} variables
  const formatPreviewText = (text) => {
    if (!text) return "";
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, i) => 
      /\{\{\d+\}\}/.test(part) ? <span key={i} className="bg-green-100 text-green-800 px-1 rounded mx-1 font-mono text-xs">[Var]</span> : part
    );
  };

  if (isBuilding) {
    return (
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#050505] text-gray-100 font-sans flex flex-col lg:flex-row gap-8">
        {/* LEFT SIDE: BUILDER FORM */}
        <div className="flex-1 bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[85vh]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Template Builder</h2>
            <button onClick={() => setIsBuilding(false)} className="text-gray-400 hover:text-white">✕ Cancel</button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Template Name</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value.toLowerCase().replace(/ /g, '_')})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="e.g. spring_sale_offer" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Language</label>
                <select value={form.language} onChange={e => setForm({...form, language: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none">
                  <option value="en_US">English (US)</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Category</label>
              <div className="grid grid-cols-3 gap-3">
                {['MARKETING', 'UTILITY', 'AUTHENTICATION'].map(cat => (
                  <div key={cat} onClick={() => setForm({...form, category: cat})} className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${form.category === cat ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-gray-700 hover:border-gray-500 text-gray-400'}`}>
                    <div className="font-semibold text-sm">{cat}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {form.category === 'MARKETING' && "Promotions, offers, informative updates, or invitations."}
                {form.category === 'UTILITY' && "Order updates, account alerts, or post-purchase notifications."}
                {form.category === 'AUTHENTICATION' && "One-time passwords (OTP) or security codes."}
              </p>
            </div>

            {/* Header */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Header Type</label>
              <select value={form.headerType} onChange={e => setForm({...form, headerType: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none mb-3">
                <option value="NONE">None</option>
                <option value="TEXT">Text</option>
                <option value="IMAGE">Image / Media</option>
              </select>

              {form.headerType === 'TEXT' && (
                <input type="text" value={form.headerText} onChange={e => setForm({...form, headerText: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Bold short title (e.g. MEGA SALE!)" maxLength={60}/>
              )}
              {form.headerType === 'IMAGE' && (
                <input type="text" value={form.headerMediaUrl} onChange={e => setForm({...form, headerMediaUrl: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Paste Image URL for Preview & Meta Review..." />
              )}
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Message Body (Required)</label>
              <textarea rows="5" value={form.body} onChange={e => setForm({...form, body: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Hi {{1}}, your order #{{2}} is confirmed!"></textarea>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">Use {"{{1}}"}, {"{{2}}"} to add dynamic variables.</p>
                <button type="button" onClick={() => setForm({...form, body: form.body + ' {{1}} '})} className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-green-400">+ Add Variable</button>
              </div>
            </div>

            {/* Footer */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Footer (Optional)</label>
              <input type="text" value={form.footerText} onChange={e => setForm({...form, footerText: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none" placeholder="Short grey text at the bottom" maxLength={60}/>
            </div>

            <button onClick={handleSubmitToMeta} disabled={submitting} className="w-full py-4 mt-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold shadow-lg shadow-green-500/30 transition-all disabled:opacity-50">
              {submitting ? 'Submitting to Meta...' : 'Submit Template for Approval'}
            </button>
          </div>
        </div>

        {/* RIGHT SIDE: LIVE PREVIEW */}
        <div className="lg:w-96 flex flex-col items-center">
          <h3 className="text-gray-400 mb-4 font-medium uppercase tracking-widest text-sm">Live Preview</h3>
          
          {/* WhatsApp Phone Mockup */}
          <div className="w-full max-w-[320px] h-[600px] bg-[#e5ddd5] rounded-[2.5rem] border-[8px] border-[#1a1a1a] shadow-2xl relative overflow-hidden flex flex-col">
            {/* WhatsApp Header */}
            <div className="bg-[#075e54] text-white p-4 pt-8 shadow-md flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-xs">AI</div>
              <div className="font-semibold">Your Business</div>
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-cover">
              
              {/* The Message Bubble */}
              <div className="bg-white text-gray-800 p-3 rounded-lg rounded-tl-none shadow-sm max-w-[90%] break-words">
                {form.headerType === 'IMAGE' && (
                  <img src={form.headerMediaUrl || "https://developers.facebook.com/docs/whatsapp/images/thumb.png"} alt="Header" className="w-full h-32 object-cover rounded-t-md mb-2 bg-gray-200" />
                )}
                {form.headerType === 'TEXT' && form.headerText && (
                  <div className="font-bold text-[15px] mb-1">{form.headerText}</div>
                )}
                
                <div className="text-[14.2px] whitespace-pre-wrap leading-snug">
                  {form.body ? formatPreviewText(form.body) : <span className="text-gray-400 italic">Start typing your message...</span>}
                </div>
                
                {form.footerText && (
                  <div className="text-[11px] text-gray-500 mt-2 uppercase tracking-wide">{form.footerText}</div>
                )}
                <div className="text-[10px] text-gray-400 text-right mt-1">12:00 PM</div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

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
          onClick={() => setIsBuilding(true)}
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
              <th className="p-5 font-semibold text-right">Actions</th>
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
                <td className="p-5 text-right">
                  <button onClick={() => handleDelete(tpl.name)} className="text-red-400 hover:text-red-300 text-sm font-bold bg-red-500/10 px-3 py-1 rounded transition-colors">
                    Delete
                  </button>
                </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}