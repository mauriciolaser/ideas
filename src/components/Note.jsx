import { useState, useRef, useEffect } from 'react';

/**
 * Componente Note - Nota individual tipo sticky note
 * 
 * Props:
 * - note: objeto con {id, x, y, w, h, content, color, z_index}
 * - onUpdate: función para actualizar nota (noteId, updates)
 * - onDelete: función para eliminar nota (noteId)
 * - onBringToFront: función para traer al frente (noteId)
 * - maxZIndex: z_index máximo actual del canvas
 */
export default function Note({ note, onUpdate, onDelete, onBringToFront, maxZIndex }) {
  // Estado local para posición/tamaño durante drag/resize
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [size, setSize] = useState({ w: note.w, h: note.h });
  const [content, setContent] = useState(note.content || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const noteRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const textareaRef = useRef(null);

  // Sincronizar con props cuando cambian externamente
  useEffect(() => {
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
    setContent(note.content || '');
  }, [note.content]);

  // === DRAG ===
  const handleMouseDown = (e) => {
    // Ignorar si es el resize handle o el textarea
    if (e.target.classList.contains('resize-handle') || 
        e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = noteRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // Traer al frente al hacer click
    if (note.z_index < maxZIndex) {
      onBringToFront(note.id);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const canvas = noteRef.current.parentElement;
      const canvasRect = canvas.getBoundingClientRect();
      
      const newX = Math.max(0, e.clientX - canvasRect.left - dragOffset.current.x);
      const newY = Math.max(0, e.clientY - canvasRect.top - dragOffset.current.y);
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // PATCH solo al soltar
      if (position.x !== note.x || position.y !== note.y) {
        onUpdate(note.id, { x: Math.round(position.x), y: Math.round(position.y) });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position, note.x, note.y, note.id, onUpdate]);

  // === RESIZE ===
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
      // PATCH solo al soltar
      if (size.w !== note.w || size.h !== note.h) {
        onUpdate(note.id, { w: Math.round(size.w), h: Math.round(size.h) });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, size, note.w, note.h, note.id, onUpdate]);

  // === EDICIÓN ===
  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleContentBlur = () => {
    // PATCH solo si cambió
    if (content !== (note.content || '')) {
      onUpdate(note.id, { content });
    }
  };

  // === DELETE ===
  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta nota?')) {
      onDelete(note.id);
    }
  };

  return (
    <div
      ref={noteRef}
      className="note"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.w,
        height: size.h,
        backgroundColor: note.color || '#FFFFA5',
        zIndex: note.z_index,
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: '2px 2px 8px rgba(0,0,0,0.15)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        userSelect: isDragging || isResizing ? 'none' : 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header con botón de eliminar */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '4px 8px',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
      }}>
        <button
          onClick={handleDelete}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#666',
            padding: '2px 6px',
          }}
          title="Eliminar nota"
        >
          ✕
        </button>
      </div>

      {/* Área de texto */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleContentChange}
        onBlur={handleContentBlur}
        placeholder="Escribe aquí..."
        style={{
          flex: 1,
          border: 'none',
          background: 'transparent',
          resize: 'none',
          padding: '8px',
          fontFamily: 'inherit',
          fontSize: '14px',
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
          background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.2) 50%)',
          borderRadius: '0 0 4px 0',
        }}
      />
    </div>
  );
}