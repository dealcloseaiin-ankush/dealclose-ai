import { useState, useEffect, useCallback } from 'react';
import { fabric } from 'fabric';

const normalizeDesignForFabric = (designJson) => {
  if (!designJson || typeof designJson !== 'object') return null;

  const canvasWidth = Number(designJson.canvas?.width || designJson.width || 1080);
  const canvasHeight = Number(designJson.canvas?.height || designJson.height || 1080);
  const backgroundColor = designJson.canvas?.backgroundColor || designJson.backgroundColor || '#ffffff';

  const rawLayers = Array.isArray(designJson.layers)
    ? designJson.layers
    : Array.isArray(designJson.objects)
      ? designJson.objects
      : [];

  const objects = rawLayers.map((layer) => {
    if (!layer || typeof layer !== 'object') return null;

    const normalizedLayer = { ...layer };

    if (normalizedLayer.type === 'text') {
      normalizedLayer.type = 'textbox';
      normalizedLayer.fontFamily = normalizedLayer.fontFamily || 'Poppins';
      normalizedLayer.fontSize = normalizedLayer.fontSize || 60;
      normalizedLayer.fontWeight = normalizedLayer.fontWeight || 'normal';
      normalizedLayer.fill = normalizedLayer.fill || '#ffffff';
      normalizedLayer.originX = normalizedLayer.originX || 'center';
      normalizedLayer.originY = normalizedLayer.originY || 'center';
      normalizedLayer.width = normalizedLayer.width || canvasWidth * 0.8;
      normalizedLayer.left = typeof normalizedLayer.left === 'number' ? normalizedLayer.left : canvasWidth / 2;
      normalizedLayer.top = typeof normalizedLayer.top === 'number' ? normalizedLayer.top : canvasHeight / 2;
    }

    if (typeof normalizedLayer.fill === 'string' && normalizedLayer.fill.includes('[')) {
      normalizedLayer.fill = '#ffffff';
    }

    if (normalizedLayer.type === 'image' && typeof normalizedLayer.src === 'string' && normalizedLayer.src.startsWith('AI_IMAGE_PROMPT:')) {
      normalizedLayer.crossOrigin = 'anonymous';
    }

    return normalizedLayer;
  }).filter(Boolean);

  return {
    version: '5.3.0',
    width: canvasWidth,
    height: canvasHeight,
    backgroundColor,
    objects,
  };
};

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

  // ✅ FIX: Completely rewritten renderDesign to be robust and use Fabric's native JSON loader.
  const renderDesign = useCallback((designJson, callback) => {
    if (!fabricCanvas || !designJson) return;

    const normalizedDesign = normalizeDesignForFabric(designJson);
    if (!normalizedDesign) return;

    console.log(`\n================== [FABRIC.JS RENDER START] ==================`);
    console.log(`🎨 [Debug] 1. Received Design JSON to render.`);
    console.log(`   - Background:`, normalizedDesign.backgroundColor);
    console.log(`   - Layer Count:`, normalizedDesign.objects?.length || 0);

    fabricCanvas.clear();
    fabricCanvas.setBackgroundColor(normalizedDesign.backgroundColor || '#ffffff');
    fabricCanvas.loadFromJSON(normalizedDesign, () => {
      fabricCanvas.setDimensions({
        width: normalizedDesign.width,
        height: normalizedDesign.height,
      });
      fabricCanvas.setWidth(normalizedDesign.width);
      fabricCanvas.setHeight(normalizedDesign.height);
      fabricCanvas.setZoom(1);
      fabricCanvas.viewportTransform = [1, 0, 0, 1, 0, 0];
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();

      // ✅ NEW: Reset history after loading a new design to prevent undoing into the old state.
      const json = fabricCanvas.toJSON();
      setHistory([json]);
      setHistoryIndex(0);
      setIsProcessing(false);
      console.log(`🔄 [Debug] 3. Undo/Redo history has been reset for the new design.`);

      // Optional callback for when rendering is complete
      if (callback) callback();
      console.log(`✅ [Debug] 4. Canvas rendering complete.`);
      console.log(`================== [FABRIC.JS RENDER END] ==================\n`);
    });
  }, [fabricCanvas]);
  
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
