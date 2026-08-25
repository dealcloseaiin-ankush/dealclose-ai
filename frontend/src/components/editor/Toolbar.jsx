import React from 'react';
import { Bold, Italic, Underline, Trash2, Maximize2, Minimize2, Crosshair } from 'lucide-react';

const Toolbar = ({ onAction, selectedObject }) => {
  if (!selectedObject) return null;

  const isText = selectedObject.type === 'textbox' || selectedObject.type === 'text';
  const isImage = selectedObject.type === 'image';

  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl p-1.5 flex items-center gap-1 shadow-xl animate-fade-in">
      {isText && (
        <>
          <button onClick={() => onAction('bold')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Bold">
            <Bold size={14} />
          </button>
          <button onClick={() => onAction('italic')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Italic">
            <Italic size={14} />
          </button>
          <button onClick={() => onAction('underline')} className="p-1.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Underline">
            <Underline size={14} />
          </button>
          <div className="w-px h-4 bg-gray-700 mx-0.5"></div>
        </>
      )}

      {isImage && (
        <>
          <button onClick={() => onAction('fillImage')} className="px-2 py-1 hover:bg-gray-700 rounded text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1 transition-colors" title="Fill / Cover Entire Canvas (1080x1080)">
            <Maximize2 size={13} className="text-pink-400" /> Fill Canvas
          </button>
          <button onClick={() => onAction('fitImage')} className="px-2 py-1 hover:bg-gray-700 rounded text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1 transition-colors" title="Fit Inside Canvas (Contain)">
            <Minimize2 size={13} className="text-purple-400" /> Fit
          </button>
          <div className="w-px h-4 bg-gray-700 mx-0.5"></div>
        </>
      )}

      <button onClick={() => onAction('delete')} className="p-1.5 hover:bg-rose-900/50 rounded text-gray-300 hover:text-rose-400 transition-colors" title="Delete Layer">
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export default Toolbar;