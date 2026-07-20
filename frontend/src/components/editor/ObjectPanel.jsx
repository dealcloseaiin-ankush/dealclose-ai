import React from 'react';
import { Type, Image, Square } from 'lucide-react';

const getIcon = (type) => {
  if (type === 'text') return <Type size={14} className="mr-2 text-blue-400" />;
  if (type === 'image') return <Image size={14} className="mr-2 text-green-400" />;
  return <Square size={14} className="mr-2 text-orange-400" />;
};

const ObjectPanel = ({ layers = [], onSelect }) => {
  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-3">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Layers</h3>
      <ul className="space-y-1">
        {layers.map((layer, index) => (
          <li key={index} onClick={() => onSelect(layer)} className="flex items-center p-2 text-sm rounded-md cursor-pointer hover:bg-gray-700 text-gray-300 transition-colors">{getIcon(layer.type)} {layer.text || layer.type}</li>
        ))}
      </ul>
    </div>
  );
};

export default ObjectPanel;