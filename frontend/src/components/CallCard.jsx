import { formatDate } from '../utils/format';

export default function CallCard({ call }) {
  const displayCall = call || { to: '+15551234567', status: 'completed', duration: 182, result: 'interested', createdAt: new Date().toISOString() };

  return (
    <div className="p-4 border rounded-lg shadow bg-white">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-gray-800">{displayCall.to}</p>
          <p className="text-sm text-gray-500">{formatDate(displayCall.createdAt)}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
          displayCall.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {displayCall.status}
        </span>
      </div>
      <div className="mt-4 flex justify-between text-sm">
        <span>Duration: <span className="font-medium">{displayCall.duration}s</span></span>
        <span>Result: <span className="font-medium capitalize">{displayCall.result || 'N/A'}</span></span>
      </div>
    </div>
  );
}