import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DollarSign, Cpu, Clock } from 'lucide-react';

const BillingPage = () => {
  const [summary, setSummary] = useState({ totalTokens: 0, totalUserCost: 0 });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/billing/summary');
        if (data.success) {
          setSummary(data.summary);
          setLogs(data.logs);
        }
      } catch (error) {
        console.error("Failed to fetch billing data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  // Function to format cost to a readable string (e.g., $0.001234)
  const formatCost = (cost) => {
    if (cost === 0) return '$0.00';
    return `$${cost.toFixed(6)}`;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading Billing Data...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">AI Usage & Billing</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <Cpu className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Tokens Used</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalTokens.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center">
          <div className="bg-green-100 p-3 rounded-full mr-4">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Estimated Cost</p>
            <p className="text-2xl font-bold text-gray-900">{formatCost(summary.totalUserCost)}</p>
          </div>
        </div>
      </div>

      {/* Detailed Logs Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <h2 className="text-xl font-semibold text-gray-800 p-4 border-b">Recent AI Activity</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map(log => (
                <tr key={log._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.feature}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.totalTokens}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">{formatCost(log.userCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;