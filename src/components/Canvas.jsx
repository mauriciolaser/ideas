import Note from './Note';

/**
 * Componente Canvas - Contenedor del tablero
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
  // Calcular z_index máximo
  const maxZIndex = notes.reduce((max, note) => 
    Math.max(max, note.z_index || 1), 0
  );

  // Crear nota al hacer doble click en el canvas
  const handleDoubleClick = (e) => {
    // Solo si el click es directamente en el canvas
    if (e.target !== e.currentTarget) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    onCreateNote(x, y);
  };

  return (
    <div 
      className="canvas"
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        overflow: 'auto',
      }}
    >
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
        />
      ))}
    </div>
  );
}