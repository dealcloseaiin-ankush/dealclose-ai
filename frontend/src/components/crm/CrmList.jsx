import React from 'react';
import { Bot, Trash2 } from 'lucide-react';

export default function CrmList({ contacts, onContactClick, onDeleteContact }) {
  return (
    <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr className="bg-[#1a1a1a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
              <th className="p-5 font-semibold">Name</th>
              <th className="p-5 font-semibold">Contact</th>
              <th className="p-5 font-semibold">Stage</th>
              <th className="p-5 font-semibold">AI Score</th>
              <th className="p-5 font-semibold">Deal Value</th>
              <th className="p-5 font-semibold">Expires</th>
              <th className="p-5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {contacts.length === 0 ? (
              <tr><td colSpan="7" className="text-center p-8 text-gray-500">No leads found.</td></tr>
            ) : (
              contacts.map(contact => (
                <tr 
                  key={contact._id} 
                  onClick={() => onContactClick(contact)}
                  className="hover:bg-gray-900/50 transition-colors cursor-pointer"
                >
                  <td className="p-5 font-bold text-gray-200">{contact.name}</td>
                  <td className="p-5 text-gray-400">{contact.phone}</td>
                  <td className="p-5">
                    <span className="bg-gray-800 text-gray-300 border border-gray-700 px-3 py-1 rounded-md text-xs font-bold capitalize">
                      {contact.crmStage}
                    </span>
                  </td>
                  <td className="p-5">
                    {contact.aiScore > 0 ? (
                      <span className="flex items-center gap-1 w-fit text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md">
                        <Bot size={12}/> {contact.aiScore}
                      </span>
                    ) : <span className="text-gray-500">—</span>}
                  </td>
                  <td className="p-5 font-semibold text-white">
                    ₹{contact.dealValue?.toLocaleString('en-IN') || 0}
                  </td>
                  <td className="p-5 text-gray-500 text-xs font-semibold">
                    {contact.expiresAt ? (
                      <span className={`px-2 py-1 rounded ${new Date(contact.expiresAt) - new Date() < 3 * 86400000 ? 'bg-red-500/10 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                        {Math.max(1, Math.ceil((new Date(contact.expiresAt) - new Date()) / 86400000))} Days
                      </span>
                    ) : (
                      'Never'
                    )}
                  </td>
                  <td className="p-5 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteContact(contact._id || contact.id); }}
                      className="text-gray-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Permanent Delete"
                    >
                      <Trash2 size={16} />
                    </button>
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