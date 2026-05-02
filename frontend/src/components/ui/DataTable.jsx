import React from 'react';

export default function DataTable({ columns, data, onRowClick }) {
  return (
    <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-xl overflow-x-auto">
      <table className="w-full text-left whitespace-nowrap">
        <thead>
          <tr className="bg-[#1a1a1a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
            {columns.map((col, i) => (
              <th key={i} className="p-5 font-semibold">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {data.map((row, i) => (
            <tr 
              key={i} 
              onClick={() => onRowClick && onRowClick(row)}
              className={`hover:bg-gray-900/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col, j) => (
                <td key={j} className="p-5 text-gray-300">
                  {col.accessor ? row[col.accessor] : col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}