import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Paleta de colores para notas
 */
const COLOR_PALETTE = [
  '#FFFFA5', // Amarillo (default)
  '#A5D6FF', // Azul
  '#B8F5B8', // Verde
  '#FFB8D4', // Rosa
  '#E5B8FF', // Morado
  '#FFD4A5', // Naranja
];

/**
 * Componente Note - Nota individual con drag, resize y edición
 * 
 * Props:
 * - note: { id, x, y, w, h, content, color, z_index }
 * - onUpdate: (noteId, updates) => void - Actualización OPTIMISTA
 * - onDelete: (noteId) => void
 * - onBringToFront: (noteId) => void
 */
export default function Note({ note, onUpdate, onDelete, onBringToFront }) {
  const noteRef = useRef(null);
  
  // Estado local para movimiento suave (sin lag)
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [size, setSize] = useState({ w: note.w, h: note.h });
  const [content, setContent] = useState(note.content || '');
  
  // Estados de interacción
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  // Offset para drag preciso
  const dragOffset = useRef({ x: 0, y: 0 });

  // ============================================
  // SINCRONIZAR PROPS → ESTADO LOCAL
  // (cuando el padre actualiza, sincronizamos)
  // ============================================
  useEffect(() => {
    // Solo sincronizar si NO estamos arrastrando/redimensionando
    if (!isDragging) {
      setPosition({ x: note.x, y: note.y });
    }
  }, [note.x, note.y, isDragging]);

  useEffect(() => {
    if (!isResizing) {
      setSize({ w: note.w, h: note.h });
    }
  }, [note.w, note.h, isResizing]);

  useEffect(() => {
    // Solo sincronizar content si no tiene el foco
    if (document.activeElement !== noteRef.current?.querySelector('textarea')) {
      setContent(note.content || '');
    }
  }, [note.content]);

  // ============================================
  // DRAG - Movimiento suave 100% local
  // ============================================
  const handleDragStart = (e) => {
    // Ignorar si viene del textarea, resize handle, o botones
    if (
      e.target.tagName === 'TEXTAREA' || 
      e.target.classList.contains('resize-handle') ||
      e.target.tagName === 'BUTTON' ||
      e.target.closest('.note-header')
    ) {
      return;
    }
    
    e.preventDefault();
    
    const rect = noteRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    setIsDragging(true);
    onBringToFront(note.id);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      // Calcular posición relativa al canvas (padre)
      const canvas = noteRef.current.parentElement;
      const canvasRect = canvas.getBoundingClientRect();
      
      const newX = e.clientX - canvasRect.left - dragOffset.current.x;
      const newY = e.clientY - canvasRect.top - dragOffset.current.y;
      
      // Limitar a valores positivos
      setPosition({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      // Solo notificar al padre si la posición cambió
      const newX = Math.round(position.x);
      const newY = Math.round(position.y);
      
      if (newX !== note.x || newY !== note.y) {
        // Actualización optimista - el padre actualiza inmediatamente
        onUpdate(note.id, { x: newX, y: newY });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position.x, position.y, note.x, note.y, note.id, onUpdate]);

  // ============================================
  // RESIZE - Redimensionado suave
  // ============================================
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const rect = noteRef.current.getBoundingClientRect();
      const newW = Math.max(150, e.clientX - rect.left);
      const newH = Math.max(100, e.clientY - rect.top);
      
      setSize({ w: newW, h: newH });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      
      const newW = Math.round(size.w);
      const newH = Math.round(size.h);
      
      if (newW !== note.w || newH !== note.h) {
        onUpdate(note.id, { w: newW, h: newH });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, size.w, size.h, note.w, note.h, note.id, onUpdate]);

  // ============================================
  // EDICIÓN DE CONTENIDO
  // ============================================
  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleContentBlur = () => {
    if (content !== (note.content || '')) {
      onUpdate(note.id, { content });
    }
  };

  // ============================================
  // COLOR
  // ============================================
  const handleColorChange = (color) => {
    onUpdate(note.id, { color });
    setShowColorPicker(false);
  };

  // ============================================
  // DELETE
  // ============================================
  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta nota?')) {
      onDelete(note.id);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      ref={noteRef}
      className="note"
      onMouseDown={handleDragStart}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.w,
        height: size.h,
        backgroundColor: note.color || '#FFFFA5',
        zIndex: note.z_index,
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: isDragging 
          ? '4px 6px 16px rgba(0,0,0,0.25)' 
          : '2px 2px 8px rgba(0,0,0,0.15)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        userSelect: isDragging || isResizing ? 'none' : 'auto',
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s',
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {/* Header con colores y botón eliminar */}
      <div 
        className="note-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          gap: '4px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          cursor: 'grab',
        }}
      >
        {/* Selector de color */}
        <div style={{ display: 'flex', gap: '3px' }}>
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => handleColorChange(color)}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: color,
                border: note.color === color 
                  ? '2px solid rgba(0,0,0,0.5)' 
                  : '1px solid rgba(0,0,0,0.2)',
                cursor: 'pointer',
                padding: 0,
              }}
              title={`Color: ${color}`}
            />
          ))}
        </div>
        
        {/* Espaciador */}
        <div style={{ flex: 1 }} />
        
        {/* Botón eliminar */}
        <button
          onClick={handleDelete}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px 6px',
            borderRadius: '4px',
            color: '#888',
          }}
          title="Eliminar nota"
        >
          ×
        </button>
      </div>

      {/* Contenido editable */}
      <textarea
        value={content}
        onChange={handleContentChange}
        onBlur={handleContentBlur}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder="Escribe aquí..."
        style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          resize: 'none',
          padding: '8px',
          fontSize: '14px',
          lineHeight: '1.4',
          fontFamily: 'inherit',
          outline: 'none',
          cursor: 'text',
        }}
      />

      {/* Handle de resize */}
      <div
        className="resize-handle"
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: '16px',
          height: '16px',
          cursor: 'se-resize',
          background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.1) 50%)',
          borderRadius: '0 0 4px 0',
        }}
      />
    </div>
  );
}