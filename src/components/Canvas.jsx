import Note from './Note';
import ZoomControls from './ZoomControls';
import { useCanvasViewport } from '../hooks/useCanvasViewport';

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

  // Calcular z_index máximo
  const maxZIndex = notes.reduce((max, note) =>
    Math.max(max, note.z_index || 1), 0
  );

  // Crear nota al hacer doble click en el canvas
  const handleDoubleClick = (e) => {
    // Solo si el click es directamente en el viewport o en el world
    if (e.target !== e.currentTarget && !e.target.classList.contains('canvas-world')) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const worldPos = screenToWorld(e.clientX, e.clientY, rect);

    onCreateNote(worldPos.x, worldPos.y);
  };

  // Prevenir menú contextual en el canvas (para que right-click sea pan)
  const handleContextMenu = (e) => {
    e.preventDefault();
  };

  return (
    <div
      ref={viewportRef}
      className="canvas-viewport"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handlePanStart}
      onContextMenu={handleContextMenu}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
      }}
    >
      {/* Capa transformada donde viven las notas */}
      <div
        className="canvas-world"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '400%',
          height: '400%',
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
        {notes.map(note => (
          <Note
            key={note.id}
            note={note}
            onUpdate={onUpdateNote}
            onDelete={onDeleteNote}
            onBringToFront={onBringToFront}
            maxZIndex={maxZIndex}
            zoom={zoom}
          />
        ))}
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
