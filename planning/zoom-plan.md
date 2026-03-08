# Feature: Zoom In/Out en el Canvas

## Resumen

Agregar zoom al canvas con rango de **25% a 100%**. El 100% es la vista natural actual. El usuario podrá hacer zoom out para ver más contenido y navegar (pan) por el canvas.

## Estado actual

- El canvas es un `<div>` con `position: relative` y notas con `position: absolute`
- No existe sistema de viewport, transform ni panning
- Las coordenadas de las notas se usan directamente como `left`/`top` en CSS
- El drag, resize y doble-click calculan coordenadas usando `getBoundingClientRect()` y `clientX`/`clientY`

## Arquitectura de la solución

### Concepto: Capa de transformación con CSS `transform`

Introducir una capa intermedia dentro del canvas que aplique `transform: scale(zoom)` y `translate(panX, panY)`. Esto separa las **coordenadas del mundo** (donde viven las notas) de las **coordenadas de pantalla** (donde el usuario hace click).

```
┌─────────────────────────────────────────────┐
│  .canvas-viewport  (overflow: hidden)       │  ← captura eventos de wheel/pan
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  .canvas-world                      │    │  ← transform: scale(zoom) translate(x,y)
│  │    ┌───────┐  ┌───────┐             │    │     transform-origin: 0 0
│  │    │ Note  │  │ Note  │             │    │
│  │    └───────┘  └───────┘             │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Controles de zoom - fixed/absolutos]      │  ← UI fuera de la transformación
└─────────────────────────────────────────────┘
```

### Nuevo estado necesario

```js
// En Canvas.jsx o en un hook useCanvasViewport()
const [zoom, setZoom] = useState(1);       // 0.25 a 1.0
const [pan, setPan] = useState({ x: 0, y: 0 }); // offset en px del mundo
const [isPanning, setIsPanning] = useState(false);
```

### Función crítica: conversión de coordenadas

Toda interacción que traduzca coordenadas de pantalla a coordenadas del mundo necesita pasar por esta función:

```js
function screenToWorld(screenX, screenY, canvasRect, zoom, pan) {
  return {
    x: (screenX - canvasRect.left) / zoom - pan.x,
    y: (screenY - canvasRect.top) / zoom - pan.y,
  };
}
```

---

## Plan de implementación

### Paso 1: Crear hook `useCanvasViewport`

**Archivo nuevo**: `src/hooks/useCanvasViewport.js`

Encapsula toda la lógica de zoom y pan:

```js
export function useCanvasViewport() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 1;
  const ZOOM_STEP = 0.05;

  // Zoom centrado en el punto del cursor
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta));

      // Ajustar pan para que el zoom se centre en el cursor
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Punto en el mundo bajo el cursor antes del zoom
      const worldX = mouseX / prev - pan.x; // worldX no cambia, pero...
      // Queremos que después del zoom, ese mismo worldX quede bajo el cursor:
      // mouseX / newZoom - newPanX = worldX
      // newPanX = mouseX / newZoom - worldX
      setPan(prevPan => ({
        x: mouseX / newZoom - (mouseX / prev - prevPan.x),
        y: mouseY / newZoom - (mouseY / prev - prevPan.y),
      }));

      return newZoom;
    });
  }, [pan]);

  // Convertir coordenadas de pantalla a coordenadas del mundo
  const screenToWorld = useCallback((screenX, screenY, canvasRect) => {
    return {
      x: (screenX - canvasRect.left) / zoom - pan.x,
      y: (screenY - canvasRect.top) / zoom - pan.y,
    };
  }, [zoom, pan]);

  // Zoom con botones (centra en el centro del viewport)
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return {
    zoom,
    pan,
    isPanning,
    setIsPanning,
    setPan,
    handleWheel,
    screenToWorld,
    zoomIn,
    zoomOut,
    resetZoom,
    MIN_ZOOM,
    MAX_ZOOM,
  };
}
```

---

### Paso 2: Reestructurar `Canvas.jsx`

**Cambios principales**:

1. **Dividir en dos capas**: viewport (contenedor fijo) y world (contenido transformado)
2. **Aplicar `transform`** al world layer
3. **Agregar panning** con middle-click o Espacio+drag
4. **Pasar `screenToWorld`** para que el doble-click calcule coordenadas correctas
5. **Agregar controles de zoom** (UI)

```jsx
export default function Canvas({ notes, onUpdateNote, onDeleteNote, onCreateNote, onBringToFront }) {
  const {
    zoom, pan, isPanning, setIsPanning, setPan,
    handleWheel, screenToWorld, zoomIn, zoomOut, resetZoom,
  } = useCanvasViewport();

  const viewportRef = useRef(null);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Doble click → crear nota en coordenadas del mundo
  const handleDoubleClick = (e) => {
    if (e.target !== e.currentTarget && !e.target.classList.contains('canvas-world')) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const worldPos = screenToWorld(e.clientX, e.clientY, rect);
    onCreateNote(worldPos.x, worldPos.y);
  };

  // Pan con middle-click o Espacio+click
  const handlePanStart = (e) => {
    if (e.button === 1 /* middle click */) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  };

  // ... mousemove/mouseup para panning (en useEffect)

  return (
    <div
      ref={viewportRef}
      className="canvas-viewport"
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handlePanStart}
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',      // ← ya no auto, el pan reemplaza el scroll
        cursor: isPanning ? 'grabbing' : 'default',
      }}
    >
      {/* Capa transformada donde viven las notas */}
      <div
        className="canvas-world"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          minHeight: '100%',
          transformOrigin: '0 0',
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          backgroundColor: '#f5f5f5',
          backgroundImage: 'radial-gradient(circle, #ddd 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* Notas */}
        {notes.map(note => (
          <Note key={note.id} note={note} zoom={zoom} ... />
        ))}
      </div>

      {/* Controles de zoom (fuera de la transformación) */}
      <ZoomControls zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />

      {/* FAB (fuera de la transformación) */}
      <button onClick={() => onCreateNote(100, 100)} ... >+</button>
    </div>
  );
}
```

---

### Paso 3: Adaptar `Note.jsx` para soportar zoom

El drag y resize calculan posiciones usando `getBoundingClientRect()` y `clientX`/`clientY`. Con zoom, los `rect` del DOM están escalados, así que las coordenadas deben dividirse por el `zoom`.

**Cambios en Note.jsx**:

1. **Recibir `zoom` como prop**
2. **Ajustar drag**: dividir deltas por `zoom`

```js
// En handleMouseMove durante drag:
const handleMouseMove = (e) => {
  const canvas = noteRef.current.parentElement;
  const canvasRect = canvas.getBoundingClientRect();

  // Compensar el zoom al calcular posición en coordenadas del mundo
  const newX = Math.max(0, (e.clientX - canvasRect.left) / zoom - dragOffset.current.x);
  const newY = Math.max(0, (e.clientY - canvasRect.top) / zoom - dragOffset.current.y);

  setPosition({ x: newX, y: newY });
};
```

3. **Ajustar resize**: dividir por `zoom`

```js
// En handleMouseMove durante resize:
const handleMouseMove = (e) => {
  const rect = noteRef.current.getBoundingClientRect();
  // rect.left y rect.top ya están en coordenadas de pantalla (escaladas)
  const newW = Math.max(150, (e.clientX - rect.left) / zoom);
  const newH = Math.max(100, (e.clientY - rect.top) / zoom);

  setSize({ w: newW, h: newH });
};
```

4. **Ajustar dragOffset**: el offset inicial también debe compensar zoom

```js
const handleMouseDown = (e) => {
  // ...
  const rect = noteRef.current.getBoundingClientRect();
  dragOffset.current = {
    x: (e.clientX - rect.left) / zoom,
    y: (e.clientY - rect.top) / zoom
  };
};
```

---

### Paso 4: Componente `ZoomControls`

**Archivo nuevo**: `src/components/ZoomControls.jsx`

UI simple con botones de +, -, porcentaje y reset:

```
┌─────────────────┐
│  [-]  75%  [+]  │
│     [Reset]     │
└─────────────────┘
```

- Posición: esquina inferior izquierda (fixed o absolute)
- Estilo minimalista para no distraer
- Muestra porcentaje actual (redondeado)
- Botón reset vuelve a 100% y pan (0,0)
- Botones + y - deshabilitados en los límites

---

### Paso 5: Panning completo

Implementar panning para navegar cuando se está en zoom out:

| Método | Acción |
|--------|--------|
| **Middle-click + drag** | Pan siempre disponible |
| **Espacio + click + drag** | Pan alternativo (estilo Figma/Miro) |
| **Ctrl + scroll** | Zoom (ya cubierto con wheel) |

**Lógica de panning** (en `useEffect` dentro de Canvas):

```js
useEffect(() => {
  if (!isPanning) return;

  const handleMouseMove = (e) => {
    const dx = (e.clientX - panStart.current.x) / zoom;
    const dy = (e.clientY - panStart.current.y) / zoom;
    setPan({
      x: panStart.current.panX + dx,
      y: panStart.current.panY + dy,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [isPanning, zoom]);
```

---

## Archivos a crear/modificar

| Archivo | Acción | Cambio |
|---------|--------|--------|
| `src/hooks/useCanvasViewport.js` | **Crear** | Hook con estado de zoom/pan, handlers de wheel, conversión de coordenadas |
| `src/components/ZoomControls.jsx` | **Crear** | UI con botones de zoom +/- y porcentaje |
| `src/components/Canvas.jsx` | **Modificar** | Reestructurar con viewport/world layers, integrar zoom/pan, pasar `zoom` a notas |
| `src/components/Note.jsx` | **Modificar** | Recibir prop `zoom`, ajustar cálculos de drag/resize dividiendo por zoom |

## Consideraciones

### Rendimiento
- `transform: scale()` es eficiente porque el navegador lo maneja en la GPU
- No se re-renderizan las notas al hacer zoom (solo cambia el transform del contenedor)
- El `will-change: transform` puede mejorar rendimiento en el canvas-world

### UX
- El zoom con wheel se centra en la posición del cursor (como Figma/Google Maps)
- Los controles UI son para usuarios que prefieren botones o trackpad
- El cursor cambia a `grab`/`grabbing` durante panning
- La grilla de puntos del fondo se escala con el zoom (comportamiento natural)

### Cosas que NO necesitan cambios
- **Backend/API**: las coordenadas de las notas siguen siendo las mismas (coordenadas del mundo)
- **Board.jsx**: no necesita cambios, el zoom es puramente visual/de interacción
- **Base de datos**: no necesita nuevos campos
