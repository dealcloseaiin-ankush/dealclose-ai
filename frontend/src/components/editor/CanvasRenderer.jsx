import React, { forwardRef } from 'react';

/**
 * A simple component that just renders the canvas element.
 * The logic is handled by the useFabric hook in the parent component.
 */
const CanvasRenderer = forwardRef((props, ref) => {
  return (
    <canvas ref={ref} />
  );
});

export default CanvasRenderer;