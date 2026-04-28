import { dialCall } from '../services/callService';
import Button from './Button';

export default function LeadCard({ lead }) {
  const handleCall = async () => {
    try {
      await dialCall(lead.phoneNumber, lead._id);
      alert(`Calling ${lead.name}...`);
    } catch (error) {
      console.error('Failed to initiate call', error);
      alert('Failed to initiate call.');
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow bg-white flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-lg">{lead.name}</h3>
        <p className="text-sm text-gray-600">{lead.phoneNumber}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full capitalize">{lead.status || 'New'}</span>
        <Button onClick={handleCall} className="text-sm py-1">Call</Button>
      </div>
    </div>
  );
}