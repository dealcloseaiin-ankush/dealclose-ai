import { useState } from 'react';

export default function CampaignManager() {
  const [campaignType, setCampaignType] = useState('whatsapp'); // whatsapp or call
  const [uploadMethod, setUploadMethod] = useState('excel'); // excel or paper
  const [processing, setProcessing] = useState(false);

  const handleStartCampaign = (e) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      alert(`✅ ${campaignType === 'whatsapp' ? 'WhatsApp' : 'AI Voice Call'} Campaign started successfully! AI is processing the list.`);
    }, 2500);
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-2">Campaign Manager (Bulk Broadcasts)</h1>
        <p className="text-gray-400">Upload your customer list to send bulk WhatsApp templates or trigger simultaneous AI Voice Calls.</p>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-xl max-w-4xl">
        <form onSubmit={handleStartCampaign} className="space-y-8">
          
          <div>
            <h3 className="text-lg font-bold text-white mb-4">1. Select Campaign Type</h3>
            <div className="flex gap-4">
              <button type="button" onClick={() => setCampaignType('whatsapp')} className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${campaignType === 'whatsapp' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>💬 Bulk WhatsApp Messages</button>
              <button type="button" onClick={() => setCampaignType('call')} className={`flex-1 py-4 rounded-xl font-bold border-2 transition-all ${campaignType === 'call' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}>📞 Bulk AI Voice Calls</button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-4">2. Choose Upload Method</h3>
            <div className="flex gap-4 mb-4">
              <button type="button" onClick={() => setUploadMethod('excel')} className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${uploadMethod === 'excel' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>MS Excel / CSV</button>
              <button type="button" onClick={() => setUploadMethod('paper')} className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${uploadMethod === 'paper' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Scan Paper List (AI Vision)</button>
            </div>
            
            <div className="border-2 border-dashed border-gray-700 rounded-2xl p-10 text-center bg-[#0a0a0a]">
              <p className="text-4xl mb-4">{uploadMethod === 'excel' ? '📊' : '📸'}</p>
              <p className="text-gray-400 mb-4">{uploadMethod === 'excel' ? 'Upload your MS Excel or CSV file here.' : 'Upload a photo of your handwritten or printed phone number list. AI will read it!'}</p>
              <input type="file" accept={uploadMethod === 'excel' ? ".csv, .xlsx" : "image/*"} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700" required />
            </div>
          </div>

          {campaignType === 'whatsapp' && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4">3. Select WhatsApp Template</h3>
              <select required className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 text-white outline-none focus:border-green-500">
                <option value="">Choose an approved template...</option>
                <option value="festive_offer">Festive Discount Offer</option>
                <option value="follow_up">Cold Lead Follow-up</option>
              </select>
            </div>
          )}

          <button type="submit" disabled={processing} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 text-lg">
            {processing ? '🚀 Processing Data & Launching...' : '🚀 Start Campaign Now'}
          </button>
        </form>
      </div>
    </div>
  );
}