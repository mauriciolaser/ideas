import { useState, useRef, useEffect, useCallback } from 'react';
import Note from './Note';
import ZoomControls from './ZoomControls';
import { useCanvasViewport } from '../hooks/useCanvasViewport';

function rectsIntersect(r1, r2) {
  return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

/**
 * Componente Canvas - Contenedor del tablero con zoom y panning
 *
 * Props:
 * - notes: array de notas
 * - onUpdateNote: función para actualizar nota
 * - onDeleteNote: función para eliminar nota
 * - onCreateNote: función para crear nota (x, y)
 * - onBringToFront: función para traer nota al frente
 */
export default function Canvas({
  notes,
  onUpdateNote,
  onDeleteNote,
  onCreateNote,
  onBringToFront
}) {
  const {
    zoom, pan, isPanning,
    viewportRef,
    handlePanStart,
    screenToWorld,
    zoomIn, zoomOut, resetZoom,
    MIN_ZOOM, MAX_ZOOM,
  } = useCanvasViewport();

  // Multi-selection state
  const [selectedNoteIds, setSelectedNoteIds] = useState(new Set());
  const [selectionRect, setSelectionRect] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [groupDragDelta, setGroupDragDelta] = useState(null);

  const selectionRectRef = useRef(null);
  const notesRef = useRef(notes);
  const selectedNoteIdsRef = useRef(selectedNoteIds);

  useEffect(() => {
    selectionRectRef.current = selectionRect;
  }, [selectionRect]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    selectedNoteIdsRef.current = selectedNoteIds;
  }, [selectedNoteIds]);

  // Calcular z_index máximo
  const maxZIndex = notes.reduce((max, note) =>
    Math.max(max, note.z_index || 1), 0
  );

  // Crear nota al hacer doble click en el canvas
  const handleDoubleClick = (e) => {
    if (e.target !== e.currentTarget && !e.target.classList.contains('canvas-world')) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const worldPos = screenToWorld(e.clientX, e.clientY, rect);
    onCreateNote(worldPos.x, worldPos.y);
  };

  // Prevenir menú contextual
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  // Clear selection on left-click on canvas background
  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('canvas-world')) {
      if (selectedNoteIds.size > 0) {
        setSelectedNoteIds(new Set());
      }
    }
  };

  // Mouse down: right-click → selection rect, middle-click → pan
  const handleMouseDown = (e) => {
    if (e.button === 2) {
      // Right-click on canvas background → start selection rectangle
      if (e.target === e.currentTarget || e.target.classList.contains('canvas-world')) {
        const rect = viewportRef.current.getBoundingClientRect();
        const worldPos = screenToWorld(e.clientX, e.clientY, rect);
        setIsSelecting(true);
        setSelectionRect({
          startX: worldPos.x, startY: worldPos.y,
          endX: worldPos.x, endY: worldPos.y,
        });
      }
    } else if (e.button === 1) {
      // Middle-click → pan
      handlePanStart(e);
    }
  };

  // Selection rectangle drag (right-click)
  useEffect(() => {
    if (!isSelecting) return;

    const handleMouseMove = (e) => {
      const rect = viewportRef.current.getBoundingClientRect();
      const worldPos = screenToWorld(e.clientX, e.clientY, rect);
      setSelectionRect(prev => prev ? ({
        ...prev,
        endX: worldPos.x,
        endY: worldPos.y,
      }) : null);
    };

    const handleMouseUp = (e) => {
      if (e.button !== 2) return;
      setIsSelecting(false);

      const sr = selectionRectRef.current;
      if (!sr) return;

      const rect = {
        left: Math.min(sr.startX, sr.endX),
        top: Math.min(sr.startY, sr.endY),
        right: Math.max(sr.startX, sr.endX),
        bottom: Math.max(sr.startY, sr.endY),
      };

      // Only select if the rect has meaningful size
      const MIN_SIZE = 5;
      if (rect.right - rect.left > MIN_SIZE || rect.bottom - rect.top > MIN_SIZE) {
        const selected = new Set();
        notesRef.current.forEach(note => {
          const noteRect = {
            left: note.x,
            top: note.y,
            right: note.x + (note.w || 200),
            bottom: note.y + (note.h || 150),
          };
          if (rectsIntersect(rect, noteRect)) {
            selected.add(note.id);
          }
        });
        setSelectedNoteIds(selected);
      }

      setSelectionRect(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelecting, screenToWorld, viewportRef]);

  // Group drag handlers
  const handleGroupDragMove = useCallback((sourceNoteId, dx, dy) => {
    setGroupDragDelta({ dx, dy, sourceNoteId });
  }, []);

  const handleGroupDragEnd = useCallback((sourceNoteId, dx, dy) => {
    setGroupDragDelta(null);
    // Update all selected notes except the source (which updates itself)
    const currentNotes = notesRef.current;
    const currentSelected = selectedNoteIdsRef.current;
    currentSelected.forEach(id => {
      if (id !== sourceNoteId) {
        const note = currentNotes.find(n => n.id === id);
        if (note) {
          onUpdateNote(id, {
            x: Math.round(note.x + dx),
            y: Math.round(note.y + dy),
          });
        }
      }
    });
  }, [onUpdateNote]);

  const clearSelection = useCallback(() => {
    setSelectedNoteIds(new Set());
  }, []);

  return (
    <div
      ref={viewportRef}
      className="canvas-viewport"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onClick={handleCanvasClick}
      onContextMenu={handleContextMenu}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : isSelecting ? 'crosshair' : 'default',
      }}
    >
      {/* Capa transformada donde viven las notas */}
      <div
        className="canvas-world"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 10000,
          height: 10000,
          transformOrigin: '0 0',
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          backgroundColor: '#f5f5f5',
          backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          willChange: 'transform',
        }}
      >
        {/* Instrucciones si no hay notas */}
        {notes.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#888',
          }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>
              No hay notas todavía
            </p>
            <p style={{ fontSize: '14px' }}>
              Haz doble click o usa el botón + para crear una nota
            </p>
          </div>
        )}

        {/* Renderizar notas */}
        {notes.map(note => {
          const isSelected = selectedNoteIds.has(note.id);
          const isMultiSelected = selectedNoteIds.size > 1 && isSelected;
          const offset = (groupDragDelta && isSelected && groupDragDelta.sourceNoteId !== note.id)
            ? { dx: groupDragDelta.dx, dy: groupDragDelta.dy }
            : null;

          return (
            <Note
              key={note.id}
              note={note}
              onUpdate={onUpdateNote}
              onDelete={onDeleteNote}
              onBringToFront={onBringToFront}
              maxZIndex={maxZIndex}
              zoom={zoom}
              viewportRef={viewportRef}
              screenToWorld={screenToWorld}
              isSelected={isSelected}
              isMultiSelected={isMultiSelected}
              groupDragOffset={offset}
              onGroupDragMove={handleGroupDragMove}
              onGroupDragEnd={handleGroupDragEnd}
              onClearSelection={clearSelection}
            />
          );
        })}

        {/* Selection rectangle */}
        {selectionRect && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(selectionRect.startX, selectionRect.endX),
              top: Math.min(selectionRect.startY, selectionRect.endY),
              width: Math.abs(selectionRect.endX - selectionRect.startX),
              height: Math.abs(selectionRect.endY - selectionRect.startY),
              backgroundColor: 'rgba(66, 133, 244, 0.15)',
              border: '2px dashed rgba(66, 133, 244, 0.6)',
              borderRadius: '2px',
              pointerEvents: 'none',
              zIndex: 99999,
            }}
          />
        )}
      </div>

      {/* Controles de zoom (fuera de la transformación) */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetZoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
      />

      {/* Botón flotante para crear nota */}
      <button
        onClick={() => onCreateNote(100, 100)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          fontSize: '28px',
          cursor: 'pointer',
          boxShadow: '2px 4px 12px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
        title="Nueva nota (o doble click en el canvas)"
      >
        +
      </button>
    </div>
  );
}
