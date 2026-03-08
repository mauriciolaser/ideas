import { useState, useCallback, useRef, useEffect } from 'react';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 1;
const ZOOM_STEP = 0.05;

export function useCanvasViewport() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const viewportRef = useRef(null);

  // Registrar wheel listener como non-passive para poder preventDefault
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? -1 : 1;

      // Capturar rect y mouse antes del state updater
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom(prevZoom => {
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prevZoom + direction * ZOOM_STEP));
        if (newZoom === prevZoom) return prevZoom;

        // Mantener el punto bajo el cursor fijo al cambiar zoom
        setPan(prevPan => ({
          x: mouseX / newZoom - (mouseX / prevZoom - prevPan.x),
          y: mouseY / newZoom - (mouseY / prevZoom - prevPan.y),
        }));

        return newZoom;
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Convertir coordenadas de pantalla a coordenadas del mundo
  const screenToWorld = useCallback((screenX, screenY, canvasRect) => {
    return {
      x: (screenX - canvasRect.left) / zoom - pan.x,
      y: (screenY - canvasRect.top) / zoom - pan.y,
    };
  }, [zoom, pan]);

  // Pan con right-click + drag
  const handlePanStart = useCallback((e) => {
    if (e.button !== 2) return; // solo right-click
    e.preventDefault();
    setIsPanning(true);
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  }, [pan]);

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e) => {
      const dx = (e.clientX - panStart.current.x) / zoom;
      const dy = (e.clientY - panStart.current.y) / zoom;
      setPan({
        x: panStart.current.panX + dx,
        y: panStart.current.panY + dy,
      });
    };

    const handleMouseUp = (e) => {
      if (e.button === 2) {
        setIsPanning(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, zoom]);

  // Zoom con botones (centra en el centro del viewport)
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return {
    zoom,
    pan,
    isPanning,
    viewportRef,
    handlePanStart,
    screenToWorld,
    zoomIn,
    zoomOut,
    resetZoom,
    MIN_ZOOM,
    MAX_ZOOM,
  };
}
