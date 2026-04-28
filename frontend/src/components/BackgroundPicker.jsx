export default function BackgroundPicker({ onSelect }) {
  const backgrounds = [
    'https://images.unsplash.com/photo-1553095066-5014bc7b7f2d?q=80&w=2071',
    'https://images.unsplash.com/photo-1581362716625-24e4a230b757?q=80&w=2070',
    '#ff0000',
    '#00ff00',
  ];

  return (
    <div>
      <h3 className="text-sm font-bold mb-2">Backgrounds</h3>
      <div className="grid grid-cols-2 gap-2">
        {backgrounds.map((bg, index) => (
          <div 
            key={index}
            onClick={() => onSelect(bg)}
            className="w-full h-16 rounded cursor-pointer border-2 border-transparent hover:border-blue-500"
            style={{ background: bg.startsWith('#') ? bg : `url(${bg})`, backgroundSize: 'cover' }}
          />
        ))}
      </div>
    </div>
  );
}