# Fix: Snap-back al mover/posicionar notas

## Problema

Cuando el usuario mueve una nota y la suelta, esta vuelve brevemente a su posición original antes de aparecer en la posición correcta. Esto causa un efecto visual de "snap-back" que rompe la fluidez.

## Causa raíz

El flujo actual al soltar una nota es:

1. `handleMouseUp` en `Note.jsx:99` → `setIsDragging(false)` + llama `onUpdate(noteId, { x, y })`
2. Al cambiar `isDragging` a `false`, el `useEffect` de sincronización (`Note.jsx:47-51`) se ejecuta inmediatamente
3. En ese momento, `note.x` y `note.y` aún tienen los valores **viejos** (la API no ha respondido)
4. → La nota se resetea visualmente a la posición vieja
5. La API responde, `Board.jsx:64` actualiza `notes` con la nueva posición
6. El `useEffect` se ejecuta de nuevo con los valores correctos → la nota va a la posición final

**Resumen**: El estado local se sincroniza con props viejas en el instante entre soltar el mouse y recibir la respuesta de la API.

## Solución: Optimistic updates en `handleUpdateNote`

### Cambio 1: `Board.jsx` - `handleUpdateNote` con actualización optimista

**Antes** (espera respuesta de la API para actualizar estado):
```js
const handleUpdateNote = async (noteId, updates) => {
  try {
    const updatedNote = await updateNote(token, noteId, updates);
    setNotes(prev =>
      prev.map(note => note.id === noteId ? updatedNote : note)
    );
  } catch (err) {
    // recargar todo
  }
};
```

**Después** (actualiza estado local inmediatamente, revierte si falla):
```js
const handleUpdateNote = async (noteId, updates) => {
  // 1. Guardar estado previo para rollback
  const previousNotes = notes;

  // 2. Actualizar localmente de inmediato (optimistic update)
  setNotes(prev =>
    prev.map(note =>
      note.id === noteId ? { ...note, ...updates } : note
    )
  );

  // 3. Persistir en backend
  try {
    const updatedNote = await updateNote(token, noteId, updates);
    // Sincronizar con respuesta real del servidor
    setNotes(prev =>
      prev.map(note => note.id === noteId ? updatedNote : note)
    );
  } catch (err) {
    console.error('Error al actualizar nota:', err);
    // Rollback: restaurar estado previo
    setNotes(previousNotes);
  }
};
```

### Cambio 2: Unificar `handleBringToFront` con `handleUpdateNote`

Ahora que `handleUpdateNote` ya es optimista, `handleBringToFront` puede simplificarse para usar el mismo patrón en vez de duplicar lógica:

```js
const handleBringToFront = async (noteId) => {
  const maxZ = notes.reduce((max, note) => Math.max(max, note.z_index || 1), 0);
  handleUpdateNote(noteId, { z_index: maxZ + 1 });
};
```

### Sin cambios en `Note.jsx`

El `useEffect` de sincronización (`Note.jsx:47-51`) ya funciona correctamente: cuando `isDragging` es `false`, sincroniza con `note.x`/`note.y`. Con el optimistic update, esos valores ya serán los correctos inmediatamente después de soltar.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Board.jsx` | Refactorizar `handleUpdateNote` para optimistic updates; simplificar `handleBringToFront` |

## Resultado esperado

- Al soltar la nota, se queda en su posición final sin parpadeo
- Si la API falla, la nota revierte a su posición anterior (rollback)
- El patrón de z-index mantiene el mismo comportamiento fluido que ya tenía
