import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function Catalog() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');

  const [activeTab, setActiveTab] = useState('products');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dummy Data for untested tabs
  const [properties] = useState([
    { _id: '60d0fe4f5311236168a109ca', propertyType: '2BHK Apartment', location: 'Andheri West, Mumbai', price: '1.5 Cr', status: 'listed', customerPhone: '+919876543210' },
    { _id: '60d0fe4f5311236168a109cb', propertyType: 'Commercial Shop', location: 'Connaught Place, Delhi', price: '50 Lakh', status: 'pending', customerPhone: '+919876543211' }
  ]);
  const [pendingQuotes] = useState([
    { id: 1, customer: 'Raju Hardware', items: 'Cement (50), Iron Rods (200kg)', matched: true, status: 'Needs Rate Approval' }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 🚀 DEBUGGING: Fetch actual catalog from backend
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const profileRes = await api.get('/users/profile').catch(() => null);
        const u = profileRes?.data?.user || profileRes?.data;
        if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
      } catch (error) {
        // Ignore profile fetch error if it fails
        console.error("Profile fetch error:", error);
      }
      
      console.log("➡️ [DEBUG] Fetching Catalog items...");
      try {
        // Note: Assuming /api/catalog backend exists, if not it will catch the error smoothly
        const { data } = await api.get('/catalog', { params: { workspaceId: activeWorkspace } });
        setItems(Array.isArray(data) ? data : []);
        console.log("✅ [DEBUG] Catalog fetched successfully:", data);
      } catch (error) {
        console.warn("⚠️ [DEBUG] /api/catalog endpoint might not exist yet. Showing empty state.", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, [activeWorkspace]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    console.log("➡️ [DEBUG] Attempting to save new catalog item:", formData);
    setSubmitting(true);
    
    try {
      let finalImageUrl = '';
      // Upload Image to Cloudinary first if selected
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('file', imageFile);
        const uploadRes = await api.post('/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadRes.data.url || uploadRes.data.imageUrl;
      }

      // 🚀 Save to Real Database via Backend
      const payload = { ...formData, imageUrl: finalImageUrl, workspaceId: activeWorkspace };
      const res = await api.post('/catalog', payload);
      
      setItems([res.data, ...items]);
      
      setImageFile(null);
      setImagePreview('');
      setIsModalOpen(false);
      setFormData({ name: '', price: '', description: '' });
      toast.success("Item added to AI Brain!");
      console.log("✅ [DEBUG] Item saved.");
    } catch (error) {
      console.error("❌ [DEBUG] Failed to save item:", error);
      toast.error("Failed to add item. Check console.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8 flex justify-between items-center">
        <div className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Catalog & Listings</h1>
              <select 
                value={activeWorkspace} 
                onChange={(e) => setActiveWorkspace(e.target.value)} 
                className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-purple-500 cursor-pointer shadow-sm"
              >
                {workspaces.map(ws => (
                  <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button className="bg-[#111] hover:bg-gray-800 border border-gray-700 text-white px-6 py-3 rounded-xl font-bold transition-colors">📥 Import Excel/CSV</button>
              <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-600/30">+ Add New Item</button>
            </div>
          </div>
          <p className="text-gray-400">Manage your products, services, or real estate properties here. AI will use this data to answer customers.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-800 pb-px">
        <button onClick={() => setActiveTab('products')} className={`pb-3 px-2 font-semibold transition-all duration-300 ${activeTab === 'products' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
          General Products Catalog
        </button>
        <button onClick={() => setActiveTab('quotes')} className={`pb-3 px-2 font-semibold transition-all duration-300 relative ${activeTab === 'quotes' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
          B2B Smart Quotes
          <span className="absolute top-0 right-0 -mt-1 -mr-3 bg-rose-500 text-white text-[10px] px-1.5 rounded-full">1</span>
        </button>
        <button onClick={() => setActiveTab('properties')} className={`pb-3 px-2 font-semibold transition-all duration-300 ${activeTab === 'properties' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
          AI Auto-Listed Properties
        </button>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl">✕</button>
            <h2 className="text-2xl font-bold text-white mb-6">Add New Catalog Item</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Product Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20 w-full" />
                {imagePreview && (
                  <div className="mt-3">
                    <img src={imagePreview} alt="Preview" className="h-24 w-24 rounded-lg border border-gray-700 object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Item / Property Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none" placeholder="e.g., Running Shoes / 3BHK Flat" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Price / Rent</label>
                <input type="text" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none" placeholder="e.g., ₹1,499 or ₹25,000/mo" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (For AI to read)</label>
                <textarea required rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none" placeholder="Details about this item..."></textarea>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={submitting} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-500/30 disabled:opacity-50">
                  {submitting ? 'Uploading & Saving...' : 'Save to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'products' ? (
      loading ? (
        <div className="text-center p-10 text-gray-500">Loading catalog...</div>
      ) : items.length === 0 ? (
        <div className="bg-[#111] rounded-2xl border border-gray-800 p-16 text-center text-gray-500 shadow-xl">
          <p className="text-5xl mb-4">📦</p>
          <h2 className="text-2xl font-bold text-gray-300 mb-2">Your Catalog is Empty</h2>
          <p className="mb-6">Add your products or properties so AI can recommend them to customers.</p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#1a1a1a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
                <th className="p-5 font-semibold w-24">Image</th>
                <th className="p-5 font-semibold">Item Name</th>
                <th className="p-5 font-semibold">Price</th>
                <th className="p-5 font-semibold w-1/2">AI Context / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map(item => (
                <tr key={item._id || item.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="p-5">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded object-cover border border-gray-700" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-800 flex items-center justify-center text-xl">📦</div>
                    )}
                  </td>
                  <td className="p-5 font-bold text-white">{item.name}</td>
                  <td className="p-5 text-green-400 font-semibold">{item.price}</td>
                  <td className="p-5 text-gray-400 text-sm whitespace-normal">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      ) : activeTab === 'quotes' ? (
        <div className="space-y-6">
          <div className="bg-[#111111] border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl"></div>
            <h2 className="text-xl font-bold text-white mb-2">Pending Quotation Approvals</h2>
            <p className="text-gray-400 text-sm mb-6">AI has matched the customer's request with your Excel sheet. Enter your rates and approve the quote.</p>
            
            {pendingQuotes.map(quote => (
              <div key={quote.id} className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-white text-lg">{quote.customer}</h3>
                    <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{quote.status}</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2"><span className="text-gray-500">Requested Items:</span> {quote.items}</p>
                  <div className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                    <span>✓</span> AI successfully matched items with Excel Catalog
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button className="flex-1 md:flex-none px-4 py-2 bg-[#0a0a0a] border border-gray-700 hover:bg-gray-800 rounded-lg text-white font-semibold transition-colors">Edit List</button>
                  <button className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 transition-colors">Enter Rates & Send</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl relative overflow-hidden">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-[#1a1a1a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
                <th className="p-5 font-semibold">Property</th>
                <th className="p-5 font-semibold">Location</th>
                <th className="p-5 font-semibold">Price</th>
                <th className="p-5 font-semibold">Customer (Owner)</th>
                <th className="p-5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {properties.map(prop => (
                <tr key={prop._id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="p-5 font-medium text-gray-200">{prop.propertyType}</td>
                  <td className="p-5 text-gray-400">{prop.location}</td>
                  <td className="p-5 text-gray-400">{prop.price}</td>
                  <td className="p-5 text-gray-400">{prop.customerPhone}</td>
                  <td className="p-5"><span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md text-xs font-bold uppercase">{prop.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}