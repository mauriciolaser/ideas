import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Canvas from '../components/Canvas';
import { getBoard, createNote, updateNote, deleteNote } from '../api/boardApi';

/**
 * Página Board - Maneja el estado del tablero
 *
 * URL: /board/:id
 */
export default function Board() {
  const { id } = useParams();

  const [board, setBoard] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadBoard() {
      if (!id) {
        setError('Falta ID de tablero en la URL');
        setLoading(false);
        return;
      }

      try {
        const data = await getBoard(id);
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
  }, [id]);

  const handleCreateNote = async (x, y) => {
    try {
      const newNote = await createNote({
        board_id: Number.parseInt(id, 10),
        x: Math.round(x),
        y: Math.round(y),
      });
      setNotes((prev) => [...prev, newNote]);
    } catch (err) {
      console.error('Error al crear nota:', err);
      alert(`Error al crear nota: ${err.message}`);
    }
  };

  const handleUpdateNote = async (noteId, updates) => {
    const previousNotes = notes;

    setNotes((prev) =>
      prev.map((note) => (note.id === noteId ? { ...note, ...updates } : note))
    );

    try {
      const updatedNote = await updateNote(noteId, updates);
      setNotes((prev) =>
        prev.map((note) => (note.id === noteId ? updatedNote : note))
      );
    } catch (err) {
      console.error('Error al actualizar nota:', err);
      setNotes(previousNotes);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
    } catch (err) {
      console.error('Error al eliminar nota:', err);
      alert(`Error al eliminar nota: ${err.message}`);
    }
  };

  const handleBringToFront = (noteId) => {
    const maxZ = notes.reduce((max, note) => Math.max(max, note.z_index || 1), 0);
    handleUpdateNote(noteId, { z_index: maxZ + 1 });
  };

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
          URL esperada: /board/ID
        </div>
      </div>
    );
  }

  return (
    <div className="board-page">
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
          {board?.title || 'ideas'}
        </h1>
        <span style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: '#888',
        }}>
          {notes.length} nota{notes.length !== 1 ? 's' : ''}
        </span>
      </header>

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
