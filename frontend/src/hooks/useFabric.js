import { useRef, useCallback, useEffect, useState } from 'react';
import { fabric } from 'fabric';

/**
 * Custom Hook to manage a Fabric.js canvas instance.
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef - The ref to the canvas element.
 * @returns {object} An object containing the fabric canvas instance and helper functions.
 */
export const useFabric = (canvasRef) => {
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const fabricCanvasRef = useRef(null);

  // Initialize the canvas
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 500,
      height: 500,
      backgroundColor: '#1a1a1a',
    });
    setFabricCanvas(canvas);
    fabricCanvasRef.current = canvas;

    // Cleanup on unmount
    return () => {
      canvas.dispose();
    };
  }, [canvasRef]);

  /**
   * Renders a design from a JSON specification onto the canvas.
   * This function is memoized with useCallback for performance.
   */
  const renderDesign = useCallback((designJson) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !designJson || !designJson.canvas) return;

    // Clear previous design
    canvas.clear();

    // Set background color
    canvas.backgroundColor = designJson.canvas.backgroundColor || '#ffffff';

    // Fabric's fromObject method is used to load layers
    fabric.util.enlivenObjects(designJson.layers, (objects) => {
      objects.forEach(obj => {
        // Handle image placeholders
        if (obj.type === 'image' && obj.src && obj.src.startsWith('AI_IMAGE_PROMPT:')) {
          // For now, we can show a placeholder or skip it.
          // In the next step, the backend will replace this with a real image URL.
          // Let's create a placeholder rectangle for now.
          const placeholder = new fabric.Rect({
            left: obj.left,
            top: obj.top,
            width: obj.width,
            height: obj.height,
            fill: '#333',
            originX: obj.originX || 'left',
            originY: obj.originY || 'top',
          });
          canvas.add(placeholder);
        } else {
          canvas.add(obj);
        }
      });

      // Scale canvas to fit the container while maintaining aspect ratio
      const scale = 500 / (designJson.canvas.width || 1080);
      canvas.setZoom(scale);
      canvas.setWidth(designJson.canvas.width * scale);
      canvas.setHeight(designJson.canvas.height * scale);

      canvas.renderAll();
    });
  }, []);

  /**
   * Exports the current canvas state to a JSON object.
   */
  const exportToJson = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;
    return canvas.toObject(['caption', 'hashtags']); // Include custom properties if any
  }, []);

  /**
   * Exports the canvas to a data URL (e.g., for PNG/JPG).
   */
  const exportToImage = useCallback((format = 'png') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL({
      format: format,
      quality: 0.9,
    });
  }, []);

  return {
    fabricCanvas,
    renderDesign,
    exportToJson,
    exportToImage,
  };
};