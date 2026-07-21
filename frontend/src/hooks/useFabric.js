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
    if (!canvas || !designJson) return;

    // Saved drafts created by older versions contain Fabric's `objects` array.
    // Convert it to the shared AI design contract before rendering.
    const normalizedDesign = designJson.canvas
      ? designJson
      : {
          canvas: {
            width: designJson.width || 1080,
            height: designJson.height || 1080,
            backgroundColor: designJson.background || designJson.backgroundColor || '#ffffff',
          },
          caption: designJson.caption || '',
          hashtags: designJson.hashtags || '',
          layers: designJson.layers || designJson.objects || [],
        };

    // Clear previous design
    canvas.clear();

    // Set background color
    canvas.backgroundColor = normalizedDesign.canvas.backgroundColor || '#ffffff';
    canvas.designCaption = normalizedDesign.caption || '';
    canvas.designHashtags = normalizedDesign.hashtags || '';

    // Fabric's fromObject method is used to load layers
    fabric.util.enlivenObjects(normalizedDesign.layers, (objects) => {
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
      const scale = 500 / (normalizedDesign.canvas.width || 1080);
      canvas.setZoom(scale);
      canvas.setWidth(normalizedDesign.canvas.width * scale);
      canvas.setHeight(normalizedDesign.canvas.height * scale);

      canvas.renderAll();
    });
  }, []);

  /**
   * Exports the current canvas state to a JSON object.
   */
  const exportToJson = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;
    const zoom = canvas.getZoom() || 1;
    return {
      canvas: {
        width: Math.round(canvas.getWidth() / zoom),
        height: Math.round(canvas.getHeight() / zoom),
        backgroundColor: canvas.backgroundColor || '#ffffff',
      },
      caption: canvas.designCaption || '',
      hashtags: canvas.designHashtags || '',
      layers: canvas.toObject().objects,
    };
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
      multiplier: 1 / (canvas.getZoom() || 1),
    });
  }, []);

  return {
    fabricCanvas,
    renderDesign,
    exportToJson,
    exportToImage,
  };
};
