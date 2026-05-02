import React from 'react';

export default function Card({ children, className = '', hoverEffect = false }) {
  return (
    <div className={`bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-xl 
      ${hoverEffect ? 'hover:border-gray-700 transition-all duration-300 relative overflow-hidden group' : ''} 
      ${className}`}>
      {children}
    </div>
  );
}