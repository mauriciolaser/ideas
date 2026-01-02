import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBoard, listBoards } from '../api/boardApi';

/**
 * Página Home - Crear nuevo tablero o acceder a uno existente
 */
export default function Home() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(true);

  // Cargar tableros al montar
  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const data = await listBoards();
      setBoards(data.boards || []);
    } catch (err) {
      console.error('Error cargando tableros:', err);
    } finally {
      setLoadingBoards(false);
    }
  };

  // Crear nuevo tablero
  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const board = await createBoard(title || 'Untitled');
      // Redirigir al tablero con el token
      navigate(`/board/${board.id}?token=${board.token}`);
    } catch (err) {
      setError(err.message || 'Error al crear tablero');
      setLoading(false);
    }
  };

  // Navegar a un tablero
  const goToBoard = (board) => {
    navigate(`/board/${board.id}?token=${board.token}`);
  };

  // Formatear fecha
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '40px 20px',
      backgroundColor: '#f5f5f5',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        {/* Header con formulario de creación */}
        <div style={{
          backgroundColor: 'white',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '32px',
        }}>
          <h1 style={{ 
            marginBottom: '8px',
            fontSize: '28px',
            color: '#333',
          }}>
            IdeaBoard
          </h1>
          <p style={{ 
            color: '#666', 
            marginBottom: '24px',
            fontSize: '14px',
          }}>
            Notas colaborativas en canvas libre
          </p>

          {/* Formulario para crear tablero */}
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del tablero (opcional)"
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                outline: 'none',
              }}
            />
            
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: loading ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {loading ? 'Creando...' : '+ Nuevo tablero'}
            </button>
          </form>

          {error && (
            <p style={{ color: '#c00', marginTop: '12px', fontSize: '14px' }}>
              {error}
            </p>
          )}
        </div>

        {/* Lista de tableros */}
        <div>
          <h2 style={{ 
            fontSize: '18px', 
            color: '#555', 
            marginBottom: '16px',
            fontWeight: '600',
          }}>
            Tableros existentes
          </h2>

          {loadingBoards ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
              Cargando tableros...
            </p>
          ) : boards.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#888',
            }}>
              No hay tableros creados aún. ¡Crea el primero!
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => goToBoard(board)}
                  style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    border: '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                    e.currentTarget.style.borderColor = '#4CAF50';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {board.title}
                  </h3>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    color: '#888',
                  }}>
                    <span style={{
                      backgroundColor: '#f0f0f0',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}>
                      {board.note_count} {board.note_count === 1 ? 'nota' : 'notas'}
                    </span>
                    <span>
                      {formatDate(board.updated_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p style={{
          marginTop: '32px',
          fontSize: '12px',
          color: '#aaa',
          textAlign: 'center',
        }}>
          MVP - Sin login, persistencia por token
        </p>
      </div>
    </div>
  );
}