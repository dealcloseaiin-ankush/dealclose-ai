import React from 'react';

const colors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

const BackgroundPicker = ({ onSelect }) => {
  return (
    <div className="p-2 bg-gray-800 rounded-lg">
      <h3 className="text-sm font-bold text-white mb-2">Background</h3>
      <div className="grid grid-cols-4 gap-2">
        {colors.map(color => (
          <div
            key={color}
            onClick={() => onSelect(color)}
            className="w-8 h-8 rounded-full cursor-pointer border-2 border-transparent hover:border-blue-400 transition-all"
            style={{ backgroundColor: color }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default BackgroundPicker;
