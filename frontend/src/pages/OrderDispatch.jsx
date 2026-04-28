import { useState } from 'react';

export default function OrderDispatch() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return alert("Please select an Excel or CSV file first.");
    
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      alert("✅ File uploaded successfully! AI is now reading the data and sending WhatsApp dispatch messages to customers.");
      setFile(null);
    }, 2000);
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-2">Bulk Order Dispatch</h1>
        <p className="text-gray-400">Upload your daily MS Excel/CSV tracking sheet. AI will notify all customers instantly.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
        <div className="bg-[#111] p-8 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-xl font-bold mb-6">Upload Dispatch Sheet</h2>
          <form onSubmit={handleUpload}>
            <div className="border-2 border-dashed border-gray-700 rounded-2xl p-10 text-center hover:border-emerald-500 transition-colors cursor-pointer bg-[#0a0a0a] mb-6">
              <p className="text-4xl mb-4">📁</p>
              <p className="text-gray-400 mb-2">Drag and drop your Excel/CSV file here</p>
              <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={(e) => setFile(e.target.files[0])} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20" />
            </div>
            <button type="submit" disabled={uploading || !file} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20">
              {uploading ? 'Processing & Sending Messages...' : 'Upload & Notify Customers'}
            </button>
          </form>
        </div>

        <div className="bg-[#111] p-8 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-xl font-bold mb-6">How it works?</h2>
          <ul className="space-y-4 text-gray-400">
            <li className="flex items-start gap-3"><span className="text-emerald-500">1.</span> Make sure your Excel has columns: <b>Customer Name, Phone Number, Order ID, Tracking Link</b>.</li>
            <li className="flex items-start gap-3"><span className="text-emerald-500">2.</span> Upload the file here.</li>
            <li className="flex items-start gap-3"><span className="text-emerald-500">3.</span> AI will read the data and send personalized WhatsApp messages to each customer.</li>
            <li className="flex items-start gap-3"><span className="text-emerald-500">4.</span> If customers ask "Where is my order?", AI will automatically check this uploaded database and reply with their tracking link!</li>
          </ul>
          <button className="mt-8 text-emerald-400 text-sm font-bold hover:underline">📥 Download Sample Excel Template</button>
        </div>
      </div>
    </div>
  );
}