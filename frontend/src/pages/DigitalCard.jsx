import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../services/api';

export default function DigitalCard() {
  const { userId } = useParams();
  const location = useLocation();
  const [formData, setFormData] = useState({ name: '', phoneNumber: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardLinks, setCardLinks] = useState(null);
  const [businessName, setBusinessName] = useState('Our Business');

  // Mocking the fetch of the specific business profile links
  // Once Workspaces are implemented, this will fetch that specific workspace's links
  useEffect(() => {
    const getLinks = async () => {
      try {
        // Use the correct profile endpoint to avoid 404 error
        const { data } = await api.get('/users/profile');
        const savedData = data.user || data.data || data;
        
        const queryParams = new URLSearchParams(location.search);
        const wsIndex = queryParams.get('ws');
        
        if (wsIndex !== null && savedData.workspaces && savedData.workspaces[wsIndex]) {
          setCardLinks(savedData.workspaces[wsIndex]);
          setBusinessName(savedData.workspaces[wsIndex].name || 'Our Business');
        } else {
          if (savedData?.digitalCardConfig) setCardLinks(savedData.digitalCardConfig);
          setBusinessName(savedData?.businessName || 'Our Business');
        }
      } catch (err) { 
        console.error("Error loading links", err); 
      }
    };
    getLinks();
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // CRM me lead save karne ki API call
      await api.post('/leads', {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        source: 'QR Scan / Digital Card',
        status: 'new',
        createdBy: userId
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Form Submit Error:", error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center py-12 px-6 font-sans">
      <div className="w-full max-w-md bg-[#111111] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-purple-600 to-blue-600 opacity-20 blur-2xl"></div>
        
        <div className="relative z-10 text-center mb-8">
          <div className="w-24 h-24 bg-gray-800 rounded-full mx-auto mb-4 border-4 border-gray-700 flex items-center justify-center text-4xl">
            🏢
          </div>
          <h1 className="text-2xl font-bold">Welcome to {businessName}</h1>
          <p className="text-gray-400 text-sm mt-2">Connect with us and leave your details below!</p>
        </div>

        {/* Social Links & Ratings */}
        <div className="space-y-3 mb-8">
          {cardLinks?.upiId && (
            <a href={`upi://pay?pa=${cardLinks.upiId}&pn=Business&cu=INR`} className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 rounded-xl font-bold hover:opacity-90 transition shadow-[0_0_15px_rgba(5,150,105,0.4)]">
              💸 Pay securely via UPI
            </a>
          )}
          {cardLinks?.website && (
            <a href={cardLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 rounded-xl font-bold hover:opacity-90 transition">
              🌐 Visit Our Website
            </a>
          )}
          {cardLinks?.instagram && (
            <a href={cardLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-bold hover:opacity-90 transition">
              📸 Follow on Instagram
            </a>
          )}
          {cardLinks?.youtube && (
            <a href={cardLinks.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 rounded-xl font-bold hover:opacity-90 transition">
              ▶ Subscribe on YouTube
            </a>
          )}
          {cardLinks?.googleReview && (
            <a href={cardLinks.googleReview} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black rounded-xl font-bold hover:opacity-90 transition">
              ⭐ Leave a Google Review
            </a>
          )}
        </div>

        <div className="border-t border-gray-800 my-6"></div>

        {/* CRM Lead Capture Form */}
        {submitted ? (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-6 rounded-xl text-center font-bold">
            🎉 Thank you! Your details have been shared securely.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Name</label>
              <input 
                type="text" required
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 outline-none focus:border-purple-500 text-white" 
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">WhatsApp Number</label>
              <input 
                type="text" required
                value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 outline-none focus:border-purple-500 text-white" 
                placeholder="+91..."
              />
            </div>
            <p className="text-xs text-gray-500 text-center">Share your details for future updates & offers.</p>
            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Submit Details 🚀'}
            </button>
          </form>
        )}
        
      </div>
    </div>
  );
}