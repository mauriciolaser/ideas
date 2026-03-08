import { useState, useRef, useEffect } from 'react';

// Color default para sticky notes (amarillo clásico)
const DEFAULT_COLOR = '#FFFFA5';

// Paleta de colores disponibles
const COLOR_PALETTE = [
  '#FFFFA5', // Amarillo
  '#FFB3BA', // Rosa
  '#BAFFC9', // Verde
  '#BAE1FF', // Azul
  '#FFDFBA', // Naranja
  '#E2B6FF', // Morado
];

// Valida que sea un color hex válido
function isValidHexColor(color) {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Componente Note - Nota individual tipo sticky note
 *
 * Props:
 * - note: objeto con {id, x, y, w, h, content, color, z_index}
 * - onUpdate: función para actualizar nota (noteId, updates)
 * - onDelete: función para eliminar nota (noteId)
 * - onBringToFront: función para traer al frente (noteId)
 * - maxZIndex: z_index máximo actual del canvas
 * - isSelected: si la nota está seleccionada
 * - isMultiSelected: si hay múltiples notas seleccionadas y esta es una de ellas
 * - groupDragOffset: {dx, dy} offset visual durante group drag (null si no aplica)
 * - onGroupDragMove: callback(noteId, dx, dy) durante group drag
 * - onGroupDragEnd: callback(noteId, dx, dy) al soltar group drag
 * - onClearSelection: callback para limpiar selección
 */
export default function Note({
  note, onUpdate, onDelete, onBringToFront, maxZIndex,
  zoom = 1, viewportRef, screenToWorld,
  isSelected = false, isMultiSelected = false,
  groupDragOffset = null,
  onGroupDragMove, onGroupDragEnd, onClearSelection
}) {
  // Color validado con fallback a amarillo
  const noteColor = isValidHexColor(note.color) ? note.color : DEFAULT_COLOR;

  // Estado local para posición/tamaño durante drag/resize
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [size, setSize] = useState({ w: note.w, h: note.h });
  const [content, setContent] = useState(note.content || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const noteRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
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

  // Visual position (with group drag offset applied)
  const visualX = position.x + (groupDragOffset ? groupDragOffset.dx : 0);
  const visualY = position.y + (groupDragOffset ? groupDragOffset.dy : 0);

  // === DRAG ===
  const handleMouseDown = (e) => {
    // Solo left-click para drag (right-click es selección del canvas)
    if (e.button !== 0) return;
    // Ignorar si es el resize handle o el textarea
    if (e.target.classList.contains('resize-handle') ||
        e.target.tagName === 'TEXTAREA') {
      return;
    }

    e.preventDefault();

    // Si esta nota no está seleccionada, limpiar la multi-selección
    if (!isSelected && onClearSelection) {
      onClearSelection();
    }

    setIsDragging(true);
    dragStartPos.current = { x: position.x, y: position.y };

    // Calcular offset del click respecto a la posición de la nota en coords mundo
    const vpRect = viewportRef.current.getBoundingClientRect();
    const worldClick = screenToWorld(e.clientX, e.clientY, vpRect);
    dragOffset.current = {
      x: worldClick.x - position.x,
      y: worldClick.y - position.y
    };

    // Traer al frente al hacer click
    if (note.z_index < maxZIndex) {
      onBringToFront(note.id);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const vpRect = viewportRef.current.getBoundingClientRect();
      const world = screenToWorld(e.clientX, e.clientY, vpRect);

      const newX = Math.max(0, world.x - dragOffset.current.x);
      const newY = Math.max(0, world.y - dragOffset.current.y);

      setPosition({ x: newX, y: newY });

      // Report delta for group drag
      if (isMultiSelected && onGroupDragMove) {
        const dx = newX - dragStartPos.current.x;
        const dy = newY - dragStartPos.current.y;
        onGroupDragMove(note.id, dx, dy);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);

      // Report group drag end
      if (isMultiSelected && onGroupDragEnd) {
        const dx = position.x - dragStartPos.current.x;
        const dy = position.y - dragStartPos.current.y;
        onGroupDragEnd(note.id, dx, dy);
      }

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
  }, [isDragging, position, note.x, note.y, note.id, onUpdate, screenToWorld, viewportRef, isMultiSelected, onGroupDragMove, onGroupDragEnd]);

  // === RESIZE ===
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const vpRect = viewportRef.current.getBoundingClientRect();
      const world = screenToWorld(e.clientX, e.clientY, vpRect);

      const newW = Math.max(150, world.x - position.x);
      const newH = Math.max(100, world.y - position.y);

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
  }, [isResizing, size, position, note.w, note.h, note.id, onUpdate, screenToWorld, viewportRef]);

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

  // === COLOR ===
  const handleColorChange = (e, newColor) => {
    e.stopPropagation();
    if (newColor !== noteColor) {
      onUpdate(note.id, { color: newColor });
    }
  };

  return (
    <div
      ref={noteRef}
      className="note"
      style={{
        position: 'absolute',
        left: visualX,
        top: visualY,
        width: size.w,
        height: size.h,
        backgroundColor: noteColor,
        zIndex: note.z_index,
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(66, 133, 244, 0.8), 2px 2px 8px rgba(0,0,0,0.15)'
          : '2px 2px 8px rgba(0,0,0,0.15)',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        userSelect: isDragging || isResizing ? 'none' : 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header con selector de color y botón eliminar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
      }}>
        {/* Paleta de colores */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              onClick={(e) => handleColorChange(e, color)}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: color,
                border: color === noteColor ? '2px solid #333' : '1px solid rgba(0,0,0,0.2)',
                cursor: 'pointer',
                padding: 0,
              }}
              title="Cambiar color"
            />
          ))}
        </div>

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
