import { useState, useEffect } from 'react';
import { formatDate } from '../utils/format';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const CallRow = ({ call }) => (
  <tr className="bg-white border-b hover:bg-gray-50">
    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{call.to}</td>
    <td className="px-6 py-4 capitalize">{call.status}</td>
    <td className="px-6 py-4">{call.duration || 0}s</td>
    <td className="px-6 py-4 capitalize">{call.result || 'N/A'}</td>
    <td className="px-6 py-4 text-gray-500">{formatDate(call.createdAt)}</td>
  </tr>
);

export default function Calls() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');

  useEffect(() => {
    const fetchCalls = async () => {
      setLoading(true);
      try {
        const profileRes = await api.get('/users/profile').catch(() => null);
        const u = profileRes?.data?.user || profileRes?.data;
        if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);

        const res = await api.get('/calls', { params: { workspaceId: activeWorkspace } });
        setCalls(res.data);
      } catch (err) {
        console.error("Failed to fetch calls", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalls();
  }, [activeWorkspace]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Call History</h1>
        <select 
          value={activeWorkspace} 
          onChange={(e) => setActiveWorkspace(e.target.value)} 
          className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-blue-500 cursor-pointer shadow-sm"
        >
          {workspaces.map(ws => (
            <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
          ))}
        </select>
      </div>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">To</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">Duration</th>
              <th scope="col" className="px-6 py-3">Result</th>
              <th scope="col" className="px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="text-center p-4">Loading...</td></tr>}
            {!loading && calls.map(call => <CallRow key={call._id} call={call} />)}
            {!loading && calls.length === 0 && <tr><td colSpan="5" className="text-center p-4">No calls found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}