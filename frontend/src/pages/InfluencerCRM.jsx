import React, { useState, useEffect } from 'react';

// Mock data extracted outside the component to prevent recreation on every render
const initialMockDeals = [
  {
    id: 1,
    brandName: "Mamaearth",
    budget: "₹13,000",
    deliverables: "1 Instagram Reel (30s) + Video Editing by Influencer",
    negotiationSummary: "Brand initially offered ₹10,000. We asked for ₹15,000 based on standard rate card. Brand agreed to settle at ₹13,000 if we include editing.",
    status: "Pending Approval",
    type: "Brand",
    igHandle: "@mamaearth_india"
  },
  {
    id: 2,
    brandName: "Boat Skincare",
    budget: "₹5,000",
    deliverables: "1 Instagram Story with Link",
    negotiationSummary: "Brand's max budget is 5k. Offered standard story promotion.",
    status: "Pending Approval",
    type: "Brand",
    igHandle: "@boat.skincare"
  },
  {
    id: 3,
    brandName: "Travel Blogger Rahul",
    budget: "Barter / Free",
    deliverables: "Joint Instagram Reel",
    negotiationSummary: "Rahul wants to do a travel vlog collab. He has 100k followers.",
    status: "Pending Approval",
    type: "Collab",
    igHandle: "@travel_rahul"
  }
];

const InfluencerCRM = () => {
  const [activeTab, setActiveTab] = useState('Brand');
  const [deals, setDeals] = useState(initialMockDeals);
  const [selectedDeals, setSelectedDeals] = useState([]);

  useEffect(() => {
    // TODO: Fetch real deals from API later
    // api.get('/leads/influencer').then(res => setDeals(res.data));
  }, []);

  const handleAction = (id, action) => {
    // API call to update CRM stage (e.g., 'converted' or 'lost')
    const updatedDeals = deals.map(deal => {
      if (deal.id === id) {
        return { ...deal, status: action === 'accept' ? 'Accepted & Contract Sent' : 'Rejected' };
      }
      return deal;
    });
    setDeals(updatedDeals);
  };

  // Bulk Actions
  const toggleSelectDeal = (id) => {
    if (selectedDeals.includes(id)) {
      setSelectedDeals(selectedDeals.filter(dealId => dealId !== id));
    } else {
      setSelectedDeals([...selectedDeals, id]);
    }
  };

  const selectAll = () => {
    const filtered = deals.filter(deal => deal.type === activeTab && deal.status === 'Pending Approval');
    if (selectedDeals.length === filtered.length) {
      setSelectedDeals([]); // Deselect all
    } else {
      setSelectedDeals(filtered.map(d => d.id));
    }
  };

  const handleBulkAction = (action) => {
    const confirmMsg = action === 'accept' 
      ? `Are you sure you want to Accept ${selectedDeals.length} collaborations?`
      : `Send bulk rejection message to ${selectedDeals.length} creators?`;
      
    if (window.confirm(confirmMsg)) {
      const updatedDeals = deals.map(deal => {
        if (selectedDeals.includes(deal.id)) {
          return { ...deal, status: action === 'accept' ? 'Accepted' : 'Rejected via Bulk' };
        }
        return deal;
      });
      setDeals(updatedDeals);
      setSelectedDeals([]);
    }
  };

  const filteredDeals = deals.filter(deal => deal.type === activeTab);
  const pendingCount = deals.filter(d => d.type === activeTab && d.status === 'Pending Approval').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Influencer CRM</h1>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700">
            Generate Media Kit
          </button>
        </div>

        {/* Summary Banner */}
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl mb-6 flex justify-between items-center shadow-sm">
          <div>
            <h3 className="font-bold text-lg">You have {pendingCount} new {activeTab} requests today!</h3>
            <p className="text-sm">These users have received an automated wait message. Review them below.</p>
          </div>
        </div>

        <div className="flex space-x-4 mb-6 border-b border-gray-300 pb-px">
          <button onClick={() => setActiveTab('Brand')} className={`pb-3 px-2 font-semibold transition-all ${activeTab === 'Brand' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Paid Brand Deals 💰</button>
          <button onClick={() => setActiveTab('Collab')} className={`pb-3 px-2 font-semibold transition-all ${activeTab === 'Collab' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Collaborations 🤝</button>
        </div>

        {/* Bulk Action Bar */}
        {activeTab === 'Collab' && pendingCount > 0 && (
          <div className="bg-white p-3 rounded-xl border border-gray-200 mb-6 flex items-center gap-4 shadow-sm">
            <button onClick={selectAll} className="text-sm font-bold text-gray-600 hover:text-blue-600 px-2 py-1">
              {selectedDeals.length === pendingCount ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm font-bold text-blue-600">{selectedDeals.length} Selected</span>
            <div className="ml-auto flex gap-2">
              <button onClick={() => handleBulkAction('reject')} disabled={selectedDeals.length === 0} className="px-4 py-1.5 bg-red-100 text-red-600 text-sm font-bold rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors">
                Bulk Reject
              </button>
              <button onClick={() => handleBulkAction('accept')} disabled={selectedDeals.length === 0} className="px-4 py-1.5 bg-green-100 text-green-700 text-sm font-bold rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors">
                Bulk Accept
              </button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {filteredDeals.length === 0 && <p className="text-gray-500 text-center py-10">No {activeTab}s found.</p>}
          {filteredDeals.map((deal) => (
            <div key={deal.id} className={`bg-white p-6 rounded-xl shadow-sm border transition-colors ${selectedDeals.includes(deal.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  {activeTab === 'Collab' && deal.status === 'Pending Approval' && (
                    <input 
                      type="checkbox" 
                      checked={selectedDeals.includes(deal.id)}
                      onChange={() => toggleSelectDeal(deal.id)}
                      className="mt-1.5 w-5 h-5 cursor-pointer accent-blue-600"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">{deal.brandName} <span className="text-sm text-blue-500 ml-2">{deal.igHandle}</span></h2>
                    <p className="text-sm text-gray-500 mt-1">Status: <span className="font-medium text-yellow-600">{deal.status}</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">{deal.budget}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Deliverables</h3>
                  <p className="text-gray-800">{deal.deliverables}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">Negotiation Summary</h3>
                  <p className="text-blue-900 text-sm leading-relaxed">{deal.negotiationSummary}</p>
                </div>
              </div>

              {deal.status === 'Pending Approval' && (
                <div className="mt-6 flex space-x-4">
                  <button 
                    onClick={() => handleAction(deal.id, 'accept')}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    ✓ Accept Deal
                  </button>
                  <button 
                    onClick={() => handleAction(deal.id, 'reject')}
                    className="flex-1 bg-red-100 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-200 transition"
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfluencerCRM;