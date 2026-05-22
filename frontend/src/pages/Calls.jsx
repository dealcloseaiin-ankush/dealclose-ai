import { useState, useEffect } from 'react';
import { getCalls } from '../services/callService';
import { formatDate } from '../utils/format';

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

  useEffect(() => {
    getCalls()
      .then(setCalls)
      .catch(err => console.error("Failed to fetch calls", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Call History</h1>
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