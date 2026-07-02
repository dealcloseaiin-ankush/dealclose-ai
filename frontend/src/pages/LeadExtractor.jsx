import React, { useState } from 'react';
import { Search, MapPin, Phone, Star, Globe, Download, Database, Building2, AlertCircle, Share2, CheckCircle2, XCircle, Copy } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function LeadExtractor() {
  const [city, setCity] = useState('');
  const [industry, setIndustry] = useState('');
  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState(null); // { totalFound, withPhoneCount, query }
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city || !industry) return;

    setIsLoading(true);
    setLeads([]);
    setMeta(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/scraper/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ city, industry, maxResults: 60 })
      });

      const data = await res.json();
      if (data.success) {
        setLeads(data.data);
        setMeta({ totalFound: data.totalFound, withPhoneCount: data.withPhoneCount, query: data.query });
        if (data.data.length === 0) alert("No businesses found for this city/industry combination.");
      } else {
        alert(data.message || "Failed to extract leads.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong connecting to the scraper API.");
    } finally {
      setIsLoading(false);
    }
  };

  const withoutPhoneCount = meta ? meta.totalFound - meta.withPhoneCount : 0;

  // Export to Excel
  const exportToExcel = () => {
    if (leads.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(leads.map(lead => ({
      "Business Name": lead.name,
      "Phone Number": lead.phone || "Not available",
      "Category": lead.type,
      "Rating": lead.rating ? `${lead.rating} (${lead.reviews} reviews)` : 'N/A',
      "Address": lead.address,
      "Website": lead.website
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "B2B Leads");
    XLSX.writeFile(workbook, `Leads_${industry}_${city}`.replace(/[^a-zA-Z0-9_]/g, '_') + '.xlsx');
  };

  // Build a readable summary text for sharing
  const buildShareText = () => {
    const header = `📊 B2B Lead Report: ${industry} in ${city}\n` +
      `Total found: ${meta?.totalFound || 0} | With phone: ${meta?.withPhoneCount || 0} | Without phone: ${withoutPhoneCount}\n\n`;
    const rows = leads.slice(0, 15).map((l, i) =>
      `${i + 1}. ${l.name}${l.phone ? ` — 📞 ${l.phone}` : ' — (no number listed)'}`
    ).join('\n');
    const footer = leads.length > 15 ? `\n\n...and ${leads.length - 15} more. Full list in the attached Excel export.` : '';
    return header + rows + footer;
  };

  // Share to WhatsApp (opens WhatsApp with pre-filled summary text)
  const shareToWhatsApp = () => {
    if (leads.length === 0) return;
    const text = encodeURIComponent(buildShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Copy summary to clipboard (quick "save" option without downloading a file)
  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    } catch {
      alert("Couldn't copy — your browser may be blocking clipboard access.");
    }
  };

  // Real CRM import (replaces the old mock setTimeout)
  const importToCRM = async () => {
    if (leads.length === 0) return;
    setIsImporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/leads/bulk-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leads, source: `LeadExtractor: ${industry} in ${city}` })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success! ${data.importedCount || leads.length} leads added to your CRM. You can now message or call them from there.`);
      } else {
        alert(data.message || "Failed to import leads to CRM.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong importing to CRM.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-[calc(100vh-4rem)] text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2 flex items-center gap-3">
          <Database className="text-blue-400" /> B2B Lead Extractor
        </h1>
        <p className="text-gray-400">Pull every business in a city and industry from Google Maps, and push them straight into your CRM for AI Voice Calling.</p>
      </div>

      {/* Search Engine UI */}
      <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <form onSubmit={handleSearch} className="relative z-10 max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-[#0a0a0a] border border-gray-700 rounded-xl text-white focus:border-emerald-500 outline-none shadow-inner text-lg"
                placeholder="City (e.g. Sarangarh)"
                required
              />
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-[#0a0a0a] border border-gray-700 rounded-xl text-white focus:border-emerald-500 outline-none shadow-inner text-lg"
                placeholder="Industry (e.g. Hardware shops)"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="md:w-48 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isLoading ? <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></span> : <><Search size={20} /> Extract Leads</>}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center flex items-center justify-center gap-1">
            <AlertCircle size={12} /> Fetches every listed business for this city + industry, up to 100 per search.
          </p>
        </form>
      </div>

      {/* AI Summary Stats */}
      {meta && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Building2 size={22} /></div>
            <div>
              <div className="text-2xl font-extrabold text-white">{meta.totalFound}</div>
              <div className="text-xs text-gray-500">Total {industry} found in {city}</div>
            </div>
          </div>
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><CheckCircle2 size={22} /></div>
            <div>
              <div className="text-2xl font-extrabold text-white">{meta.withPhoneCount}</div>
              <div className="text-xs text-gray-500">With full details (phone number)</div>
            </div>
          </div>
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center"><XCircle size={22} /></div>
            <div>
              <div className="text-2xl font-extrabold text-white">{withoutPhoneCount}</div>
              <div className="text-xs text-gray-500">Listed, but no phone number available</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {leads.length > 0 && (
        <div className="bg-[#111] border border-gray-800 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Extracted Leads</h2>
              <p className="text-sm text-gray-400">{leads.length} businesses found for "{industry} in {city}".</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button onClick={exportToExcel} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors border border-gray-700">
                <Download size={16} /> Excel
              </button>
              <button onClick={copySummary} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors border border-gray-700">
                <Copy size={16} /> {copyStatus ? 'Copied!' : 'Copy Summary'}
              </button>
              <button onClick={shareToWhatsApp} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-green-600/20">
                <Share2 size={16} /> Share on WhatsApp
              </button>
              <button onClick={importToCRM} disabled={isImporting} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50">
                <Database size={16} /> {isImporting ? 'Importing...' : 'Send to AI CRM'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0a0a0a] text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
                  <th className="p-4 font-bold">Business Name</th>
                  <th className="p-4 font-bold">Phone Number</th>
                  <th className="p-4 font-bold">Rating</th>
                  <th className="p-4 font-bold">Address</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-300">
                {leads.map((lead, index) => (
                  <tr key={index} className="border-b border-gray-800/50 hover:bg-[#1a1a1a] transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{lead.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{lead.type}</div>
                    </td>
                    <td className="p-4">
                      {lead.phone ? (
                        <div className="flex items-center gap-1.5 text-blue-400 font-semibold bg-blue-500/10 w-fit px-2 py-1 rounded">
                          <Phone size={14} /> {lead.phone}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-gray-500 bg-gray-800/50 w-fit px-2 py-1 rounded text-xs">
                          <XCircle size={12} /> Not listed
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {lead.rating ? (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star size={14} className="fill-yellow-500" /> {lead.rating} <span className="text-xs text-gray-500">({lead.reviews})</span>
                        </div>
                      ) : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="flex items-start gap-1.5 text-gray-400">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-gray-500" />
                        <span className="truncate" title={lead.address}>{lead.address}</span>
                      </div>
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 mt-1 hover:underline ml-5">
                          <Globe size={12} /> Website
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}