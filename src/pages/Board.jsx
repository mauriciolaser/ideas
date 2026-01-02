import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Canvas from '../components/Canvas';
import { getBoard, createNote, updateNote, deleteNote } from '../api/boardApi';

/**
 * Página Board - Maneja el estado del tablero
 * 
 * URL: /board/:id?token=xxx
 * 
 * IMPORTANTE: Usa actualizaciones optimistas para UI suave
 */
export default function Board() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [board, setBoard] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar tablero al montar
  useEffect(() => {
    async function loadBoard() {
      if (!id || !token) {
        setError('Falta ID de tablero o token en la URL');
        setLoading(false);
        return;
      }

      try {
        const data = await getBoard(id, token);
        setBoard(data.board);
        setNotes(data.notes || []);
        setError(null);
      } catch (err) {
        setError(err.message || 'Error al cargar el tablero');
      } finally {
        setLoading(false);
      }
    }

    loadBoard();
  }, [id, token]);

  // ============================================
  // CREAR NOTA
  // ============================================
  const handleCreateNote = useCallback(async (x, y) => {
    try {
      const newNote = await createNote(token, {
        board_id: parseInt(id),
        x: Math.round(x),
        y: Math.round(y),
      });
      setNotes(prev => [...prev, newNote]);
    } catch (err) {
      console.error('Error al crear nota:', err);
      alert('Error al crear nota: ' + err.message);
    }
  }, [id, token]);

  // ============================================
  // ACTUALIZAR NOTA - OPTIMISTA
  // 
  // La clave del movimiento suave:
  // 1. Actualizamos el estado local INMEDIATAMENTE
  // 2. Enviamos al servidor en background (sin bloquear)
  // 3. Solo revertimos si hay error
  // ============================================
  const handleUpdateNote = useCallback((noteId, updates) => {
    // 1. ACTUALIZACIÓN OPTIMISTA - inmediata, sin await
    setNotes(prev => 
      prev.map(note => 
        note.id === noteId 
          ? { ...note, ...updates }
          : note
      )
    );

    // 2. PERSISTIR EN BACKGROUND - no bloqueamos la UI
    updateNote(token, noteId, updates)
      .catch(err => {
        console.error('Error al persistir nota:', err);
        // En caso de error, recargar estado real del servidor
        getBoard(id, token)
          .then(data => setNotes(data.notes || []))
          .catch(() => {}); // ignorar error de recarga
      });
  }, [id, token]);

  // ============================================
  // ELIMINAR NOTA - También optimista
  // ============================================
  const handleDeleteNote = useCallback((noteId) => {
    // Guardar nota por si hay que revertir
    const deletedNote = notes.find(n => n.id === noteId);
    
    // Eliminar optimistamente
    setNotes(prev => prev.filter(note => note.id !== noteId));
    
    // Persistir en background
    deleteNote(token, noteId)
      .catch(err => {
        console.error('Error al eliminar nota:', err);
        // Revertir si falló
        if (deletedNote) {
          setNotes(prev => [...prev, deletedNote]);
        }
        alert('Error al eliminar nota');
      });
  }, [notes, token]);

  // ============================================
  // TRAER AL FRENTE - Optimista
  // ============================================
  const handleBringToFront = useCallback((noteId) => {
    const maxZ = notes.reduce((max, note) => Math.max(max, note.z_index || 1), 0);
    const newZ = maxZ + 1;
    
    // Solo actualizar si es necesario
    const currentNote = notes.find(n => n.id === noteId);
    if (currentNote && currentNote.z_index >= maxZ) {
      return; // Ya está al frente
    }
    
    // Actualización optimista
    setNotes(prev =>
      prev.map(note => 
        note.id === noteId ? { ...note, z_index: newZ } : note
      )
    );
    
    // Persistir en background
    updateNote(token, noteId, { z_index: newZ })
      .catch(err => {
        console.error('Error al actualizar z_index:', err);
      });
  }, [notes, token]);

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666',
      }}>
        Cargando tablero...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#c00',
        gap: '16px',
      }}>
        <div>Error: {error}</div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          URL esperada: /board/ID?token=TOKEN
        </div>
      </div>
    );
  }

  return (
    <div className="board-page">
      {/* Header simple */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '48px',
        backgroundColor: 'white',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        zIndex: 10000,
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '18px',
          fontWeight: 500,
        }}>
          {board?.title || 'IdeaBoard'}
        </h1>
        <span style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: '#888',
        }}>
          {notes.length} nota{notes.length !== 1 ? 's' : ''}
        </span>
      </header>

      {/* Canvas con padding para header */}
      <main style={{ paddingTop: '48px' }}>
        <Canvas
          notes={notes}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onCreateNote={handleCreateNote}
          onBringToFront={handleBringToFront}
        />
      </main>
    </div>
  );
}