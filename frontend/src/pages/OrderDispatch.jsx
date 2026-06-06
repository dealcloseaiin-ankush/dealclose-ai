import { useState } from 'react';
import api from '../services/api'; // Import your API service
import toast from 'react-hot-toast'; // Assuming you use react-hot-toast for notifications
import { useAuth } from '../hooks/useAuth';

export default function OrderDispatch() {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const { user } = useAuth() || {};
  const workspaces = [{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])];
  const [activeWorkspace, setActiveWorkspace] = useState('main');

  // State for Single/Manual Dispatch
  const [manualForm, setManualForm] = useState({
    orderId: '',
    customerPhone: '',
    deliveryMethod: 'Courier',
    trackingLink: '',
    builtyNo: '',
    shippingNotes: ''
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Please select an Excel or CSV file first.");
    
    setUploading(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvText = event.target.result;
        // Basic CSV Parsing (Split by new line, then by comma)
        const rows = csvText.split('\n').filter(row => row.trim().length > 0);
        
        if (rows.length <= 1) {
          toast.error("File is empty or invalid format.");
          setUploading(false);
          return;
        }

        // Skipping the first row (Headers) and looping through the data
        let successCount = 0;
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',');
          if (cols.length >= 4) {
            // Expected Columns: CustomerName, Phone, OrderID, Status, TrackingLink
            const payload = {
              customerPhone: cols[1]?.trim(),
              orderId: cols[2]?.trim(),
              status: cols[3]?.trim() || 'Dispatched',
              trackingLink: cols[4]?.trim() || '',
              workspaceId: activeWorkspace
            };
            // API hit for each row to update DB and send WhatsApp
            await api.post('/dispatch/update', payload).catch(err => console.error("Dispatch Failed for", payload.orderId, err));
            successCount++;
          }
        }
        toast.success(`✅ ${successCount} Orders dispatched & messages sent successfully!`);
      } catch (error) {
        console.error("File processing error:", error);
        toast.error("Failed to process file.");
      }
      setUploading(false);
      setFile(null);
    };
    
    // Read the file as text (Perfect for CSVs)
    reader.readAsText(file);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualSubmitting(true);
    try {
      await api.post('/dispatch/update', {
        ...manualForm,
        status: 'Dispatched',
        workspaceId: activeWorkspace
      });
      toast.success('✅ Order updated and customer notified!');
      setManualForm({ orderId: '', customerPhone: '', deliveryMethod: 'Courier', trackingLink: '', builtyNo: '', shippingNotes: '' });
    } catch (error) {
      console.error("Manual Dispatch Error:", error);
      toast.error("Failed to update order.");
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Bulk Order Dispatch</h1>
            <select 
              value={activeWorkspace} 
              onChange={(e) => setActiveWorkspace(e.target.value)} 
              className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500 cursor-pointer shadow-sm"
            >
              {workspaces.map(ws => (
                <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
              ))}
            </select>
          </div>
          <p className="text-gray-400">Upload your daily MS Excel/CSV tracking sheet. AI will notify all customers instantly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
        {/* Excel Bulk Upload */}
        <div className="bg-[#111] p-8 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-emerald-400">Excel/CSV Bulk Upload</h2>
          <form onSubmit={handleUpload}>
            <div className="border-2 border-dashed border-gray-700 rounded-2xl p-10 text-center hover:border-emerald-500 transition-colors cursor-pointer bg-[#0a0a0a] mb-6">
              <p className="text-4xl mb-4">📁</p>
              <p className="text-gray-400 mb-2">Drag and drop your Excel/CSV file here</p>
              <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20" />
            </div>
            <button type="submit" disabled={uploading || !file} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20">
              {uploading ? 'Processing & Sending Messages...' : 'Upload & Notify Customers'}
            </button>
          </form>
        </div>

        {/* Manual Single Dispatch */}
        <div className="bg-[#111] p-8 rounded-2xl border border-gray-800 shadow-xl">
          <h2 className="text-xl font-bold mb-6 text-blue-400">Manual / Single Dispatch Update</h2>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Order ID <span className="text-rose-500">*</span></label>
                <input type="text" required value={manualForm.orderId} onChange={e => setManualForm({...manualForm, orderId: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none" placeholder="e.g. ORD-1001" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Customer Phone <span className="text-rose-500">*</span></label>
                <input type="text" required value={manualForm.customerPhone} onChange={e => setManualForm({...manualForm, customerPhone: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none" placeholder="9198765..." />
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-400 mb-1">Delivery Method <span className="text-rose-500">*</span></label>
              <select value={manualForm.deliveryMethod} onChange={e => setManualForm({...manualForm, deliveryMethod: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none cursor-pointer">
                <option value="Courier">Courier (e.g. BlueDart, Shiprocket)</option>
                <option value="Transport">Transport / Lorry</option>
                <option value="Local Delivery">Local Delivery Boy</option>
              </select>
            </div>

            {manualForm.deliveryMethod === 'Courier' && (
              <input type="text" required value={manualForm.trackingLink} onChange={e => setManualForm({...manualForm, trackingLink: e.target.value})} placeholder="Tracking Link URL" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none" />
            )}
            
            {manualForm.deliveryMethod === 'Transport' && (
              <input type="text" required value={manualForm.builtyNo} onChange={e => setManualForm({...manualForm, builtyNo: e.target.value})} placeholder="Builty No / LR Number" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none" />
            )}

            <textarea value={manualForm.shippingNotes} onChange={e => setManualForm({...manualForm, shippingNotes: e.target.value})} rows="2" placeholder="Any shipping notes or Transport Name (Optional)" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"></textarea>

            <button type="submit" disabled={manualSubmitting || !manualForm.orderId} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 mt-2">
              {manualSubmitting ? 'Updating...' : 'Update Status & Send WhatsApp'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}