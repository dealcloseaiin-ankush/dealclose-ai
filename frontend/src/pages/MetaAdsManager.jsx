import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { DollarSign, Users, Loader, PlusCircle } from 'lucide-react';

const MetaAdsManager = () => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingAudience, setLoadingAudience] = useState(false);

  // Form state for creating a new audience
  const [audienceName, setAudienceName] = useState('');
  const [leadStatus, setLeadStatus] = useState('converted');

  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const { data } = await api.get('/meta-ads/accounts');
        if (data.success) {
          setAdAccounts(data.accounts);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to fetch Ad Accounts.');
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchAdAccounts();
  }, []);

  const handleCreateAudience = async (e) => {
    e.preventDefault();
    if (!audienceName.trim()) {
      toast.error('Please give your audience a name.');
      return;
    }
    setLoadingAudience(true);
    try {
      const { data } = await api.post('/meta-ads/create-audience', {
        audienceName,
        description: `Audience of ${leadStatus} leads from DealClose CRM`,
        leadStatus,
      });
      if (data.success) {
        toast.success(`Audience "${data.audienceName}" created with ${data.userCount} users! It will be available in your Meta Ads Manager shortly.`);
        setAudienceName('');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create audience.');
    } finally {
      setLoadingAudience(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Meta Ads Center</h1>

      {/* Ad Accounts Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Ad Accounts</h2>
        {loadingAccounts ? (
          <div className="text-center p-4">
            <Loader className="animate-spin inline-block" />
            <p>Fetching Ad Accounts...</p>
          </div>
        ) : adAccounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adAccounts.map(account => (
              <div key={account.id} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-bold text-gray-900">{account.name}</h3>
                <p className="text-sm text-gray-500">ID: {account.account_id}</p>
                <div className="mt-4 flex items-center text-2xl font-bold text-green-600">
                  <DollarSign size={24} className="mr-2" />
                  {/* Balance is returned in minor currency units (e.g., paise), so divide by 100 */}
                  <span>{(parseFloat(account.balance) / 100).toLocaleString('en-IN', { style: 'currency', currency: account.currency })}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <p className="text-gray-600">No Ad Accounts found. Please ensure your Meta account is connected in Settings and has `ads_read` permission.</p>
          </div>
        )}
      </div>

      {/* Custom Audience Creator Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Users className="mr-2" /> Create Custom Audience from CRM
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Turn your CRM leads into powerful retargeting audiences on Facebook & Instagram.
        </p>
        <form onSubmit={handleCreateAudience} className="space-y-4">
          <div>
            <label htmlFor="audienceName" className="block text-sm font-medium text-gray-700">Audience Name</label>
            <input
              type="text"
              id="audienceName"
              value={audienceName}
              onChange={(e) => setAudienceName(e.target.value)}
              placeholder="e.g., Converted Customers - Q2"
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="leadStatus" className="block text-sm font-medium text-gray-700">Select CRM Lead Status</label>
            <select
              id="leadStatus"
              value={leadStatus}
              onChange={(e) => setLeadStatus(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="converted">Converted / Won Leads</option>
              <option value="hot">Hot Leads</option>
              <option value="warm">Warm / Interested Leads</option>
              <option value="new">New Leads</option>
              <option value="lost">Lost Leads</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loadingAudience}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loadingAudience ? <Loader className="animate-spin mr-2" /> : <PlusCircle className="mr-2" />}
            Create Audience on Meta
          </button>
        </form>
      </div>
    </div>
  );
};

export default MetaAdsManager;