import { useState, useEffect } from 'react';

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        // Future integration: const { data } = await api.get('/properties');
        // Mock data representing what AI saved in the backend
        const mockData = [
          { _id: '60d0fe4f5311236168a109ca', propertyType: '2BHK Apartment', location: 'Andheri West, Mumbai', price: '1.5 Cr', amenities: ['Gym', 'Pool'], status: 'listed', customerPhone: '+919876543210', createdAt: new Date().toISOString() },
          { _id: '60d0fe4f5311236168a109cb', propertyType: 'Commercial Shop', location: 'Connaught Place, Delhi', price: '50 Lakh', amenities: ['Parking'], status: 'pending', customerPhone: '+919876543211', createdAt: new Date().toISOString() }
        ];
        setProperties(mockData);
      } catch (error) {
        console.error("Failed to fetch properties", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#050505] text-gray-100 font-sans">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
            Property Listings
          </span>
        </h1>
        <p className="text-gray-400 text-lg">Auto-extracted properties listed by your AI Agent.</p>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#1a1a1a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
              <th className="p-5 font-semibold">Property</th>
              <th className="p-5 font-semibold">Location</th>
              <th className="p-5 font-semibold">Price</th>
              <th className="p-5 font-semibold">Source Number</th>
              <th className="p-5 font-semibold">Status</th>
              <th className="p-5 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan="6" className="text-center p-8 text-gray-500">Loading properties...</td></tr>
            ) : (
              properties.map(prop => (
                <tr key={prop._id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="p-5 font-medium text-gray-200">{prop.propertyType}</td>
                  <td className="p-5 text-gray-400">{prop.location}</td>
                  <td className="p-5 text-gray-400">{prop.price}</td>
                  <td className="p-5 text-gray-400">{prop.customerPhone}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-md text-xs font-bold tracking-wide ${prop.status === 'listed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
                      {prop.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-5 text-blue-400 hover:text-blue-300 cursor-pointer">
                    <a href={`https://newpropertyhub.in/property/${prop._id}`} target="_blank" rel="noreferrer">View Link</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}