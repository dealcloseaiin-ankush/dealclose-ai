import React from 'react';
import { Type, Image as ImageIcon, Square, Star } from 'lucide-react';

const getIcon = (type = '') => {
  if (type.includes('text')) return <Type size={14} className="mr-2 text-blue-400" />;
  if (type === 'image') return <ImageIcon size={14} className="mr-2 text-green-400" />;
  if (type === 'rect') return <Square size={14} className="mr-2 text-orange-400" />;
  return <Star size={14} className="mr-2 text-yellow-400" />;
};

const ObjectPanel = ({ layers = [], onSelect }) => {
  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-4">
      <h3 className="text-md font-bold text-white mb-3">Layers</h3>
      <ul className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
        {layers.map((layer) => (
          <li key={layer.id} onClick={() => onSelect(layer)} className="flex items-center p-2 text-sm rounded-lg cursor-pointer hover:bg-gray-800 text-gray-300 transition-colors">
            {getIcon(layer.type)} <span className="truncate">{layer.text || layer.type.replace('textbox', 'Text')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ObjectPanel;