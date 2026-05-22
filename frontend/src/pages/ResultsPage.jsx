import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Share2, Copy, CheckCircle } from 'lucide-react';

export default function ResultsPage() {
  const { scanId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data } = await api.get(`/scaniq/${scanId}`);
        if (data.success && data.analysis) {
          setResult(data.analysis);
        }
      } catch (err) {
        console.error("Error fetching results", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [scanId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.captionRewrite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080C10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-green-500"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-[#080C10] text-white flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Result not found or still processing.</h2>
        <Link to="/" className="text-green-400 hover:underline">← Go Back Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C10] text-gray-200 font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10 border-b border-gray-800 pb-6">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors">
            <ArrowLeft size={20} /> Back to Scanner
          </Link>
          <button className="flex items-center gap-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 px-4 py-2 rounded-lg font-bold transition-colors">
            <Share2 size={18} /> Share Report
          </button>
        </div>

        {/* Viral Score & Summary */}
        <div className="bg-[#0D1117] border border-gray-800 rounded-3xl p-8 mb-8 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-500/10 blur-3xl rounded-full"></div>
          <h2 className="text-gray-400 font-bold tracking-widest uppercase mb-6 relative z-10">AI Viral Potential</h2>
          <div className="w-40 h-40 mx-auto rounded-full border-8 border-green-500 flex flex-col items-center justify-center mb-6 relative z-10 shadow-[0_0_30px_rgba(0,255,133,0.3)]">
            <span className="text-6xl font-black text-white">{result.viralScore}</span>
            <span className="text-sm font-bold text-green-400 mt-1">{result.viralLabel}</span>
          </div>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto relative z-10">{result.overallSummary}</p>
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-[#0D1117] border border-gray-800 rounded-3xl p-8 shadow-lg">
            <h3 className="text-green-400 font-bold text-xl mb-4">✅ Core Strengths</h3>
            <ul className="space-y-3">{result.strengths?.map((item, i) => <li key={i} className="text-gray-300 leading-relaxed">{item}</li>)}</ul>
          </div>
          <div className="bg-[#0D1117] border border-gray-800 rounded-3xl p-8 shadow-lg">
            <h3 className="text-rose-400 font-bold text-xl mb-4">❌ Key Weaknesses</h3>
            <ul className="space-y-3">{result.weaknesses?.map((item, i) => <li key={i} className="text-gray-300 leading-relaxed">{item}</li>)}</ul>
          </div>
        </div>

        {/* AI Caption Rewrite */}
        <div className="bg-gradient-to-br from-[#0D1117] to-[#161B22] border border-green-500/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">✍️ AI Optimized Caption</h3>
            <button onClick={handleCopy} className="text-green-400 hover:text-green-300 flex items-center gap-2 text-sm font-bold">{copied ? <><CheckCircle size={16}/> Copied</> : <><Copy size={16}/> Copy Text</>}</button>
          </div>
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed bg-[#050505] p-6 rounded-xl border border-gray-800">{result.captionRewrite}</p>
        </div>
      </div>
    </div>
  );
}