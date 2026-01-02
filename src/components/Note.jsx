import { useState, useEffect, useRef } from 'react';

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
 * CLAVE: Usamos refs + manipulación DOM directa durante drag/resize
 * para evitar re-renders en cada frame del mouse.
 */
export default function Note({ note, onUpdate, onDelete, onBringToFront }) {
  const noteRef = useRef(null);
  
  // Estado para renderizado (solo se actualiza al inicio y al soltar)
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [size, setSize] = useState({ w: note.w, h: note.h });
  const [content, setContent] = useState(note.content || '');
  
  // Estados de interacción (para estilos visuales)
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // === REFS para tracking sin re-renders ===
  const dragOffset = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: note.x, y: note.y });
  const currentSize = useRef({ w: note.w, h: note.h });

  // ============================================
  // SINCRONIZAR PROPS → ESTADO/REFS
  // ============================================
  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: note.x, y: note.y });
      currentPos.current = { x: note.x, y: note.y };
    }
  }, [note.x, note.y, isDragging]);

  useEffect(() => {
    if (!isResizing) {
      setSize({ w: note.w, h: note.h });
      currentSize.current = { w: note.w, h: note.h };
    }
  }, [note.w, note.h, isResizing]);

  useEffect(() => {
    if (document.activeElement !== noteRef.current?.querySelector('textarea')) {
      setContent(note.content || '');
    }
  }, [note.content]);

  // ============================================
  // DRAG - Movimiento via DOM directo (sin re-renders)
  // ============================================
  const handleDragStart = (e) => {
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
    
    currentPos.current = { x: position.x, y: position.y };
    
    setIsDragging(true);
    onBringToFront(note.id);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const canvas = noteRef.current.parentElement;
      const canvasRect = canvas.getBoundingClientRect();
      
      const newX = Math.max(0, e.clientX - canvasRect.left - dragOffset.current.x);
      const newY = Math.max(0, e.clientY - canvasRect.top - dragOffset.current.y);
      
      // Guardar en ref (sin re-render)
      currentPos.current = { x: newX, y: newY };
      
      // Mover elemento via DOM directo (máxima performance)
      noteRef.current.style.left = `${newX}px`;
      noteRef.current.style.top = `${newY}px`;
    };

    const handleMouseUp = () => {
      const finalX = Math.round(currentPos.current.x);
      const finalY = Math.round(currentPos.current.y);
      
      // Sincronizar estado React con posición final
      setPosition({ x: finalX, y: finalY });
      setIsDragging(false);
      
      // Persistir si cambió
      if (finalX !== note.x || finalY !== note.y) {
        onUpdate(note.id, { x: finalX, y: finalY });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, note.id, note.x, note.y, onUpdate]);

  // ============================================
  // RESIZE - También via DOM directo
  // ============================================
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    currentSize.current = { w: size.w, h: size.h };
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const rect = noteRef.current.getBoundingClientRect();
      const newW = Math.max(150, e.clientX - rect.left);
      const newH = Math.max(100, e.clientY - rect.top);
      
      currentSize.current = { w: newW, h: newH };
      
      noteRef.current.style.width = `${newW}px`;
      noteRef.current.style.height = `${newH}px`;
    };

    const handleMouseUp = () => {
      const finalW = Math.round(currentSize.current.w);
      const finalH = Math.round(currentSize.current.h);
      
      setSize({ w: finalW, h: finalH });
      setIsResizing(false);
      
      if (finalW !== note.w || finalH !== note.h) {
        onUpdate(note.id, { w: finalW, h: finalH });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, note.id, note.w, note.h, onUpdate]);

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
        
        <div style={{ flex: 1 }} />
        
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