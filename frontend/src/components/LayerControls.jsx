export default function LayerControls({ layers, selectedLayer, onSelectLayer }) {
  return (
    <div>
      <h3 className="text-sm font-bold mb-2">Layers</h3>
      <ul className="space-y-1">
        {(layers || ['Background', 'Product', 'Text']).map((layer, index) => (
          <li 
            key={index}
            onClick={() => onSelectLayer(layer)}
            className={`p-2 text-sm rounded cursor-pointer ${selectedLayer === layer ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
          >
            {layer}
          </li>
        ))}
      </ul>
    </div>
  );
}