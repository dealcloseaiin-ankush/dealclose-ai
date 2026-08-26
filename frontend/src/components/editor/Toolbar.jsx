import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Trash2,
  Maximize2,
  Minimize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Palette
} from 'lucide-react';

const Toolbar = ({ onAction, selectedObject }) => {
  if (!selectedObject) return null;

  const isText = selectedObject.type === 'textbox' || selectedObject.type === 'text';
  const isImage = selectedObject.type === 'image';
  const isShape = selectedObject.type === 'rect' || selectedObject.type === 'circle' || selectedObject.type === 'triangle';

  const currentColor = typeof selectedObject.fill === 'string' && selectedObject.fill.startsWith('#')
    ? selectedObject.fill
    : '#ffffff';

  return (
    <div className="bg-[#1a1a1a] border border-gray-700 rounded-xl px-2 py-1 flex items-center gap-1.5 shadow-xl animate-fade-in text-xs">
      {isText && (
        <>
          {/* Bold, Italic, Underline */}
          <div className="flex items-center bg-[#252525] rounded-lg p-0.5 border border-gray-700">
            <button
              onClick={() => onAction('bold')}
              className={`p-1 rounded transition-colors ${selectedObject.fontWeight === 'bold' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:text-white'}`}
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button
              onClick={() => onAction('italic')}
              className={`p-1 rounded transition-colors ${selectedObject.fontStyle === 'italic' ? 'bg-pink-600 text-white' : 'text-gray-300 hover:text-white'}`}
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <button
              onClick={() => onAction('underline')}
              className={`p-1 rounded transition-colors ${selectedObject.underline ? 'bg-pink-600 text-white' : 'text-gray-300 hover:text-white'}`}
              title="Underline"
            >
              <Underline size={13} />
            </button>
          </div>

          {/* Font Size */}
          <div className="flex items-center bg-[#252525] rounded-lg p-0.5 border border-gray-700">
            <button
              onClick={() => onAction('decreaseFontSize')}
              className="px-1.5 py-0.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white font-bold"
              title="Decrease Font Size"
            >
              A-
            </button>
            <span className="px-1.5 text-[11px] font-mono text-gray-400">{Math.round(selectedObject.fontSize || 40)}</span>
            <button
              onClick={() => onAction('increaseFontSize')}
              className="px-1.5 py-0.5 hover:bg-gray-700 rounded text-gray-300 hover:text-white font-bold"
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center bg-[#252525] rounded-lg p-0.5 border border-gray-700">
            <button
              onClick={() => onAction('alignLeft')}
              className={`p-1 rounded transition-colors ${selectedObject.textAlign === 'left' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:text-white'}`}
              title="Align Left"
            >
              <AlignLeft size={13} />
            </button>
            <button
              onClick={() => onAction('alignCenter')}
              className={`p-1 rounded transition-colors ${selectedObject.textAlign === 'center' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:text-white'}`}
              title="Align Center"
            >
              <AlignCenter size={13} />
            </button>
            <button
              onClick={() => onAction('alignRight')}
              className={`p-1 rounded transition-colors ${selectedObject.textAlign === 'right' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:text-white'}`}
              title="Align Right"
            >
              <AlignRight size={13} />
            </button>
          </div>
        </>
      )}

      {(isText || isShape) && (
        <div className="flex items-center gap-1 bg-[#252525] px-1.5 py-0.5 rounded-lg border border-gray-700">
          <Palette size={12} className="text-pink-400" />
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onAction('setColor', e.target.value)}
            className="w-5 h-5 p-0 border-none rounded cursor-pointer bg-transparent"
            title="Choose Color"
          />
        </div>
      )}

      {isImage && (
        <div className="flex items-center gap-1 bg-[#252525] rounded-lg p-0.5 border border-gray-700">
          <button
            onClick={() => onAction('fillImage')}
            className="px-2 py-1 hover:bg-gray-700 rounded text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1 transition-colors"
            title="Fill / Cover Entire Canvas (1080x1080)"
          >
            <Maximize2 size={12} className="text-pink-400" /> Fill
          </button>
          <button
            onClick={() => onAction('fitImage')}
            className="px-2 py-1 hover:bg-gray-700 rounded text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-1 transition-colors"
            title="Fit Inside Canvas"
          >
            <Minimize2 size={12} className="text-purple-400" /> Fit
          </button>
        </div>
      )}

      {/* Layer Depth */}
      <div className="flex items-center bg-[#252525] rounded-lg p-0.5 border border-gray-700">
        <button
          onClick={() => onAction('bringForward')}
          className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
          title="Bring Layer Forward"
        >
          <ArrowUp size={13} />
        </button>
        <button
          onClick={() => onAction('sendBackward')}
          className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white"
          title="Send Layer Backward"
        >
          <ArrowDown size={13} />
        </button>
      </div>

      <div className="w-px h-4 bg-gray-700 mx-0.5"></div>

      {/* Delete Layer */}
      <button
        onClick={() => onAction('delete')}
        className="p-1.5 hover:bg-rose-900/60 text-gray-400 hover:text-rose-300 rounded-lg transition-colors border border-transparent hover:border-rose-700"
        title="Delete Selected Layer"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

export default Toolbar;