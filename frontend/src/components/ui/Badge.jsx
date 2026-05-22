import React from 'react';

export default function Badge({ children, variant = 'neutral', className = '' }) {
  const variants = {
    success: "bg-green-500/10 text-green-400 border border-green-500/20",
    danger: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    neutral: "bg-gray-800 text-gray-300 border border-gray-700",
    primary: "bg-purple-500/10 text-purple-400 border border-purple-500/20"
  };

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}