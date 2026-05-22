import React from 'react';

export default function EmptyState({ icon = "📦", title, description, actionButton }) {
  return (
    <div className="bg-[#111111] rounded-2xl border border-gray-800 p-16 text-center shadow-xl">
      <p className="text-5xl mb-4">{icon}</p>
      <h2 className="text-2xl font-bold text-gray-300 mb-2">{title}</h2>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">{description}</p>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
}