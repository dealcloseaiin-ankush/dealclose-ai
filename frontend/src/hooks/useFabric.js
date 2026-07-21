import { useState, useEffect, useCallback } from 'react';
import { fabric } from 'fabric';

export const useFabric = (canvasRef) => {
  const [fabricCanvas, setFabricCanvas] = useState(null);
  
  // ✅ NEW: State for Undo/Redo history
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false); // Prevents saving state during undo/redo

  // Initialize the canvas
  useEffect(() => {
    // Debounce function to prevent excessive history saves
    const debounce = (func, delay) => {
      let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); };
    };

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1080,
      height: 1080,
      backgroundColor: '#0a0a0a',
      preserveObjectStacking: true,
    });

    const saveState = debounce(() => {
      if (isProcessing) return;
      const json = canvas.toJSON();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(json);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }, 500); // Debounce history saves by 500ms

    // Capture initial state
    saveState();

    // Event listeners to capture changes
    canvas.on('object:added', saveState);
    canvas.on('object:removed', saveState);
    canvas.on('object:modified', saveState);

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
      setFabricCanvas(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef]); // This effect should only run once to initialize the canvas. The functions inside create closures, which is intended.

  const renderDesign = useCallback((designJson) => {
    if (!fabricCanvas || !designJson) return;
    
    fabricCanvas.loadFromJSON(designJson, () => {
      fabricCanvas.renderAll();
      // After loading, fit the canvas to the screen
      // ✅ NEW: Reset history after loading a new design
      const json = fabricCanvas.toJSON();
      setHistory([json]);
      setHistoryIndex(0);
      setIsProcessing(false);

      const container = canvasRef.current.parentElement.parentElement;
      if (container) {
        const containerWidth = container.offsetWidth - 80;
        const containerHeight = container.offsetHeight - 100;
        const scale = Math.min(containerWidth / 1080, containerHeight / 1080);
        fabricCanvas.setZoom(scale);
        fabricCanvas.setWidth(1080 * scale);
        fabricCanvas.setHeight(1080 * scale);
        fabricCanvas.renderAll();
      }
    });
  }, [fabricCanvas, canvasRef]);
  
  const exportToJson = useCallback(() => {
    if (!fabricCanvas) return null;
    return fabricCanvas.toJSON(['id', 'layers', 'objects']);
  }, [fabricCanvas]);
  
  const exportToImage = useCallback((format = 'png') => {
    if (!fabricCanvas) return '';
    return fabricCanvas.toDataURL({
      format: format,
      quality: 0.9,
    });
  }, [fabricCanvas]);

  // ✅ NEW: Undo/Redo functions
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setIsProcessing(true);
      const newIndex = historyIndex - 1;
      fabricCanvas.loadFromJSON(history[newIndex], () => {
        fabricCanvas.renderAll();
        setHistoryIndex(newIndex);
        setIsProcessing(false);
      });
    }
  }, [fabricCanvas, history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setIsProcessing(true);
      const newIndex = historyIndex + 1;
      fabricCanvas.loadFromJSON(history[newIndex], () => {
        fabricCanvas.renderAll();
        setHistoryIndex(newIndex);
        setIsProcessing(false);
      });
    }
  }, [fabricCanvas, history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return { fabricCanvas, renderDesign, exportToJson, exportToImage, undo, redo, canUndo, canRedo };
};
