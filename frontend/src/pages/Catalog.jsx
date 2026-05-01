import { useState } from 'react';

export default function Catalog() {
  const [items, setItems] = useState([
    { id: 1, name: 'Premium Wireless Headphones', price: '₹2,499', description: 'Noise cancelling bluetooth headphones.' },
    { id: 2, name: '2BHK Apartment (Rent)', price: '₹45,000/mo', description: 'Fully furnished flat in Andheri West.' }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', description: '' });

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const newItem = { ...formData, id: Date.now() };
    setItems([...items, newItem]);
    setIsModalOpen(false);
    setFormData({ name: '', price: '', description: '' });
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2">Catalog & Listings</h1>
          <p className="text-gray-400">Manage your products, services, or real estate properties here. AI will use this data to answer customers.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-600/30">+ Add New Item</button>
      </div>

      {/* Add Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl">✕</button>
            <h2 className="text-2xl font-bold text-white mb-6">Add New Catalog Item</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
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
                <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-purple-500/30">Save to Catalog</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {items.length === 0 ? (
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
                <th className="p-5 font-semibold">Item Name</th>
                <th className="p-5 font-semibold">Price</th>
                <th className="p-5 font-semibold w-1/2">AI Context / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="p-5 font-bold text-white">{item.name}</td>
                  <td className="p-5 text-green-400 font-semibold">{item.price}</td>
                  <td className="p-5 text-gray-400 text-sm whitespace-normal">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}