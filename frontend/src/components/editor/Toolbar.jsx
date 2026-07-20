import React from 'react';
import { Bold, Italic, Underline, Palette } from 'lucide-react';

const Toolbar = ({ onAction }) => {
  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-2 flex items-center gap-2 shadow-lg">
      <button onClick={() => onAction('bold')} className="p-2 hover:bg-gray-700 rounded-md text-gray-300 hover:text-white transition-colors" title="Bold">
        <Bold size={16} />
      </button>
      <button onClick={() => onAction('italic')} className="p-2 hover:bg-gray-700 rounded-md text-gray-300 hover:text-white transition-colors" title="Italic">
        <Italic size={16} />
      </button>
      <button onClick={() => onAction('underline')} className="p-2 hover:bg-gray-700 rounded-md text-gray-300 hover:text-white transition-colors" title="Underline">
        <Underline size={16} />
      </button>
      {/* Add more controls like font size, color picker etc. here */}
    </div>
  );
};

export default Toolbar;