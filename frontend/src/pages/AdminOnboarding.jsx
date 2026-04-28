import { useState } from 'react';

export default function AdminOnboarding() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    businessModel: 'online',
    vyaparWebsiteUrl: '',
    productCategories: '',
    servedPinCodes: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Parse comma-separated strings into arrays
    const payload = {
      ...formData,
      productCategories: formData.productCategories.split(',').map(c => c.trim()),
      servedPinCodes: formData.servedPinCodes.split(',').map(p => p.trim())
    };

    console.log("Onboarding Client Data: ", payload);
    
    // Yahan API call aayegi backend me user create karne ke liye
    // await api.post('/users/register-client', payload);
    
    alert("Client Onboarded Successfully with Hyper-Local Tracking!");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Retailer Onboarding</h1>
      <p className="text-gray-600 mb-6">Setup WhatsApp automation, Vyapar URL, and local tracking for cross-selling.</p>

      <form onSubmit={handleSubmit} className="bg-white p-6 shadow rounded-lg space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Business/Owner Name</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          </div>

          {/* Business Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Business Model</label>
            <select name="businessModel" value={formData.businessModel} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2">
              <option value="online">Online Only (Ships anywhere)</option>
              <option value="offline">Offline / Local Store</option>
              <option value="both">Both (Online + Local)</option>
            </select>
          </div>
          
          {/* Vyapar URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700">VyaparIndia.online URL</label>
            <input type="url" name="vyaparWebsiteUrl" placeholder="https://vyaparindia.online/store-name" value={formData.vyaparWebsiteUrl} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
          </div>
        </div>

        {/* Hyper-Local Settings */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Hyper-Local / Cross-Sell Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Product Categories (Comma separated)</label>
              <input 
                type="text" 
                name="productCategories" 
                placeholder="e.g. Electronics, Laptops, Mobile Repair" 
                value={formData.productCategories} 
                onChange={handleChange} 
                className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
              />
              <p className="text-xs text-gray-500 mt-1">AI will use this to match lost leads to this seller.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Covered Pin Codes (Comma separated)</label>
              <input 
                type="text" 
                name="servedPinCodes" 
                placeholder="e.g. 400001, 400002" 
                value={formData.servedPinCodes} 
                onChange={handleChange} 
                disabled={formData.businessModel === 'online'}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-100" 
              />
              <p className="text-xs text-gray-500 mt-1">If offline/local, AI will only route leads from these pin codes to this seller.</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors">
            Onboard Client & Activate System
          </button>
        </div>
      </form>
    </div>
  );
}