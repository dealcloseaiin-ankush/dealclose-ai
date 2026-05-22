import React from 'react';
import { Bot } from 'lucide-react';

export default function CrmList({ contacts, onContactClick }) {
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {contacts.length === 0 ? (
              <tr><td colSpan="5" className="text-center p-8 text-gray-500">No leads found.</td></tr>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}