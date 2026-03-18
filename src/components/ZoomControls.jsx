import { useUi } from '../hooks/useUi';

/**
 * Controles de zoom para el canvas
 *
 * Props:
 * - zoom: nivel de zoom actual (0.25 a 1.0)
 * - onZoomIn: función para acercar
 * - onZoomOut: función para alejar
 * - onReset: función para volver a 100%
 * - minZoom: zoom mínimo
 * - maxZoom: zoom máximo
 */
export default function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset, minZoom, maxZoom }) {
  const { t } = useUi();
  const percentage = Math.round(zoom * 100);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      padding: '4px',
      zIndex: 9999,
      userSelect: 'none',
    }}>
      <button
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        style={{
          width: '32px',
          height: '32px',
          border: 'none',
          background: 'none',
          cursor: zoom <= minZoom ? 'default' : 'pointer',
          fontSize: '18px',
          color: zoom <= minZoom ? '#ccc' : '#333',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={t('zoom.zoomOut')}
      >
        −
      </button>

      <button
        onClick={onReset}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: '13px',
          color: '#555',
          padding: '4px 8px',
          borderRadius: '4px',
          minWidth: '48px',
        }}
        title={t('zoom.reset')}
      >
        {percentage}%
      </button>

      <button
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        style={{
          width: '32px',
          height: '32px',
          border: 'none',
          background: 'none',
          cursor: zoom >= maxZoom ? 'default' : 'pointer',
          fontSize: '18px',
          color: zoom >= maxZoom ? '#ccc' : '#333',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={t('zoom.zoomIn')}
      >
        +
      </button>
    </div>
  );
}
