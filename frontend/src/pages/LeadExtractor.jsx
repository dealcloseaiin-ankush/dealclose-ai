import React, { useState } from 'react';
import { Search, MapPin, Phone, Star, Globe, Download, Database, Building2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx'; // Need to run: npm install xlsx

export default function LeadExtractor() {
  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/scraper/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      });
      
      const data = await res.json();
      if (data.success) {
        setLeads(data.data);
        if (data.data.length === 0) alert("No businesses with phone numbers found for this query.");
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

  // Function to Export Data to Excel
  const exportToExcel = () => {
    if (leads.length === 0) return;
    
    const worksheet = XLSX.utils.json_to_sheet(leads.map(lead => ({
      "Business Name": lead.name,
      "Phone Number": lead.phone,
      "Category": lead.type,
      "Rating": lead.rating ? `${lead.rating} (${lead.reviews} reviews)` : 'N/A',
      "Address": lead.address,
      "Website": lead.website
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "B2B Leads");
    
    // Generate file and download
    XLSX.writeFile(workbook, `Leads_${query.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  // Mock function to Import to CRM
  const importToCRM = () => {
    setIsImporting(true);
    setTimeout(() => {
      alert(`Success! ${leads.length} leads have been added to your CRM. The AI Calling Agent can now pitch to them.`);
      setIsImporting(false);
    }, 2000);
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-[calc(100vh-4rem)] text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2 flex items-center gap-3">
          <Database className="text-blue-400" /> B2B Lead Extractor
        </h1>
        <p className="text-gray-400">Extract high-quality business leads directly from Google Maps and import them to your CRM for AI Voice Calling.</p>
      </div>

      {/* Search Engine UI */}
      <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <form onSubmit={handleSearch} className="relative z-10 max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Building2 className="h-5 w-5 text-gray-500" />
              </div>
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-[#0a0a0a] border border-gray-700 rounded-xl text-white focus:border-emerald-500 outline-none shadow-inner text-lg"
                placeholder="e.g. Hardware shops in Pune, Plumbers in Delhi..."
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="md:w-48 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isLoading ? <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></span> : <><Search size={20}/> Extract Leads</>}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center flex items-center justify-center gap-1">
            <AlertCircle size={12}/> 1 Search fetches up to 20 highly relevant businesses to save your API credits.
          </p>
        </form>
      </div>

      {/* Results Table */}
      {leads.length > 0 && (
        <div className="bg-[#111] border border-gray-800 rounded-2xl shadow-xl overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Extracted Leads</h2>
              <p className="text-sm text-gray-400">Found {leads.length} verified businesses with phone numbers.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={exportToExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors border border-gray-700">
                <Download size={16}/> Export Excel
              </button>
              <button onClick={importToCRM} disabled={isImporting} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50">
                <Database size={16}/> {isImporting ? 'Importing...' : 'Send to AI CRM'}
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
                      <div className="flex items-center gap-1.5 text-blue-400 font-semibold bg-blue-500/10 w-fit px-2 py-1 rounded">
                        <Phone size={14}/> {lead.phone}
                      </div>
                    </td>
                    <td className="p-4">
                      {lead.rating ? (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star size={14} className="fill-yellow-500"/> {lead.rating} <span className="text-xs text-gray-500">({lead.reviews})</span>
                        </div>
                      ) : <span className="text-gray-600">-</span>}
                    </td>
                    <td className="p-4 max-w-xs">
                      <div className="flex items-start gap-1.5 text-gray-400">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-gray-500"/>
                        <span className="truncate" title={lead.address}>{lead.address}</span>
                      </div>
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 mt-1 hover:underline ml-5">
                          <Globe size={12}/> Website
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