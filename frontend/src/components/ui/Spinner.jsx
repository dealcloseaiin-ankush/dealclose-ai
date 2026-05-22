import React from 'react';

export default function Spinner({ size = 'md', color = 'border-purple-500' }) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-t-2 border-b-2"
  };

  return <div className={`animate-spin rounded-full ${sizes[size]} ${color} border-t-transparent`}></div>;
}