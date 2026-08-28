import React, { useState } from 'react';
import { Search, Flame, Target, AlertTriangle, CheckCircle, BarChart3, ExternalLink, Image as ImageIcon } from 'lucide-react';
import api from '../services/api';

export default function ScanIQ() {
  const [keyword, setKeyword] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedAds, setScannedAds] = useState([]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!keyword) return;
    
    setIsScanning(true);
    
    try {
      const { data } = await api.post('/scaniq/search', { query: keyword });
      
      if (data.success && data.analysis) {
        setScannedAds([{
          id: Date.now(),
          brandName: "AI Market Analysis",
          platform: "Live Google & Meta Scan",
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80", // Generic dashboard image
          adCopy: data.analysis.overallSummary || "Scan complete.",
          viralScore: data.analysis.viralScore || 85,
          strengths: data.analysis.strengths || [],
          weaknesses: data.analysis.weaknesses || [],
          aiTip: data.analysis.actionableTips ? data.analysis.actionableTips.join(" ") : "Optimize based on findings."
        }]);
      } else {
        alert(data.message || "Failed to fetch and analyze ads.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong connecting to the backend API.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-[calc(100vh-4rem)] text-gray-100 font-sans relative">

      {/* Header */}
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-block p-3 bg-red-500/10 text-red-500 rounded-full mb-4">
          <Flame size={32} />
        </div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 mb-4">
          ScanIQ: Competitor Ad Analyzer
        </h1>
        <p className="text-gray-400 text-lg">
          Spy on your competitors. Fetch the top performing ads from Meta & Google, analyze their strengths, and let AI tell you exactly how to beat them.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden mb-12 max-w-4xl mx-auto">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <form onSubmit={handleScan} className="relative z-10 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-500" />
            </div>
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-[#0a0a0a] border border-gray-700 rounded-xl text-white focus:border-orange-500 outline-none shadow-inner text-lg"
              placeholder="e.g. Top 5 sports shoe ads in India..."
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isScanning}
            className="md:w-56 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isScanning ? <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></span> : <><Target size={20}/> Extract & Analyze</>}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {scannedAds.length > 0 && (
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="text-orange-400"/> Top 5 Performing Ads Found
          </h2>
          
          <div className="space-y-8">
            {scannedAds.map((ad) => (
              <div key={ad.id} className="bg-[#111] border border-gray-800 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-xl hover:border-gray-700 transition-colors">
                
                {/* Ad Image Section */}
                <div className="md:w-1/3 relative bg-[#0a0a0a] flex items-center justify-center min-h-[250px]">
                  <img src={ad.image} alt={ad.brandName} className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" />
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-700">
                    {ad.brandName}
                  </div>
                  <div className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded border border-blue-500">
                    {ad.platform}
                  </div>
                </div>

                {/* AI Analysis Section */}
                <div className="md:w-2/3 p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Primary Ad Copy</h3>
                      <p className="text-gray-200 text-lg leading-relaxed font-medium">"{ad.adCopy}"</p>
                    </div>
                    <div className="text-center shrink-0 bg-[#0a0a0a] p-3 rounded-xl border border-gray-800">
                      <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-emerald-600">{ad.viralScore}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold mt-1">Viral Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-gray-800 flex-1">
                    <div>
                      <h4 className="flex items-center gap-1.5 text-sm font-bold text-green-400 mb-3"><CheckCircle size={16}/> What Works (Strengths)</h4>
                      <ul className="space-y-2">
                        {ad.strengths.map((str, i) => <li key={i} className="text-sm text-gray-300 flex items-start gap-2"><span className="text-green-500 mt-1">•</span> {str}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="flex items-center gap-1.5 text-sm font-bold text-red-400 mb-3"><AlertTriangle size={16}/> Weaknesses</h4>
                      <ul className="space-y-2">
                        {ad.weaknesses.map((wk, i) => <li key={i} className="text-sm text-gray-300 flex items-start gap-2"><span className="text-red-500 mt-1">•</span> {wk}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
                    <Flame className="text-orange-400 shrink-0 mt-0.5" size={20}/>
                    <div>
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">AI Tip to Beat Them</span>
                      <p className="text-sm text-orange-200 mt-1">{ad.aiTip}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}