import React from 'react';
import { Bold, Italic, Underline, Trash2 } from 'lucide-react';

const Toolbar = ({ onAction, selectedObject }) => {
  if (!selectedObject) return null; // Render nothing if no object is selected

  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-2 flex items-center gap-1 shadow-lg animate-fade-in-up">
      <button onClick={() => onAction('bold')} className="p-2 hover:bg-gray-700 rounded-md text-gray-300 hover:text-white transition-colors" title="Bold">
        <Bold size={16} />
      </button>
      <button onClick={() => onAction('italic')} className="p-2 hover:bg-gray-700 rounded-md text-gray-300 hover:text-white transition-colors" title="Italic">
        <Italic size={16} />
      </button>
      <button onClick={() => onAction('underline')} className="p-2 hover:bg-gray-700 rounded-md text-gray-300 hover:text-white transition-colors" title="Underline">
        <Underline size={16} />
      </button>
      <div className="w-px h-5 bg-gray-700 mx-1"></div>
      <button onClick={() => onAction('delete')} className="p-2 hover:bg-red-900/50 rounded-md text-gray-300 hover:text-red-400 transition-colors" title="Delete">
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default Toolbar;