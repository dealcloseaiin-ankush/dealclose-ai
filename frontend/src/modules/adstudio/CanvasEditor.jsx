import { useEffect, useRef } from 'react';

export default function CanvasEditor({ template, product }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (template) {
      // Draw template background (mock)
      ctx.fillStyle = template.bg || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.font = '20px Arial';
      ctx.fillText(template.name, 20, 40);
    }

    if (product) {
      // In real app, load image from URL and draw
      ctx.fillStyle = 'blue';
      ctx.fillRect(100, 100, 100, 100); // Mock product
      ctx.fillStyle = 'white';
      ctx.fillText("Product", 110, 150);
    }
  }, [template, product]);

  return (
    <div className="border shadow-lg bg-white">
      <canvas 
        ref={canvasRef} 
        width={500} 
        height={500} 
        className="max-w-full h-auto"
      />
    </div>
  );
}