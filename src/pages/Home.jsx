import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  archiveBoard,
  createBoard,
  exportIdeasData,
  importIdeasData,
  listBoards,
} from '../api/boardApi';
import { useUi } from '../hooks/useUi';

/**
 * Página Home - Crear nuevo tablero o acceder a uno existente
 */
export default function Home() {
  const navigate = useNavigate();
  const importInputRef = useRef(null);
  const { t, language, ui, getErrorMessage } = useUi();

  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [boards, setBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadBoards = useCallback(async () => {
    setLoadingBoards(true);
    try {
      const data = await listBoards(showArchived ? '1' : '0');
      setBoards(data.boards || []);
      setError(null);
    } catch (err) {
      console.error('Error cargando tableros:', err);
      setError(getErrorMessage(err, 'home.loadBoardsError'));
    } finally {
      setLoadingBoards(false);
    }
  }, [getErrorMessage, showArchived]);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const board = await createBoard(title || t('home.untitledBoard'));
      navigate(`/board/${board.id}`);
    } catch (err) {
      setError(getErrorMessage(err, 'home.createBoardError'));
      setLoading(false);
    }
  };

  const goToBoard = (board) => {
    navigate(`/board/${board.id}`);
  };

  const handleArchive = async (e, board, archive) => {
    e.stopPropagation();

    const actionLabel = archive ? t('home.archiveAction') : t('home.unarchiveAction');
    const actionLower = actionLabel.toLowerCase();
    if (!confirm(t('home.archiveConfirm', { action: actionLabel, title: board.title }))) {
      return;
    }

    try {
      await archiveBoard(board.id, archive);
      await loadBoards();
    } catch (err) {
      alert(t('home.archiveError', { action: actionLower, message: getErrorMessage(err) }));
    }
  };

  const handleExport = async () => {
    try {
      setError(null);
      const data = await exportIdeasData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      link.href = url;
      link.download = t('home.exportFileName', { timestamp });
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err, 'home.exportError'));
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const fileContents = await file.text();
      await importIdeasData(fileContents);
      await loadBoards();
    } catch (err) {
      setError(getErrorMessage(err, 'home.importError'));
    } finally {
      e.target.value = '';
      setImporting(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const locale = ui?.meta?.dateLocale?.[language] || 'es-PE';
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const utilityButtonStyle = {
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: '500',
    backgroundColor: '#f7f7f7',
    color: '#444',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
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
            {t('common.appName')}
          </h1>
          <p style={{
            color: '#666',
            marginBottom: '24px',
            fontSize: '14px',
          }}>
            {t('home.tagline')}
          </p>

          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('home.boardNamePlaceholder')}
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
              {loading ? t('home.creatingButton') : t('home.createButton')}
            </button>
          </form>

          <div style={{
            marginTop: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: '12px',
              color: '#888',
            }}>
              {t('home.persistenceNote')}
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleExport}
                style={utilityButtonStyle}
              >
                {t('home.exportButton')}
              </button>
              <button
                type="button"
                onClick={handleImportClick}
                disabled={importing}
                style={{
                  ...utilityButtonStyle,
                  opacity: importing ? 0.7 : 1,
                  cursor: importing ? 'not-allowed' : 'pointer',
                }}
              >
                {importing ? t('home.importingButton') : t('home.importButton')}
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                onChange={handleImportChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {error && (
            <p style={{ color: '#c00', marginTop: '12px', fontSize: '14px' }}>
              {error}
            </p>
          )}
        </div>

        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <h2 style={{
              fontSize: '18px',
              color: '#555',
              fontWeight: '600',
              margin: 0,
            }}>
              {showArchived ? t('home.archivedBoardsTitle') : t('home.activeBoardsTitle')}
            </h2>

            <div style={{
              display: 'flex',
              gap: '4px',
              backgroundColor: '#e0e0e0',
              padding: '4px',
              borderRadius: '8px',
            }}>
              <button
                onClick={() => setShowArchived(false)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: !showArchived ? 'white' : 'transparent',
                  color: !showArchived ? '#333' : '#666',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t('home.activeTab')}
              </button>
              <button
                onClick={() => setShowArchived(true)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: showArchived ? 'white' : 'transparent',
                  color: showArchived ? '#333' : '#666',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t('home.archivedTab')}
              </button>
            </div>
          </div>

          {loadingBoards ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
              {t('home.loadingBoards')}
            </p>
          ) : boards.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#888',
            }}>
              {showArchived
                ? t('home.emptyArchived')
                : t('home.emptyActive')}
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
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                    e.currentTarget.style.borderColor = showArchived ? '#888' : '#4CAF50';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <button
                    onClick={(e) => handleArchive(e, board, !showArchived)}
                    title={showArchived ? t('home.unarchiveAction') : t('home.archiveAction')}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '28px',
                      height: '28px',
                      padding: 0,
                      backgroundColor: 'transparent',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: '#888',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = showArchived ? '#4CAF50' : '#ff9800';
                      e.currentTarget.style.borderColor = showArchived ? '#4CAF50' : '#ff9800';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = '#ddd';
                      e.currentTarget.style.color = '#888';
                    }}
                  >
                    {showArchived ? '↩' : '📦'}
                  </button>

                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: '36px',
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
                      {t('common.noteCount', { count: board.note_count })}
                    </span>
                    <span>
                      {formatDate(showArchived ? board.archived_at : board.updated_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p style={{
          marginTop: '32px',
          fontSize: '12px',
          color: '#aaa',
          textAlign: 'center',
        }}>
          {t('home.footerNote')}
        </p>
      </div>
    </div>
  );
}
