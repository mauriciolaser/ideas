# ideas

Canvas libre de notas adhesivas construido con React + Vite.

La app ahora funciona sin backend ni base de datos externa: toda la persistencia vive en `localStorage`, así que cualquier persona puede clonar el repo y tener datos persistentes out of the box en `localhost` o en un deploy estático.

## Desarrollo

```bash
npm install
npm run dev
```

Build de producción:

```bash
npm run build
```

Preview local del build:

```bash
npm run preview
```

## Persistencia

- Los datos se guardan en el navegador y por origen usando `localStorage`.
- La estructura persistida mantiene dos colecciones análogas a la base previa: `boards` y `notes`.
- Cada navegador, perfil o dominio tendrá su propio dataset local.
- Para mover o respaldar datos entre entornos, la pantalla inicial incluye `Exportar` e `Importar` en formato JSON.

## Flujo actual

- Crear tableros desde la home.
- Abrir un tablero por la ruta `/board/:id`.
- Crear, mover, editar, redimensionar, ordenar y borrar notas con persistencia automática.
- Archivar y desarchivar tableros desde la home.

## Backend legado

El directorio `public/api` queda solo como referencia histórica del MVP anterior en PHP/MySQL. La app React actual no depende de ese backend.
